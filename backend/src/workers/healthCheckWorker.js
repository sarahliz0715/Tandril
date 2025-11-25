/**
 * Health Check Worker
 *
 * Runs hourly to check all active listings for health issues
 * and auto-fix what can be fixed automatically.
 */

import prisma from '../utils/prisma.js';
import ListingHealthChecker from '../services/ListingHealthChecker.js';
import logger from '../utils/logger.js';

export async function processHealthCheck(data) {
  const { userId, type } = data;

  logger.info('Starting scheduled health check', { userId, type });

  try {
    let results;

    if (userId) {
      // Check specific user's listings
      results = await ListingHealthChecker.checkAllListings(userId);
    } else {
      // Check all active users' listings
      const users = await prisma.user.findMany({
        where: {
          // Only check users with active subscriptions or who have listings
          OR: [
            { plan: { not: 'FREE' } },
            {
              platforms: {
                some: {
                  listings: {
                    some: {
                      status: { in: ['ACTIVE', 'SUPPRESSED', 'STRANDED'] },
                    },
                  },
                },
              },
            },
          ],
        },
        select: { id: true, email: true },
      });

      logger.info(`Checking health for ${users.length} users`);

      const allResults = [];
      for (const user of users) {
        try {
          const userResults = await ListingHealthChecker.checkAllListings(user.id);
          allResults.push(...userResults);

          // Auto-fix critical issues
          const criticalIssues = userResults
            .flatMap(r => r.issues)
            .filter(i => i.severity === 'CRITICAL' && i.canAutoFix);

          logger.info(`Found ${criticalIssues.length} auto-fixable critical issues for user ${user.email}`);

          for (const issue of criticalIssues) {
            try {
              const issueRecord = await prisma.listingHealthIssue.findFirst({
                where: {
                  listing: {
                    product: { userId: user.id },
                  },
                  type: issue.type,
                  status: 'OPEN',
                },
              });

              if (issueRecord) {
                await ListingHealthChecker.autoFix(issueRecord.id);
                logger.info(`Auto-fixed issue ${issueRecord.id}`);
              }
            } catch (error) {
              logger.error(`Failed to auto-fix issue:`, error);
            }
          }

          // Create alerts for remaining critical issues
          const remainingCritical = userResults
            .flatMap(r => r.issues)
            .filter(i => i.severity === 'CRITICAL' && !i.canAutoFix);

          if (remainingCritical.length > 0) {
            await prisma.alert.create({
              data: {
                userId: user.id,
                type: 'LISTING_SUPPRESSED',
                severity: 'CRITICAL',
                title: `${remainingCritical.length} critical listing issues need attention`,
                message: `You have ${remainingCritical.length} suppressed or critical listings that require manual review.`,
                actionRequired: true,
                actionUrl: '/listings',
                actionLabel: 'View Issues',
              },
            });
          }
        } catch (error) {
          logger.error(`Failed to check health for user ${user.email}:`, error);
        }
      }

      results = allResults;
    }

    // Summary stats
    const summary = {
      totalChecked: results.length,
      critical: results.filter(r => r.issues.some(i => i.severity === 'CRITICAL')).length,
      high: results.filter(r => r.issues.some(i => i.severity === 'HIGH')).length,
      avgHealthScore: results.reduce((sum, r) => sum + r.healthScore, 0) / results.length || 100,
      autoFixed: results.flatMap(r => r.canAutoFix).length,
    };

    logger.info('Health check complete', summary);

    return summary;
  } catch (error) {
    logger.error('Health check worker failed:', error);
    throw error;
  }
}
