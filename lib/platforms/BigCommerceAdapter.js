/**
 * BigCommerce Platform Adapter
 *
 * Integrates with BigCommerce REST API (Enterprise e-commerce platform)
 * Handles products, orders, inventory, and customers
 *
 * API Documentation: https://developer.bigcommerce.com/api-reference
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

export class BigCommerceAdapter extends PlatformAdapter {
  constructor(credentials) {
    super(credentials);
    this.platformType = PlatformType.BIGCOMMERCE;
    this.platformName = 'BigCommerce';

    // BigCommerce uses store hash for API calls
    this.storeHash = credentials.store_hash; // e.g., abc123xyz
    this.accessToken = credentials.access_token;
    this.clientId = credentials.client_id;
    this.apiVersion = 'v3';
    this.apiBaseUrl = `https://api.bigcommerce.com/stores/${this.storeHash}/${this.apiVersion}`;
    this.apiV2Url = `https://api.bigcommerce.com/stores/${this.storeHash}/v2`;
  }

  // ==========================================
  // CONNECTION & AUTHENTICATION
  // ==========================================

  async testConnection() {
    try {
      const response = await this.makeRequest('/store');
      return {
        success: true,
        message: `Successfully connected to ${response.name || 'BigCommerce store'}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  async getAuthUrl() {
    // BigCommerce OAuth URL
    const scopes = 'store_v2_products store_v2_orders store_v2_customers store_v2_information';
    return `https://login.bigcommerce.com/oauth2/authorize` +
      `?client_id=${this.clientId}` +
      `&redirect_uri=${encodeURIComponent(this.credentials.redirect_uri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}`;
  }

  async exchangeCodeForToken(code) {
    const response = await fetch('https://login.bigcommerce.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.credentials.client_secret,
        code,
        redirect_uri: this.credentials.redirect_uri,
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    this.storeHash = data.context.split('/')[1];

    return data;
  }

  // ==========================================
  // PRODUCTS
  // ==========================================

  async getProducts(options = {}) {
    const { limit = 250, page = 1, search = null } = options;

    const params = new URLSearchParams({
      limit: limit.toString(),
      page: page.toString(),
      include: 'variants,images,custom_fields'
    });
    if (search) params.append('keyword', search);

    const response = await this.makeRequest(`/catalog/products?${params}`);
    return response.data.map(product => this.transformToStandardProduct(product));
  }

  async getProduct(productId) {
    const response = await this.makeRequest(`/catalog/products/${productId}?include=variants,images,custom_fields`);
    return this.transformToStandardProduct(response.data);
  }

  async createProduct(product) {
    const bcProduct = this.transformFromStandardProduct(product);
    const response = await this.makeRequest('/catalog/products', {
      method: 'POST',
      body: JSON.stringify(bcProduct)
    });
    return this.transformToStandardProduct(response.data);
  }

  async updateProduct(productId, updates) {
    const response = await this.makeRequest(`/catalog/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return this.transformToStandardProduct(response.data);
  }

  async deleteProduct(productId) {
    await this.makeRequest(`/catalog/products/${productId}`, {
      method: 'DELETE'
    });
    return true;
  }

  // ==========================================
  // INVENTORY
  // ==========================================

  async getInventory(productIds = []) {
    const inventory = [];

    for (const productId of productIds) {
      const product = await this.makeRequest(`/catalog/products/${productId}?include=variants`);

      if (product.data.variants && product.data.variants.length > 0) {
        // Product has variants
        product.data.variants.forEach(variant => {
          inventory.push({
            platform_id: variant.id.toString(),
            platform: PlatformType.BIGCOMMERCE,
            product_id: productId,
            sku: variant.sku,
            quantity: variant.inventory_level || 0,
            available_quantity: variant.inventory_level || 0,
            location_name: 'Default',
            updated_at: product.data.date_modified || new Date().toISOString()
          });
        });
      } else {
        // Simple product
        inventory.push({
          platform_id: product.data.id.toString(),
          platform: PlatformType.BIGCOMMERCE,
          sku: product.data.sku,
          quantity: product.data.inventory_level || 0,
          available_quantity: product.data.inventory_level || 0,
          location_name: 'Default',
          updated_at: product.data.date_modified || new Date().toISOString()
        });
      }
    }

    return inventory;
  }

  async updateInventory(productId, quantity) {
    // Check if product has variants
    const product = await this.makeRequest(`/catalog/products/${productId}?include=variants`);

    if (product.data.variants && product.data.variants.length > 0) {
      // Update first variant
      const variantId = product.data.variants[0].id;
      await this.makeRequest(`/catalog/products/${productId}/variants/${variantId}`, {
        method: 'PUT',
        body: JSON.stringify({
          inventory_level: quantity,
          inventory_tracking: 'product'
        })
      });
    } else {
      // Update simple product
      await this.makeRequest(`/catalog/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({
          inventory_level: quantity,
          inventory_tracking: 'product'
        })
      });
    }

    return {
      platform_id: productId,
      quantity,
      updated_at: new Date().toISOString()
    };
  }

  // ==========================================
  // ORDERS (Uses V2 API)
  // ==========================================

  async getOrders(options = {}) {
    const {
      min_date_created = null,
      max_date_created = null,
      status_id = null,
      limit = 250,
      page = 1
    } = options;

    const params = new URLSearchParams({
      limit: limit.toString(),
      page: page.toString()
    });

    if (min_date_created) params.append('min_date_created', min_date_created);
    if (max_date_created) params.append('max_date_created', max_date_created);
    if (status_id) params.append('status_id', status_id.toString());

    const response = await this.makeRequestV2(`/orders?${params}`);
    const orders = [];

    // Fetch full order details for each order
    for (const order of response) {
      const fullOrder = await this.getOrder(order.id);
      orders.push(fullOrder);
    }

    return orders;
  }

  async getOrder(orderId) {
    const [order, products] = await Promise.all([
      this.makeRequestV2(`/orders/${orderId}`),
      this.makeRequestV2(`/orders/${orderId}/products`)
    ]);

    return this.transformToStandardOrder(order, products);
  }

  async updateOrderStatus(orderId, status) {
    const bcStatusId = this.mapToBigCommerceStatusId(status);
    const response = await this.makeRequestV2(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status_id: bcStatusId })
    });
    return this.transformToStandardOrder(response, []);
  }

  async fulfillOrder(orderId, fulfillment) {
    // Create shipment
    const shipment = await this.makeRequestV2(`/orders/${orderId}/shipments`, {
      method: 'POST',
      body: JSON.stringify({
        tracking_number: fulfillment.tracking_number,
        tracking_carrier: fulfillment.carrier,
        comments: 'Shipped via Tandril'
      })
    });

    // Update order status to shipped
    await this.updateOrderStatus(orderId, 'fulfilled');

    return shipment;
  }

  // ==========================================
  // CUSTOMERS (Uses V3 API)
  // ==========================================

  async getCustomers(options = {}) {
    const { limit = 250, page = 1 } = options;

    const params = new URLSearchParams({
      limit: limit.toString(),
      page: page.toString()
    });

    const response = await this.makeRequest(`/customers?${params}`);
    return response.data.map(customer => this.transformToStandardCustomer(customer));
  }

  async getCustomer(customerId) {
    const response = await this.makeRequest(`/customers/${customerId}`);
    return this.transformToStandardCustomer(response.data);
  }

  // ==========================================
  // WEBHOOKS
  // ==========================================

  async registerWebhook(topic, webhookUrl) {
    const response = await this.makeRequest('/hooks', {
      method: 'POST',
      body: JSON.stringify({
        scope: this.mapTopicToScope(topic),
        destination: webhookUrl,
        is_active: true,
        headers: {}
      })
    });

    return response.data;
  }

  async unregisterWebhook(webhookId) {
    await this.makeRequest(`/hooks/${webhookId}`, {
      method: 'DELETE'
    });
    return true;
  }

  verifyWebhookSignature(payload, signature) {
    // BigCommerce doesn't use webhook signatures by default
    // You can verify by checking the source IP or using custom headers
    return true;
  }

  mapTopicToScope(topic) {
    const scopeMap = {
      'order.created': 'store/order/created',
      'order.updated': 'store/order/updated',
      'product.created': 'store/product/created',
      'product.updated': 'store/product/updated',
      'product.deleted': 'store/product/deleted',
      'customer.created': 'store/customer/created'
    };
    return scopeMap[topic] || topic;
  }

  // ==========================================
  // TRANSFORMATION METHODS
  // ==========================================

  transformToStandardProduct(bcProduct) {
    return new StandardProduct({
      platform_id: bcProduct.id.toString(),
      platform: PlatformType.BIGCOMMERCE,
      sku: bcProduct.sku,
      title: bcProduct.name,
      description: bcProduct.description,
      vendor: bcProduct.brand_id ? `Brand ${bcProduct.brand_id}` : '',
      product_type: bcProduct.type,
      price: parseFloat(bcProduct.price || 0),
      compare_at_price: bcProduct.retail_price ? parseFloat(bcProduct.retail_price) : null,
      cost_per_item: bcProduct.cost_price ? parseFloat(bcProduct.cost_price) : null,
      currency: 'USD',
      inventory_quantity: bcProduct.inventory_level || 0,
      inventory_tracked: bcProduct.inventory_tracking !== 'none',
      has_variants: (bcProduct.variants?.length || 0) > 0,
      variants: bcProduct.variants?.map(v => this.transformVariant(v)) || [],
      images: bcProduct.images?.map(img => img.url_standard) || [],
      featured_image: bcProduct.images?.[0]?.url_standard || null,
      status: bcProduct.is_visible ? 'active' : 'draft',
      seo_title: bcProduct.page_title,
      seo_description: bcProduct.meta_description,
      created_at: bcProduct.date_created || new Date().toISOString(),
      updated_at: bcProduct.date_modified || new Date().toISOString(),
      platform_url: `https://store-${this.storeHash}.mybigcommerce.com/manage/products/${bcProduct.id}/edit`,
      metafields: {
        weight: bcProduct.weight,
        condition: bcProduct.condition,
        custom_url: bcProduct.custom_url?.url
      }
    });
  }

  transformVariant(bcVariant) {
    return new StandardVariant({
      platform_id: bcVariant.id.toString(),
      sku: bcVariant.sku,
      price: parseFloat(bcVariant.price || 0),
      inventory_quantity: bcVariant.inventory_level || 0,
      weight: bcVariant.weight,
      image: bcVariant.image_url
    });
  }

  transformFromStandardProduct(standardProduct) {
    return {
      name: standardProduct.title,
      type: 'physical',
      sku: standardProduct.sku,
      description: standardProduct.description,
      weight: 0,
      price: standardProduct.price,
      cost_price: standardProduct.cost_per_item,
      retail_price: standardProduct.compare_at_price,
      inventory_level: standardProduct.inventory_quantity,
      inventory_tracking: standardProduct.inventory_tracked ? 'product' : 'none',
      is_visible: standardProduct.status === 'active',
      images: standardProduct.images.map((url, index) => ({
        image_url: url,
        is_thumbnail: index === 0
      }))
    };
  }

  transformToStandardOrder(bcOrder, bcProducts = []) {
    const lineItems = bcProducts.map(item => new StandardLineItem({
      platform_id: item.id.toString(),
      product_id: item.product_id.toString(),
      sku: item.sku,
      title: item.name,
      quantity: item.quantity,
      price: parseFloat(item.base_price),
      total_price: parseFloat(item.total_inc_tax),
      tax: parseFloat(item.total_tax || 0)
    }));

    return new StandardOrder({
      platform_id: bcOrder.id.toString(),
      platform: PlatformType.BIGCOMMERCE,
      order_number: bcOrder.id.toString(),
      customer_id: bcOrder.customer_id?.toString() || null,
      customer_email: bcOrder.billing_address?.email || '',
      customer_name: `${bcOrder.billing_address?.first_name || ''} ${bcOrder.billing_address?.last_name || ''}`.trim(),
      line_items: lineItems,
      total_price: parseFloat(bcOrder.total_inc_tax || 0),
      subtotal_price: parseFloat(bcOrder.subtotal_ex_tax || 0),
      total_tax: parseFloat(bcOrder.total_tax || 0),
      total_shipping: parseFloat(bcOrder.shipping_cost_inc_tax || 0),
      total_discounts: parseFloat(bcOrder.discount_amount || 0),
      currency: bcOrder.currency_code || 'USD',
      financial_status: this.mapBigCommercePaymentStatus(bcOrder.payment_status),
      fulfillment_status: this.mapBigCommerceFulfillmentStatus(bcOrder.status_id),
      shipping_address: bcOrder.shipping_addresses?.[0] ? {
        first_name: bcOrder.shipping_addresses[0].first_name,
        last_name: bcOrder.shipping_addresses[0].last_name,
        company: bcOrder.shipping_addresses[0].company,
        address1: bcOrder.shipping_addresses[0].street_1,
        address2: bcOrder.shipping_addresses[0].street_2,
        city: bcOrder.shipping_addresses[0].city,
        province: bcOrder.shipping_addresses[0].state,
        country: bcOrder.shipping_addresses[0].country,
        zip: bcOrder.shipping_addresses[0].zip
      } : {},
      billing_address: bcOrder.billing_address ? {
        first_name: bcOrder.billing_address.first_name,
        last_name: bcOrder.billing_address.last_name,
        company: bcOrder.billing_address.company,
        address1: bcOrder.billing_address.street_1,
        address2: bcOrder.billing_address.street_2,
        city: bcOrder.billing_address.city,
        province: bcOrder.billing_address.state,
        country: bcOrder.billing_address.country,
        zip: bcOrder.billing_address.zip,
        phone: bcOrder.billing_address.phone
      } : {},
      created_at: bcOrder.date_created || new Date().toISOString(),
      updated_at: bcOrder.date_modified || new Date().toISOString(),
      platform_url: `https://store-${this.storeHash}.mybigcommerce.com/manage/orders/${bcOrder.id}`,
      notes: bcOrder.customer_message || ''
    });
  }

  transformToStandardCustomer(bcCustomer) {
    return new StandardCustomer({
      platform_id: bcCustomer.id.toString(),
      platform: PlatformType.BIGCOMMERCE,
      email: bcCustomer.email,
      first_name: bcCustomer.first_name,
      last_name: bcCustomer.last_name,
      phone: bcCustomer.phone,
      created_at: bcCustomer.date_created || new Date().toISOString(),
      updated_at: bcCustomer.date_modified || new Date().toISOString(),
      accepts_marketing: bcCustomer.accepts_product_review_abandoned_cart_emails
    });
  }

  mapToBigCommerceStatusId(standardStatus) {
    const statusMap = {
      'pending': 1,      // Pending
      'paid': 2,         // Shipped (processing)
      'fulfilled': 10,   // Completed
      'cancelled': 5     // Cancelled
    };
    return statusMap[standardStatus] || 1;
  }

  mapBigCommercePaymentStatus(paymentStatus) {
    return paymentStatus === 'captured' ? 'paid' : 'pending';
  }

  mapBigCommerceFulfillmentStatus(statusId) {
    const fulfillmentMap = {
      1: 'unfulfilled',  // Pending
      2: 'unfulfilled',  // Shipped (in progress)
      10: 'fulfilled',   // Completed
      11: 'fulfilled',   // Awaiting Fulfillment
      7: 'unfulfilled',  // Awaiting Payment
      5: 'unfulfilled'   // Cancelled
    };
    return fulfillmentMap[statusId] || 'unfulfilled';
  }

  // ==========================================
  // API REQUEST HELPERS
  // ==========================================

  async makeRequest(endpoint, options = {}) {
    const url = `${this.apiBaseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Auth-Token': this.accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.title || 'BigCommerce API request failed');
    }

    return await response.json();
  }

  async makeRequestV2(endpoint, options = {}) {
    const url = `${this.apiV2Url}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Auth-Token': this.accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error[0]?.message || 'BigCommerce API request failed');
    }

    return await response.json();
  }
}

export default BigCommerceAdapter;
