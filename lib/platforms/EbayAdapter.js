import { PlatformAdapter, PlatformType } from './PlatformAdapter.js';
import {
  StandardProduct,
  StandardVariant,
  StandardOrder,
  StandardLineItem,
  StandardCustomer,
  StandardInventory,
  StandardWebhookEvent
} from './StandardModels.js';

/**
 * eBay Marketplace Platform Adapter
 *
 * eBay is a global online marketplace for auctions and fixed-price sales.
 * This adapter supports both auction-style and "Buy It Now" listings.
 *
 * API Documentation: https://developer.ebay.com/docs
 *
 * Authentication: OAuth 2.0 (User Token or Application Token)
 * Base URL: https://api.ebay.com
 *
 * Key Features:
 * - Inventory API (listings, offers, inventory items)
 * - Buy API (orders, fulfillment)
 * - Sell API (listing management)
 * - Feed API (bulk operations)
 * - Notification API (webhooks)
 *
 * Listing Types:
 * - FIXED_PRICE: Traditional "Buy It Now"
 * - AUCTION: Bidding-style auction
 * - AUCTION_WITH_BIN: Auction with Buy It Now option
 *
 * Rate Limits:
 * - 5,000 calls per day for most APIs
 * - Some APIs have per-minute/per-hour limits
 */
export class EbayAdapter extends PlatformAdapter {
  constructor(credentials) {
    super(credentials);

    this.platformType = PlatformType.EBAY;
    this.platformName = 'eBay Marketplace';
    this.apiBaseUrl = 'https://api.ebay.com';

    // Sandbox vs Production
    this.isSandbox = credentials.sandbox || false;
    if (this.isSandbox) {
      this.apiBaseUrl = 'https://api.sandbox.ebay.com';
    }

    this.accessToken = credentials.access_token;
    this.refreshToken = credentials.refresh_token;
    this.marketplaceId = credentials.marketplace_id || 'EBAY_US'; // EBAY_US, EBAY_GB, EBAY_DE, etc.

    // Rate limiting
    this.rateLimitDelay = 200; // 5 requests per second
  }

