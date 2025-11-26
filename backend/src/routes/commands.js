import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import DiffService from '../services/DiffService.js';

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
 * POST /api/commands/preview - Preview command changes before execution
 */
router.post('/preview', requireAuth, async (req, res) => {
  const { commandText, interpretation, productIds } = req.body;

  try {
    const preview = await DiffService.previewCommand(
      commandText,
      interpretation,
      productIds || []
    );

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/commands/preview/price - Preview price update
 */
router.post('/preview/price', requireAuth, async (req, res) => {
  const { productIds, updateType, value } = req.body;

  // Verify product ownership
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      userId: req.user.id,
    },
    select: { id: true },
  });

  if (products.length !== productIds.length) {
    return res.status(403).json({
      success: false,
      error: 'Some products not found or not owned by user',
    });
  }

  try {
    const preview = await DiffService.previewPriceUpdate(productIds, updateType, value);

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/commands/preview/inventory - Preview inventory update
 */
router.post('/preview/inventory', requireAuth, async (req, res) => {
  const { inventoryItemIds, operation, quantity } = req.body;

  // Verify ownership through inventory items
  const items = await prisma.inventoryItem.findMany({
    where: {
      id: { in: inventoryItemIds },
      product: { userId: req.user.id },
    },
    select: { id: true },
  });

  if (items.length !== inventoryItemIds.length) {
    return res.status(403).json({
      success: false,
      error: 'Some inventory items not found or not owned by user',
    });
  }

  try {
    const preview = await DiffService.previewInventoryUpdate(inventoryItemIds, operation, quantity);

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/commands/preview/listing - Preview listing update
 */
router.post('/preview/listing', requireAuth, async (req, res) => {
  const { listingIds, updates } = req.body;

  // Verify ownership
  const listings = await prisma.listing.findMany({
    where: {
      id: { in: listingIds },
      product: { userId: req.user.id },
    },
    select: { id: true },
  });

  if (listings.length !== listingIds.length) {
    return res.status(403).json({
      success: false,
      error: 'Some listings not found or not owned by user',
    });
  }

  try {
    const preview = await DiffService.previewListingUpdate(listingIds, updates);

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
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
