// Development-only logging utility
// Logs are only shown in development mode, silent in production

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const logger = {
  /**
   * Log informational messages (development only)
   */
  dev: (...args) => {
    if (isDevelopment) {
      console.log('[DEV]', ...args);
    }
  },

  /**
   * Log debug information (development only)
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Log warnings (always shown)
   */
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Log errors (always shown)
   */
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log API calls (development only)
   */
  api: (method, url, ...args) => {
    if (isDevelopment) {
      console.log(`[API ${method}]`, url, ...args);
    }
  },

  /**
   * Log component lifecycle events (development only)
   */
  lifecycle: (component, event, ...args) => {
    if (isDevelopment) {
      console.log(`[${component}] ${event}`, ...args);
    }
  }
};

export default logger;