  /**
   * Make authenticated API request to eBay
   */
  async makeRequest(endpoint, options = {}) {
    await this.waitForRateLimit();

    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-EBAY-C-MARKETPLACE-ID': this.marketplaceId,
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`eBay API Error: ${response.status} - ${errorData.errors?.[0]?.message || response.statusText}`);
      }

      // Some DELETE requests return 204 No Content
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    } catch (error) {
      console.error('eBay API request failed:', error);
      throw error;
    }
  }

  /**
   * Test connection to eBay API
   */
  async testConnection() {
    try {
      // Test by fetching inventory summary
      const response = await this.makeRequest('/sell/inventory/v1/inventory_item?limit=1');

      return {
        success: true,
        data: {
          marketplace: this.marketplaceId,
          total_items: response.total || 0,
          sandbox: this.isSandbox
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(callbackUrl, state) {
    const scopes = [
      'https://api.ebay.com/oauth/api_scope',
      'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.marketing',
      'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment'
    ].join(' ');

    const authUrl = this.isSandbox
      ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
      : 'https://auth.ebay.com/oauth2/authorize';

    const params = new URLSearchParams({
      client_id: this.credentials.client_id || 'YOUR_CLIENT_ID',
      response_type: 'code',
      redirect_uri: callbackUrl,
      scope: scopes,
      state: state
    });

    return `${authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code, callbackUrl) {
    const tokenUrl = this.isSandbox
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token';

    const credentials = Buffer.from(
      `${this.credentials.client_id}:${this.credentials.client_secret}`
    ).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: callbackUrl
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    };
  }

  /**
   * Get products (inventory items) from eBay
   */
  async getProducts(options = {}) {
    const {
      limit = 100,
      offset = 0
    } = options;

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    const response = await this.makeRequest(`/sell/inventory/v1/inventory_item?${params.toString()}`);

    const products = [];
    for (const item of response.inventoryItems || []) {
      // Get full details for each item
      const fullItem = await this.makeRequest(`/sell/inventory/v1/inventory_item/${item.sku}`);
      products.push(this.transformToStandardProduct(fullItem));
    }

    return {
      products: products,
      pagination: {
        total_items: response.total,
        limit: limit,
        offset: offset
      }
    };
  }

  /**
   * Get single product by SKU
   */
  async getProduct(sku) {
    const response = await this.makeRequest(`/sell/inventory/v1/inventory_item/${sku}`);
    return this.transformToStandardProduct(response);
  }

  /**
   * Create new inventory item
   */
  async createProduct(product) {
    const ebayProduct = this.transformFromStandardProduct(product);

    const response = await this.makeRequest(`/sell/inventory/v1/inventory_item/${product.sku}`, {
      method: 'PUT',
      body: JSON.stringify(ebayProduct)
    });

    // After creating inventory item, create an offer to list it
    const offer = await this.createOffer(product.sku, product.price);

    return this.transformToStandardProduct({
      ...ebayProduct,
      sku: product.sku,
      offers: [offer]
    });
  }

  /**
   * Update existing product
   */
  async updateProduct(sku, updates) {
    const ebayUpdates = this.transformFromStandardProduct(updates);

    const response = await this.makeRequest(`/sell/inventory/v1/inventory_item/${sku}`, {
      method: 'PUT',
      body: JSON.stringify(ebayUpdates)
    });

    return { success: true };
  }

  /**
   * Delete product (withdraw from sale)
   */
  async deleteProduct(sku) {
    // First, delete all offers
    const offers = await this.makeRequest(`/sell/inventory/v1/offer?sku=${sku}`);

    for (const offer of offers.offers || []) {
      await this.makeRequest(`/sell/inventory/v1/offer/${offer.offerId}`, {
        method: 'DELETE'
      });
    }

    // Then delete inventory item
    await this.makeRequest(`/sell/inventory/v1/inventory_item/${sku}`, {
      method: 'DELETE'
    });

    return { success: true };
  }

  /**
   * Create an offer (listing) for an inventory item
   */
  async createOffer(sku, price, format = 'FIXED_PRICE') {
    const offerData = {
      sku: sku,
      marketplaceId: this.marketplaceId,
      format: format, // FIXED_PRICE or AUCTION
      listingDescription: 'Listed via Tandril',
      availableQuantity: 1,
      categoryId: '1', // Must be valid category - would need category lookup
      listingPolicies: {
        fulfillmentPolicyId: this.credentials.fulfillment_policy_id,
        paymentPolicyId: this.credentials.payment_policy_id,
        returnPolicyId: this.credentials.return_policy_id
      },
      pricingSummary: {
        price: {
          currency: 'USD',
          value: price.toString()
        }
      }
    };

    const response = await this.makeRequest('/sell/inventory/v1/offer', {
      method: 'POST',
      body: JSON.stringify(offerData)
    });

    // Publish the offer
    await this.makeRequest(`/sell/inventory/v1/offer/${response.offerId}/publish`, {
      method: 'POST'
    });

    return response;
  }

  /**
   * Get inventory levels
   */
  async getInventory(skus = []) {
    const inventoryData = [];

    if (skus.length === 0) {
      // Get all inventory
      const response = await this.makeRequest('/sell/inventory/v1/inventory_item?limit=200');
      skus = (response.inventoryItems || []).map(item => item.sku);
    }

    for (const sku of skus) {
      const item = await this.makeRequest(`/sell/inventory/v1/inventory_item/${sku}`);

      inventoryData.push(new StandardInventory({
        platform_id: sku,
        product_platform_id: sku,
        sku: sku,
        quantity: item.availability?.shipToLocationAvailability?.quantity || 0,
        available_quantity: item.availability?.shipToLocationAvailability?.quantity || 0,
        platform: PlatformType.EBAY
      }));
    }

    return inventoryData;
  }

  /**
   * Update inventory
   */
  async updateInventory(sku, quantity) {
    const response = await this.makeRequest(`/sell/inventory/v1/inventory_item/${sku}`, {
      method: 'PUT',
      body: JSON.stringify({
        availability: {
          shipToLocationAvailability: {
            quantity: quantity
          }
        }
      })
    });

    return {
      success: true,
      new_quantity: quantity
    };
  }

  /**
   * Get orders from eBay
   */
  async getOrders(options = {}) {
    const {
      limit = 50,
      offset = 0,
      orderIds = null,
      filter = null // e.g., "orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS}"
    } = options;

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    if (orderIds) params.append('orderIds', orderIds);
    if (filter) params.append('filter', filter);

    const response = await this.makeRequest(`/sell/fulfillment/v1/order?${params.toString()}`);

    return {
      orders: (response.orders || []).map(o => this.transformToStandardOrder(o)),
      pagination: {
        total_items: response.total,
        limit: limit,
        offset: offset
      }
    };
  }

  /**
   * Get single order
   */
  async getOrder(orderId) {
    const response = await this.makeRequest(`/sell/fulfillment/v1/order/${orderId}`);
    return this.transformToStandardOrder(response);
  }

  /**
   * Fulfill order (mark as shipped)
   */
  async fulfillOrder(orderId, fulfillment) {
    const { tracking_number, carrier, line_items } = fulfillment;

    const shipmentData = {
      shippingCarrierCode: carrier || 'USPS',
      trackingNumber: tracking_number,
      lineItems: line_items || [] // Array of { lineItemId, quantity }
    };

    const response = await this.makeRequest(`/sell/fulfillment/v1/order/${orderId}/shipping_fulfillment`, {
      method: 'POST',
      body: JSON.stringify(shipmentData)
    });

    return {
      success: true,
      fulfillment_id: response.fulfillmentId
    };
  }

  /**
   * Get customers (buyers)
   * Note: eBay doesn't have a centralized customer API
   * Customer info comes from orders
   */
  async getCustomers(options = {}) {
    const ordersResponse = await this.getOrders({ limit: 100 });
    const uniqueBuyers = new Map();

    for (const order of ordersResponse.orders) {
      if (order.customer && !uniqueBuyers.has(order.customer.email)) {
        uniqueBuyers.set(order.customer.email, order.customer);
      }
    }

    return Array.from(uniqueBuyers.values());
  }

  /**
   * Register webhook (notification)
   * eBay uses "Notification API" for webhooks
   */
  async registerWebhook(topic, webhookUrl) {
    // eBay notification topics:
    // - MARKETPLACE_ACCOUNT_DELETION
    // - ITEM_SOLD
    // - ORDER_PAYMENT_PENDING
    // - LISTING_CREATED
    // etc.

    const notificationData = {
      destination: {
        deliveryConfig: {
          endpoint: webhookUrl
        }
      },
      config: {
        enabled: true,
        eventTypes: [topic]
      }
    };

    const response = await this.makeRequest('/commerce/notification/v1/subscription', {
      method: 'POST',
      body: JSON.stringify(notificationData)
    });

    return {
      webhook_id: response.subscriptionId,
      topic: topic,
      url: webhookUrl
    };
  }

  /**
   * List webhooks
   */
  async listWebhooks() {
    const response = await this.makeRequest('/commerce/notification/v1/subscription');

    return (response.subscriptions || []).map(sub => ({
      webhook_id: sub.subscriptionId,
      topic: sub.config?.eventTypes?.[0],
      url: sub.destination?.deliveryConfig?.endpoint,
      active: sub.config?.enabled
    }));
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId) {
    await this.makeRequest(`/commerce/notification/v1/subscription/${webhookId}`, {
      method: 'DELETE'
    });

    return { success: true };
  }

  /**
   * Verify webhook signature
   * eBay uses X-EBAY-SIGNATURE header
   */
  verifyWebhookSignature(payload, signature) {
    // eBay webhook verification:
    // 1. Extract signature from X-EBAY-SIGNATURE header
    // 2. Verify using public key from eBay
    // Implementation would require eBay's public key

    console.warn('eBay webhook signature verification not fully implemented');
    return true; // TODO: Implement proper verification
  }

  /**
   * Process webhook event
   */
  async processWebhook(payload, signature) {
    // eBay webhooks are JSON with notification structure
    const event = new StandardWebhookEvent({
      platform: PlatformType.EBAY,
      event_type: payload.metadata?.topic,
      event_id: payload.notificationId,
      created_at: payload.timestamp,
      data: payload.notification
    });

    return event;
  }

  /**
   * Transform eBay inventory item to StandardProduct
   */
  transformToStandardProduct(ebayItem) {
    // eBay uses SKU as primary identifier
    const product = new StandardProduct({
      platform_id: ebayItem.sku,
      platform: PlatformType.EBAY,
      sku: ebayItem.sku,
      title: ebayItem.product?.title || '',
      description: ebayItem.product?.description || '',
      product_type: ebayItem.product?.aspects?.Type?.[0] || '',

      // Price comes from offers
      price: ebayItem.offers?.[0]?.pricingSummary?.price?.value || 0,

      inventory_quantity: ebayItem.availability?.shipToLocationAvailability?.quantity || 0,

      // Images
      images: (ebayItem.product?.imageUrls || []),

      // Condition
      metafields: {
        condition: ebayItem.condition || 'NEW',
        upc: ebayItem.product?.upc?.[0],
        ean: ebayItem.product?.ean?.[0],
        isbn: ebayItem.product?.isbn?.[0],
        mpn: ebayItem.product?.mpn?.[0],
        brand: ebayItem.product?.brand,
        listing_format: ebayItem.offers?.[0]?.format,
        category_id: ebayItem.offers?.[0]?.categoryId
      },

      status: ebayItem.offers?.[0]?.status === 'PUBLISHED' ? 'active' : 'draft'
    });

    return product;
  }

  /**
   * Transform eBay order to StandardOrder
   */
  transformToStandardOrder(ebayOrder) {
    const lineItems = (ebayOrder.lineItems || []).map(item =>
      new StandardLineItem({
        platform_id: item.lineItemId,
        product_platform_id: item.sku,
        variant_platform_id: item.sku,
        title: item.title,
        quantity: item.quantity,
        price: parseFloat(item.lineItemCost?.value || 0),
        sku: item.sku,
        variant_title: item.title
      })
    );

    // Buyer info
    const buyer = ebayOrder.buyer || {};
    const customer = new StandardCustomer({
      platform_id: buyer.username,
      platform: PlatformType.EBAY,
      email: buyer.email,
      first_name: buyer.fullName?.split(' ')[0] || '',
      last_name: buyer.fullName?.split(' ').slice(1).join(' ') || '',
      shipping_address: {
        name: ebayOrder.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.fullName,
        address1: ebayOrder.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.addressLine1,
        address2: ebayOrder.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.addressLine2,
        city: ebayOrder.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.city,
        province: ebayOrder.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.stateOrProvince,
        country: ebayOrder.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.countryCode,
        zip: ebayOrder.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress?.postalCode
      }
    });

    return new StandardOrder({
      platform_id: ebayOrder.orderId,
      platform: PlatformType.EBAY,
      order_number: ebayOrder.orderId,

      line_items: lineItems,

      total_price: parseFloat(ebayOrder.pricingSummary?.total?.value || 0),
      subtotal_price: parseFloat(ebayOrder.pricingSummary?.priceSubtotal?.value || 0),
      total_tax: parseFloat(ebayOrder.pricingSummary?.tax?.value || 0),
      total_shipping: parseFloat(ebayOrder.pricingSummary?.deliveryCost?.value || 0),

      financial_status: this.mapFinancialStatus(ebayOrder.orderPaymentStatus),
      fulfillment_status: this.mapFulfillmentStatus(ebayOrder.orderFulfillmentStatus),

      customer: customer,

      shipping_address: customer.shipping_address,

      metafields: {
        sales_record_reference: ebayOrder.salesRecordReference,
        marketplace_id: ebayOrder.salesRecordReference?.split('-')[0]
      },

      created_at: ebayOrder.creationDate,
      updated_at: ebayOrder.lastModifiedDate
    });
  }

  /**
   * Map eBay payment status to standard financial status
   */
  mapFinancialStatus(paymentStatus) {
    const statusMap = {
      'PAID': 'paid',
      'PENDING': 'pending',
      'FAILED': 'voided',
      'REFUNDED': 'refunded'
    };

    return statusMap[paymentStatus] || 'pending';
  }

  /**
   * Map eBay fulfillment status to standard fulfillment status
   */
  mapFulfillmentStatus(fulfillmentStatus) {
    const statusMap = {
      'NOT_STARTED': 'unfulfilled',
      'IN_PROGRESS': 'partial',
      'FULFILLED': 'fulfilled',
      'CANCELLED': 'cancelled'
    };

    return statusMap[fulfillmentStatus] || 'unfulfilled';
  }

  /**
   * Transform StandardProduct to eBay format
   */
  transformFromStandardProduct(standardProduct) {
    const ebayProduct = {
      product: {
        title: standardProduct.title,
        description: standardProduct.description,
        imageUrls: standardProduct.images || [],
        aspects: {}
      },
      condition: standardProduct.metafields?.condition || 'NEW',
      availability: {
        shipToLocationAvailability: {
          quantity: standardProduct.inventory_quantity || 0
        }
      }
    };

    // Add brand if available
    if (standardProduct.vendor) {
      ebayProduct.product.brand = [standardProduct.vendor];
    }

    // Add product identifiers
    if (standardProduct.metafields?.upc) {
      ebayProduct.product.upc = [standardProduct.metafields.upc];
    }

    return ebayProduct;
  }
}
