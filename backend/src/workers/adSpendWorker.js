/**
 * Ad Spend Monitoring Worker
 *
 * Runs every 15 minutes to check campaign spending against guards
 * and auto-pause campaigns that exceed thresholds.
 */

import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

export async function processAdSpendMonitoring(data) {
  const { campaignId } = data;

  logger.info('Starting ad spend monitoring', { campaignId });

  try {
    let campaigns;

    if (campaignId) {
      // Monitor specific campaign
      campaigns = await prisma.adCampaign.findMany({
        where: { id: campaignId },
        include: {
          spendGuards: {
            where: { isActive: true },
          },
        },
      });
    } else {
      // Monitor all active campaigns
      campaigns = await prisma.adCampaign.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          spendGuards: {
            where: { isActive: true },
          },
        },
      });
    }

    logger.info(`Monitoring ${campaigns.length} active campaigns`);

    const actions = [];

    for (const campaign of campaigns) {
      try {
        // Check each guard
        for (const guard of campaign.spendGuards) {
          let triggered = false;
          let reason = '';

          switch (guard.type) {
            case 'DAILY_BUDGET_CAP':
              if (guard.dailyCapAmount && campaign.todaySpend >= guard.dailyCapAmount) {
                triggered = true;
                reason = `Daily spend ($${campaign.todaySpend}) reached cap ($${guard.dailyCapAmount})`;
              }
              break;

            case 'MONTHLY_BUDGET_CAP':
              if (guard.monthlyCapAmount && campaign.currentSpend >= guard.monthlyCapAmount) {
                triggered = true;
                reason = `Monthly spend ($${campaign.currentSpend}) reached cap ($${guard.monthlyCapAmount})`;
              }
              break;

            case 'ACOS_THRESHOLD':
              if (guard.acosThreshold && campaign.acos && campaign.acos > guard.acosThreshold) {
                triggered = true;
                reason = `ACoS (${campaign.acos}%) exceeds threshold (${guard.acosThreshold}%)`;
              }
              break;

            case 'ROAS_THRESHOLD':
              if (guard.roasThreshold && campaign.roas && campaign.roas < guard.roasThreshold) {
                triggered = true;
                reason = `ROAS (${campaign.roas}) below threshold (${guard.roasThreshold})`;
              }
              break;
          }

          if (triggered) {
            logger.warn(`Guard triggered for campaign ${campaign.id}: ${reason}`);

            // Update guard
            await prisma.adSpendGuard.update({
              where: { id: guard.id },
              data: {
                lastTriggered: new Date(),
                triggerCount: { increment: 1 },
              },
            });

            // Execute guard action
            switch (guard.autoAction) {
              case 'PAUSE_CAMPAIGN':
                await prisma.adCampaign.update({
                  where: { id: campaign.id },
                  data: { status: 'PAUSED' },
                });

                actions.push({
                  campaignId: campaign.id,
                  action: 'PAUSED',
                  reason,
                });

                // Create critical alert
                await prisma.alert.create({
                  data: {
                    userId: campaign.userId,
                    type: 'AD_BUDGET_EXCEEDED',
                    severity: 'CRITICAL',
                    title: `Campaign "${campaign.name}" auto-paused`,
                    message: reason,
                    entityType: 'AdCampaign',
                    entityId: campaign.id,
                    actionRequired: true,
                    actionUrl: `/ads/campaigns/${campaign.id}`,
                    actionLabel: 'View Campaign',
                  },
                });
                break;

              case 'ALERT':
                // Create warning alert
                await prisma.alert.create({
                  data: {
                    userId: campaign.userId,
                    type: 'AD_BUDGET_WARNING',
                    severity: 'WARNING',
                    title: `Campaign "${campaign.name}" spending alert`,
                    message: reason,
                    entityType: 'AdCampaign',
                    entityId: campaign.id,
                    actionRequired: true,
                    actionUrl: `/ads/campaigns/${campaign.id}`,
                    actionLabel: 'Review Campaign',
                  },
                });

                actions.push({
                  campaignId: campaign.id,
                  action: 'ALERT_SENT',
                  reason,
                });
                break;

              case 'REDUCE_BID':
                // TODO: Implement bid reduction logic
                logger.info(`Bid reduction triggered for campaign ${campaign.id}`);
                actions.push({
                  campaignId: campaign.id,
                  action: 'BID_REDUCED',
                  reason,
                });
                break;

              case 'REVERT_CHANGES':
                // TODO: Implement revert logic
                logger.info(`Revert triggered for campaign ${campaign.id}`);
                actions.push({
                  campaignId: campaign.id,
                  action: 'REVERTED',
                  reason,
                });
                break;
            }
          }
        }

        // Warning at 80% of budget
        if (campaign.dailyBudget) {
          const spendPercent = (campaign.todaySpend / campaign.dailyBudget) * 100;
          if (spendPercent >= 80 && spendPercent < 100) {
            await prisma.alert.create({
              data: {
                userId: campaign.userId,
                type: 'AD_BUDGET_WARNING',
                severity: 'WARNING',
                title: `Campaign "${campaign.name}" at ${Math.round(spendPercent)}% of daily budget`,
                message: `Current spend: $${campaign.todaySpend} / Budget: $${campaign.dailyBudget}`,
                entityType: 'AdCampaign',
                entityId: campaign.id,
              },
            });
          }
        }
      } catch (error) {
        logger.error(`Failed to monitor campaign ${campaign.id}:`, error);
      }
    }

    const summary = {
      campaignsMonitored: campaigns.length,
      actionsT: actions.length,
      actions,
    };

    logger.info('Ad spend monitoring complete', summary);

    return summary;
  } catch (error) {
    logger.error('Ad spend monitoring worker failed:', error);
    throw error;
  }
}
