/**
 * Background Workers - Job Queue System
 *
 * Uses BullMQ for reliable job processing:
 * - Scheduled health checks (hourly)
 * - Ad spend monitoring (every 15 min)
 * - Inventory sync (daily)
 */

import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import logger from '../utils/logger.js';

// Import workers
import { processHealthCheck } from './healthCheckWorker.js';
import { processAdSpendMonitoring } from './adSpendWorker.js';
import { processInventorySync } from './inventorySyncWorker.js';

// Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ============================================================================
// Job Queues
// ============================================================================

export const healthCheckQueue = new Queue('health-checks', { connection });
export const adSpendQueue = new Queue('ad-spend-monitoring', { connection });
export const inventorySyncQueue = new Queue('inventory-sync', { connection });

// ============================================================================
// Workers
// ============================================================================

const healthCheckWorker = new Worker(
  'health-checks',
  async (job) => {
    logger.info(`Processing health check job ${job.id}`);
    return await processHealthCheck(job.data);
  },
  {
    connection,
    concurrency: 5,
  }
);

const adSpendWorker = new Worker(
  'ad-spend-monitoring',
  async (job) => {
    logger.info(`Processing ad spend monitoring job ${job.id}`);
    return await processAdSpendMonitoring(job.data);
  },
  {
    connection,
    concurrency: 10,
  }
);

const inventorySyncWorker = new Worker(
  'inventory-sync',
  async (job) => {
    logger.info(`Processing inventory sync job ${job.id}`);
    return await processInventorySync(job.data);
  },
  {
    connection,
    concurrency: 2,
  }
);

// ============================================================================
// Event Handlers
// ============================================================================

healthCheckWorker.on('completed', (job) => {
  logger.info(`Health check job ${job.id} completed`);
});

healthCheckWorker.on('failed', (job, err) => {
  logger.error(`Health check job ${job.id} failed:`, err);
});

adSpendWorker.on('completed', (job) => {
  logger.info(`Ad spend monitoring job ${job.id} completed`);
});

adSpendWorker.on('failed', (job, err) => {
  logger.error(`Ad spend monitoring job ${job.id} failed:`, err);
});

inventorySyncWorker.on('completed', (job) => {
  logger.info(`Inventory sync job ${job.id} completed`);
});

inventorySyncWorker.on('failed', (job, err) => {
  logger.error(`Inventory sync job ${job.id} failed:`, err);
});

// ============================================================================
// Scheduled Jobs Setup
// ============================================================================

export async function setupScheduledJobs() {
  logger.info('Setting up scheduled jobs...');

  // Health checks - every hour
  await healthCheckQueue.add(
    'scheduled-health-check',
    { type: 'scheduled' },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour at minute 0
      },
    }
  );

  // Ad spend monitoring - every 15 minutes
  await adSpendQueue.add(
    'scheduled-ad-monitoring',
    { type: 'scheduled' },
    {
      repeat: {
        pattern: '*/15 * * * *', // Every 15 minutes
      },
    }
  );

  // Inventory sync - daily at 2 AM
  await inventorySyncQueue.add(
    'scheduled-inventory-sync',
    { type: 'scheduled' },
    {
      repeat: {
        pattern: '0 2 * * *', // Daily at 2 AM
      },
    }
  );

  logger.info('✅ Scheduled jobs configured');
}

// ============================================================================
// Manual Job Triggers
// ============================================================================

export async function triggerHealthCheck(userId) {
  return await healthCheckQueue.add('manual-health-check', { userId });
}

export async function triggerAdSpendMonitoring(campaignId) {
  return await adSpendQueue.add('manual-ad-monitoring', { campaignId });
}

export async function triggerInventorySync(platformId) {
  return await inventorySyncQueue.add('manual-inventory-sync', { platformId });
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

export async function shutdown() {
  logger.info('Shutting down workers...');

  await healthCheckWorker.close();
  await adSpendWorker.close();
  await inventorySyncWorker.close();

  await connection.quit();

  logger.info('Workers shut down successfully');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
