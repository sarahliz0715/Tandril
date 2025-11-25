import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

/**
 * GET /api/alerts - Get alerts
 */
router.get('/', requireAuth, async (req, res) => {
  const { unreadOnly, type, limit = 50 } = req.query;

  const where = {
    userId: req.user.id,
    ...(unreadOnly === 'true' && { isRead: false }),
    ...(type && { type }),
    isDismissed: false,
  };

  const alerts = await prisma.alert.findMany({
    where,
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: parseInt(limit),
  });

  res.json({
    success: true,
    data: alerts,
  });
});

/**
 * PATCH /api/alerts/:id/read - Mark alert as read
 */
router.patch('/:id/read', requireAuth, async (req, res) => {
  const alert = await prisma.alert.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  });

  if (!alert) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found',
    });
  }

  const updated = await prisma.alert.update({
    where: { id: req.params.id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  res.json({
    success: true,
    data: updated,
  });
});

/**
 * DELETE /api/alerts/:id - Dismiss alert
 */
router.delete('/:id', requireAuth, async (req, res) => {
  const alert = await prisma.alert.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  });

  if (!alert) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found',
    });
  }

  await prisma.alert.update({
    where: { id: req.params.id },
    data: {
      isDismissed: true,
      dismissedAt: new Date(),
    },
  });

  res.json({
    success: true,
    message: 'Alert dismissed',
  });
});

export default router;
