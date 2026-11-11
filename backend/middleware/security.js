/**
 * PENDO Security Middleware
 * Centralized security utilities for authentication, rate limiting, and CORS
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ── SECURITY: No hardcoded fallback secrets ─────────────────────────────
const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production!');
    return crypto.randomBytes(64).toString('hex');
  }
  console.warn('⚠️ JWT_SECRET not set — using auto-generated secret (dev only)');
  return crypto.randomBytes(64).toString('hex');
})();
const CRON_SECRET = process.env.CRON_SECRET || '';

// ── JWT Authentication ────────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const auth = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Token requis', status: 401 });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, error: 'Token invalide ou expiré', status: 403 });
    req.user = user;
    next();
  });
}

function optionalAuth(req, res, next) {
  const auth = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => { if (!err) req.user = user; });
  }
  next();
}

// SECURITY: Only trust JWT-decoded user, never arbitrary headers
function getUserId(req) {
  return req.user?.id || 'guest';
}

// ── Cron/Admin Auth ───────────────────────────────────────────────────
function verifyCronSecret(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers['authorization'];
    const querySecret = req.query.secret;
    const vercelCron = req.headers['x-vercel-cron'];

    if (CRON_SECRET) {
      if (authHeader === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET) {
        return next();
      }
      return res.status(403).json({ success: false, error: 'Accès interdit — secret invalide', status: 403 });
    }

    // Fallback: accept x-vercel-cron when CRON_SECRET not configured
    if (vercelCron) {
      console.warn('⚠️ CRON_SECRET not set — using x-vercel-cron fallback.');
      return next();
    }

    return res.status(403).json({ success: false, error: 'Cron not configured', status: 403 });
  }
  next();
}

// ── Rate Limiting ─────────────────────────────────────────────────────
const rateLimitStore = {};

// Auto-cleanup every 15 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetAt < now) delete rateLimitStore[key];
  }
}, 15 * 60 * 1000);

function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = (req.ip || req.headers['x-forwarded-for'] || 'unknown') + ':' + req.path;
    const now = Date.now();
    if (!rateLimitStore[key] || rateLimitStore[key].resetAt < now) {
      rateLimitStore[key] = { count: 1, resetAt: now + windowMs };
      return next();
    }
    rateLimitStore[key].count++;
    if (rateLimitStore[key].count > maxRequests) {
      return res.status(429).json({ success: false, error: 'Trop de requêtes, réessayez plus tard', status: 429 });
    }
    next();
  };
}

// ── CORS Configuration ────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://pendo-frontend.vercel.app',
  'https://pendo-africa.vercel.app',
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:5173'] : [])
];

function corsOriginCheck(origin, callback) {
  if (!origin) return callback(null, true); // Allow cron, curl, mobile
  if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
  callback(new Error('CORS non autorisé pour: ' + origin));
}

module.exports = {
  JWT_SECRET,
  CRON_SECRET,
  authenticateToken,
  optionalAuth,
  getUserId,
  verifyCronSecret,
  rateLimit,
  ALLOWED_ORIGINS,
  corsOriginCheck,
  authRateLimit: rateLimit(10, 15 * 60 * 1000),
  apiRateLimit: rateLimit(100, 60 * 1000)
};
