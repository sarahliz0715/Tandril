import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import ListingHealthChecker from '../services/ListingHealthChecker.js';

const router = express.Router();

/**
 * GET /api/listings - List all listings with health status
 */
router.get('/', requireAuth, async (req, res) => {
  const { platformId, status, minHealthScore, search, limit = 50, offset = 0 } = req.query;

  const where = {
    product: { userId: req.user.id },
    ...(platformId && { platformId }),
    ...(status && { status }),
    ...(minHealthScore && { healthScore: { gte: parseInt(minHealthScore) } }),
  };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            primaryImage: true,
            price: true,
          },
        },
        platform: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        healthIssues: {
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          orderBy: { severity: 'desc' },
        },
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { healthScore: 'asc' }, // Show worst health first
    }),
    prisma.listing.count({ where }),
  ]);

  res.json({
    success: true,
    data: listings,
    meta: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
});

/**
 * GET /api/listings/:id - Get single listing with full details
 */
router.get('/:id', requireAuth, async (req, res) => {
  const listing = await prisma.listing.findFirst({
    where: {
      id: req.params.id,
      product: { userId: req.user.id },
    },
    include: {
      product: true,
      platform: true,
      healthIssues: {
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });

  if (!listing) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found',
    });
  }

  res.json({
    success: true,
    data: listing,
  });
});

/**
 * POST /api/listings - Create new listing
 */
router.post('/', requireAuth, async (req, res) => {
  const { productId, platformId, title, description, price, status = 'DRAFT' } = req.body;

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

  // Verify platform ownership
  const platform = await prisma.platform.findFirst({
    where: { id: platformId, userId: req.user.id },
  });

  if (!platform) {
    return res.status(404).json({
      success: false,
      error: 'Platform not found',
    });
  }

  const listing = await prisma.listing.create({
    data: {
      productId,
      platformId,
      title,
      description,
      price,
      status,
      isActive: status === 'ACTIVE',
    },
    include: {
      product: true,
      platform: true,
    },
  });

  // Run initial health check
  await ListingHealthChecker.checkListing(listing.id);

  res.status(201).json({
    success: true,
    data: listing,
  });
});

/**
 * PATCH /api/listings/:id - Update listing
 */
router.patch('/:id', requireAuth, async (req, res) => {
  // Verify ownership
  const existing = await prisma.listing.findFirst({
    where: {
      id: req.params.id,
      product: { userId: req.user.id },
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found',
    });
  }

  const listing = await prisma.listing.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json({
    success: true,
    data: listing,
  });
});

/**
 * DELETE /api/listings/:id - Delete listing
 */
router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.listing.findFirst({
    where: {
      id: req.params.id,
      product: { userId: req.user.id },
    },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found',
    });
  }

  await prisma.listing.delete({
    where: { id: req.params.id },
  });

  res.json({
    success: true,
    message: 'Listing deleted',
  });
});

// ============================================================================
// ⭐ LISTING HEALTH ENDPOINTS - The killer feature!
// ============================================================================

/**
 * POST /api/listings/:id/health-check - Run health check on a listing
 */
router.post('/:id/health-check', requireAuth, async (req, res) => {
  // Verify ownership
  const listing = await prisma.listing.findFirst({
    where: {
      id: req.params.id,
      product: { userId: req.user.id },
    },
  });

  if (!listing) {
    return res.status(404).json({
      success: false,
      error: 'Listing not found',
    });
  }

  const result = await ListingHealthChecker.checkListing(req.params.id);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/listings/health-check-all - Run health check on all listings
 */
router.post('/health-check-all', requireAuth, async (req, res) => {
  const results = await ListingHealthChecker.checkAllListings(req.user.id);

  const summary = {
    totalChecked: results.length,
    critical: results.filter(r => r.issues.some(i => i.severity === 'CRITICAL')).length,
    canAutoFix: results.filter(r => r.canAutoFix.length > 0).length,
    avgHealthScore: results.reduce((sum, r) => sum + r.healthScore, 0) / results.length,
  };

  res.json({
    success: true,
    data: {
      summary,
      results,
    },
  });
});

/**
 * POST /api/listings/issues/:issueId/auto-fix - Auto-fix a health issue
 */
router.post('/issues/:issueId/auto-fix', requireAuth, async (req, res) => {
  // Verify ownership through listing
  const issue = await prisma.listingHealthIssue.findFirst({
    where: {
      id: req.params.issueId,
      listing: {
        product: { userId: req.user.id },
      },
    },
  });

  if (!issue) {
    return res.status(404).json({
      success: false,
      error: 'Issue not found',
    });
  }

  if (!issue.canAutoFix) {
    return res.status(400).json({
      success: false,
      error: 'This issue cannot be auto-fixed',
    });
  }

  const fixed = await ListingHealthChecker.autoFix(req.params.issueId);

  res.json({
    success: true,
    data: { fixed },
    message: fixed ? 'Issue fixed successfully' : 'Failed to fix issue',
  });
});

/**
 * GET /api/listings/health/dashboard - Get health dashboard stats
 */
router.get('/health/dashboard', requireAuth, async (req, res) => {
  const [
    totalListings,
    suppressed,
    critical,
    avgHealthScore,
    topIssues,
  ] = await Promise.all([
    // Total listings
    prisma.listing.count({
      where: { product: { userId: req.user.id } },
    }),

    // Suppressed listings
    prisma.listing.count({
      where: {
        product: { userId: req.user.id },
        status: 'SUPPRESSED',
      },
    }),

    // Critical issues count
    prisma.listingHealthIssue.count({
      where: {
        listing: { product: { userId: req.user.id } },
        severity: 'CRITICAL',
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    }),

    // Average health score
    prisma.listing.aggregate({
      where: { product: { userId: req.user.id } },
      _avg: { healthScore: true },
    }),

    // Top issue types
    prisma.$queryRaw`
      SELECT
        type,
        severity,
        COUNT(*) as count
      FROM listing_health_issues
      WHERE listing_id IN (
        SELECT l.id FROM listings l
        INNER JOIN products p ON l.product_id = p.id
        WHERE p.user_id = ${req.user.id}
      )
      AND status IN ('OPEN', 'IN_PROGRESS')
      GROUP BY type, severity
      ORDER BY count DESC
      LIMIT 10
    `,
  ]);

  res.json({
    success: true,
    data: {
      totalListings,
      suppressed,
      critical,
      avgHealthScore: Math.round(avgHealthScore._avg.healthScore || 100),
      topIssues,
    },
  });
});

export default router;
