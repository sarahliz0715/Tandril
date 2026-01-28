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
 * Faire Wholesale Platform Adapter
 *
 * Faire is a wholesale marketplace connecting brands/makers with retailers.
 * Unlike retail platforms, Faire focuses on bulk ordering with wholesale pricing.
 *
 * API Documentation: https://faire.github.io/external-api-docs/
 *
 * Authentication: API Token-based (X-FAIRE-ACCESS-TOKEN header)
 * Base URL: https://www.faire.com/api/v2
 *
 * Key Features:
 * - Wholesale pricing tiers
 * - Minimum order quantities (MOQs)
 * - Net payment terms (Net 60, etc.)
 * - Commission-based sales model
 * - Retailer management
 * - Brand/maker features
 *
 * Rate Limits:
 * - 100 requests per 10 seconds per brand
 * - Burst allowance of 200 requests
 */
export class FaireAdapter extends PlatformAdapter {
  constructor(credentials) {
    super(credentials);

    this.platformType = PlatformType.FAIRE;
    this.platformName = 'Faire Wholesale';
    this.apiBaseUrl = 'https://www.faire.com/api/v2';
    this.apiToken = credentials.api_token;
    this.brandToken = credentials.brand_token; // Brand identifier

    // Faire uses milliseconds for rate limiting
    this.rateLimitDelay = 100; // 100ms between requests = 10 requests/second
  }

  /**
   * Make authenticated API request to Faire
   */
  async makeRequest(endpoint, options = {}) {
    await this.waitForRateLimit();

    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers = {
      'X-FAIRE-ACCESS-TOKEN': this.apiToken,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Faire API Error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Faire API request failed:', error);
      throw error;
    }
  }

  /**
   * Test connection to Faire API
   */
  async testConnection() {
    try {
      const response = await this.makeRequest('/brands/me');
      return {
        success: true,
        data: {
          brand_name: response.name,
          brand_id: response.token,
          email: response.email,
          state: response.state // ACTIVE, PENDING, etc.
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
   * Get OAuth authorization URL (Faire uses OAuth 2.0)
   */
  async getAuthUrl(callbackUrl, state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.credentials.client_id || 'YOUR_CLIENT_ID',
      redirect_uri: callbackUrl,
      state: state,
      scope: 'READ_PRODUCTS WRITE_PRODUCTS READ_ORDERS WRITE_ORDERS'
    });

    return `https://www.faire.com/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code, callbackUrl) {
    const tokenUrl = 'https://www.faire.com/oauth2/token';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret,
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
      expires_in: data.expires_in,
      brand_token: data.brand_token
    };
  }

  /**
   * Get products from Faire
   * Faire products are wholesale items with MOQs and tiered pricing
   */
  async getProducts(options = {}) {
    const {
      limit = 50,
      page = 1,
      state = 'ACTIVE', // ACTIVE, INACTIVE, FOR_SALE
      search = null
    } = options;

    const params = new URLSearchParams({
      limit: limit.toString(),
      page: page.toString()
    });

    if (state) params.append('state', state);
    if (search) params.append('query', search);

    const response = await this.makeRequest(`/products?${params.toString()}`);

    return {
      products: response.products.map(p => this.transformToStandardProduct(p)),
      pagination: {
        current_page: response.page,
        total_pages: Math.ceil(response.total / limit),
        total_items: response.total
      }
    };
  }

  /**
   * Get single product by ID
   */
  async getProduct(productId) {
    const response = await this.makeRequest(`/products/${productId}`);
    return this.transformToStandardProduct(response);
  }

  /**
   * Create new product on Faire
   */
  async createProduct(product) {
    const faireProduct = this.transformFromStandardProduct(product);

    const response = await this.makeRequest('/products', {
      method: 'POST',
      body: JSON.stringify(faireProduct)
    });

    return this.transformToStandardProduct(response);
  }

  /**
   * Update existing product
   */
  async updateProduct(productId, updates) {
    const faireUpdates = this.transformFromStandardProduct(updates);

    const response = await this.makeRequest(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(faireUpdates)
    });

    return this.transformToStandardProduct(response);
  }

  /**
   * Delete product (set to INACTIVE)
   */
  async deleteProduct(productId) {
    await this.makeRequest(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'INACTIVE' })
    });

    return { success: true };
  }

  /**
   * Get inventory levels for products
   */
  async getInventory(productTokens = []) {
    // Faire tracks inventory per product option (variant)
    const inventoryData = [];

    for (const token of productTokens) {
      const product = await this.makeRequest(`/products/${token}`);

      for (const option of product.options || []) {
        inventoryData.push(new StandardInventory({
          platform_id: option.token,
          product_platform_id: token,
          sku: option.sku,
          quantity: option.available_quantity || 0,
          available_quantity: option.available_quantity || 0,
          reserved_quantity: 0, // Faire doesn't expose reserved quantity
          platform: PlatformType.FAIRE,
          location: 'Faire Warehouse'
        }));
      }
    }

    return inventoryData;
  }

  /**
   * Update inventory for a product option
   */
  async updateInventory(productId, quantity, optionId = null) {
    // If optionId provided, update specific variant
    // Otherwise update the default option

    const endpoint = optionId
      ? `/products/${productId}/options/${optionId}`
      : `/products/${productId}`;

    const response = await this.makeRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({
        available_quantity: quantity
      })
    });

    return {
      success: true,
      new_quantity: quantity
    };
  }

  /**
   * Get orders from Faire (wholesale orders from retailers)
   */
  async getOrders(options = {}) {
    const {
      limit = 50,
      page = 1,
      state = null, // NEW, PROCESSING, PRE_TRANSIT, IN_TRANSIT, DELIVERED, CANCELLED
      since = null // ISO 8601 date
    } = options;

    const params = new URLSearchParams({
      limit: limit.toString(),
      page: page.toString()
    });

    if (state) params.append('state', state);
    if (since) params.append('updated_at_min', since);

    const response = await this.makeRequest(`/orders?${params.toString()}`);

    return {
      orders: response.orders.map(o => this.transformToStandardOrder(o)),
      pagination: {
        current_page: response.page,
        total_pages: Math.ceil(response.total / limit),
        total_items: response.total
      }
    };
  }

  /**
   * Get single order by ID
   */
  async getOrder(orderId) {
    const response = await this.makeRequest(`/orders/${orderId}`);
    return this.transformToStandardOrder(response);
  }

  /**
   * Update order (mark as processing, shipped, etc.)
   */
  async updateOrder(orderId, updates) {
    const response = await this.makeRequest(`/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });

    return this.transformToStandardOrder(response);
  }

