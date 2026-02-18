/**
 * Standard Data Models
 *
 * These are the unified data structures that all platforms
 * must transform their data into. This ensures consistency
 * across Shopify, Amazon, WooCommerce, BigCommerce, etc.
 */

/**
 * Standard Product Model
 * All platforms transform their products into this format
 */
export class StandardProduct {
  constructor(data = {}) {
    this.id = data.id || null;                    // Tandril's internal ID
    this.platform_id = data.platform_id || null;  // Platform's product ID
    this.platform = data.platform || null;        // 'shopify', 'amazon', etc.
    this.sku = data.sku || null;
    this.title = data.title || '';
    this.description = data.description || '';
    this.vendor = data.vendor || '';
    this.product_type = data.product_type || '';
    this.tags = data.tags || [];

    // Pricing
    this.price = data.price || 0;
    this.compare_at_price = data.compare_at_price || null;
    this.cost_per_item = data.cost_per_item || null;
    this.currency = data.currency || 'USD';

    // Inventory
    this.inventory_quantity = data.inventory_quantity || 0;
    this.inventory_tracked = data.inventory_tracked !== false;
    this.low_stock_threshold = data.low_stock_threshold || 10;

    // Variants
    this.has_variants = data.has_variants || false;
    this.variants = data.variants || [];

    // Images
    this.images = data.images || [];
    this.featured_image = data.featured_image || null;

    // Status
    this.status = data.status || 'draft'; // 'active', 'draft', 'archived'
    this.published_at = data.published_at || null;

    // SEO
    this.seo_title = data.seo_title || null;
    this.seo_description = data.seo_description || null;

    // Metadata
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
    this.platform_url = data.platform_url || null;
    this.metafields = data.metafields || {};
  }

  /**
   * Calculate profit margin
   */
  getProfitMargin() {
    if (!this.cost_per_item || !this.price) return 0;
    return ((this.price - this.cost_per_item) / this.price) * 100;
  }

  /**
   * Check if product is low stock
   */
  isLowStock() {
    return this.inventory_quantity <= this.low_stock_threshold;
  }

  /**
   * Check if product is out of stock
   */
  isOutOfStock() {
    return this.inventory_quantity === 0;
  }
}

/**
 * Standard Product Variant Model
 */
export class StandardVariant {
  constructor(data = {}) {
    this.id = data.id || null;
    this.platform_id = data.platform_id || null;
    this.product_id = data.product_id || null;
    this.sku = data.sku || null;
    this.title = data.title || '';
    this.price = data.price || 0;
    this.compare_at_price = data.compare_at_price || null;
    this.inventory_quantity = data.inventory_quantity || 0;
    this.weight = data.weight || null;
    this.weight_unit = data.weight_unit || 'lb';
    this.options = data.options || {}; // { size: 'Large', color: 'Blue' }
    this.image = data.image || null;
    this.barcode = data.barcode || null;
  }
}

/**
 * Standard Order Model
 */
export class StandardOrder {
  constructor(data = {}) {
    this.id = data.id || null;
    this.platform_id = data.platform_id || null;
    this.platform = data.platform || null;
    this.order_number = data.order_number || '';

    // Customer
    this.customer_id = data.customer_id || null;
    this.customer_email = data.customer_email || '';
    this.customer_name = data.customer_name || '';
    this.customer_phone = data.customer_phone || null;

    // Order Details
    this.line_items = data.line_items || [];
    this.total_price = data.total_price || 0;
    this.subtotal_price = data.subtotal_price || 0;
    this.total_tax = data.total_tax || 0;
    this.total_shipping = data.total_shipping || 0;
    this.total_discounts = data.total_discounts || 0;
    this.currency = data.currency || 'USD';

    // Status
    this.financial_status = data.financial_status || 'pending'; // pending, paid, refunded
    this.fulfillment_status = data.fulfillment_status || 'unfulfilled'; // unfulfilled, fulfilled, partial
    this.cancelled_at = data.cancelled_at || null;
    this.cancel_reason = data.cancel_reason || null;

    // Addresses
    this.shipping_address = data.shipping_address || {};
    this.billing_address = data.billing_address || {};

    // Fulfillment
    this.tracking_number = data.tracking_number || null;
    this.tracking_url = data.tracking_url || null;
    this.carrier = data.carrier || null;

    // Metadata
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
    this.processed_at = data.processed_at || null;
    this.fulfilled_at = data.fulfilled_at || null;
    this.platform_url = data.platform_url || null;
    this.notes = data.notes || '';
    this.tags = data.tags || [];
  }

  /**
   * Check if order is paid
   */
  isPaid() {
    return this.financial_status === 'paid';
  }

  /**
   * Check if order is fulfilled
   */
  isFulfilled() {
    return this.fulfillment_status === 'fulfilled';
  }

