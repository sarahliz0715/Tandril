/**
 * Platform Adapter Base Class
 *
 * All e-commerce platform integrations must extend this class
 * and implement its methods to ensure consistent data structure
 * across all platforms (Shopify, Amazon, WooCommerce, etc.)
 */

export const PlatformType = {
  SHOPIFY: 'shopify',
  AMAZON: 'amazon',
  WOOCOMMERCE: 'woocommerce',
  BIGCOMMERCE: 'bigcommerce',
  ETSY: 'etsy',
  EBAY: 'ebay',
  FAIRE: 'faire'
};

export const PlatformStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  PENDING: 'pending'
};

/**
 * Base Platform Adapter
 * All platform integrations extend this class
 */
export class PlatformAdapter {
  constructor(credentials) {
    this.credentials = credentials;
    this.platformType = null; // Set by subclass
    this.platformName = null; // Set by subclass
  }

  // ==========================================
  // CONNECTION & AUTHENTICATION
  // ==========================================

  /**
   * Test connection to platform
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by subclass');
  }

  /**
   * Get OAuth authorization URL
   * @returns {Promise<string>}
   */
  async getAuthUrl() {
    throw new Error('getAuthUrl() must be implemented by subclass');
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code
   * @returns {Promise<object>} - Access token and metadata
   */
  async exchangeCodeForToken(code) {
    throw new Error('exchangeCodeForToken() must be implemented by subclass');
  }

  // ==========================================
  // PRODUCTS
  // ==========================================

  /**
   * Get all products from platform
   * @param {object} options - Pagination and filters
   * @returns {Promise<Array<StandardProduct>>}
   */
  async getProducts(options = {}) {
    throw new Error('getProducts() must be implemented by subclass');
  }

  /**
   * Get single product by platform ID
   * @param {string} productId - Platform's product ID
   * @returns {Promise<StandardProduct>}
   */
  async getProduct(productId) {
    throw new Error('getProduct() must be implemented by subclass');
  }

  /**
   * Create new product on platform
   * @param {StandardProduct} product - Product data
   * @returns {Promise<StandardProduct>}
   */
  async createProduct(product) {
    throw new Error('createProduct() must be implemented by subclass');
  }

  /**
   * Update existing product
   * @param {string} productId - Platform's product ID
   * @param {object} updates - Fields to update
   * @returns {Promise<StandardProduct>}
   */
  async updateProduct(productId, updates) {
    throw new Error('updateProduct() must be implemented by subclass');
  }

  /**
   * Delete product from platform
   * @param {string} productId - Platform's product ID
   * @returns {Promise<boolean>}
   */
  async deleteProduct(productId) {
    throw new Error('deleteProduct() must be implemented by subclass');
  }

  // ==========================================
  // INVENTORY
  // ==========================================

  /**
   * Get inventory levels for products
   * @param {Array<string>} productIds - Platform product IDs
   * @returns {Promise<Array<StandardInventory>>}
   */
  async getInventory(productIds = []) {
    throw new Error('getInventory() must be implemented by subclass');
  }

  /**
   * Update inventory quantity
   * @param {string} productId - Platform's product ID
   * @param {number} quantity - New quantity
   * @returns {Promise<StandardInventory>}
   */
  async updateInventory(productId, quantity) {
    throw new Error('updateInventory() must be implemented by subclass');
  }

  // ==========================================
  // ORDERS
  // ==========================================

  /**
   * Get all orders from platform
   * @param {object} options - Date range, status filters, pagination
   * @returns {Promise<Array<StandardOrder>>}
   */
  async getOrders(options = {}) {
    throw new Error('getOrders() must be implemented by subclass');
  }

  /**
   * Get single order by platform ID
   * @param {string} orderId - Platform's order ID
   * @returns {Promise<StandardOrder>}
   */
  async getOrder(orderId) {
    throw new Error('getOrder() must be implemented by subclass');
  }

  /**
   * Update order status
   * @param {string} orderId - Platform's order ID
   * @param {string} status - New status
   * @returns {Promise<StandardOrder>}
   */
  async updateOrderStatus(orderId, status) {
    throw new Error('updateOrderStatus() must be implemented by subclass');
  }

  /**
   * Fulfill order (mark as shipped)
   * @param {string} orderId - Platform's order ID
   * @param {object} fulfillment - Tracking info
   * @returns {Promise<StandardOrder>}
   */
  async fulfillOrder(orderId, fulfillment) {
    throw new Error('fulfillOrder() must be implemented by subclass');
  }

  // ==========================================
  // CUSTOMERS
  // ==========================================

  /**
   * Get all customers from platform
   * @param {object} options - Pagination and filters
   * @returns {Promise<Array<StandardCustomer>>}
   */
  async getCustomers(options = {}) {
    throw new Error('getCustomers() must be implemented by subclass');
  }

  /**
   * Get single customer by platform ID
   * @param {string} customerId - Platform's customer ID
   * @returns {Promise<StandardCustomer>}
   */
  async getCustomer(customerId) {
    throw new Error('getCustomer() must be implemented by subclass');
  }

  // ==========================================
  // WEBHOOKS
  // ==========================================

  /**
   * Register webhook for platform events
   * @param {string} topic - Event type (order.created, product.updated, etc.)
   * @param {string} webhookUrl - URL to receive webhook
   * @returns {Promise<object>}
   */
  async registerWebhook(topic, webhookUrl) {
    throw new Error('registerWebhook() must be implemented by subclass');
  }

  /**
   * Unregister webhook
   * @param {string} webhookId - Platform's webhook ID
   * @returns {Promise<boolean>}
   */
  async unregisterWebhook(webhookId) {
    throw new Error('unregisterWebhook() must be implemented by subclass');
  }

  /**
   * Verify webhook signature
   * @param {object} payload - Webhook payload
   * @param {string} signature - Webhook signature header
   * @returns {boolean}
   */
  verifyWebhookSignature(payload, signature) {
    throw new Error('verifyWebhookSignature() must be implemented by subclass');
  }

  // ==========================================
  // ANALYTICS
  // ==========================================

  /**
   * Get sales analytics for date range
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Promise<object>}
   */
  async getAnalytics(startDate, endDate) {
    // Optional - return null if not supported
    return null;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Transform platform-specific product to standard format
   * @param {object} platformProduct - Product in platform's format
   * @returns {StandardProduct}
   */
  transformToStandardProduct(platformProduct) {
    throw new Error('transformToStandardProduct() must be implemented by subclass');
  }

  /**
   * Transform standard product to platform-specific format
   * @param {StandardProduct} standardProduct
   * @returns {object} - Product in platform's format
   */
  transformFromStandardProduct(standardProduct) {
    throw new Error('transformFromStandardProduct() must be implemented by subclass');
  }

  /**
   * Transform platform-specific order to standard format
   * @param {object} platformOrder - Order in platform's format
   * @returns {StandardOrder}
   */
  transformToStandardOrder(platformOrder) {
    throw new Error('transformToStandardOrder() must be implemented by subclass');
  }

  /**
   * Handle API rate limiting
   * @param {Function} apiCall - Function that makes API call
   * @returns {Promise<any>}
   */
  async handleRateLimit(apiCall) {
    // Default implementation - subclasses can override
    try {
      return await apiCall();
    } catch (error) {
      if (error.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = error.headers?.['retry-after'] || 1;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return await apiCall();
      }
      throw error;
    }
  }
}

// Export for use in other files
export default PlatformAdapter;
