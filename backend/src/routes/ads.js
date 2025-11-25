import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = express.Router();

/**
 * GET /api/ads/campaigns - List ad campaigns
 */
router.get('/campaigns', requireAuth, async (req, res) => {
  const { status } = req.query;

  const where = {
    userId: req.user.id,
    ...(status && { status }),
  };

  const campaigns = await prisma.adCampaign.findMany({
    where,
    include: {
      spendGuards: {
        where: { isActive: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: campaigns,
  });
});

/**
 * POST /api/ads/campaigns - Create campaign
 */
router.post('/campaigns', requireAuth, async (req, res) => {
  const { name, platform, dailyBudget, totalBudget, status } = req.body;

  const campaign = await prisma.adCampaign.create({
    data: {
      userId: req.user.id,
      name,
      platform,
      dailyBudget,
      totalBudget,
      status: status || 'DRAFT',
    },
  });

  res.status(201).json({
    success: true,
    data: campaign,
  });
});

/**
 * POST /api/ads/campaigns/:id/guards - Add spend guard
 */
router.post('/campaigns/:id/guards', requireAuth, async (req, res) => {
  const { type, dailyCapAmount, monthlyCapAmount, acosThreshold, roasThreshold, autoAction } = req.body;

  // Verify campaign ownership
  const campaign = await prisma.adCampaign.findFirst({
    where: {
      id: req.params.id,
      userId: req.user.id,
    },
  });

  if (!campaign) {
    return res.status(404).json({
      success: false,
      error: 'Campaign not found',
    });
  }

  const guard = await prisma.adSpendGuard.create({
    data: {
      campaignId: req.params.id,
      type,
      dailyCapAmount,
      monthlyCapAmount,
      acosThreshold,
      roasThreshold,
      autoAction: autoAction || 'ALERT',
    },
  });

  res.status(201).json({
    success: true,
    data: guard,
  });
});

/**
 * GET /api/ads/dashboard - Ad spend dashboard
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  const [campaigns, totalSpend, activeCampaigns] = await Promise.all([
    prisma.adCampaign.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        currentSpend: true,
        dailyBudget: true,
        todaySpend: true,
        acos: true,
        roas: true,
        status: true,
      },
    }),

    prisma.adCampaign.aggregate({
      where: { userId: req.user.id },
      _sum: { currentSpend: true },
    }),

    prisma.adCampaign.count({
      where: {
        userId: req.user.id,
        status: 'ACTIVE',
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      campaigns,
      totalSpend: totalSpend._sum.currentSpend || 0,
      activeCampaigns,
    },
  });
});

export default router;
