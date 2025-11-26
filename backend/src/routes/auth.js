import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

/**
 * GET /api/auth/me - Get current user
 */
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

/**
 * PATCH /api/auth/me - Update current user
 */
router.patch('/me', requireAuth, async (req, res) => {
  const { name, timezone, currency } = req.body;

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name && { name }),
      ...(timezone && { timezone }),
      ...(currency && { currency }),
    },
  });

  res.json({
    success: true,
    data: updated,
  });
});

export default router;