  /**
   * Fulfill order (mark as shipped with tracking)
   */
  async fulfillOrder(orderId, fulfillment) {
    const { tracking_number, carrier } = fulfillment;

    const response = await this.makeRequest(`/orders/${orderId}/processing-complete`, {
      method: 'POST',
      body: JSON.stringify({
        shipments: [{
          carrier_name: carrier || 'OTHER',
          tracking_code: tracking_number
        }]
      })
    });

    return {
      success: true,
      order: this.transformToStandardOrder(response)
    };
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, reason = '') {
    const response = await this.makeRequest(`/orders/${orderId}/items/availability`, {
      method: 'PUT',
      body: JSON.stringify({
        items: [], // Empty items array cancels the order
        reason: reason
      })
    });

    return { success: true };
  }

  /**
   * Get retailers (customers on Faire are retailers buying wholesale)
   */
  async getCustomers(options = {}) {
    // Faire doesn't have a direct "customers" endpoint
    // Retailers are inferred from orders
    // We'll return unique retailers from recent orders

    const ordersResponse = await this.getOrders({ limit: 100 });
    const uniqueRetailers = new Map();

    for (const order of ordersResponse.orders) {
      if (order.customer && !uniqueRetailers.has(order.customer.platform_id)) {
        uniqueRetailers.set(order.customer.platform_id, order.customer);
      }
    }

    return Array.from(uniqueRetailers.values());
  }

  /**
   * Get specific retailer by ID
   */
  async getCustomer(retailerId) {
    // Faire API doesn't provide direct retailer lookup
    // Would need to search through orders
    const orders = await this.getOrders({ limit: 100 });
    const order = orders.orders.find(o => o.customer?.platform_id === retailerId);

    if (order) {
      return order.customer;
    }

    throw new Error(`Retailer ${retailerId} not found`);
  }

