import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

/**
 * GET /api/automations - List automations
 */
router.get('/', requireAuth, async (req, res) => {
  const automations = await prisma.automation.findMany({
    where: { userId: req.user.id },
    include: {
      runs: {
        take: 5,
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          status: true,
          startedAt: true,
          duration: true,
          itemsProcessed: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: automations,
  });
});

/**
 * GET /api/automations/:id - Get single automation
 */
router.get('/:id', requireAuth, async (req, res) => {
  const automation = await prisma.automation.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
    include: {
      runs: {
        orderBy: { startedAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!automation) {
    return res.status(404).json({
      success: false,
      error: 'Automation not found',
    });
  }

  res.json({
    success: true,
    data: automation,
  });
});

/**
 * POST /api/automations - Create automation
 */
router.post('/', requireAuth, async (req, res) => {
  const { name, description, triggers, actions, conditions, schedule, isActive } = req.body;

  const automation = await prisma.automation.create({
    data: {
      userId: req.user.id,
      name,
      description,
      triggers,
      actions,
      conditions,
      schedule,
      isActive: isActive !== false,
    },
  });

  res.status(201).json({
    success: true,
    data: automation,
  });
});

/**
 * PATCH /api/automations/:id - Update automation
 */
router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.automation.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Automation not found',
    });
  }

  const updated = await prisma.automation.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json({
    success: true,
    data: updated,
  });
});

/**
 * DELETE /api/automations/:id - Delete automation
 */
router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.automation.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Automation not found',
    });
  }

  await prisma.automation.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: 'Automation deleted',
  });
});

export default router;
