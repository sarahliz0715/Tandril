/**
 * Amazon Seller Central Platform Adapter
 *
 * Integrates with Amazon SP-API (Selling Partner API)
 * Handles products, orders, inventory, and fulfillment
 *
 * API Documentation: https://developer-docs.amazon.com/sp-api/
 */

import PlatformAdapter, { PlatformType, PlatformStatus } from './PlatformAdapter.js';
import {
  StandardProduct,
  StandardVariant,
  StandardOrder,
  StandardLineItem,
  StandardCustomer,
  StandardInventory
} from './StandardModels.js';

export class AmazonAdapter extends PlatformAdapter {
  constructor(credentials) {
    super(credentials);
    this.platformType = PlatformType.AMAZON;
    this.platformName = 'Amazon Seller Central';
    this.apiBaseUrl = credentials.region === 'EU'
      ? 'https://sellingpartnerapi-eu.amazon.com'
      : 'https://sellingpartnerapi-na.amazon.com';

    // Amazon uses LWA (Login with Amazon) for OAuth
    this.accessToken = credentials.access_token || null;
    this.refreshToken = credentials.refresh_token || null;
    this.sellerId = credentials.seller_id || null;
    this.marketplaceId = credentials.marketplace_id || 'ATVPDKIKX0DER'; // US default
  }

  // ==========================================
  // CONNECTION & AUTHENTICATION
  // ==========================================

