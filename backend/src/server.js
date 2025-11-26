import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import 'dotenv/config';
import { createServer } from 'http';

import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

// Routes
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import listingsRouter from './routes/listings.js';
import inventoryRouter from './routes/inventory.js';
import automationsRouter from './routes/automations.js';
import commandsRouter from './routes/commands.js';
import adsRouter from './routes/ads.js';
import alertsRouter from './routes/alerts.js';
import platformsRouter from './routes/platforms.js';
import shopifyRouter from './routes/shopify.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// Middleware
// ============================================================================

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// ============================================================================
// Routes
// ============================================================================

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/automations', automationsRouter);
app.use('/api/commands', commandsRouter);
app.use('/api/ads', adsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/platforms', platformsRouter);
app.use('/api/shopify', shopifyRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handling (must be last)
app.use(errorHandler);

// ============================================================================
// Server startup
// ============================================================================

const server = createServer(app);

server.listen(PORT, () => {
  logger.info(`🚀 Tandril Backend running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