  /**
   * Register webhook for events
   * Faire supports webhooks for: orders, products, inventory
   */
  async registerWebhook(topic, webhookUrl) {
    // Faire webhook topics:
    // - order.created
    // - order.updated
    // - product.created
    // - product.updated
    // - inventory.updated

    const response = await this.makeRequest('/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        url: webhookUrl,
        event: topic,
        active: true
      })
    });

    return {
      webhook_id: response.token,
      topic: topic,
      url: webhookUrl
    };
  }

  /**
   * List all registered webhooks
   */
  async listWebhooks() {
    const response = await this.makeRequest('/webhooks');

    return response.webhooks.map(wh => ({
      webhook_id: wh.token,
      topic: wh.event,
      url: wh.url,
      active: wh.active
    }));
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId) {
    await this.makeRequest(`/webhooks/${webhookId}`, {
      method: 'DELETE'
    });

    return { success: true };
  }

  /**
   * Verify webhook signature
   * Faire uses HMAC-SHA256 with webhook secret
   */
  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');

    const webhookSecret = this.credentials.webhook_secret;
    if (!webhookSecret) {
      console.warn('Webhook secret not configured');
      return false;
    }

    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(JSON.stringify(payload));
    const computedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  }

  /**
   * Process webhook event
   */
  async processWebhook(payload, signature) {
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const event = new StandardWebhookEvent({
      platform: PlatformType.FAIRE,
      event_type: payload.type,
      event_id: payload.id,
      created_at: payload.created_at,
      data: payload.data
    });

    return event;
  }

  /**
   * Transform Faire product to StandardProduct
   */
  transformToStandardProduct(faireProduct) {
    // Faire products have "options" which are like variants
    const variants = (faireProduct.options || []).map(option =>
      new StandardVariant({
        platform_id: option.token,
        sku: option.sku,
        title: option.name,
        price: option.wholesale_price_cents / 100, // Convert cents to dollars
        compare_at_price: option.retail_price_cents / 100,
        inventory_quantity: option.available_quantity || 0,
        weight: option.weight_grams,
        weight_unit: 'g',
        option_values: {
          size: option.size,
          color: option.color
        }
      })
    );

    return new StandardProduct({
      platform_id: faireProduct.token,
      platform: PlatformType.FAIRE,
      sku: faireProduct.sku,
      title: faireProduct.name,
      description: faireProduct.description_html,
      vendor: faireProduct.brand_name,
      product_type: faireProduct.taxonomy_type?.name,
      tags: faireProduct.tags || [],

      // Use first option's pricing as default
      price: faireProduct.options?.[0]?.wholesale_price_cents / 100 || 0,
      compare_at_price: faireProduct.options?.[0]?.retail_price_cents / 100 || 0,
      cost_per_item: faireProduct.options?.[0]?.wholesale_price_cents / 100 || 0,

      inventory_quantity: faireProduct.options?.reduce((sum, opt) =>
        sum + (opt.available_quantity || 0), 0) || 0,

      images: (faireProduct.images || []).map(img => img.url),

      variants: variants,

      platform_url: `https://www.faire.com/product/${faireProduct.token}`,

      status: faireProduct.state === 'ACTIVE' ? 'active' : 'draft',

      metafields: {
        minimum_order_quantity: faireProduct.minimum_order_quantity,
        case_pack_quantity: faireProduct.case_pack_quantity,
        made_to_order: faireProduct.made_to_order,
        preorder: faireProduct.preorder,
        ships_from_country: faireProduct.ships_from_country_code,
        lead_time_days: faireProduct.lead_time_days,
        brand_token: faireProduct.brand_token
      },

      created_at: faireProduct.created_at,
      updated_at: faireProduct.updated_at
    });
  }

  /**
   * Transform Faire order to StandardOrder
   */
  transformToStandardOrder(faireOrder) {
    const lineItems = (faireOrder.items || []).map(item =>
      new StandardLineItem({
        platform_id: item.token,
        product_platform_id: item.product_token,
        variant_platform_id: item.product_option_token,
        title: item.product_name,
        quantity: item.quantity,
        price: item.price_cents / 100,
        sku: item.sku,
        variant_title: item.product_option_name
      })
    );

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = faireOrder.shipment_fee_cents / 100 || 0;
    const total = subtotal + shipping;

    return new StandardOrder({
      platform_id: faireOrder.token,
      platform: PlatformType.FAIRE,
      order_number: faireOrder.order_number,

      line_items: lineItems,

      total_price: total,
      subtotal_price: subtotal,
      total_tax: 0, // Faire handles tax differently
      total_shipping: shipping,

      financial_status: this.mapFinancialStatus(faireOrder.state),
      fulfillment_status: this.mapFulfillmentStatus(faireOrder.state),

      customer: faireOrder.retailer ? new StandardCustomer({
        platform_id: faireOrder.retailer.token,
        platform: PlatformType.FAIRE,
        email: faireOrder.retailer.email,
        first_name: faireOrder.retailer.first_name,
        last_name: faireOrder.retailer.last_name,
        company: faireOrder.retailer.business_name,
        phone: faireOrder.retailer.phone_number,
        billing_address: {
          address1: faireOrder.address?.address1,
          address2: faireOrder.address?.address2,
          city: faireOrder.address?.city,
          province: faireOrder.address?.state_code,
          country: faireOrder.address?.country_code,
          zip: faireOrder.address?.postal_code
        },
        shipping_address: {
          address1: faireOrder.address?.address1,
          address2: faireOrder.address?.address2,
          city: faireOrder.address?.city,
          province: faireOrder.address?.state_code,
          country: faireOrder.address?.country_code,
          zip: faireOrder.address?.postal_code
        }
      }) : null,

      shipping_address: {
        address1: faireOrder.address?.address1,
        address2: faireOrder.address?.address2,
        city: faireOrder.address?.city,
        province: faireOrder.address?.state_code,
        country: faireOrder.address?.country_code,
        zip: faireOrder.address?.postal_code
      },

      metafields: {
        payment_terms: faireOrder.payment_terms, // NET_60, etc.
        commission_rate: faireOrder.commission_rate,
        payout_date: faireOrder.payout_date,
        is_first_order: faireOrder.retailer?.is_first_order
      },

      created_at: faireOrder.created_at,
      updated_at: faireOrder.updated_at,

      notes: faireOrder.retailer_notes
    });
  }

  /**
   * Map Faire order state to financial status
   */
  mapFinancialStatus(state) {
    const statusMap = {
      'NEW': 'pending',
      'PROCESSING': 'pending',
      'PRE_TRANSIT': 'paid',
      'IN_TRANSIT': 'paid',
      'DELIVERED': 'paid',
      'CANCELLED': 'voided'
    };

    return statusMap[state] || 'pending';
  }

  /**
   * Map Faire order state to fulfillment status
   */
  mapFulfillmentStatus(state) {
    const statusMap = {
      'NEW': 'unfulfilled',
      'PROCESSING': 'partial',
      'PRE_TRANSIT': 'fulfilled',
      'IN_TRANSIT': 'fulfilled',
      'DELIVERED': 'fulfilled',
      'CANCELLED': 'cancelled'
    };

    return statusMap[state] || 'unfulfilled';
  }

  /**
   * Transform StandardProduct to Faire format
   */
  transformFromStandardProduct(standardProduct) {
    const faireProduct = {
      name: standardProduct.title,
      description_html: standardProduct.description,
      sku: standardProduct.sku,
      state: standardProduct.status === 'active' ? 'ACTIVE' : 'INACTIVE',
      taxonomy_type: standardProduct.product_type,
      tags: standardProduct.tags
    };

    // Transform variants to Faire options
    if (standardProduct.variants && standardProduct.variants.length > 0) {
      faireProduct.options = standardProduct.variants.map(variant => ({
        name: variant.title,
        sku: variant.sku,
        wholesale_price_cents: Math.round((variant.price || 0) * 100),
        retail_price_cents: Math.round((variant.compare_at_price || variant.price || 0) * 100),
        available_quantity: variant.inventory_quantity || 0,
        weight_grams: variant.weight || 0
      }));
    } else {
      // Single variant product
      faireProduct.options = [{
        name: 'Default',
        sku: standardProduct.sku,
        wholesale_price_cents: Math.round((standardProduct.price || 0) * 100),
        retail_price_cents: Math.round((standardProduct.compare_at_price || standardProduct.price || 0) * 100),
        available_quantity: standardProduct.inventory_quantity || 0
      }];
    }

    // Add images
    if (standardProduct.images && standardProduct.images.length > 0) {
      faireProduct.images = standardProduct.images.map(url => ({ url }));
    }

    return faireProduct;
  }
}
