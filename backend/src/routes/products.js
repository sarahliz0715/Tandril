import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

// Validation schemas
const createProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  cost: z.number().optional(),
  price: z.number(),
  compareAtPrice: z.number().optional(),
  mapPrice: z.number().optional(),
  images: z.array(z.string()).optional(),
  primaryImage: z.string().optional(),
  hasVariants: z.boolean().optional(),
  variants: z.any().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/products - List all products
 */
router.get('/', requireAuth, async (req, res) => {
  const { search, category, limit = 50, offset = 0 } = req.query;

  const where = {
    userId: req.user.id,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(category && { category }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        listings: {
          select: {
            id: true,
            status: true,
            platform: { select: { name: true, type: true } },
          },
        },
        inventoryItems: {
          select: {
            location: true,
            quantity: true,
            available: true,
          },
        },
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: products,
    meta: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
});

/**
 * GET /api/products/:id - Get single product
 */
router.get('/:id', requireAuth, async (req, res) => {
  const product = await prisma.product.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
    include: {
      listings: {
        include: {
          platform: true,
          healthIssues: {
            where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          },
        },
      },
      inventoryItems: {
        include: {
          platform: true,
        },
      },
      purchaseOrders: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found',
    });
  }

  res.json({
    success: true,
    data: product,
  });
});

/**
 * POST /api/products - Create product
 */
router.post('/', requireAuth, async (req, res) => {
  const data = createProductSchema.parse(req.body);

  const product = await prisma.product.create({
    data: {
      ...data,
      userId: req.user.id,
    },
  });

  res.status(201).json({
    success: true,
    data: product,
  });
});

/**
 * PATCH /api/products/:id - Update product
 */
router.patch('/:id', requireAuth, async (req, res) => {
  // Verify ownership
  const existing = await prisma.product.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Product not found',
    });
  }

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json({
    success: true,
    data: product,
  });
});

/**
 * DELETE /api/products/:id - Delete product
 */
router.delete('/:id', requireAuth, async (req, res) => {
  // Verify ownership
  const existing = await prisma.product.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Product not found',
    });
  }

  await prisma.product.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: 'Product deleted',
  });
});

export default router;
