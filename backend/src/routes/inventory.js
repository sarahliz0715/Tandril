import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

/**
 * GET /api/inventory - Get inventory items
 */
router.get('/', requireAuth, async (req, res) => {
  const { productId, lowStock } = req.query;

  const where = {
    product: { userId: req.user.id },
    ...(productId && { productId }),
    ...(lowStock === 'true' && {
      available: { lte: prisma.inventoryItem.fields.reorderPoint },
    }),
  };

  const items = await prisma.inventoryItem.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          primaryImage: true,
        },
      },
      platform: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: { available: 'asc' },
  });

  res.json({
    success: true,
    data: items,
  });
});

/**
 * POST /api/inventory - Create inventory item
 */
router.post('/', requireAuth, async (req, res) => {
  const { productId, platformId, location, quantity, reorderPoint, reorderQuantity } = req.body;

  // Verify product ownership
  const product = await prisma.product.findFirst({
    where: { id: productId, userId: req.user.id },
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found',
    });
  }

  const item = await prisma.inventoryItem.create({
    data: {
      productId,
      platformId,
      location,
      quantity,
      available: quantity,
      reorderPoint: reorderPoint || 10,
      reorderQuantity: reorderQuantity || 50,
    },
  });

  res.status(201).json({
    success: true,
    data: item,
  });
});

/**
 * PATCH /api/inventory/:id - Update inventory
 */
router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.inventoryItem.findFirst({
    where: {
      id: req.params.id,
      product: { userId: req.user.id },
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Inventory item not found',
    });
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json({
    success: true,
    data: updated,
  });
});

export default router;
