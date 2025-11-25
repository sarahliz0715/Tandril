import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

/**
 * GET /api/platforms - List connected platforms
 */
router.get('/', requireAuth, async (req, res) => {
  const platforms = await prisma.platform.findMany({
    where: { userId: req.user.id },
    include: {
      _count: {
        select: {
          listings: true,
          inventoryItems: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: platforms,
  });
});

/**
 * POST /api/platforms - Connect new platform
 */
router.post('/', requireAuth, async (req, res) => {
  const { name, type, shopUrl } = req.body;

  const platform = await prisma.platform.create({
    data: {
      userId: req.user.id,
      name,
      type,
      shopUrl,
      status: 'DISCONNECTED', // Will be updated after credentials are added
    },
  });

  res.status(201).json({
    success: true,
    data: platform,
  });
});

/**
 * PATCH /api/platforms/:id - Update platform
 */
router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.platform.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Platform not found',
    });
  }

  const updated = await prisma.platform.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json({
    success: true,
    data: updated,
  });
});

/**
 * DELETE /api/platforms/:id - Disconnect platform
 */
router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.platform.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Platform not found',
    });
  }

  await prisma.platform.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: 'Platform disconnected',
  });
});

export default router;
