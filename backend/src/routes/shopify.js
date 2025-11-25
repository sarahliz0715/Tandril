import express from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import ShopifyService from '../services/ShopifyService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/shopify/auth/start - Initiate Shopify OAuth
 */
router.get('/auth/start', requireAuth, async (req, res) => {
  const { shop } = req.query;

  if (!shop) {
    return res.status(400).json({
      success: false,
      error: 'Shop parameter is required',
    });
  }

  // Generate random state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');

  // Store state in session or database
  // For now, we'll just return it and verify later
  const redirectUri = `${process.env.FRONTEND_URL}/shopify/callback`;

  const authUrl = ShopifyService.generateAuthUrl(shop, state, redirectUri);

  res.json({
    success: true,
    data: {
      authUrl,
      state,
    },
  });
});

/**
 * GET /api/shopify/auth/callback - Handle OAuth callback
 */
router.get('/auth/callback', requireAuth, async (req, res) => {
  const { shop, code, state } = req.query;

  if (!shop || !code) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters',
    });
  }

  // TODO: Verify state matches what we sent
  // For production, store state in Redis/database and verify here

  try {
    // Exchange code for access token
    const accessToken = await ShopifyService.getAccessToken(shop, code);

    // Create or update platform
    const shopDomain = ShopifyService.normalizeShopDomain(shop);

    let platform = await prisma.platform.findFirst({
      where: {
        userId: req.user.id,
        shopUrl: shopDomain,
      },
    });

    if (platform) {
      // Update existing platform
      platform = await prisma.platform.update({
        where: { id: platform.id },
        data: {
          status: 'CONNECTED',
          lastSyncAt: new Date(),
        },
      });
    } else {
      // Create new platform
      platform = await prisma.platform.create({
        data: {
          userId: req.user.id,
          name: `Shopify: ${shopDomain}`,
          type: 'SHOPIFY',
          shopUrl: shopDomain,
          status: 'CONNECTED',
        },
      });
    }

    // Store credentials
    await prisma.integrationCredential.upsert({
      where: {
        platformId_type: {
          platformId: platform.id,
          type: 'OAUTH',
        },
      },
      create: {
        platformId: platform.id,
        type: 'OAUTH',
        accessToken,
        scope: ShopifyService.scopes.split(','),
      },
      update: {
        accessToken,
        scope: ShopifyService.scopes.split(','),
      },
    });

    // Register webhooks
    const webhookUrl = process.env.BACKEND_URL || 'https://your-api.railway.app';
    await ShopifyService.registerWebhooks(platform, webhookUrl);

    // Start initial sync in background
    ShopifyService.syncProducts(platform.id).catch(err => {
      logger.error('Background sync failed:', err);
    });

    res.json({
      success: true,
      data: {
        platform,
        message: 'Shopify connected successfully. Products are syncing in the background.',
      },
    });
  } catch (error) {
    logger.error('Shopify OAuth callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect Shopify store',
    });
  }
});

/**
 * POST /api/shopify/sync/:platformId - Manually trigger product sync
 */
router.post('/sync/:platformId', requireAuth, async (req, res) => {
  const { platformId } = req.params;

  // Verify platform ownership
  const platform = await prisma.platform.findFirst({
    where: {
      id: platformId,
      userId: req.user.id,
      type: 'SHOPIFY',
    },
  });

  if (!platform) {
    return res.status(404).json({
      success: false,
      error: 'Shopify platform not found',
    });
  }

  try {
    const result = await ShopifyService.syncProducts(platformId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Shopify sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/shopify/webhooks - Handle incoming webhooks
 */
router.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const topic = req.headers['x-shopify-topic'];
  const shop = req.headers['x-shopify-shop-domain'];

  // Verify webhook authenticity
  const isValid = ShopifyService.verifyWebhook(req.body, hmac);

  if (!isValid) {
    logger.warn(`Invalid Shopify webhook signature from ${shop}`);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Find platform by shop domain
  const platform = await prisma.platform.findFirst({
    where: {
      shopUrl: shop,
      type: 'SHOPIFY',
    },
  });

  if (!platform) {
    logger.warn(`Webhook received for unknown shop: ${shop}`);
    return res.status(404).json({ error: 'Shop not found' });
  }

  try {
    // Parse payload
    const payload = JSON.parse(req.body.toString());

    // Handle webhook asynchronously
    ShopifyService.handleWebhook(platform, topic, payload).catch(err => {
      logger.error(`Error processing webhook ${topic}:`, err);
    });

    // Respond immediately to Shopify
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

/**
 * GET /api/shopify/test/:platformId - Test Shopify connection
 */
router.get('/test/:platformId', requireAuth, async (req, res) => {
  const { platformId } = req.params;

  const platform = await prisma.platform.findFirst({
    where: {
      id: platformId,
      userId: req.user.id,
      type: 'SHOPIFY',
    },
  });

  if (!platform) {
    return res.status(404).json({
      success: false,
      error: 'Shopify platform not found',
    });
  }

  const result = await ShopifyService.testConnection(platform);

  if (result.success) {
    res.json({
      success: true,
      data: {
        shop: result.shop,
        message: 'Connection successful',
      },
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
    });
  }
});

/**
 * POST /api/shopify/products/:platformId/update - Update product on Shopify
 */
router.post('/products/:platformId/update', requireAuth, async (req, res) => {
  const { platformId } = req.params;
  const { productId, updates } = req.body;

  const platform = await prisma.platform.findFirst({
    where: {
      id: platformId,
      userId: req.user.id,
      type: 'SHOPIFY',
    },
  });

  if (!platform) {
    return res.status(404).json({
      success: false,
      error: 'Shopify platform not found',
    });
  }

  try {
    const updated = await ShopifyService.updateProduct(platform, productId, updates);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Shopify product update error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
