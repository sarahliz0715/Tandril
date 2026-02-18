/**
 * WooCommerce Platform Adapter
 *
 * Integrates with WooCommerce REST API (WordPress e-commerce plugin)
 * Handles products, orders, inventory, and customers
 *
 * API Documentation: https://woocommerce.github.io/woocommerce-rest-api-docs/
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

export class WooCommerceAdapter extends PlatformAdapter {
  constructor(credentials) {
    super(credentials);
    this.platformType = PlatformType.WOOCOMMERCE;
    this.platformName = 'WooCommerce';

    // WooCommerce uses the store URL as base
    this.storeUrl = credentials.store_url; // e.g., https://example.com
    this.consumerKey = credentials.consumer_key;
    this.consumerSecret = credentials.consumer_secret;
    this.apiVersion = 'wc/v3';
    this.apiBaseUrl = `${this.storeUrl}/wp-json/${this.apiVersion}`;
  }

  // ==========================================
  // CONNECTION & AUTHENTICATION
  // ==========================================

  async testConnection() {
    try {
      // Test by fetching system status
      const response = await this.makeRequest('/system_status');
      return {
        success: true,
        message: `Successfully connected to ${response.environment?.site_url || 'WooCommerce store'}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  async getAuthUrl() {
    // WooCommerce uses OAuth 1.0a for authentication
    // For simplicity, most integrations use API keys directly
    return `${this.storeUrl}/wc-auth/v1/authorize` +
      `?app_name=Tandril` +
      `&scope=read_write` +
      `&user_id=${this.credentials.user_id || 'tandril'}` +
      `&return_url=${encodeURIComponent(this.credentials.redirect_uri)}` +
      `&callback_url=${encodeURIComponent(this.credentials.callback_uri)}`;
  }

  async exchangeCodeForToken(code) {
    // WooCommerce provides keys directly via OAuth callback
    // No token exchange needed - keys are provided in callback
    return {
      consumer_key: this.consumerKey,
      consumer_secret: this.consumerSecret
    };
  }

  // ==========================================
  // PRODUCTS
  // ==========================================

  async getProducts(options = {}) {
    const { limit = 100, page = 1, search = null } = options;

    const params = new URLSearchParams({
      per_page: limit.toString(),
      page: page.toString()
    });
    if (search) params.append('search', search);

    const response = await this.makeRequest(`/products?${params}`);
    return response.map(product => this.transformToStandardProduct(product));
  }

  async getProduct(productId) {
    const response = await this.makeRequest(`/products/${productId}`);
    return this.transformToStandardProduct(response);
  }

  async createProduct(product) {
    const wooProduct = this.transformFromStandardProduct(product);
    const response = await this.makeRequest('/products', {
      method: 'POST',
      body: JSON.stringify(wooProduct)
    });
    return this.transformToStandardProduct(response);
  }

  async updateProduct(productId, updates) {
    const response = await this.makeRequest(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return this.transformToStandardProduct(response);
  }

  async deleteProduct(productId) {
    await this.makeRequest(`/products/${productId}`, {
      method: 'DELETE',
      body: JSON.stringify({ force: true }) // Permanently delete
    });
    return true;
  }

  // ==========================================
  // INVENTORY
  // ==========================================

  async getInventory(productIds = []) {
    const inventory = [];

    for (const productId of productIds) {
      const product = await this.makeRequest(`/products/${productId}`);

      if (product.type === 'variable') {
        // Variable product - get all variants
        const variants = await this.makeRequest(`/products/${productId}/variations`);
        variants.forEach(variant => {
          inventory.push({
            platform_id: variant.id.toString(),
            platform: PlatformType.WOOCOMMERCE,
            product_id: productId,
            sku: variant.sku,
            quantity: variant.stock_quantity || 0,
            available_quantity: variant.stock_status === 'instock' ? (variant.stock_quantity || 0) : 0,
            location_name: 'Default',
            updated_at: variant.date_modified || new Date().toISOString()
          });
        });
      } else {
        // Simple product
        inventory.push({
          platform_id: product.id.toString(),
          platform: PlatformType.WOOCOMMERCE,
          sku: product.sku,
          quantity: product.stock_quantity || 0,
          available_quantity: product.stock_status === 'instock' ? (product.stock_quantity || 0) : 0,
          location_name: 'Default',
          updated_at: product.date_modified || new Date().toISOString()
        });
      }
    }

    return inventory;
  }

  async updateInventory(productId, quantity) {
    const response = await this.makeRequest(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({
        stock_quantity: quantity,
        manage_stock: true,
        stock_status: quantity > 0 ? 'instock' : 'outofstock'
      })
    });

    return {
      platform_id: productId,
      quantity,
      updated_at: response.date_modified || new Date().toISOString()
    };
  }

  // ==========================================
  // ORDERS
  // ==========================================

  async getOrders(options = {}) {
    const {
      after = null,
      before = null,
      status = 'any',
      limit = 100,
      page = 1
    } = options;

    const params = new URLSearchParams({
      per_page: limit.toString(),
      page: page.toString(),
      status
    });

    if (after) params.append('after', new Date(after).toISOString());
    if (before) params.append('before', new Date(before).toISOString());

    const response = await this.makeRequest(`/orders?${params}`);
    return response.map(order => this.transformToStandardOrder(order));
  }

  async getOrder(orderId) {
    const response = await this.makeRequest(`/orders/${orderId}`);
    return this.transformToStandardOrder(response);
  }

  async updateOrderStatus(orderId, status) {
    const wooStatus = this.mapToWooCommerceStatus(status);
    const response = await this.makeRequest(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: wooStatus })
    });
    return this.transformToStandardOrder(response);
  }

  async fulfillOrder(orderId, fulfillment) {
    // Add shipping tracking note
    await this.makeRequest(`/orders/${orderId}/notes`, {
      method: 'POST',
      body: JSON.stringify({
        note: `Shipped via ${fulfillment.carrier}. Tracking: ${fulfillment.tracking_number}`,
        customer_note: true
      })
    });

    // Update order status to completed
    const response = await this.makeRequest(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed' })
    });

    return this.transformToStandardOrder(response);
  }

  // ==========================================
  // CUSTOMERS
  // ==========================================

  async getCustomers(options = {}) {
    const { limit = 100, page = 1, search = null } = options;

    const params = new URLSearchParams({
      per_page: limit.toString(),
      page: page.toString()
    });
    if (search) params.append('search', search);

    const response = await this.makeRequest(`/customers?${params}`);
    return response.map(customer => this.transformToStandardCustomer(customer));
  }

  async getCustomer(customerId) {
    const response = await this.makeRequest(`/customers/${customerId}`);
    return this.transformToStandardCustomer(response);
  }

  // ==========================================
  // WEBHOOKS
  // ==========================================

  async registerWebhook(topic, webhookUrl) {
    const response = await this.makeRequest('/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        name: `Tandril - ${topic}`,
        topic: topic,
        delivery_url: webhookUrl,
        secret: this.consumerSecret
      })
    });

    return response;
  }

  async unregisterWebhook(webhookId) {
    await this.makeRequest(`/webhooks/${webhookId}`, {
      method: 'DELETE',
      body: JSON.stringify({ force: true })
    });
    return true;
  }

  verifyWebhookSignature(payload, signature) {
    // WooCommerce uses HMAC-SHA256
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', this.consumerSecret)
      .update(JSON.stringify(payload))
      .digest('base64');

    return hash === signature;
  }

  // ==========================================
  // TRANSFORMATION METHODS
  // ==========================================

  transformToStandardProduct(wooProduct) {
    return new StandardProduct({
      platform_id: wooProduct.id.toString(),
      platform: PlatformType.WOOCOMMERCE,
      sku: wooProduct.sku,
      title: wooProduct.name,
      description: wooProduct.description || wooProduct.short_description,
      vendor: '', // WooCommerce doesn't have vendor by default
      product_type: wooProduct.type,
      tags: wooProduct.tags?.map(tag => tag.name) || [],
      price: parseFloat(wooProduct.price || 0),
      compare_at_price: wooProduct.regular_price ? parseFloat(wooProduct.regular_price) : null,
      currency: 'USD', // Would need to fetch from store settings
      inventory_quantity: wooProduct.stock_quantity || 0,
      inventory_tracked: wooProduct.manage_stock || false,
      has_variants: wooProduct.type === 'variable',
      images: wooProduct.images?.map(img => img.src) || [],
      featured_image: wooProduct.images?.[0]?.src || null,
      status: wooProduct.status === 'publish' ? 'active' : 'draft',
      created_at: wooProduct.date_created || new Date().toISOString(),
      updated_at: wooProduct.date_modified || new Date().toISOString(),
      platform_url: wooProduct.permalink,
      metafields: {
        categories: wooProduct.categories?.map(cat => cat.name) || [],
        weight: wooProduct.weight,
        dimensions: wooProduct.dimensions
      }
    });
  }

  transformFromStandardProduct(standardProduct) {
    return {
      name: standardProduct.title,
      type: standardProduct.has_variants ? 'variable' : 'simple',
      regular_price: standardProduct.price.toString(),
      description: standardProduct.description,
      short_description: standardProduct.description?.substring(0, 200),
      sku: standardProduct.sku,
      manage_stock: standardProduct.inventory_tracked,
      stock_quantity: standardProduct.inventory_quantity,
      stock_status: standardProduct.inventory_quantity > 0 ? 'instock' : 'outofstock',
      images: standardProduct.images.map((url, index) => ({
        src: url,
        position: index
      })),
      tags: standardProduct.tags.map(tag => ({ name: tag })),
      status: standardProduct.status === 'active' ? 'publish' : 'draft'
    };
  }

  transformToStandardOrder(wooOrder) {
    const lineItems = wooOrder.line_items.map(item => new StandardLineItem({
      platform_id: item.id.toString(),
      product_id: item.product_id.toString(),
      variant_id: item.variation_id ? item.variation_id.toString() : null,
      sku: item.sku,
      title: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price),
      total_price: parseFloat(item.total),
      tax: parseFloat(item.total_tax || 0)
    }));

    return new StandardOrder({
      platform_id: wooOrder.id.toString(),
      platform: PlatformType.WOOCOMMERCE,
      order_number: wooOrder.number,
      customer_id: wooOrder.customer_id?.toString() || null,
      customer_email: wooOrder.billing.email,
      customer_name: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`.trim(),
      customer_phone: wooOrder.billing.phone,
      line_items: lineItems,
      total_price: parseFloat(wooOrder.total),
      subtotal_price: parseFloat(wooOrder.total) - parseFloat(wooOrder.total_tax) - parseFloat(wooOrder.shipping_total),
      total_tax: parseFloat(wooOrder.total_tax),
      total_shipping: parseFloat(wooOrder.shipping_total),
      total_discounts: parseFloat(wooOrder.discount_total || 0),
      currency: wooOrder.currency,
      financial_status: this.mapWooCommercePaymentStatus(wooOrder.status),
      fulfillment_status: this.mapWooCommerceFulfillmentStatus(wooOrder.status),
      shipping_address: {
        first_name: wooOrder.shipping.first_name,
        last_name: wooOrder.shipping.last_name,
        company: wooOrder.shipping.company,
        address1: wooOrder.shipping.address_1,
        address2: wooOrder.shipping.address_2,
        city: wooOrder.shipping.city,
        province: wooOrder.shipping.state,
        country: wooOrder.shipping.country,
        zip: wooOrder.shipping.postcode
      },
      billing_address: {
        first_name: wooOrder.billing.first_name,
        last_name: wooOrder.billing.last_name,
        company: wooOrder.billing.company,
        address1: wooOrder.billing.address_1,
        address2: wooOrder.billing.address_2,
        city: wooOrder.billing.city,
        province: wooOrder.billing.state,
        country: wooOrder.billing.country,
        zip: wooOrder.billing.postcode,
        phone: wooOrder.billing.phone
      },
      created_at: wooOrder.date_created || new Date().toISOString(),
      updated_at: wooOrder.date_modified || new Date().toISOString(),
      platform_url: `${this.storeUrl}/wp-admin/post.php?post=${wooOrder.id}&action=edit`,
      notes: wooOrder.customer_note || ''
    });
  }

  transformToStandardCustomer(wooCustomer) {
    return new StandardCustomer({
      platform_id: wooCustomer.id.toString(),
      platform: PlatformType.WOOCOMMERCE,
      email: wooCustomer.email,
      first_name: wooCustomer.first_name,
      last_name: wooCustomer.last_name,
      phone: wooCustomer.billing?.phone || null,
      orders_count: wooCustomer.orders_count || 0,
      total_spent: parseFloat(wooCustomer.total_spent || 0),
      average_order_value: wooCustomer.orders_count > 0
        ? parseFloat(wooCustomer.total_spent || 0) / wooCustomer.orders_count
        : 0,
      default_address: wooCustomer.billing ? {
        first_name: wooCustomer.billing.first_name,
        last_name: wooCustomer.billing.last_name,
        address1: wooCustomer.billing.address_1,
        address2: wooCustomer.billing.address_2,
        city: wooCustomer.billing.city,
        province: wooCustomer.billing.state,
        country: wooCustomer.billing.country,
        zip: wooCustomer.billing.postcode
      } : {},
      created_at: wooCustomer.date_created || new Date().toISOString(),
      updated_at: wooCustomer.date_modified || new Date().toISOString()
    });
  }

  mapToWooCommerceStatus(standardStatus) {
    const statusMap = {
      'pending': 'pending',
      'paid': 'processing',
      'fulfilled': 'completed',
      'cancelled': 'cancelled',
      'refunded': 'refunded'
    };
    return statusMap[standardStatus] || 'pending';
  }

  mapWooCommercePaymentStatus(wooStatus) {
    const paymentMap = {
      'pending': 'pending',
      'processing': 'paid',
      'on-hold': 'pending',
      'completed': 'paid',
      'cancelled': 'pending',
      'refunded': 'refunded',
      'failed': 'pending'
    };
    return paymentMap[wooStatus] || 'pending';
  }

  mapWooCommerceFulfillmentStatus(wooStatus) {
    const fulfillmentMap = {
      'pending': 'unfulfilled',
      'processing': 'unfulfilled',
      'on-hold': 'unfulfilled',
      'completed': 'fulfilled',
      'cancelled': 'unfulfilled',
      'refunded': 'unfulfilled',
      'failed': 'unfulfilled'
    };
    return fulfillmentMap[wooStatus] || 'unfulfilled';
  }

  // ==========================================
  // API REQUEST HELPER
  // ==========================================

  async makeRequest(endpoint, options = {}) {
    const url = `${this.apiBaseUrl}${endpoint}`;

    // WooCommerce uses Basic Auth with consumer key and secret
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'WooCommerce API request failed');
    }

    return await response.json();
  }
}

export default WooCommerceAdapter;
