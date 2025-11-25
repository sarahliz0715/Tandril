import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

/**
 * GET /api/commands - Get command history
 */
router.get('/', requireAuth, async (req, res) => {
  const { status, limit = 50 } = req.query;

  const where = {
    userId: req.user.id,
    ...(status && { status }),
  };

  const commands = await prisma.aICommand.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
  });

  res.json({
    success: true,
    data: commands,
  });
});

/**
 * GET /api/commands/:id - Get single command
 */
router.get('/:id', requireAuth, async (req, res) => {
  const command = await prisma.aICommand.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  });

  if (!command) {
    return res.status(404).json({
      success: false,
      error: 'Command not found',
    });
  }

  res.json({
    success: true,
    data: command,
  });
});

/**
 * POST /api/commands - Create & execute command
 */
router.post('/', requireAuth, async (req, res) => {
  const { commandText, platformTargets, autoExecute = false } = req.body;

  // TODO: Integrate with AI to interpret command
  const command = await prisma.aICommand.create({
    data: {
      userId: req.user.id,
      commandText,
      interpretation: { raw: commandText }, // Placeholder
      platformTargets: platformTargets || [],
      status: autoExecute ? 'EXECUTING' : 'PENDING',
      riskLevel: 'LOW', // Would be determined by AI
    },
  });

  res.status(201).json({
    success: true,
    data: command,
  });
});

/**
 * POST /api/commands/:id/undo - Undo a command
 */
router.post('/:id/undo', requireAuth, async (req, res) => {
  const command = await prisma.aICommand.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  });

  if (!command) {
    return res.status(404).json({
      success: false,
      error: 'Command not found',
    });
  }

  if (!command.canUndo) {
    return res.status(400).json({
      success: false,
      error: 'This command cannot be undone',
    });
  }

  // TODO: Implement actual undo logic using beforeState

  await prisma.aICommand.update({
    where: { id: req.params.id },
    data: {
      status: 'UNDONE',
      undoneAt: new Date(),
      undoneBy: req.user.id,
    },
  });

  res.json({
    success: true,
    message: 'Command undone successfully',
  });
});

export default router;
