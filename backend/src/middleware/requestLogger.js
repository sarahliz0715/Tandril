import logger from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();

  // Log after response is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
}
