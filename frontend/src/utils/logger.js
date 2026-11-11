/**
 * Centralized logger — silences console in production builds.
 *
 * Usage:
 *   import logger from '../utils/logger';
 *   logger.error('...', err);  // dev only; prod routes to errorReporter if set
 *   logger.warn('...')         // dev only
 *   logger.info('...')         // dev only
 *
 * Plug Sentry (or any reporter) later:
 *   import { setErrorReporter } from './utils/logger';
 *   setErrorReporter((level, ...args) => Sentry.captureException(args[1] ?? args[0]));
 */

const isDev = process.env.NODE_ENV !== 'production';

let errorReporter = null;

export const setErrorReporter = (fn) => {
  errorReporter = typeof fn === 'function' ? fn : null;
};

const safeReport = (level, args) => {
  if (!errorReporter) return;
  try { errorReporter(level, ...args); } catch (_e) { /* never let reporter crash the app */ }
};

const logger = {
  error: (...args) => {
    if (isDev) console.error(...args);
    safeReport('error', args);
  },
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  info: (...args) => {
    if (isDev) console.info(...args);
  },
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  debug: (...args) => {
    if (isDev) console.debug(...args);
  },
};

export default logger;