  /**
   * Calculate order profit (requires cost data)
   */
  calculateProfit(productCosts = {}) {
    let totalCost = 0;
    this.line_items.forEach(item => {
      const cost = productCosts[item.sku] || 0;
      totalCost += cost * item.quantity;
    });
    return this.total_price - totalCost - this.total_shipping;
  }
}

/**
 * Standard Order Line Item
 */
export class StandardLineItem {
  constructor(data = {}) {
    this.id = data.id || null;
    this.platform_id = data.platform_id || null;
    this.product_id = data.product_id || null;
    this.variant_id = data.variant_id || null;
    this.sku = data.sku || null;
    this.title = data.title || '';
    this.variant_title = data.variant_title || null;
    this.quantity = data.quantity || 1;
    this.price = data.price || 0;
    this.total_price = data.total_price || 0;
    this.tax = data.tax || 0;
    this.discount = data.discount || 0;
    this.fulfillment_status = data.fulfillment_status || 'unfulfilled';
  }
}

/**
 * Standard Customer Model
 */
export class StandardCustomer {
  constructor(data = {}) {
    this.id = data.id || null;
    this.platform_id = data.platform_id || null;
    this.platform = data.platform || null;
    this.email = data.email || '';
    this.first_name = data.first_name || '';
    this.last_name = data.last_name || '';
    this.phone = data.phone || null;

    // Statistics
    this.orders_count = data.orders_count || 0;
    this.total_spent = data.total_spent || 0;
    this.average_order_value = data.average_order_value || 0;

    // Addresses
    this.default_address = data.default_address || {};
    this.addresses = data.addresses || [];

    // Marketing
    this.accepts_marketing = data.accepts_marketing || false;
    this.marketing_opt_in_level = data.marketing_opt_in_level || null;

    // Status
    this.state = data.state || 'enabled'; // enabled, disabled, invited
    this.verified_email = data.verified_email || false;

    // Metadata
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
    this.last_order_date = data.last_order_date || null;
    this.tags = data.tags || [];
    this.notes = data.notes || '';
  }

  /**
   * Get customer lifetime value
   */
  getLifetimeValue() {
    return this.total_spent;
  }

  /**
   * Get customer segment
   */
  getSegment() {
    if (this.total_spent >= 1000) return 'VIP';
    if (this.total_spent >= 500) return 'High Value';
    if (this.total_spent >= 100) return 'Regular';
    return 'New';
  }
}

/**
 * Standard Inventory Model
 */
export class StandardInventory {
  constructor(data = {}) {
    this.id = data.id || null;
    this.platform_id = data.platform_id || null;
    this.platform = data.platform || null;
    this.product_id = data.product_id || null;
    this.variant_id = data.variant_id || null;
    this.sku = data.sku || null;
    this.quantity = data.quantity || 0;
    this.location_id = data.location_id || null;
    this.location_name = data.location_name || 'Default';
    this.reserved_quantity = data.reserved_quantity || 0; // Orders not yet fulfilled
    this.available_quantity = data.available_quantity || 0; // Can be sold
    this.incoming_quantity = data.incoming_quantity || 0; // Purchase orders
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  /**
   * Calculate sellable quantity
   */
  getSellableQuantity() {
    return Math.max(0, this.quantity - this.reserved_quantity);
  }

  /**
   * Check if needs reorder
   */
  needsReorder(threshold = 10) {
    return this.getSellableQuantity() <= threshold;
  }
}

/**
 * Standard Address Model
 */
export class StandardAddress {
  constructor(data = {}) {
    this.first_name = data.first_name || '';
    this.last_name = data.last_name || '';
    this.company = data.company || null;
    this.address1 = data.address1 || '';
    this.address2 = data.address2 || null;
    this.city = data.city || '';
    this.province = data.province || ''; // State/Province
    this.province_code = data.province_code || null;
    this.country = data.country || '';
    this.country_code = data.country_code || '';
    this.zip = data.zip || '';
    this.phone = data.phone || null;
  }

  /**
   * Format address as string
   */
  toString() {
    const parts = [
      this.address1,
      this.address2,
      `${this.city}, ${this.province_code} ${this.zip}`,
      this.country
    ].filter(Boolean);
    return parts.join(', ');
  }
}

/**
 * Standard Webhook Event Model
 */
export class StandardWebhookEvent {
  constructor(data = {}) {
    this.id = data.id || null;
    this.platform = data.platform || null;
    this.topic = data.topic || ''; // 'order.created', 'product.updated', etc.
    this.resource_id = data.resource_id || null;
    this.resource_type = data.resource_type || null; // 'order', 'product', etc.
    this.payload = data.payload || {};
    this.received_at = data.received_at || new Date().toISOString();
    this.processed_at = data.processed_at || null;
    this.status = data.status || 'pending'; // pending, processed, failed
    this.error = data.error || null;
  }
}

// Export all models
export default {
  StandardProduct,
  StandardVariant,
  StandardOrder,
  StandardLineItem,
  StandardCustomer,
  StandardInventory,
  StandardAddress,
  StandardWebhookEvent
};
