/**
 * Shopify Integration Service
 *
 * Handles OAuth authentication, product sync, and real-time webhooks
 * for Shopify stores.
 */

import axios from 'axios';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

export class ShopifyService {
  constructor() {
    this.apiVersion = '2024-01';
    this.scopes = [
      'read_products',
      'write_products',
      'read_inventory',
      'write_inventory',
      'read_orders',
      'read_price_rules',
      'write_price_rules',
    ].join(',');
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(shop, state, redirectUri) {
    const shopDomain = this.normalizeShopDomain(shop);

    const params = new URLSearchParams({
      client_id: process.env.SHOPIFY_API_KEY,
      scope: this.scopes,
      redirect_uri: redirectUri,
      state: state,
    });

    return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(shop, code) {
    const shopDomain = this.normalizeShopDomain(shop);

    try {
      const response = await axios.post(
        `https://${shopDomain}/admin/oauth/access_token`,
        {
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code,
        }
      );

      return response.data.access_token;
    } catch (error) {
      logger.error('Failed to get Shopify access token:', error);
      throw new Error('Failed to authenticate with Shopify');
    }
  }

  /**
   * Verify webhook HMAC signature
   */
  verifyWebhook(data, hmacHeader) {
    const hash = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
      .update(data, 'utf8')
      .digest('base64');

    return hash === hmacHeader;
  }

  /**
   * Make authenticated API request to Shopify
   */
  async makeRequest(platform, endpoint, method = 'GET', data = null) {
    const credentials = await prisma.integrationCredential.findFirst({
      where: {
        platformId: platform.id,
        type: 'OAUTH',
      },
    });

    if (!credentials) {
      throw new Error('No Shopify credentials found for this platform');
    }

    const shopDomain = platform.shopUrl;
    const url = `https://${shopDomain}/admin/api/${this.apiVersion}/${endpoint}`;

    try {
      const response = await axios({
        method,
        url,
        headers: {
          'X-Shopify-Access-Token': credentials.accessToken,
          'Content-Type': 'application/json',
        },
        ...(data && { data }),
      });

      return response.data;
    } catch (error) {
      logger.error(`Shopify API error (${endpoint}):`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Sync all products from Shopify
   */
  async syncProducts(platformId) {
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
      include: { user: true },
    });

    if (!platform) {
      throw new Error('Platform not found');
    }

    logger.info(`Starting Shopify product sync for platform ${platformId}`);

    let hasNextPage = true;
    let pageInfo = null;
    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    while (hasNextPage) {
      // Get products with pagination
      const endpoint = pageInfo
        ? `products.json?limit=250&page_info=${pageInfo}`
        : 'products.json?limit=250';

      const data = await this.makeRequest(platform, endpoint);
      const products = data.products || [];

      for (const shopifyProduct of products) {
        try {
          await this.syncProduct(platform, shopifyProduct);
          syncedCount++;

          // Check if product was created or updated
          const existing = await prisma.product.findFirst({
            where: {
              userId: platform.userId,
              sku: shopifyProduct.variants?.[0]?.sku || `shopify-${shopifyProduct.id}`,
            },
          });

          if (existing) {
            updatedCount++;
          } else {
            createdCount++;
          }
        } catch (error) {
          logger.error(`Failed to sync product ${shopifyProduct.id}:`, error);
        }
      }

      // Check for next page
      const linkHeader = data.link;
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/page_info=([^&>]+)/);
        pageInfo = match ? match[1] : null;
        hasNextPage = !!pageInfo;
      } else {
        hasNextPage = false;
      }
    }

    // Update platform sync status
    await prisma.platform.update({
      where: { id: platformId },
      data: {
        lastSyncAt: new Date(),
        status: 'CONNECTED',
      },
    });

    logger.info(`Shopify sync complete: ${syncedCount} products (${createdCount} new, ${updatedCount} updated)`);

    return {
      syncedCount,
      createdCount,
      updatedCount,
    };
  }

  /**
   * Sync a single product from Shopify
   */
  async syncProduct(platform, shopifyProduct) {
    const userId = platform.userId;

    // Use first variant's SKU, or generate one
    const sku = shopifyProduct.variants?.[0]?.sku || `shopify-${shopifyProduct.id}`;
    const price = parseFloat(shopifyProduct.variants?.[0]?.price || 0);
    const compareAtPrice = parseFloat(shopifyProduct.variants?.[0]?.compare_at_price || 0);
    const inventoryQuantity = shopifyProduct.variants?.[0]?.inventory_quantity || 0;

    // Extract images
    const images = shopifyProduct.images?.map(img => img.src) || [];
    const primaryImage = images[0] || null;

    // Check if product exists
    let product = await prisma.product.findFirst({
      where: { userId, sku },
    });

    if (product) {
      // Update existing product
      product = await prisma.product.update({
        where: { id: product.id },
        data: {
          name: shopifyProduct.title,
          description: shopifyProduct.body_html,
          price,
          compareAtPrice: compareAtPrice > 0 ? compareAtPrice : null,
          images,
          primaryImage,
          tags: shopifyProduct.tags ? shopifyProduct.tags.split(',').map(t => t.trim()) : [],
          hasVariants: shopifyProduct.variants?.length > 1,
          variants: shopifyProduct.variants?.length > 1 ? shopifyProduct.variants : null,
        },
      });
    } else {
      // Create new product
      product = await prisma.product.create({
        data: {
          userId,
          sku,
          name: shopifyProduct.title,
          description: shopifyProduct.body_html,
          price,
          compareAtPrice: compareAtPrice > 0 ? compareAtPrice : null,
          images,
          primaryImage,
          tags: shopifyProduct.tags ? shopifyProduct.tags.split(',').map(t => t.trim()) : [],
          hasVariants: shopifyProduct.variants?.length > 1,
          variants: shopifyProduct.variants?.length > 1 ? shopifyProduct.variants : null,
        },
      });
    }

    // Create or update listing
    let listing = await prisma.listing.findFirst({
      where: {
        productId: product.id,
        platformId: platform.id,
      },
    });

    if (listing) {
      // Update existing listing
      await prisma.listing.update({
        where: { id: listing.id },
        data: {
          externalId: shopifyProduct.id.toString(),
          externalUrl: `https://${platform.shopUrl}/admin/products/${shopifyProduct.id}`,
          status: shopifyProduct.status === 'active' ? 'ACTIVE' : 'DRAFT',
          isActive: shopifyProduct.status === 'active',
          title: shopifyProduct.title,
          description: shopifyProduct.body_html,
          price,
        },
      });
    } else {
      // Create new listing
      listing = await prisma.listing.create({
        data: {
          productId: product.id,
          platformId: platform.id,
          externalId: shopifyProduct.id.toString(),
          externalUrl: `https://${platform.shopUrl}/admin/products/${shopifyProduct.id}`,
          status: shopifyProduct.status === 'active' ? 'ACTIVE' : 'DRAFT',
          isActive: shopifyProduct.status === 'active',
          title: shopifyProduct.title,
          description: shopifyProduct.body_html,
          price,
        },
      });
    }

    // Sync inventory
    if (shopifyProduct.variants?.[0]) {
      const variant = shopifyProduct.variants[0];

      await prisma.inventoryItem.upsert({
        where: {
          productId_platformId_location: {
            productId: product.id,
            platformId: platform.id,
            location: 'Shopify',
          },
        },
        create: {
          productId: product.id,
          platformId: platform.id,
          location: 'Shopify',
          quantity: variant.inventory_quantity || 0,
          available: variant.inventory_quantity || 0,
          reserved: 0,
        },
        update: {
          quantity: variant.inventory_quantity || 0,
          available: variant.inventory_quantity || 0,
          lastSyncAt: new Date(),
        },
      });
    }

    return { product, listing };
  }

  /**
   * Update product on Shopify
   */
  async updateProduct(platform, productId, updates) {
    const endpoint = `products/${productId}.json`;

    const data = await this.makeRequest(platform, endpoint, 'PUT', {
      product: updates,
    });

    return data.product;
  }

  /**
   * Update product variant price on Shopify
   */
  async updateVariantPrice(platform, variantId, price) {
    const endpoint = `variants/${variantId}.json`;

    const data = await this.makeRequest(platform, endpoint, 'PUT', {
      variant: {
        price: price.toString(),
      },
    });

    return data.variant;
  }

  /**
   * Update inventory quantity on Shopify
   */
  async updateInventory(platform, inventoryItemId, locationId, quantity) {
    const endpoint = 'inventory_levels/set.json';

    const data = await this.makeRequest(platform, endpoint, 'POST', {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available: quantity,
    });

    return data.inventory_level;
  }

  /**
   * Register webhooks for real-time updates
   */
  async registerWebhooks(platform, webhookUrl) {
    const topics = [
      'products/create',
      'products/update',
      'products/delete',
      'inventory_levels/update',
      'orders/create',
      'orders/updated',
    ];

    const registered = [];

    for (const topic of topics) {
      try {
        const data = await this.makeRequest(platform, 'webhooks.json', 'POST', {
          webhook: {
            topic,
            address: `${webhookUrl}/api/webhooks/shopify`,
            format: 'json',
          },
        });

        registered.push(data.webhook);
        logger.info(`Registered Shopify webhook: ${topic}`);
      } catch (error) {
        logger.error(`Failed to register webhook ${topic}:`, error);
      }
    }

    return registered;
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(platform, topic, payload) {
    logger.info(`Handling Shopify webhook: ${topic}`);

    try {
      switch (topic) {
        case 'products/create':
        case 'products/update':
          await this.syncProduct(platform, payload);
          break;

        case 'products/delete':
          await this.handleProductDelete(platform, payload);
          break;

        case 'inventory_levels/update':
          await this.handleInventoryUpdate(platform, payload);
          break;

        case 'orders/create':
        case 'orders/updated':
          await this.handleOrderUpdate(platform, payload);
          break;

        default:
          logger.warn(`Unhandled webhook topic: ${topic}`);
      }
    } catch (error) {
      logger.error(`Error handling webhook ${topic}:`, error);
      throw error;
    }
  }

  async handleProductDelete(platform, payload) {
    const listing = await prisma.listing.findFirst({
      where: {
        platformId: platform.id,
        externalId: payload.id.toString(),
      },
    });

    if (listing) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: {
          status: 'ARCHIVED',
          isActive: false,
        },
      });
    }
  }

  async handleInventoryUpdate(platform, payload) {
    // Find the product by variant ID
    const listing = await prisma.listing.findFirst({
      where: {
        platformId: platform.id,
      },
      include: {
        product: true,
      },
    });

    if (listing?.product) {
      await prisma.inventoryItem.updateMany({
        where: {
          productId: listing.product.id,
          platformId: platform.id,
        },
        data: {
          quantity: payload.available || 0,
          available: payload.available || 0,
          lastSyncAt: new Date(),
        },
      });
    }
  }

  async handleOrderUpdate(platform, payload) {
    // TODO: Implement order sync
    logger.info(`Order update received: ${payload.id}`);
  }

  /**
   * Normalize shop domain (handle various input formats)
   */
  normalizeShopDomain(shop) {
    let domain = shop.trim().toLowerCase();

    // Remove protocol
    domain = domain.replace(/^https?:\/\//, '');

    // Remove trailing slash
    domain = domain.replace(/\/$/, '');

    // Add .myshopify.com if not present
    if (!domain.includes('.')) {
      domain = `${domain}.myshopify.com`;
    }

    return domain;
  }

  /**
   * Test connection to Shopify store
   */
  async testConnection(platform) {
    try {
      const data = await this.makeRequest(platform, 'shop.json');
      return {
        success: true,
        shop: data.shop,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new ShopifyService();