  async testConnection() {
    try {
      // Test by fetching seller info
      const response = await this.makeRequest('/sellers/v1/marketplaceParticipations');
      return {
        success: true,
        message: 'Successfully connected to Amazon Seller Central'
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  async getAuthUrl() {
    // Amazon OAuth URL
    const clientId = this.credentials.client_id;
    const redirectUri = encodeURIComponent(this.credentials.redirect_uri);
    const state = this.credentials.state || Math.random().toString(36).substring(7);

    return `https://sellercentral.amazon.com/apps/authorize/consent` +
      `?application_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&state=${state}` +
      `&version=beta`;
  }

  async exchangeCodeForToken(code) {
    // Exchange authorization code for access token
    const response = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret,
        redirect_uri: this.credentials.redirect_uri
      })
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;

    return data;
  }

  // ==========================================
  // PRODUCTS (Catalog Items API)
  // ==========================================

  async getProducts(options = {}) {
    const { limit = 20, nextToken = null } = options;

    const params = new URLSearchParams({
      marketplaceIds: this.marketplaceId,
      pageSize: limit.toString()
    });
    if (nextToken) params.append('pageToken', nextToken);

    const response = await this.makeRequest(`/catalog/2022-04-01/items?${params}`);

    // Transform Amazon products to standard format
    return response.items.map(item => this.transformToStandardProduct(item));
  }

  async getProduct(asin) {
    const params = new URLSearchParams({
      marketplaceIds: this.marketplaceId,
      includedData: 'attributes,dimensions,identifiers,images,productTypes,salesRanks,summaries,relationships'
    });

    const response = await this.makeRequest(`/catalog/2022-04-01/items/${asin}?${params}`);
    return this.transformToStandardProduct(response);
  }

  async createProduct(product) {
    // Amazon uses Listings API for creating products
    const amazonProduct = this.transformFromStandardProduct(product);

    const response = await this.makeRequest('/listings/2021-08-01/items/' + this.sellerId + '/' + product.sku, {
      method: 'PUT',
      body: JSON.stringify({
        productType: amazonProduct.product_type,
        requirements: 'LISTING',
        attributes: amazonProduct.attributes
      })
    });

    return this.transformToStandardProduct(response);
  }

  async updateProduct(asin, updates) {
    const response = await this.makeRequest(`/listings/2021-08-01/items/${this.sellerId}/${asin}`, {
      method: 'PATCH',
      body: JSON.stringify({
        productType: updates.product_type,
        patches: [
          {
            op: 'replace',
            path: '/attributes/item_name',
            value: [{ value: updates.title, language_tag: 'en_US', marketplace_id: this.marketplaceId }]
          }
        ]
      })
    });

    return this.transformToStandardProduct(response);
  }

  async deleteProduct(asin) {
    await this.makeRequest(`/listings/2021-08-01/items/${this.sellerId}/${asin}`, {
      method: 'DELETE'
    });
    return true;
  }

  // ==========================================
  // INVENTORY (FBA & Merchant Fulfilled)
  // ==========================================

  async getInventory(asins = []) {
    const params = new URLSearchParams({
      granularityType: 'Marketplace',
      granularityId: this.marketplaceId,
      marketplaceIds: this.marketplaceId
    });

    if (asins.length > 0) {
      params.append('sellerSkus', asins.join(','));
    }

    const response = await this.makeRequest(`/fba/inventory/v1/summaries?${params}`);

    return response.inventorySummaries.map(item => ({
      platform_id: item.asin,
      platform: PlatformType.AMAZON,
      sku: item.sellerSku,
      quantity: item.totalQuantity || 0,
      available_quantity: item.fulfillableQuantity || 0,
      reserved_quantity: item.reservedQuantity || 0,
      incoming_quantity: item.inboundWorkingQuantity || 0,
      location_name: 'Amazon FBA',
      updated_at: item.lastUpdatedTime || new Date().toISOString()
    }));
  }

  async updateInventory(sku, quantity) {
    // For merchant-fulfilled inventory
    const response = await this.makeRequest('/inventories/2024-06-19/items/' + this.sellerId + '/' + sku, {
      method: 'PUT',
      body: JSON.stringify({
        quantity: quantity,
        availabilityType: 'NOW'
      })
    });

    return {
      platform_id: sku,
      quantity,
      updated_at: new Date().toISOString()
    };
  }

  // ==========================================
  // ORDERS
  // ==========================================

  async getOrders(options = {}) {
    const {
      createdAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdBefore = new Date().toISOString(),
      orderStatuses = ['Unshipped', 'PartiallyShipped', 'Shipped'],
      nextToken = null
    } = options;

    const params = new URLSearchParams({
      MarketplaceIds: this.marketplaceId,
      CreatedAfter: createdAfter,
      CreatedBefore: createdBefore,
      OrderStatuses: orderStatuses.join(',')
    });

    if (nextToken) params.append('NextToken', nextToken);

    const response = await this.makeRequest(`/orders/v0/orders?${params}`);

    // Transform Amazon orders to standard format
    const standardOrders = [];
    for (const order of response.Orders || []) {
      const standardOrder = await this.transformToStandardOrder(order);
      standardOrders.push(standardOrder);
    }

    return standardOrders;
  }

  async getOrder(amazonOrderId) {
    const response = await this.makeRequest(`/orders/v0/orders/${amazonOrderId}`);
    return await this.transformToStandardOrder(response);
  }

  async updateOrderStatus(amazonOrderId, status) {
    // Amazon doesn't allow direct status updates
    // Status changes through fulfillment
    throw new Error('Amazon orders update status automatically through fulfillment');
  }

  async fulfillOrder(amazonOrderId, fulfillment) {
    // Create shipment for order
    const response = await this.makeRequest(`/mfn/v0/shipments`, {
      method: 'POST',
      body: JSON.stringify({
        AmazonOrderId: amazonOrderId,
        ShipmentData: {
          ShippingCarrier: fulfillment.carrier,
          TrackingNumber: fulfillment.tracking_number
        }
      })
    });

    return response;
  }

  // ==========================================
  // CUSTOMERS
  // ==========================================

  async getCustomers(options = {}) {
    // Amazon doesn't provide customer data directly
    // Customer info is only available per-order
    throw new Error('Amazon does not provide direct customer data access for privacy reasons');
  }

  async getCustomer(customerId) {
    throw new Error('Amazon does not provide direct customer data access for privacy reasons');
  }

  // ==========================================
  // WEBHOOKS (Notifications API)
  // ==========================================

  async registerWebhook(topic, webhookUrl) {
    // Amazon uses Event Bridge for notifications
    const response = await this.makeRequest('/notifications/v1/subscriptions/ATVPDKIKX0DER/' + topic, {
      method: 'POST',
      body: JSON.stringify({
        payloadVersion: '1.0',
        destinationType: 'SQS', // Amazon SQS queue
        destinationArn: webhookUrl
      })
    });

    return response;
  }

  async unregisterWebhook(subscriptionId) {
    await this.makeRequest(`/notifications/v1/subscriptions/${this.marketplaceId}/${subscriptionId}`, {
      method: 'DELETE'
    });
    return true;
  }

  verifyWebhookSignature(payload, signature) {
    // Amazon SNS signature verification
    // Implementation depends on SNS setup
    return true; // Simplified for now
  }

  // ==========================================
  // TRANSFORMATION METHODS
  // ==========================================

  transformToStandardProduct(amazonProduct) {
    return new StandardProduct({
      platform_id: amazonProduct.asin,
      platform: PlatformType.AMAZON,
      sku: amazonProduct.identifiers?.sku || amazonProduct.asin,
      title: amazonProduct.summaries?.[0]?.itemName || amazonProduct.attributes?.item_name?.[0]?.value || '',
      description: amazonProduct.summaries?.[0]?.itemDescription || '',
      vendor: amazonProduct.summaries?.[0]?.brand || '',
      product_type: amazonProduct.productTypes?.[0]?.productType || 'PRODUCT',
      price: amazonProduct.offers?.[0]?.price?.amount || 0,
      currency: amazonProduct.offers?.[0]?.price?.currency || 'USD',
      images: amazonProduct.images?.map(img => img.link) || [],
      featured_image: amazonProduct.images?.[0]?.link || null,
      status: amazonProduct.summaries?.[0]?.status === 'BUYABLE' ? 'active' : 'draft',
      created_at: amazonProduct.summaries?.[0]?.createdDate || new Date().toISOString(),
      updated_at: amazonProduct.summaries?.[0]?.lastUpdatedDate || new Date().toISOString(),
      platform_url: `https://www.amazon.com/dp/${amazonProduct.asin}`,
      metafields: {
        asin: amazonProduct.asin,
        sales_rank: amazonProduct.salesRanks?.[0]?.rank || null,
        category: amazonProduct.salesRanks?.[0]?.displayGroupTitle || null
      }
    });
  }

  transformFromStandardProduct(standardProduct) {
    return {
      product_type: standardProduct.product_type || 'PRODUCT',
      attributes: {
        item_name: [{
          value: standardProduct.title,
          language_tag: 'en_US',
          marketplace_id: this.marketplaceId
        }],
        brand: [{
          value: standardProduct.vendor || 'Generic',
          language_tag: 'en_US',
          marketplace_id: this.marketplaceId
        }],
        item_description: [{
          value: standardProduct.description,
          language_tag: 'en_US',
          marketplace_id: this.marketplaceId
        }],
        list_price: [{
          value: standardProduct.price,
          currency: standardProduct.currency,
          marketplace_id: this.marketplaceId
        }]
      }
    };
  }

  async transformToStandardOrder(amazonOrder) {
    // Fetch order items
    const itemsResponse = await this.makeRequest(`/orders/v0/orders/${amazonOrder.AmazonOrderId}/orderItems`);

    const lineItems = (itemsResponse.OrderItems || []).map(item => new StandardLineItem({
      platform_id: item.OrderItemId,
      product_id: item.ASIN,
      sku: item.SellerSKU,
      title: item.Title,
      quantity: item.QuantityOrdered,
      price: parseFloat(item.ItemPrice?.Amount || 0),
      total_price: parseFloat(item.ItemPrice?.Amount || 0) * item.QuantityOrdered,
      tax: parseFloat(item.ItemTax?.Amount || 0)
    }));

    return new StandardOrder({
      platform_id: amazonOrder.AmazonOrderId,
      platform: PlatformType.AMAZON,
      order_number: amazonOrder.AmazonOrderId,
      customer_email: amazonOrder.BuyerEmail || 'privacy@amazon.com',
      customer_name: amazonOrder.BuyerName || 'Amazon Customer',
      line_items: lineItems,
      total_price: parseFloat(amazonOrder.OrderTotal?.Amount || 0),
      currency: amazonOrder.OrderTotal?.CurrencyCode || 'USD',
      financial_status: amazonOrder.PaymentMethod === 'COD' ? 'pending' : 'paid',
      fulfillment_status: this.mapAmazonOrderStatus(amazonOrder.OrderStatus),
      shipping_address: {
        address1: amazonOrder.ShippingAddress?.AddressLine1 || '',
        address2: amazonOrder.ShippingAddress?.AddressLine2 || null,
        city: amazonOrder.ShippingAddress?.City || '',
        province: amazonOrder.ShippingAddress?.StateOrRegion || '',
        country: amazonOrder.ShippingAddress?.CountryCode || '',
        zip: amazonOrder.ShippingAddress?.PostalCode || ''
      },
      created_at: amazonOrder.PurchaseDate,
      updated_at: amazonOrder.LastUpdateDate,
      platform_url: `https://sellercentral.amazon.com/orders-v3/order/${amazonOrder.AmazonOrderId}`,
      notes: amazonOrder.OrderType || ''
    });
  }

  mapAmazonOrderStatus(amazonStatus) {
    const statusMap = {
      'Pending': 'unfulfilled',
      'Unshipped': 'unfulfilled',
      'PartiallyShipped': 'partial',
      'Shipped': 'fulfilled',
      'Canceled': 'cancelled',
      'Unfulfillable': 'unfulfilled'
    };
    return statusMap[amazonStatus] || 'unfulfilled';
  }

  // ==========================================
  // API REQUEST HELPER
  // ==========================================

  async makeRequest(endpoint, options = {}) {
    // In production, this would include AWS signature v4 signing
    // For now, simple mock implementation

    if (!this.accessToken) {
      throw new Error('Not authenticated. Please connect your Amazon account first.');
    }

    const url = `${this.apiBaseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'x-amz-access-token': this.accessToken,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Amazon API request failed');
    }

    return await response.json();
  }
}

// Export the adapter
export default AmazonAdapter;
