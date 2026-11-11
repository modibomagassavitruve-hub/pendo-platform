/**
 * PENDO - Serveur Backend COMPLET pour Vercel
 * BUILD_VERSION: 2026-02-18 - v13-FULL-COVERAGE maxFeeds=85 toutes les 54 nations
 * Version avec TOUTES les fonctionnalités (50 feeds) + couverture complète Afrique + v7-decode v8-direct
 *
 * Routes incluses:
 * - /api/status
 * - /api/markets (+ :id, :id/history)
 * - /api/opportunities (+ :id, sectors, countries)
 * - /api/news (+ :id, latest)
 * - /api/portfolio (+ summary, transactions, performance, buy, sell)
 * - /api/indicators (+ :ticker/complete)
 * - /api/stocks (+ :ticker, :ticker/history)
 * - /api/auth (+ register, login, logout, me, profile)
 * - /api/forum (+ categories, threads, posts)
 * - /api/chat (+ conversations, messages)
 * - /api/notifications
 * - /api/analytics
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { Pool } = require('pg');
const https = require('https');
const http = require('http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Charger les variables d'environnement en local
try { require('dotenv').config(); } catch(e) {}

const crypto = require('crypto');
// Polyfill fetch for Node < 18 (Vercel uses 18+ but safety net)
if (typeof globalThis.fetch === 'undefined') {
  try { globalThis.fetch = require('node-fetch'); } catch(e) {}
}

const BUILD_VERSION = '2026-08-15-v25-DS-FEATURES-PROD';

// ── DS features: dédup news, scoring opportunités, anomalies marché ────────
const { deduplicateArticles } = require('./utils/newsDedup');
const { scoreOpportunities } = require('./utils/opportunityScoring');

// ── SECURITY: No hardcoded fallback secrets in production ─────────────────
const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production!');
    // Generate ephemeral secret — tokens won't survive cold starts, but server won't crash
    return crypto.randomBytes(64).toString('hex');
  }
  // Dev only: auto-generate
  console.warn('⚠️ JWT_SECRET not set — using auto-generated secret (dev only)');
  return crypto.randomBytes(64).toString('hex');
})();
const CRON_SECRET = process.env.CRON_SECRET || '';

// ── Middleware CRON Auth ──────────────────────────────────────────────────
// Vercel auto-sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET env is set.
// If CRON_SECRET is not set, fall back to x-vercel-cron header (less secure but functional).
function verifyCronSecret(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers['authorization'];
    const querySecret = req.query.secret;
    const vercelCron = req.headers['x-vercel-cron'];

    // Best: CRON_SECRET is configured — verify it via Authorization header or query param
    if (CRON_SECRET) {
      if (authHeader === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET) {
        return next();
      }
      return res.status(403).json({ success: false, error: 'Accès interdit — secret invalide', status: 403 });
    }

    // No fallback in production — CRON_SECRET is mandatory
    return res.status(403).json({ success: false, error: 'Accès interdit — CRON_SECRET requis', status: 403 });
  }
  next(); // En dev local, pas de vérification
}

// ── Helper pour appels internes authentifiés ─────────────────────────────
function internalCronFetch(req, path) {
  const host = req.headers.host || 'pendo-backend.vercel.app';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const url = `${proto}://${host}${path}`;
  const headers = {};
  if (CRON_SECRET) headers['Authorization'] = `Bearer ${CRON_SECRET}`;
  return fetch(url, { headers }).catch(() => {});
}

// ── Middleware JWT ──────────────────────────────────────────────────────────
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

function getUserId(req) {
  // SECURITY: only trust JWT-decoded user, never trust headers or query params
  return req.user?.id || 'guest';
}
const app = express();

// CORS configuration — whitelist explicite (plus de wildcard regex)
const ALLOWED_ORIGINS = [
  'https://pendo-frontend.vercel.app',
  'https://pendo-africa.vercel.app',
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:5173'] : [])
];
app.use(cors({
  origin: function(origin, callback) {
    // Autoriser les requêtes sans origin (cron, curl, mobile)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('CORS non autorisé pour: ' + origin));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' })); // Limit request body size
app.use(compression({ level: 6 })); // Gzip compression — réduit les réponses de 3-5x

// ── Security headers via helmet ──────────────────────────────────────────
const helmet = require('helmet');
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", "https://s3.tradingview.com", "https://cdn.jsdelivr.net"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc:      ["'self'", "data:", "https:", "blob:"],
      connectSrc:  [
        "'self'",
        "https://pendo-backend.vercel.app",
        "https://pendo-frontend.vercel.app",
        "https://pendo-africa.vercel.app",
        "https://api.allorigins.win",
        "https://api.codetabs.com",
        "wss:",
      ],
      frameSrc:    ["'self'", "https://s.tradingview.com", "https://www.tradingview.com"],
      objectSrc:   ["'none'"],
      baseUri:     ["'self'"],
      formAction:  ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// ── Cache-Control for public data endpoints ─────────────────────────────────
function cachePublic(seconds) {
  return (req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`);
    next();
  };
}

// ── Input sanitization helper ─────────────────────────────────────────────
function sanitizeHtml(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Rate Limiting (in-memory, with auto-cleanup) ────────────────────────────
const rateLimitStore = {};
// Auto-cleanup every 10 minutes to prevent memory leaks (standalone mode)
setInterval(() => {
  const now = Date.now();
  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetAt < now) delete rateLimitStore[key];
  }
}, 10 * 60 * 1000);
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
const authRateLimit = rateLimit(10, 15 * 60 * 1000); // 10 requêtes / 15 min pour auth
const apiRateLimit = rateLimit(120, 60 * 1000); // 120 requêtes / min pour API générale

// ── Appliquer rate limit sur toutes les routes /api/ (sauf crons) ──────────
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/cron/')) return next(); // Crons exemptés
  return apiRateLimit(req, res, next);
});

// ── IMPORTANT: declare pool + DATABASE_URL BEFORE calling initDB() ─────────
// (let/const have TDZ - they must be initialized before initDB() references them)
const PORT = process.env.PORT || 3001;
// SECURITY: No hardcoded database credentials — env var only
const DATABASE_URL = process.env.DATABASE_URL || null;

let pool = null;

console.log('🚀 PENDO Backend COMPLET démarrage...');
console.log(`📦 Port: ${PORT}`);
console.log(`🗄️  DATABASE_URL présente: ${DATABASE_URL ? 'OUI' : 'NON — Mode démonstration'}`);

// ── Vercel serverless: wait for DB init before processing ANY request ──────
// initDB() is a hoisted async function declaration - called once here
const _dbInitPromise = initDB();
let _dbInitDone = false;
_dbInitPromise.then(() => { _dbInitDone = true; }).catch(() => { _dbInitDone = true; });

// Track lazy reconnect to avoid concurrent re-inits
let _reconnectPromise = null;
// Race a promise against a timeout — resolves with undefined on timeout so requests pass through in degraded mode
const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);

app.use(async (req, res, next) => {
  // Wait for cold-start init to complete (bounded: don't block past 8s)
  if (!_dbInitDone) {
    await withTimeout(_dbInitPromise.catch(() => {}), 8000);
    _dbInitDone = true;
  }
  // Lazy reconnect: if pool is null (init failed) and DATABASE_URL exists, retry once per burst
  // Shared promise prevents thundering herd; 8s cap prevents Vercel 10s function timeout
  if (!pool && DATABASE_URL) {
    if (!_reconnectPromise) {
      _reconnectPromise = initDB(1).finally(() => { _reconnectPromise = null; });
    }
    await withTimeout(_reconnectPromise.catch(() => {}), 8000);
  }
  next();
});

// ============================================
// DONNÉES STATIQUES
// ============================================

// baseValues mirrored from services/realTimeMarkets.js MARKET_CONFIG (source of truth — updated 2026-04-04)
const AFRICAN_MARKETS = [
  { id: 'jse',    name: 'JSE All Share',  country: 'Afrique du Sud', countryCode: 'ZA', baseValue: 116123,  currency: 'ZAR', timezone: 'Africa/Johannesburg',  openTime: '09:00', closeTime: '17:00' },
  { id: 'masi',   name: 'MASI',           country: 'Maroc',          countryCode: 'MA', baseValue: 17515,   currency: 'MAD', timezone: 'Africa/Casablanca',     openTime: '09:30', closeTime: '15:30' },
  { id: 'nse_ng', name: 'NGX All Share',  country: 'Nigeria',        countryCode: 'NG', baseValue: 201699,  currency: 'NGN', timezone: 'Africa/Lagos',          openTime: '10:00', closeTime: '14:30' },
  { id: 'egx',    name: 'EGX 30',         country: 'Égypte',         countryCode: 'EG', baseValue: 47276,   currency: 'EGP', timezone: 'Africa/Cairo',          openTime: '10:00', closeTime: '14:30' },
  { id: 'nse_ke', name: 'NSE 20',         country: 'Kenya',          countryCode: 'KE', baseValue: 199,     currency: 'KES', timezone: 'Africa/Nairobi',        openTime: '09:30', closeTime: '15:00' },
  { id: 'brvm',   name: 'BRVM Composite', country: 'UEMOA',          countryCode: 'CI', baseValue: 410,     currency: 'XOF', timezone: 'Africa/Abidjan',        openTime: '09:00', closeTime: '15:30' },
  { id: 'gse',    name: 'GSE Composite',  country: 'Ghana',          countryCode: 'GH', baseValue: 13041,   currency: 'GHS', timezone: 'Africa/Accra',          openTime: '09:30', closeTime: '15:00' },
  { id: 'bse',    name: 'BSE DCI',        country: 'Botswana',       countryCode: 'BW', baseValue: 11083,   currency: 'BWP', timezone: 'Africa/Gaborone',       openTime: '09:00', closeTime: '15:30' },
  { id: 'luse',   name: 'LASI',           country: 'Zambie',         countryCode: 'ZM', baseValue: 27295,   currency: 'ZMW', timezone: 'Africa/Lusaka',         openTime: '10:00', closeTime: '12:00' },
  { id: 'zse',    name: 'ZSE All Share',  country: 'Zimbabwe',       countryCode: 'ZW', baseValue: 359,     currency: 'ZWG', timezone: 'Africa/Harare',         openTime: '10:00', closeTime: '14:00' },
  { id: 'sem',    name: 'SEMDEX',         country: 'Maurice',        countryCode: 'MU', baseValue: 2487,    currency: 'MUR', timezone: 'Indian/Mauritius',      openTime: '09:00', closeTime: '13:30' },
  { id: 'dse',    name: 'DSEI',           country: 'Tanzanie',       countryCode: 'TZ', baseValue: 3840,    currency: 'TZS', timezone: 'Africa/Dar_es_Salaam',  openTime: '10:00', closeTime: '14:00' },
  { id: 'use',    name: 'USE All Share',  country: 'Ouganda',        countryCode: 'UG', baseValue: 1956,    currency: 'UGX', timezone: 'Africa/Kampala',        openTime: '09:30', closeTime: '14:00' },
  { id: 'rse',    name: 'RSE All Share',  country: 'Rwanda',         countryCode: 'RW', baseValue: 189,     currency: 'RWF', timezone: 'Africa/Kigali',         openTime: '09:00', closeTime: '12:00' },
  { id: 'bvmt',   name: 'TUNINDEX',       country: 'Tunisie',        countryCode: 'TN', baseValue: 15380,   currency: 'TND', timezone: 'Africa/Tunis',          openTime: '09:00', closeTime: '14:10' },
  { id: 'nsx',    name: 'NSX Overall',    country: 'Namibie',        countryCode: 'NA', baseValue: 1667,    currency: 'NAD', timezone: 'Africa/Windhoek',       openTime: '09:00', closeTime: '17:00' },
  { id: 'mse',    name: 'MSE All Share',  country: 'Malawi',         countryCode: 'MW', baseValue: 574588,  currency: 'MWK', timezone: 'Africa/Blantyre',       openTime: '10:00', closeTime: '14:00' }
];

// Actions principales africaines
const AFRICAN_STOCKS = [
  { ticker: 'SNTS', name: 'Sonatel', exchange: 'brvm', sector: 'Télécoms', price: 15750, currency: 'XOF' },
  { ticker: 'SGBC', name: 'Société Générale CI', exchange: 'brvm', sector: 'Finance', price: 12800, currency: 'XOF' },
  { ticker: 'SOLB', name: 'Solibra', exchange: 'brvm', sector: 'Industrie', price: 154000, currency: 'XOF' },
  { ticker: 'ONTB', name: 'Onatel BF', exchange: 'brvm', sector: 'Télécoms', price: 3200, currency: 'XOF' },
  { ticker: 'COMC', name: 'CFAO Motors CI', exchange: 'brvm', sector: 'Commerce', price: 620, currency: 'XOF' },
  { ticker: 'ETIT', name: 'Ecobank TI', exchange: 'brvm', sector: 'Finance', price: 14, currency: 'XOF' },
  { ticker: 'BOAB', name: 'BOA Bénin', exchange: 'brvm', sector: 'Finance', price: 5100, currency: 'XOF' },
  { ticker: 'NSBC', name: 'NSIA Banque CI', exchange: 'brvm', sector: 'Finance', price: 6100, currency: 'XOF' },
  { ticker: 'BICC', name: 'BICICI', exchange: 'brvm', sector: 'Finance', price: 7400, currency: 'XOF' },
  { ticker: 'ORGT', name: 'Oragroup', exchange: 'brvm', sector: 'Finance', price: 3880, currency: 'XOF' },
  { ticker: 'MTN', name: 'MTN Nigeria', exchange: 'nse_ng', sector: 'Télécoms', price: 285, currency: 'NGN' },
  { ticker: 'DANGCEM', name: 'Dangote Cement', exchange: 'nse_ng', sector: 'Industrie', price: 290, currency: 'NGN' },
  { ticker: 'GTCO', name: 'GTBank', exchange: 'nse_ng', sector: 'Finance', price: 45, currency: 'NGN' },
  { ticker: 'ZENITH', name: 'Zenith Bank', exchange: 'nse_ng', sector: 'Finance', price: 38, currency: 'NGN' },
  { ticker: 'AIRTEL', name: 'Airtel Africa', exchange: 'nse_ng', sector: 'Télécoms', price: 1850, currency: 'NGN' },
  { ticker: 'NPN', name: 'Naspers', exchange: 'jse', sector: 'Tech', price: 3250, currency: 'ZAR' },
  { ticker: 'SOL', name: 'Sasol', exchange: 'jse', sector: 'Énergie', price: 185, currency: 'ZAR' },
  { ticker: 'SBK', name: 'Standard Bank', exchange: 'jse', sector: 'Finance', price: 175, currency: 'ZAR' },
  { ticker: 'FSR', name: 'FirstRand', exchange: 'jse', sector: 'Finance', price: 68, currency: 'ZAR' },
  { ticker: 'AGL', name: 'Anglo American', exchange: 'jse', sector: 'Mines', price: 520, currency: 'ZAR' },
  { ticker: 'IAM', name: 'Maroc Telecom', exchange: 'masi', sector: 'Télécoms', price: 128, currency: 'MAD' },
  { ticker: 'ATW', name: 'Attijariwafa Bank', exchange: 'masi', sector: 'Finance', price: 485, currency: 'MAD' },
  { ticker: 'BCP', name: 'Banque Populaire', exchange: 'masi', sector: 'Finance', price: 265, currency: 'MAD' },
  { ticker: 'SCOM', name: 'Safaricom', exchange: 'nse_ke', sector: 'Télécoms', price: 28, currency: 'KES' },
  { ticker: 'EQTY', name: 'Equity Bank', exchange: 'nse_ke', sector: 'Finance', price: 42, currency: 'KES' }
];

// Données de démonstration pour les opportunités
// publishedAt: static ISO strings — stable across cold starts
const DEMO_OPPORTUNITIES = [
  {
    id: 1, title: 'Expansion du réseau Sonatel', sector: 'Télécoms', country: 'Sénégal', countryCode: 'SN',
    ticker: 'SNTS', current_price: 15750,
    description: 'Sonatel investit massivement dans l\'extension de la couverture 4G/5G en Afrique de l\'Ouest, offrant une opportunité de croissance significative.',
    minInvestment: 500000, maxInvestment: 50000000, expectedReturn: '15-20%', riskLevel: 'medium',
    status: 'active', publishedAt: '2026-04-18T08:00:00.000Z', views: 1250, currency: 'XOF',
    highlights: ['Leader du marché', 'Croissance 5G', 'Dividendes réguliers'], tags: ['télécoms', 'croissance', 'dividendes']
  },
  {
    id: 2, title: 'Projet solaire au Maroc', sector: 'Énergie', country: 'Maroc', countryCode: 'MA',
    ticker: null, current_price: null,
    description: 'Participation au développement d\'un parc solaire de 200MW dans la région de Ouarzazate.',
    minInvestment: 1000000, maxInvestment: 100000000, expectedReturn: '12-18%', riskLevel: 'medium',
    status: 'active', publishedAt: '2026-04-17T09:00:00.000Z', views: 890, currency: 'MAD',
    highlights: ['Énergie renouvelable', 'Soutien gouvernemental', 'Contrats long terme'], tags: ['solaire', 'green', 'infrastructure']
  },
  {
    id: 3, title: 'Fintech nigériane en expansion', sector: 'Tech', country: 'Nigeria', countryCode: 'NG',
    ticker: 'FLUTW', current_price: null,
    description: 'Investissement dans une fintech leader proposant des services de paiement mobile à travers l\'Afrique.',
    minInvestment: 200000, maxInvestment: 20000000, expectedReturn: '25-40%', riskLevel: 'high',
    status: 'active', publishedAt: '2026-04-16T10:00:00.000Z', views: 2100, currency: 'NGN',
    highlights: ['Forte croissance', 'Marché en expansion', 'Équipe expérimentée'], tags: ['fintech', 'mobile', 'paiement']
  },
  {
    id: 4, title: 'Immobilier commercial à Abidjan', sector: 'Immobilier', country: 'Côte d\'Ivoire', countryCode: 'CI',
    ticker: null, current_price: null,
    description: 'Développement d\'un centre commercial premium dans le quartier de Cocody.',
    minInvestment: 5000000, maxInvestment: 500000000, expectedReturn: '10-15%', riskLevel: 'low',
    status: 'active', publishedAt: '2026-04-15T08:00:00.000Z', views: 750, currency: 'XOF',
    highlights: ['Emplacement premium', 'Locataires confirmés', 'Rendement stable'], tags: ['immobilier', 'commercial', 'cocody']
  },
  {
    id: 5, title: 'Agriculture moderne au Kenya', sector: 'Agriculture', country: 'Kenya', countryCode: 'KE',
    ticker: 'EQTY', current_price: 42,
    description: 'Ferme high-tech utilisant l\'irrigation intelligente et les technologies IoT pour l\'agriculture durable.',
    minInvestment: 300000, maxInvestment: 30000000, expectedReturn: '18-25%', riskLevel: 'medium',
    status: 'active', publishedAt: '2026-04-14T09:00:00.000Z', views: 1450, currency: 'KES',
    highlights: ['Agriculture 4.0', 'Export international', 'Impact social'], tags: ['agritech', 'durable', 'export']
  },
  {
    id: 6, title: 'Mines d\'or au Ghana', sector: 'Mines', country: 'Ghana', countryCode: 'GH',
    ticker: null, current_price: null,
    description: 'Participation dans une mine d\'or opérationnelle avec des réserves prouvées importantes.',
    minInvestment: 2000000, maxInvestment: 200000000, expectedReturn: '20-30%', riskLevel: 'high',
    status: 'active', publishedAt: '2026-04-13T08:00:00.000Z', views: 980, currency: 'GHS',
    highlights: ['Réserves prouvées', 'Production active', 'Prix de l\'or favorable'], tags: ['or', 'mines', 'commodités']
  },
  {
    id: 7, title: 'E-commerce panafricain', sector: 'Tech', country: 'Nigeria', countryCode: 'NG',
    ticker: 'JUMIA', current_price: null,
    description: 'Plateforme e-commerce servant 15 pays africains avec une logistique intégrée.',
    minInvestment: 100000, maxInvestment: 10000000, expectedReturn: '30-50%', riskLevel: 'high',
    status: 'active', publishedAt: '2026-04-12T10:00:00.000Z', views: 3200, currency: 'USD',
    highlights: ['Présence panafricaine', 'Croissance explosive', 'Investisseurs majeurs'], tags: ['ecommerce', 'logistique', 'digital']
  },
  {
    id: 8, title: 'Banque digitale en Afrique de l\'Est', sector: 'Finance', country: 'Rwanda', countryCode: 'RW',
    ticker: null, current_price: null,
    description: 'Néobanque ciblant les populations non-bancarisées avec des services mobiles innovants.',
    minInvestment: 500000, maxInvestment: 50000000, expectedReturn: '22-35%', riskLevel: 'medium',
    status: 'active', publishedAt: '2026-04-11T08:00:00.000Z', views: 1800, currency: 'RWF',
    highlights: ['Inclusion financière', 'Technologie moderne', 'Régulation favorable'], tags: ['neobanque', 'mobile', 'inclusion']
  }
];

// Données de démonstration pour les actualités
// Timestamps statiques — stable across cold starts, no drift on each deploy
const DEMO_NEWS = [
  {
    id: 1, title: 'La BRVM atteint un nouveau record historique',
    summary: 'L\'indice BRVM Composite a franchi la barre symbolique des 410 points, porté par les performances exceptionnelles du secteur bancaire.',
    content: 'L\'indice phare de la Bourse Régionale des Valeurs Mobilières (BRVM) a clôturé à 412,35 points ce vendredi...',
    source: 'BRVM News', category: 'Marché', market_id: 'brvm',
    image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    published_at: '2026-04-22T10:00:00.000Z',
    author: 'Amadou Diallo', tags: ['BRVM', 'record', 'banques']
  },
  {
    id: 2, title: 'Sonatel annonce des résultats en hausse de 12%',
    summary: 'Le groupe Sonatel affiche une croissance de 12% de son chiffre d\'affaires au premier semestre.',
    content: 'Sonatel, filiale d\'Orange en Afrique de l\'Ouest, a publié ce matin ses résultats du premier semestre...',
    source: 'Financial Afrik', category: 'Entreprise', market_id: 'brvm',
    image_url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800',
    published_at: '2026-04-22T07:00:00.000Z',
    author: 'Marie Koné', tags: ['Sonatel', 'Orange', 'télécoms']
  },
  {
    id: 3, title: 'Le Nigeria renforce sa position économique',
    summary: 'La bourse de Lagos enregistre des flux record d\'investissements étrangers.',
    content: 'Le Nigerian Stock Exchange (NGX) a enregistré un afflux de capitaux étrangers de 2,3 milliards de dollars...',
    source: 'NGX News', category: 'Économie', market_id: 'nse_ng',
    image_url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800',
    published_at: '2026-04-22T04:00:00.000Z',
    author: 'Chidi Okonkwo', tags: ['Nigeria', 'NGX', 'investissements']
  },
  {
    id: 4, title: 'Le MASI poursuit sa tendance haussière',
    summary: 'L\'indice principal de la Bourse de Casablanca gagne 2.3% cette semaine.',
    content: 'Le MASI a clôturé la semaine à 17 515 points, enregistrant une progression de 2,3%...',
    source: 'Bourse de Casablanca', category: 'Marché', market_id: 'masi',
    image_url: 'https://images.unsplash.com/photo-1565688534245-05d6b5be184a?w=800',
    published_at: '2026-04-22T00:00:00.000Z',
    author: 'Youssef El Amrani', tags: ['Maroc', 'MASI', 'banques']
  },
  {
    id: 5, title: 'L\'Afrique du Sud attire les investisseurs',
    summary: 'La JSE enregistre un afflux de capitaux étrangers suite aux réformes économiques.',
    content: 'La Johannesburg Stock Exchange a vu affluer plus de 1,5 milliard de dollars d\'investissements...',
    source: 'JSE News', category: 'Investissement', market_id: 'jse',
    image_url: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800',
    published_at: '2026-04-21T12:00:00.000Z',
    author: 'Thabo Mbeki Jr', tags: ['Afrique du Sud', 'JSE', 'investissements']
  },
  {
    id: 6, title: 'Kenya: La NSE lance des produits dérivés',
    summary: 'La Bourse de Nairobi diversifie son offre avec des contrats à terme.',
    content: 'Le Nairobi Securities Exchange a annoncé le lancement de contrats à terme sur le thé et le café...',
    source: 'NSE Kenya', category: 'Innovation', market_id: 'nse_ke',
    image_url: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800',
    published_at: '2026-04-21T00:00:00.000Z',
    author: 'Wanjiku Mwangi', tags: ['Kenya', 'NSE', 'dérivés']
  }
];

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

async function initDB(maxAttempts = 3) {
  if (!DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL non configurée - Mode démonstration');
    return false;
  }
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (pool) { try { await pool.end(); } catch(_) {} pool = null; }
    try {
      pool = new Pool({
        connectionString: DATABASE_URL,
        // rejectUnauthorized: false required for providers with self-signed certs (Neon, Supabase, Render, etc.)
        ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
    });
    const result = await pool.query('SELECT NOW()');
    console.log(`✅ [v${BUILD_VERSION}] PostgreSQL connecté:`, result.rows[0].now);

    // ── Schema version check: skip migration if already up-to-date ─────────
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS _schema_version (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())`);
      const vCheck = await pool.query(`SELECT version FROM _schema_version WHERE version = $1`, [BUILD_VERSION]);
      if (vCheck.rows.length > 0) {
        // Verify critical tables actually exist before skipping migration
        const tCheck = await pool.query(`SELECT to_regclass('public.users') as tbl`);
        if (tCheck.rows[0].tbl) {
          console.log(`✅ Schema already at ${BUILD_VERSION} — skipping migration`);
          return true;
        }
        console.warn(`⚠️ Version ${BUILD_VERSION} stamped but tables missing — re-running migration`);
      }
    } catch(e) { /* first run — continue with migration */ }

    // ── Tables de base ────────────────────────────────────────────────────────
    await pool.query(`CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY, title TEXT NOT NULL, summary TEXT,
      url TEXT UNIQUE, source_url TEXT, source TEXT, category TEXT,
      market_id TEXT, country TEXT,
      published_at TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // ── Utilisateurs ──────────────────────────────────────────────────────────
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      avatar TEXT,
      bio TEXT,
      preferences JSONB DEFAULT '{"language":"fr","currency":"XOF","notifications":true}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // ── Portfolio ─────────────────────────────────────────────────────────────
    await pool.query(`CREATE TABLE IF NOT EXISTS portfolio_cash (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
      balance DECIMAL(18,4) NOT NULL DEFAULT 10000000.00,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS portfolio_holdings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ticker TEXT NOT NULL,
      company_name TEXT,
      quantity DECIMAL(18,6) NOT NULL DEFAULT 0,
      avg_buy_price DECIMAL(18,4) NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, ticker)
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS portfolio_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ticker TEXT NOT NULL,
      company_name TEXT,
      type TEXT NOT NULL,
      quantity DECIMAL(18,6) NOT NULL,
      price DECIMAL(18,4) NOT NULL,
      total DECIMAL(18,4) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS price_alerts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ticker TEXT NOT NULL,
      condition TEXT NOT NULL,
      target_price DECIMAL(18,4) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      triggered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // ── Forum ─────────────────────────────────────────────────────────────────
    await pool.query(`CREATE TABLE IF NOT EXISTS forum_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '💬',
      color TEXT DEFAULT 'orange',
      sort_order INTEGER DEFAULT 0,
      threads_count INTEGER DEFAULT 0,
      posts_count INTEGER DEFAULT 0
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS forum_threads (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES forum_categories(id),
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      replies INTEGER DEFAULT 0,
      is_pinned BOOLEAN DEFAULT false,
      is_closed BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS forum_posts (
      id SERIAL PRIMARY KEY,
      thread_id INTEGER REFERENCES forum_threads(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT,
      content TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS forum_likes (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, target_type, target_id)
    )`);

    // ── Chat ─────────────────────────────────────────────────────────────────
    await pool.query(`CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      conversation_id TEXT NOT NULL DEFAULT 'public',
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT,
      avatar TEXT,
      content TEXT NOT NULL,
      is_deleted BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_conv ON chat_messages(conversation_id, created_at)`);

    // ── Notifications ────────────────────────────────────────────────────────
    await pool.query(`CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      email TEXT,
      name TEXT,
      category TEXT DEFAULT 'general',
      rating INTEGER,
      message TEXT NOT NULL,
      page TEXT,
      user_agent TEXT,
      user_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'system',
      title TEXT NOT NULL,
      message TEXT,
      is_read BOOLEAN DEFAULT false,
      data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // ── Investment Opportunities ────────────────────────────────────────────
    await pool.query(`CREATE TABLE IF NOT EXISTS investment_opportunities (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT,
      sector TEXT,
      subsector TEXT,
      country TEXT,
      country_name TEXT,
      region TEXT,
      summary TEXT,
      description TEXT,
      opportunity_type TEXT DEFAULT 'investment',
      min_investment DECIMAL(18,2),
      max_investment DECIMAL(18,2),
      expected_return_min DECIMAL(5,2),
      expected_return_max DECIMAL(5,2),
      investment_horizon TEXT,
      risk_level TEXT DEFAULT 'medium',
      company_name TEXT,
      company_size TEXT,
      source_name TEXT,
      source_url TEXT,
      url TEXT,
      status TEXT DEFAULT 'active',
      score INTEGER DEFAULT 50,
      published_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      scraped_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_opps_published ON investment_opportunities(published_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_opps_sector ON investment_opportunities(sector)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_opps_country ON investment_opportunities(country)`);

    // ── Seed forum categories (idempotent) ────────────────────────────────────
    // Bug fix 2026-04: le précédent `ON CONFLICT DO NOTHING` sans contrainte
    // UNIQUE sur `name` ne faisait rien détecter (PK SERIAL auto-généré),
    // donc chaque cold start réinsérait les 6 catégories. Conséquence:
    // ~2099 cold starts → 12594 doublons. On répare en 3 étapes:
    //   1) dédup (garder MIN(id) par name) — safe si forum_threads pointent
    //      sur les "canoniques", on les re-mappe AVANT suppression
    //   2) CREATE UNIQUE INDEX IF NOT EXISTS sur (name)
    //   3) INSERT ... ON CONFLICT (name) DO NOTHING
    try {
      // 1) Re-map: les threads qui référencent un doublon pointent vers le canonique
      await pool.query(`
        WITH canon AS (
          SELECT name, MIN(id) AS keep_id FROM forum_categories GROUP BY name
        )
        UPDATE forum_threads t
        SET category_id = canon.keep_id
        FROM forum_categories fc
        JOIN canon ON canon.name = fc.name
        WHERE t.category_id = fc.id
          AND fc.id <> canon.keep_id
      `);
      // 2) Supprimer les doublons (garde le plus petit id par name)
      await pool.query(`
        DELETE FROM forum_categories fc
        USING (
          SELECT name, MIN(id) AS keep_id FROM forum_categories GROUP BY name
        ) canon
        WHERE fc.name = canon.name AND fc.id <> canon.keep_id
      `);
      // 3) Index UNIQUE idempotent
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_forum_categories_name ON forum_categories(name)`);
    } catch(e) {
      console.warn('[init-db] forum_categories dedup warning:', e.message);
    }
    // 4) Seed idempotent (désormais réellement no-op grâce à l'index UNIQUE)
    await pool.query(`INSERT INTO forum_categories (name, description, icon, color, sort_order) VALUES
      ('Marchés Africains', 'Discussion sur les bourses et marchés africains', '📈', 'orange', 1),
      ('Analyse Technique', 'Analyses techniques, indicateurs, graphiques', '🔍', 'blue', 2),
      ('Opportunités', 'Partage d''opportunités d''investissement', '💡', 'green', 3),
      ('Débutants', 'Questions et conseils pour les nouveaux investisseurs', '🎓', 'purple', 4),
      ('Actualités', 'Commentaires sur les actualités financières africaines', '📰', 'yellow', 5),
      ('Cryptomonnaies', 'Discussions sur les crypto et blockchain en Afrique', '₿', 'red', 6)
      ON CONFLICT (name) DO NOTHING`);

    // ── Migration: colonnes de traduction multilingues ──────────────────────
    const TRANSLATION_LANGS = ['fr','en','es','ar','de','pt','sw','ha','yo','am','ig','zu','xh','af','sn','st','ee','ln','ts','wo','bm','ff','fon','tw','kg','sg','tn','nd','ss'];
    for (const lang of TRANSLATION_LANGS) {
      try {
        await pool.query(`ALTER TABLE investment_opportunities ADD COLUMN IF NOT EXISTS title_${lang} TEXT`);
        await pool.query(`ALTER TABLE investment_opportunities ADD COLUMN IF NOT EXISTS summary_${lang} TEXT`);
        await pool.query(`ALTER TABLE investment_opportunities ADD COLUMN IF NOT EXISTS description_${lang} TEXT`);
      } catch(e) {}
      try {
        await pool.query(`ALTER TABLE news ADD COLUMN IF NOT EXISTS title_${lang} TEXT`);
        await pool.query(`ALTER TABLE news ADD COLUMN IF NOT EXISTS summary_${lang} TEXT`);
        await pool.query(`ALTER TABLE news ADD COLUMN IF NOT EXISTS content_${lang} TEXT`);
      } catch(e) {}
    }
    console.log(`✅ Colonnes de traduction vérifiées pour ${TRANSLATION_LANGS.length} langues`);

    // ── Stamp schema version so next cold start skips migration ──────────
    try {
      await pool.query(`INSERT INTO _schema_version (version) VALUES ($1) ON CONFLICT DO NOTHING`, [BUILD_VERSION]);
    } catch(e) {}

    console.log(`✅ Toutes les tables prêtes (v${BUILD_VERSION})`);
      return true;
    } catch (error) {
      console.error(`❌ initDB attempt ${attempt}/${maxAttempts}:`, error.message, 'code:', error.code);
      if (pool) { try { await pool.end(); } catch(_) {} pool = null; }
      if (attempt < maxAttempts) {
        // Wait 2s before retry (pgBouncer transient errors often resolve quickly)
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
    }
  }
  console.error('❌ Toutes les tentatives initDB ont échoué — mode démonstration');
  return false;
}

function formatResponse(data, meta = {}) {
  return {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), ...meta }
  };
}

function formatError(message, code = 500) {
  return {
    success: false,
    error: { message, code },
    meta: { timestamp: new Date().toISOString() }
  };
}

// Returns true for any error that indicates the DB is unavailable or schema not ready.
function isDbUnavailable(e) {
  return e.code === '42P01'   // relation does not exist
      || e.code === 'XX000'   // Neon: tenant or user not found / internal error
      || e.code === 'ECONNREFUSED'
      || e.code === 'ETIMEDOUT'
      || e.code === 'ENOTFOUND'
      || (e.message && e.message.includes('Tenant or user not found'));
}

// Returns a catch handler that gracefully degrades when PostgreSQL is unavailable.
// Pass a fallback response body (default: empty array) to return in that case.
function pgErrHandler(res, fallback = []) {
  return (e) => {
    console.error('DB error:', e.message, 'code:', e.code);
    if (isDbUnavailable(e)) return res.json(formatResponse(fallback));
    res.status(500).json(formatError('Erreur interne', 500));
  };
}

// Seeded PRNG (mulberry32) so historical data is stable across requests
function seededRand(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Daily seed: stable within a calendar day, rotates at midnight UTC.
// Use for market/stock figures that should look "live" but be consistent per session.
function dailySeed(key) {
  const dayEpoch = Math.floor(Date.now() / 86400000); // changes each UTC day
  const keySeed = String(key).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return seededRand((keySeed * 31337 + dayEpoch) >>> 0);
}

function generateHistoricalData(baseValue, period = '1M', seed = 42) {
  // Mapping Yahoo Finance → interne (supporte les deux formats)
  const periodMap = {
    '1d': '1D', '5d': '1W', '1mo': '1M', '3mo': '3M',
    '6mo': '6M', '1y': '1Y', '5y': '5Y'
  };
  const normalizedPeriod = periodMap[period] || period.toUpperCase();

  const periods = {
    '1D': { days: 1, interval: 5 },
    '1W': { days: 7, interval: 60 },
    '1M': { days: 30, interval: 1440 },
    '3M': { days: 90, interval: 1440 },
    '6M': { days: 180, interval: 1440 },
    '1Y': { days: 365, interval: 1440 },
    '5Y': { days: 1825, interval: 10080 }
  };
  const config = periods[normalizedPeriod] || periods['1M'];
  const rand = seededRand(seed);
  const dataPoints = [];
  const now = new Date();
  let currentValue = baseValue * 0.9;
  const trend = 0.0002;
  const volatility = 0.015;
  const totalPoints = Math.min(config.days * 1440 / config.interval, 365);
  for (let i = totalPoints; i >= 0; i--) {
    const date = new Date(now.getTime() - i * config.interval * 60000);
    const change = (rand() - 0.48) * volatility + trend;
    currentValue = currentValue * (1 + change);
    dataPoints.push({
      date: date.toISOString(),
      timestamp: date.getTime(),
      open: currentValue * (1 + (rand() - 0.5) * 0.005),
      high: currentValue * (1 + rand() * 0.01),
      low: currentValue * (1 - rand() * 0.01),
      close: currentValue,
      volume: Math.floor(rand() * 1000000) + 100000
    });
  }
  return dataPoints;
}

function generateTechnicalIndicators(ticker, period = '1M') {
  const tickerSeed = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const basePrice = 100 + seededRand(tickerSeed)() * 900;
  const data = generateHistoricalData(basePrice, period, tickerSeed + 1);
  const closes = data.map(d => d.close);
  const rInd = dailySeed(ticker + '-ind');

  // Calculs des indicateurs
  const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);
  const ema12 = closes.slice(-12).reduce((a, b) => a + b, 0) / 12;
  const ema26 = closes.slice(-26).reduce((a, b) => a + b, 0) / Math.min(26, closes.length);
  const macd = ema12 - ema26;
  const signal = macd * 0.9;
  const rsi = 30 + rInd() * 40;

  return {
    ticker,
    price: closes[closes.length - 1],
    change: ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2] * 100).toFixed(2),
    indicators: {
      sma: { sma20, sma50, sma200: sma50 * 0.95 },
      ema: { ema12, ema26, ema50: sma50 },
      macd: { value: macd, signal, histogram: macd - signal },
      rsi: { value: rsi, overbought: rsi > 70, oversold: rsi < 30 },
      bollinger: {
        upper: sma20 * 1.02,
        middle: sma20,
        lower: sma20 * 0.98,
        bandwidth: 4
      },
      stochastic: { k: 50 + rInd() * 30, d: 45 + rInd() * 30 },
      atr: { value: basePrice * 0.02, percent: 2 },
      volume: { current: Math.floor(rInd() * 1000000), average: 500000 }
    },
    signals: {
      trend: macd > 0 ? 'bullish' : 'bearish',
      momentum: rsi > 50 ? 'positive' : 'negative',
      volatility: 'moderate',
      overall: rsi > 50 && macd > 0 ? 'BUY' : (rsi < 50 && macd < 0 ? 'SELL' : 'HOLD')
    },
    history: data
  };
}

// ============================================
// ROUTES - RACINE
// ============================================

app.get('/', (req, res) => {
  res.json({
    message: 'PENDO API Server - African Financial Markets',
    status: 'online',
    version: '3.0.0-complete',
    features: ['markets', 'stocks', 'opportunities', 'news', 'portfolio', 'indicators', 'analytics', 'forum', 'chat'],
    endpoints: {
      status: '/api/status',
      markets: '/api/markets',
      stocks: '/api/stocks',
      opportunities: '/api/opportunities',
      news: '/api/news',
      portfolio: '/api/portfolio',
      indicators: '/api/indicators/:ticker/complete',
      analytics: '/api/analytics',
      forum: '/api/forum',
      chat: '/api/chat'
    }
  });
});

// ============================================
// ROUTES - STATUS
// ============================================

let _lastProbe = { t: 0, connected: false };

app.get('/api/status', async (req, res) => {
  // Probe pool with a real query — pool object existing ≠ connection working
  // Cache result 3s to avoid Supabase round-trips on frequent frontend polls
  let dbActuallyConnected = false;
  if (pool) {
    if (Date.now() - _lastProbe.t < 3000) {
      dbActuallyConnected = _lastProbe.connected;
    } else {
      try { await pool.query('SELECT 1'); dbActuallyConnected = true; } catch(e) {}
      _lastProbe = { t: Date.now(), connected: dbActuallyConnected };
    }
  }
  const dbStatus = dbActuallyConnected ? 'connected' : 'demo_mode';
  // Counters: static fallbacks, upgraded to live DB counts when connected
  let marketsCount = AFRICAN_MARKETS.length;
  let stocksCount = AFRICAN_STOCKS.length;
  let oppCount = DEMO_OPPORTUNITIES.length;
  let newsCount = DEMO_NEWS.length;

  if (dbActuallyConnected) {
    try {
      const r = await pool.query('SELECT COUNT(DISTINCT market_id) as total FROM market_snapshots WHERE fetched_at > NOW() - INTERVAL \'24 hours\'');
      const live = parseInt(r.rows[0].total);
      if (live > 0) marketsCount = live;
    } catch (e) {}
    try {
      const r = await pool.query('SELECT COUNT(*) as total FROM investment_opportunities WHERE status = \'active\'');
      oppCount = parseInt(r.rows[0].total) || oppCount;
    } catch (e) {}
    try {
      const r = await pool.query('SELECT COUNT(*) as total FROM news');
      newsCount = parseInt(r.rows[0].total) || newsCount;
    } catch (e) {}
  }

  const httpStatus = dbActuallyConnected ? 200 : 503;
  res.status(httpStatus).json(formatResponse({
    status: dbActuallyConnected ? 'online' : 'degraded',
    version: BUILD_VERSION,
    database: dbStatus,
    markets_count: marketsCount,
    stocks_count: stocksCount,
    opportunities_count: oppCount,
    news_count: newsCount,
    features_enabled: {
      markets: true,
      stocks: true,
      opportunities: true,
      news: true,
      portfolio: true,
      indicators: true,
      analytics: true,
      forum: true,
      chat: true
    },
    last_update: new Date().toISOString(),
    uptime: process.uptime()
  }));
});

// ============================================
// ROUTE - DEBUG DB (temporary diagnostic endpoint)
// ============================================
app.get('/api/debug-db', verifyCronSecret, async (req, res) => {
  const result = { pool: !!pool, tests: [] };
  if (!pool) return res.json(result);
  const queries = [
    { name: 'SELECT NOW()', q: 'SELECT NOW() as t' },
    { name: 'users exists', q: "SELECT to_regclass('public.users') as t" },
    { name: 'SELECT users', q: 'SELECT COUNT(*) as c FROM users' },
    { name: 'forum_threads exists', q: "SELECT to_regclass('public.forum_threads') as t" },
    { name: 'market_snapshots exists', q: "SELECT to_regclass('public.market_snapshots') as t" },
    { name: 'market_snapshots count', q: 'SELECT COUNT(*) as c FROM market_snapshots' },
    { name: 'market_snapshots latest', q: "SELECT market_id, value, change_percent, source, fetched_at FROM market_snapshots ORDER BY fetched_at DESC LIMIT 3" },
  ];
  for (const { name, q } of queries) {
    try {
      const r = await pool.query(q);
      result.tests.push({ name, ok: true, value: JSON.stringify(r.rows[0]) });
    } catch(e) {
      result.tests.push({ name, ok: false, error: e.message, code: e.code });
    }
  }
  res.json(result);
});

// POST /api/init-db — force la (ré)exécution de initDB() et renvoie l'état.
// Protégé par CRON_SECRET (Authorization: Bearer <secret> OU ?secret=<secret>).
// Usage: curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://pendo-backend.vercel.app/api/init-db
app.post('/api/init-db', verifyCronSecret, async (req, res) => {
  const started = Date.now();
  try {
    // Force re-run of initDB (re-entrant safe: uses CREATE TABLE IF NOT EXISTS)
    const ok = await initDB();
    if (!ok || !pool) {
      return res.status(503).json(formatError(
        'initDB a échoué — DATABASE_URL absente ou connexion impossible. Vérifier vercel env ls production.',
        503
      ));
    }
    // Vérifier les tables critiques
    const tablesToCheck = ['users', 'forum_categories', 'forum_threads', 'portfolio_cash', 'news'];
    const checks = [];
    for (const t of tablesToCheck) {
      try {
        const r = await pool.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
        checks.push({ table: t, ok: true, rows: r.rows[0].c });
      } catch (e) {
        checks.push({ table: t, ok: false, error: e.code || e.message });
      }
    }
    const now = await pool.query('SELECT NOW() as t, current_database() as db');
    res.json(formatResponse({
      ok: true,
      build: BUILD_VERSION,
      elapsed_ms: Date.now() - started,
      db: now.rows[0].db,
      server_time: now.rows[0].t,
      tables: checks
    }));
  } catch (e) {
    console.error('[init-db] ERROR', e);
    res.status(500).json(formatError(`init-db failed: ${e.message}`, 500));
  }
});

// ============================================
// INLINE COLLECTION HELPERS (compatible Vercel Serverless)
// Vérifie la fraîcheur des données via la DB et collecte inline si nécessaire
// ============================================

// ============================================
// SOURCES RSS RÉELLES — COLLECTE DE VRAIES DONNÉES
// ============================================

// Flux RSS pour les OPPORTUNITÉS D'INVESTISSEMENT — Couverture PANAFRICAINE complète
const OPPORTUNITY_RSS_FEEDS = [
  // === FLUX DIRECTS (URLs réelles, enrichissables) — PRIORITÉ HAUTE ===
  // --- Pan-Africain ---
  { id: 'allafrica-biz', name: 'AllAfrica Business', category: 'opportunities', direct: true,
    url: 'https://allafrica.com/tools/headlines/rdf/business/headlines.rdf' },
  { id: 'african-biz-mag', name: 'African Business Magazine', category: 'opportunities', direct: true,
    url: 'https://african.business/feed' },
  { id: 'disrupt-africa', name: 'Disrupt Africa', category: 'opportunities', direct: true,
    url: 'https://disrupt-africa.com/feed/' },
  { id: 'techcrunch-africa', name: 'TechCrunch Africa', category: 'opportunities', direct: true,
    url: 'https://techcrunch.com/tag/africa/feed/' },
  { id: 'weetracker', name: 'WeeTracker Africa', category: 'opportunities', direct: true,
    url: 'https://weetracker.com/feed/' },
  { id: 'africa-news-biz', name: 'Africanews Business', category: 'opportunities', direct: true,
    url: 'https://www.africanews.com/feed/rss/business' },
  { id: 'ventureburn', name: 'Ventureburn Africa', category: 'opportunities', direct: true,
    url: 'https://ventureburn.com/feed/' },
  { id: 'afdb-press', name: 'AfDB Press Releases', category: 'opportunities', direct: true,
    url: 'https://www.afdb.org/en/news-and-events/press-releases/feed' },
  // --- Régionaux directs (couverture étendue) ---
  { id: 'the-east-african', name: 'The East African', category: 'opportunities', direct: true,
    url: 'https://www.theeastafrican.co.ke/tea/rss' },
  { id: 'allafrica-energy', name: 'AllAfrica Energy', category: 'opportunities', direct: true,
    url: 'https://allafrica.com/tools/headlines/rdf/energy/headlines.rdf' },
  { id: 'allafrica-ict', name: 'AllAfrica ICT', category: 'opportunities', direct: true,
    url: 'https://allafrica.com/tools/headlines/rdf/ict/headlines.rdf' },
  { id: 'allafrica-invest', name: 'AllAfrica Investment', category: 'opportunities', direct: true,
    url: 'https://allafrica.com/tools/headlines/rdf/investment/headlines.rdf' },
  { id: 'allafrica-mining', name: 'AllAfrica Mining', category: 'opportunities', direct: true,
    url: 'https://allafrica.com/tools/headlines/rdf/mining/headlines.rdf' },
  { id: 'allafrica-trade', name: 'AllAfrica Trade', category: 'opportunities', direct: true,
    url: 'https://allafrica.com/tools/headlines/rdf/trade/headlines.rdf' },
  { id: 'allafrica-agri', name: 'AllAfrica Agriculture', category: 'opportunities', direct: true,
    url: 'https://allafrica.com/tools/headlines/rdf/agribusiness/headlines.rdf' },
  { id: 'itnewsafrica', name: 'IT News Africa', category: 'opportunities', direct: true,
    url: 'https://www.itnewsafrica.com/feed/' },
  // === GOOGLE NEWS - THÉMATIQUES PANAFRICAINES ===
  { id: 'google-invest-en', name: 'Africa Investment EN', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Africa+investment+opportunity+OR+African+startup+funding&hl=en&gl=US&ceid=US:en' },
  { id: 'google-invest-fr', name: 'Investissement Afrique FR', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=investissement+Afrique+OR+financement+africain&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'google-afdb', name: 'AfDB Projects', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=%22African+Development+Bank%22+OR+%22AfDB%22+approve+OR+invest&hl=en&gl=US&ceid=US:en' },
  { id: 'google-ifc-africa', name: 'IFC & World Bank Africa', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=%22IFC%22+Africa+investment+OR+%22World+Bank%22+Africa+project&hl=en&gl=US&ceid=US:en' },
  { id: 'google-africa-energy', name: 'Africa Energy', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Africa+energy+solar+OR+renewable+project+investment&hl=en&gl=US&ceid=US:en' },
  { id: 'google-africa-mining', name: 'Africa Mining', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Africa+mining+gold+OR+lithium+OR+cobalt+investment&hl=en&gl=US&ceid=US:en' },
  { id: 'google-africa-tech', name: 'Africa Tech Startups', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=African+tech+startup+raise+OR+funding+OR+Series&hl=en&gl=US&ceid=US:en' },
  { id: 'google-africa-infra', name: 'Africa Infrastructure', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Africa+infrastructure+project+OR+PPP+OR+construction&hl=en&gl=US&ceid=US:en' },
  { id: 'google-africa-agri', name: 'Africa Agriculture', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Africa+agriculture+investment+OR+agribusiness+OR+farming&hl=en&gl=US&ceid=US:en' },
  { id: 'google-africa-health', name: 'Africa Healthcare', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Africa+healthcare+investment+OR+hospital+OR+pharma&hl=en&gl=US&ceid=US:en' },
  // === AFRIQUE DE L'OUEST ===
  { id: 'ng-invest', name: 'Nigeria Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Nigeria+investment+OR+Lagos+startup+funding&hl=en&gl=US&ceid=US:en' },
  { id: 'gh-invest', name: 'Ghana Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Ghana+investment+OR+Accra+startup+OR+Ghana+mining&hl=en&gl=US&ceid=US:en' },
  { id: 'sn-invest', name: 'Sénégal Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Sénégal+investissement+OR+Dakar+startup+OR+Sénégal+pétrole&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'ci-invest', name: 'Côte d\'Ivoire Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Côte+d%27Ivoire+investissement+OR+Abidjan+économie&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'ml-invest', name: 'Mali Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Mali+investissement+OR+Mali+or+mine&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'bf-invest', name: 'Burkina Faso Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Burkina+Faso+investissement+OR+mine+OR+économie&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'gn-invest', name: 'Guinée Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Guinée+Conakry+investissement+OR+bauxite+OR+mine&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'bj-tg-invest', name: 'Bénin Togo Invest', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Bénin+OR+Togo+investissement+OR+port+OR+économie&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'ne-invest', name: 'Niger Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Niger+investissement+OR+uranium+OR+pétrole+Agadem&hl=fr&gl=FR&ceid=FR:fr' },
  // === AFRIQUE DE L'EST ===
  { id: 'ke-invest', name: 'Kenya Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Kenya+investment+OR+Nairobi+startup+OR+Kenya+tech&hl=en&gl=US&ceid=US:en' },
  { id: 'tz-invest', name: 'Tanzania Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Tanzania+investment+OR+Dar+es+Salaam+project+OR+Tanzania+mining&hl=en&gl=US&ceid=US:en' },
  { id: 'et-invest', name: 'Ethiopia Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Ethiopia+investment+OR+Addis+Ababa+project+OR+Ethiopia+telecom&hl=en&gl=US&ceid=US:en' },
  { id: 'rw-invest', name: 'Rwanda Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Rwanda+investment+OR+Kigali+tech+OR+Rwanda+innovation&hl=en&gl=US&ceid=US:en' },
  { id: 'ug-invest', name: 'Uganda Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Uganda+investment+OR+Kampala+startup+OR+Uganda+oil&hl=en&gl=US&ceid=US:en' },
  { id: 'mg-invest', name: 'Madagascar Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Madagascar+investissement+OR+mine+OR+vanille+OR+économie&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'dj-invest', name: 'Djibouti Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Djibouti+investment+OR+port+OR+logistics&hl=en&gl=US&ceid=US:en' },
  // === AFRIQUE DU NORD ===
  { id: 'eg-invest', name: 'Egypt Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Egypt+investment+OR+Cairo+startup+OR+Suez+project&hl=en&gl=US&ceid=US:en' },
  { id: 'ma-invest', name: 'Maroc Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Maroc+investissement+OR+Casablanca+startup+OR+Maroc+énergie&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'tn-invest', name: 'Tunisie Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Tunisie+investissement+OR+startup+Tunis+OR+économie+tunisienne&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'dz-invest', name: 'Algérie Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Algérie+investissement+OR+économie+algérienne+OR+hydrocarbures&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'ly-invest', name: 'Libya Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Libya+investment+OR+reconstruction+OR+oil+production&hl=en&gl=US&ceid=US:en' },
  // === AFRIQUE AUSTRALE ===
  { id: 'za-invest', name: 'South Africa Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=%22South+Africa%22+investment+OR+Johannesburg+startup+OR+JSE&hl=en&gl=US&ceid=US:en' },
  { id: 'mz-invest', name: 'Mozambique Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Mozambique+investment+OR+LNG+gas+OR+Maputo+project&hl=en&gl=US&ceid=US:en' },
  { id: 'zm-invest', name: 'Zambia Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Zambia+investment+OR+copper+mining+OR+Lusaka+project&hl=en&gl=US&ceid=US:en' },
  { id: 'zw-invest', name: 'Zimbabwe Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Zimbabwe+investment+OR+lithium+mining+OR+Harare&hl=en&gl=US&ceid=US:en' },
  { id: 'bw-na-invest', name: 'Botswana Namibia', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Botswana+OR+Namibia+investment+OR+diamond+OR+mining&hl=en&gl=US&ceid=US:en' },
  { id: 'ao-invest', name: 'Angola Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Angola+investment+OR+Luanda+oil+OR+diversification&hl=en&gl=US&ceid=US:en' },
  // === AFRIQUE CENTRALE ===
  { id: 'cd-invest', name: 'RDC Congo Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=%22RD+Congo%22+OR+%22DRC%22+OR+Kinshasa+investissement+OR+cobalt+OR+mine&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'cm-invest', name: 'Cameroun Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Cameroun+investissement+OR+Douala+OR+économie+camerounaise&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'ga-invest', name: 'Gabon Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Gabon+investissement+OR+pétrole+OR+manganèse+OR+Libreville&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'cg-td-invest', name: 'Congo Tchad Invest', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Congo+Brazzaville+OR+Tchad+investissement+OR+pétrole&hl=fr&gl=FR&ceid=FR:fr' },
  // === ÎLES & LUSOPHONE ===
  { id: 'mu-invest', name: 'Mauritius Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Mauritius+investment+OR+fintech+OR+offshore+finance&hl=en&gl=US&ceid=US:en' },
  { id: 'sc-invest', name: 'Seychelles Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Seychelles+investment+OR+blue+economy+OR+tourism&hl=en&gl=US&ceid=US:en' },
  // === PAYS MANQUANTS — Couverture 54/54 ===
  // Afrique de l'Ouest manquants
  { id: 'sl-invest', name: 'Sierra Leone Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=%22Sierra+Leone%22+investment+OR+mining+OR+Freetown+economy&hl=en&gl=US&ceid=US:en' },
  { id: 'lr-invest', name: 'Liberia Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Liberia+investment+OR+Monrovia+economy+OR+mining&hl=en&gl=US&ceid=US:en' },
  { id: 'mr-invest', name: 'Mauritanie Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Mauritanie+investissement+OR+Mauritania+mining+OR+gas+OR+Nouakchott&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'cv-invest', name: 'Cape Verde Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=%22Cape+Verde%22+OR+%22Cabo+Verde%22+investment+OR+tourism+economy&hl=en&gl=US&ceid=US:en' },
  { id: 'gm-invest', name: 'Gambia Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Gambia+investment+OR+Banjul+economy+OR+tourism&hl=en&gl=US&ceid=US:en' },
  { id: 'gw-invest', name: 'Guinea-Bissau Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=%22Guinea-Bissau%22+investment+OR+Bissau+economy&hl=en&gl=US&ceid=US:en' },
  // Afrique de l'Est manquants
  { id: 'so-invest', name: 'Somalia Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Somalia+investment+OR+Mogadishu+economy+OR+Somaliland&hl=en&gl=US&ceid=US:en' },
  { id: 'ss-invest', name: 'South Sudan Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=%22South+Sudan%22+investment+OR+oil+OR+Juba+economy&hl=en&gl=US&ceid=US:en' },
  { id: 'er-invest', name: 'Eritrea Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Eritrea+investment+OR+mining+OR+Asmara+economy&hl=en&gl=US&ceid=US:en' },
  { id: 'bi-invest', name: 'Burundi Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Burundi+investment+OR+Bujumbura+economy&hl=en&gl=US&ceid=US:en' },
  { id: 'km-invest', name: 'Comores Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Comoros+OR+Comores+investment+OR+economy+OR+vanilla&hl=en&gl=US&ceid=US:en' },
  // Afrique du Nord manquant
  { id: 'sd-invest', name: 'Sudan Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Sudan+investment+OR+Khartoum+economy+OR+gold+mining&hl=en&gl=US&ceid=US:en' },
  // Afrique Centrale manquants
  { id: 'gq-invest', name: 'Equatorial Guinea Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=%22Equatorial+Guinea%22+investment+OR+oil+OR+Malabo&hl=en&gl=US&ceid=US:en' },
  { id: 'cf-invest', name: 'Centrafrique Investissement', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Centrafrique+OR+%22Central+African+Republic%22+investment+OR+Bangui&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'st-invest', name: 'São Tomé Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=%22Sao+Tome%22+OR+%22São+Tomé%22+investment+OR+economy&hl=en&gl=US&ceid=US:en' },
  // Afrique Australe manquants
  { id: 'mw-invest', name: 'Malawi Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Malawi+investment+OR+Lilongwe+economy+OR+tobacco+mining&hl=en&gl=US&ceid=US:en' },
  { id: 'sz-invest', name: 'Eswatini Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Eswatini+OR+Swaziland+investment+OR+economy&hl=en&gl=US&ceid=US:en' },
  { id: 'ls-invest', name: 'Lesotho Investment', category: 'opportunities',
    url: 'https://news.google.com/rss/search?q=Lesotho+investment+OR+Maseru+economy+OR+diamond&hl=en&gl=US&ceid=US:en' },
];

// Flux RSS pour les ACTUALITÉS — même couverture panafricaine
const NEWS_RSS_FEEDS = [
  { id: 'google-african-markets', name: 'African Markets', category: 'news',
    url: 'https://news.google.com/rss/search?q=African+stock+market+OR+African+economy+OR+bourse+Afrique&hl=en&gl=US&ceid=US:en' },
  { id: 'google-africa-business', name: 'Africa Business', category: 'news',
    url: 'https://news.google.com/rss/search?q=Africa+business+economy+trade&hl=en&gl=US&ceid=US:en' },
  { id: 'google-afrique-eco-fr', name: 'Afrique Économie', category: 'news',
    url: 'https://news.google.com/rss/search?q=Afrique+économie+OR+bourse+africaine+OR+marché+africain&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'google-africa-fintech', name: 'Africa Fintech', category: 'news',
    url: 'https://news.google.com/rss/search?q=Africa+fintech+OR+mobile+money+Africa&hl=en&gl=US&ceid=US:en' },
  { id: 'google-waemu-cemac', name: 'UEMOA CEMAC', category: 'news',
    url: 'https://news.google.com/rss/search?q=UEMOA+OR+CEMAC+OR+BCEAO+OR+franc+CFA+économie&hl=fr&gl=FR&ceid=FR:fr' },
  { id: 'google-eac-sadc', name: 'EAC SADC News', category: 'news',
    url: 'https://news.google.com/rss/search?q=%22East+African+Community%22+OR+SADC+OR+COMESA+trade+economy&hl=en&gl=US&ceid=US:en' },
  { id: 'google-africa-oil-gas', name: 'Africa Oil & Gas', category: 'news',
    url: 'https://news.google.com/rss/search?q=Africa+oil+gas+production+OR+exploration+OR+OPEC+Africa&hl=en&gl=US&ceid=US:en' },
  { id: 'google-afcfta', name: 'AfCFTA Trade', category: 'news',
    url: 'https://news.google.com/rss/search?q=AfCFTA+OR+%22African+Continental+Free+Trade%22+OR+commerce+intra-africain&hl=en&gl=US&ceid=US:en' },
];

// Tous les flux combinés (ancien RSS_FEEDS pour compatibilité)
const RSS_FEEDS = [...NEWS_RSS_FEEDS, ...OPPORTUNITY_RSS_FEEDS.slice(0, 5)];

// ============================================
// DÉTECTION INTELLIGENTE — SECTEUR, PAYS, ENTREPRISE
// ============================================

const SECTOR_KEYWORDS = {
  'Finance': ['fintech', 'banking', 'bank', 'mobile money', 'payment', 'insurance', 'microfinance',
    'lending', 'blockchain', 'crypto', 'neobank', 'digital wallet', 'credit', 'loan', 'financial services',
    'venture capital', 'private equity', 'fund', 'IPO', 'stock exchange', 'bourse', 'banque', 'paiement',
    'assurance', 'crédit', 'financement'],
  'Technology': ['tech', 'software', 'saas', 'ai ', 'artificial intelligence', 'machine learning', 'app ',
    'cloud', 'digital', 'startup', 'platform', 'e-commerce', 'edtech', 'healthtech', 'agritech',
    'cybersecurity', 'data', 'innovation', 'numérique', 'logiciel', 'technologie'],
  'Energy': ['renewable', 'solar', 'wind', 'energy', 'power', 'electricity', 'biomass', 'geothermal',
    'hydropower', 'mini-grid', 'off-grid', 'green energy', 'clean energy', 'énergie', 'solaire',
    'éolien', 'électricité', 'renouvelable', 'hydrogen', 'battery', 'MW', 'GW'],
  'Infrastructure': ['infrastructure', 'transport', 'logistics', 'real estate', 'port', 'rail', 'road',
    'telecom', '5g', 'broadband', 'water', 'construction', 'bridge', 'highway', 'airport',
    'route', 'pont', 'autoroute', 'aéroport', 'immobilier', 'PPP'],
  'Agriculture': ['agriculture', 'farming', 'agri', 'food', 'crop', 'livestock', 'aquaculture',
    'irrigation', 'cold storage', 'agribusiness', 'cocoa', 'coffee', 'cashew', 'maize', 'wheat',
    'rice', 'cacao', 'café', 'coton', 'palm oil'],
  'Mining': ['mining', 'mineral', 'gold', 'copper', 'diamond', 'lithium', 'cobalt', 'coal', 'ore',
    'extraction', 'precious metal', 'iron ore', 'bauxite', 'manganese', 'phosphate', 'uranium',
    'mine', 'or ', 'diamant', 'fer'],
  'Healthcare': ['health', 'medical', 'hospital', 'clinic', 'pharmacy', 'telehealth', 'healthcare',
    'medicine', 'diagnostic', 'wellness', 'disease', 'vaccination', 'biotech', 'pharmaceutical',
    'santé', 'hôpital', 'médical', 'pharmacie'],
  'Tourism': ['tourism', 'hotel', 'safari', 'resort', 'lodge', 'travel', 'hospitality',
    'eco-tourism', 'attraction', 'tourisme', 'hôtel', 'voyage']
};

// 54 pays africains pour la détection
const AFRICAN_COUNTRIES_DETECT = [
  { code: 'NG', names: ['Nigeria', 'Nigerian', 'Lagos', 'Abuja'], region: 'Afrique de l\'Ouest', name: 'Nigeria' },
  { code: 'ZA', names: ['South Africa', 'South African', 'Johannesburg', 'Cape Town', 'Afrique du Sud'], region: 'Afrique Australe', name: 'Afrique du Sud' },
  { code: 'EG', names: ['Egypt', 'Egyptian', 'Cairo', 'Égypte', 'Le Caire'], region: 'Afrique du Nord', name: 'Égypte' },
  { code: 'KE', names: ['Kenya', 'Kenyan', 'Nairobi'], region: 'Afrique de l\'Est', name: 'Kenya' },
  { code: 'GH', names: ['Ghana', 'Ghanaian', 'Accra'], region: 'Afrique de l\'Ouest', name: 'Ghana' },
  { code: 'MA', names: ['Morocco', 'Moroccan', 'Casablanca', 'Maroc', 'Marocain', 'Rabat'], region: 'Afrique du Nord', name: 'Maroc' },
  { code: 'ET', names: ['Ethiopia', 'Ethiopian', 'Addis Ababa', 'Éthiopie'], region: 'Afrique de l\'Est', name: 'Éthiopie' },
  { code: 'TZ', names: ['Tanzania', 'Tanzanian', 'Dar es Salaam', 'Tanzanie'], region: 'Afrique de l\'Est', name: 'Tanzanie' },
  { code: 'CI', names: ['Ivory Coast', "Côte d'Ivoire", 'Cote d\'Ivoire', 'Ivorian', 'Abidjan'], region: 'Afrique de l\'Ouest', name: 'Côte d\'Ivoire' },
  { code: 'SN', names: ['Senegal', 'Senegalese', 'Dakar', 'Sénégal'], region: 'Afrique de l\'Ouest', name: 'Sénégal' },
  { code: 'RW', names: ['Rwanda', 'Rwandan', 'Kigali'], region: 'Afrique de l\'Est', name: 'Rwanda' },
  { code: 'UG', names: ['Uganda', 'Ugandan', 'Kampala', 'Ouganda'], region: 'Afrique de l\'Est', name: 'Ouganda' },
  { code: 'DZ', names: ['Algeria', 'Algerian', 'Algiers', 'Algérie', 'Alger'], region: 'Afrique du Nord', name: 'Algérie' },
  { code: 'TN', names: ['Tunisia', 'Tunisian', 'Tunis', 'Tunisie'], region: 'Afrique du Nord', name: 'Tunisie' },
  { code: 'CM', names: ['Cameroon', 'Cameroonian', 'Yaoundé', 'Douala', 'Cameroun'], region: 'Afrique Centrale', name: 'Cameroun' },
  { code: 'CD', names: ['Congo', 'DRC', 'Kinshasa', 'RD Congo', 'DR Congo'], region: 'Afrique Centrale', name: 'RD Congo' },
  { code: 'AO', names: ['Angola', 'Angolan', 'Luanda'], region: 'Afrique Australe', name: 'Angola' },
  { code: 'MZ', names: ['Mozambique', 'Mozambican', 'Maputo'], region: 'Afrique Australe', name: 'Mozambique' },
  { code: 'ZM', names: ['Zambia', 'Zambian', 'Lusaka', 'Zambie'], region: 'Afrique Australe', name: 'Zambie' },
  { code: 'ZW', names: ['Zimbabwe', 'Zimbabwean', 'Harare'], region: 'Afrique Australe', name: 'Zimbabwe' },
  { code: 'BW', names: ['Botswana', 'Gaborone'], region: 'Afrique Australe', name: 'Botswana' },
  { code: 'NA', names: ['Namibia', 'Namibian', 'Windhoek', 'Namibie'], region: 'Afrique Australe', name: 'Namibie' },
  { code: 'MU', names: ['Mauritius', 'Mauritian', 'Port Louis', 'Maurice'], region: 'Afrique Australe', name: 'Maurice' },
  { code: 'MG', names: ['Madagascar', 'Malagasy', 'Antananarivo'], region: 'Afrique de l\'Est', name: 'Madagascar' },
  { code: 'ML', names: ['Mali', 'Malian', 'Bamako'], region: 'Afrique de l\'Ouest', name: 'Mali' },
  { code: 'BF', names: ['Burkina Faso', 'Burkinabe', 'Ouagadougou'], region: 'Afrique de l\'Ouest', name: 'Burkina Faso' },
  { code: 'NE', names: ['Niger', 'Nigerien', 'Niamey'], region: 'Afrique de l\'Ouest', name: 'Niger' },
  { code: 'GN', names: ['Guinea', 'Guinean', 'Conakry', 'Guinée'], region: 'Afrique de l\'Ouest', name: 'Guinée' },
  { code: 'BJ', names: ['Benin', 'Beninese', 'Cotonou', 'Bénin'], region: 'Afrique de l\'Ouest', name: 'Bénin' },
  { code: 'TG', names: ['Togo', 'Togolese', 'Lomé'], region: 'Afrique de l\'Ouest', name: 'Togo' },
  { code: 'GA', names: ['Gabon', 'Gabonese', 'Libreville'], region: 'Afrique Centrale', name: 'Gabon' },
  { code: 'MW', names: ['Malawi', 'Malawian', 'Lilongwe'], region: 'Afrique Australe', name: 'Malawi' },
  { code: 'SD', names: ['Sudan', 'Sudanese', 'Khartoum', 'Soudan'], region: 'Afrique du Nord', name: 'Soudan' },
  { code: 'LY', names: ['Libya', 'Libyan', 'Tripoli', 'Libye'], region: 'Afrique du Nord', name: 'Libye' },
  { code: 'SO', names: ['Somalia', 'Somali', 'Mogadishu', 'Somalie'], region: 'Afrique de l\'Est', name: 'Somalie' },
  { code: 'SC', names: ['Seychelles', 'Seychellois'], region: 'Afrique Australe', name: 'Seychelles' },
  { code: 'TD', names: ['Chad', 'Chadian', 'N\'Djamena', 'Tchad'], region: 'Afrique Centrale', name: 'Tchad' },
  { code: 'SS', names: ['South Sudan', 'Juba', 'Soudan du Sud'], region: 'Afrique de l\'Est', name: 'Soudan du Sud' },
  { code: 'ER', names: ['Eritrea', 'Eritrean', 'Asmara', 'Érythrée'], region: 'Afrique de l\'Est', name: 'Érythrée' },
  { code: 'DJ', names: ['Djibouti'], region: 'Afrique de l\'Est', name: 'Djibouti' },
  { code: 'SL', names: ['Sierra Leone', 'Freetown'], region: 'Afrique de l\'Ouest', name: 'Sierra Leone' },
  { code: 'LR', names: ['Liberia', 'Liberian', 'Monrovia', 'Libéria'], region: 'Afrique de l\'Ouest', name: 'Liberia' },
  { code: 'MR', names: ['Mauritania', 'Mauritanian', 'Nouakchott', 'Mauritanie'], region: 'Afrique de l\'Ouest', name: 'Mauritanie' },
  { code: 'CG', names: ['Republic of Congo', 'Congo-Brazzaville', 'Brazzaville'], region: 'Afrique Centrale', name: 'Congo-Brazzaville' },
  { code: 'BI', names: ['Burundi', 'Burundian', 'Bujumbura'], region: 'Afrique de l\'Est', name: 'Burundi' },
  { code: 'SZ', names: ['Eswatini', 'Swaziland', 'Mbabane'], region: 'Afrique Australe', name: 'Eswatini' },
  { code: 'LS', names: ['Lesotho', 'Maseru'], region: 'Afrique Australe', name: 'Lesotho' },
  { code: 'CV', names: ['Cape Verde', 'Cabo Verde', 'Cap-Vert'], region: 'Afrique de l\'Ouest', name: 'Cap-Vert' },
  { code: 'GQ', names: ['Equatorial Guinea', 'Malabo', 'Guinée Équatoriale'], region: 'Afrique Centrale', name: 'Guinée Équatoriale' },
  { code: 'CF', names: ['Central African Republic', 'Bangui', 'Centrafrique'], region: 'Afrique Centrale', name: 'Centrafrique' },
  { code: 'GM', names: ['Gambia', 'Gambian', 'Banjul', 'Gambie'], region: 'Afrique de l\'Ouest', name: 'Gambie' },
  { code: 'GW', names: ['Guinea-Bissau', 'Bissau'], region: 'Afrique de l\'Ouest', name: 'Guinée-Bissau' },
  { code: 'KM', names: ['Comoros', 'Comorian', 'Moroni', 'Comores'], region: 'Afrique de l\'Est', name: 'Comores' },
  { code: 'ST', names: ['São Tomé', 'Sao Tome'], region: 'Afrique Centrale', name: 'São Tomé-et-Príncipe' },
];

// Détection du secteur à partir du texte
function detectSector(text) {
  const lower = text.toLowerCase();
  let bestSector = null;
  let bestScore = 0;
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) score += kw.length; // mots plus longs = plus spécifiques
    }
    if (score > bestScore) { bestScore = score; bestSector = sector; }
  }
  return bestSector || 'Finance'; // fallback
}

// Sous-secteur basé sur le secteur et le texte
function detectSubsector(sector, text) {
  const lower = text.toLowerCase();
  const subsectorMap = {
    'Finance': { 'Fintech': ['fintech','payment','paiement'], 'Mobile Money': ['mobile money','m-pesa','mobile banking'], 'Banque Digitale': ['neobank','digital bank','banque digitale'], 'Assurance': ['insurance','assurance'], 'Microfinance': ['microfinance','microcredit'], 'Blockchain': ['blockchain','crypto','defi'], 'Capital Investissement': ['venture','private equity','fund','fonds'] },
    'Technology': { 'E-commerce': ['e-commerce','ecommerce','marketplace'], 'EdTech': ['edtech','education','learning'], 'HealthTech': ['healthtech','health tech','telehealth'], 'AgriTech': ['agritech','agri-tech','farm tech'], 'IA & Data': ['ai ','artificial intelligence','machine learning','data'], 'SaaS': ['saas','software','cloud'], 'Cybersécurité': ['cyber','security'] },
    'Energy': { 'Solaire': ['solar','solaire','photovoltaic'], 'Éolien': ['wind','éolien'], 'Hydroélectrique': ['hydro','dam','barrage'], 'Mini-grid': ['mini-grid','microgrid','off-grid'], 'Hydrogène Vert': ['hydrogen','hydrogène'], 'Géothermie': ['geothermal','géothermie'] },
    'Infrastructure': { 'Transport': ['transport','road','rail','highway','route'], 'Immobilier': ['real estate','housing','immobilier'], 'Telecom 5G': ['telecom','5g','broadband','fibre'], 'Ports & Logistique': ['port','logistics','shipping','logistique'], 'Eau & Assainissement': ['water','sanitation','eau'] },
    'Agriculture': { 'Agro-industrie': ['agribusiness','agro-industry','processing'], 'Export': ['export','trade','cocoa','coffee','cashew'], 'Aquaculture': ['aquaculture','fish','fishing'], 'Irrigation': ['irrigation','water management'] },
    'Mining': { 'Or': ['gold','or '], 'Lithium': ['lithium'], 'Cobalt': ['cobalt'], 'Diamant': ['diamond','diamant'], 'Fer': ['iron ore','iron','fer'], 'Cuivre': ['copper','cuivre'] },
    'Healthcare': { 'Télémédecine': ['telehealth','telemedicine','télémédecine'], 'Pharma': ['pharma','drug','medicine','médicament'], 'Hôpitaux': ['hospital','clinic','hôpital'] },
    'Tourism': { 'Hôtellerie': ['hotel','resort','hospitality','hôtel'], 'Écotourisme': ['eco-tourism','ecotourism','safari','wildlife'] }
  };
  const subs = subsectorMap[sector] || {};
  for (const [subName, keywords] of Object.entries(subs)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return subName;
    }
  }
  return Object.keys(subs)[0] || sector;
}

// Détection du pays dans le texte
function detectCountry(text) {
  const lower = text.toLowerCase();
  for (const country of AFRICAN_COUNTRIES_DETECT) {
    for (const name of country.names) {
      // Vérifier que le mot n'est pas un faux positif (ex: "Niger" dans "Nigeria")
      const regex = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (regex.test(text)) {
        return country;
      }
    }
  }
  return null; // Pas de pays détecté
}

// Extraction de montants d'investissement depuis le texte
function extractInvestmentAmounts(text) {
  const patterns = [
    /\$\s*([\d,.]+)\s*(billion|bn|b)/gi,
    /\$\s*([\d,.]+)\s*(million|mn|m)/gi,
    /([\d,.]+)\s*(billion|bn|b)\s*(dollars|usd|\$)/gi,
    /([\d,.]+)\s*(million|mn|m)\s*(dollars|usd|\$)/gi,
    /USD\s*([\d,.]+)\s*(billion|bn|b|million|mn|m)/gi,
    /([\d,.]+)\s*M\s*USD/gi,
    /([\d,.]+)\s*Md?\s*(USD|\$|dollars)/gi,
  ];
  const amounts = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let num = parseFloat(match[1].replace(/,/g, ''));
      const unit = (match[2] || '').toLowerCase();
      if (unit.startsWith('b')) num *= 1000000000;
      else if (unit.startsWith('m')) num *= 1000000;
      if (num > 0 && num < 100000000000) amounts.push(num);
    }
  }
  if (amounts.length > 0) {
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    return { min: Math.floor(min), max: Math.floor(max > min ? max : min * 2) };
  }
  return null;
}

// Extraction de noms d'entreprises connues
function extractCompanyName(text) {
  const companies = [
    'Flutterwave', 'OPay', 'Interswitch', 'Wave', 'PalmPay', 'M-Pesa', 'Safaricom', 'MTN',
    'Jumia', 'Andela', 'Paystack', 'Takealot', 'Twiga Foods', 'Kobo360', 'TradeDepot',
    'Dangote', 'Julius Berger', 'Africa50', 'Meridiam', 'Sonatel', 'Orange',
    'Ecobank', 'Standard Bank', 'FirstRand', 'Equity Bank', 'GTBank', 'Zenith Bank',
    'AngloGold Ashanti', 'Gold Fields', 'Harmony Gold', 'Ivanhoe Mines', 'First Quantum',
    'Barrick Gold', 'Sibanye', 'De Beers', 'Glencore',
    'M-KOPA', 'BBOXX', 'd.light', 'ENGIE', 'SolarNow', 'ACWA Power',
    'mPharma', 'Zipline', 'Helium Health', '54gene',
    'Naspers', 'Prosus', 'Airtel Africa', 'Vodacom', 'Maroc Telecom',
    'Olam', 'ETG', 'SIFCA', 'Zambeef', 'Illovo Sugar',
    'Singita', 'Sun International', 'Protea Hotels', 'Radisson',
    'Google', 'Microsoft', 'Meta', 'Amazon', 'Tesla', 'Apple',
    'TotalEnergies', 'Shell', 'BP', 'Enel', 'EDF',
    'AfDB', 'African Development Bank', 'IFC', 'World Bank', 'Afreximbank',
    'Africa Finance Corporation', 'Proparco', 'CDC Group', 'FMO',
  ];
  for (const company of companies) {
    if (text.includes(company)) return company;
  }
  return null;
}

// Catégoriser une actualité
function detectNewsCategory(title, summary) {
  const text = (title + ' ' + (summary || '')).toLowerCase();
  // Finance / Marchés
  if (text.match(/\bstock|market cap|stock exchange|trading|share price|index|bourse|cours|indice|nasdaq|nyse|jse|nse|egx|brvm|gse|masi\b/)) return 'Marché';
  // Entreprises / Résultats
  if (text.match(/\bearnings|profit|revenue|quarterly results?|annual results?|ipo|initial public|results|résultats|bénéfice|chiffre d.affaires\b/)) return 'Entreprise';
  // Investissement / Financement
  if (text.match(/\binvestment|funding|venture capital|startup|raises? \$|series [a-d]|seed round|levée|financement|fonds\b/)) return 'Investissement';
  // Fusions & Acquisitions
  if (text.match(/\bmerger|acquisition|deal|takeover|buyout|acquires?|acquired|rachat|fusion|cession\b/)) return 'M&A';
  // Politique monétaire / Banques centrales
  if (text.match(/\bcentral bank|interest rate|monetary policy|inflation|forex|exchange rate|banque centrale|taux d.intérêt|inflation\b/)) return 'Politique Monétaire';
  // Réglementation
  if (text.match(/\bregulation|regulator|compliance|law|legislation|government policy|réglementation|gouvernement|loi|régulateur\b/)) return 'Régulation';
  // Énergie / Matières premières
  if (text.match(/\benergy|solar|oil|gas|crude|commodity|commodities|gold|copper|cocoa|power|énergie|pétrole|matières premières|or\b/)) return 'Énergie';
  // Technologie
  if (text.match(/\btech(nology)?|digital|fintech|ai\b|artificial intelligence|blockchain|crypto|innovation|numérique|startup\b/)) return 'Tech';
  // Banque / Finance
  if (text.match(/\bbank(ing)?|loan|credit|mortgage|insurance|microfinance|banque|crédit|assurance\b/)) return 'Banque';
  // Agriculture
  if (text.match(/\bagri(culture)?|farming|harvest|crop|food|livestock|agriculture|récolte|céréales\b/)) return 'Agriculture';
  return 'Économie';
}

function fetchRSSFeedInline(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const options = {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PENDO-Bot/1.0; +https://pendo-backend.vercel.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
      }
    };
    const req = proto.get(url, options, (res) => {
      // Suivre les redirections (301, 302)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchRSSFeedInline(res.headers.location, timeoutMs - 1000).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// Décoder l'URL réelle depuis un lien Google News (base64 encodé dans le chemin)
function decodeGoogleNewsUrl(googleUrl) {
  if (!googleUrl || !googleUrl.includes('news.google.com')) return null;
  try {
    // Format: https://news.google.com/rss/articles/CBMi[base64data]
    // Le base64 contient l'URL réelle après quelques octets protobuf
    const match = googleUrl.match(/\/articles\/([A-Za-z0-9_-]+)/);
    if (!match) return null;
    // Convertir base64url en base64 standard
    let b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const decoded = Buffer.from(b64, 'base64').toString('latin1');
    // Chercher l'URL HTTP(S) dans les données décodées
    const urlMatch = decoded.match(/(https?:\/\/[^\x00-\x1f\x7f-\xff\s"<>]+)/);
    if (urlMatch && !urlMatch[1].includes('news.google.com')) {
      return urlMatch[1];
    }
    // Fallback: chercher avec encodage UTF-8
    const decodedUtf8 = Buffer.from(b64, 'base64').toString('utf8');
    const urlMatch2 = decodedUtf8.match(/(https?:\/\/[^\x00-\x1f\s"<>]+)/);
    if (urlMatch2 && !urlMatch2[1].includes('news.google.com')) {
      return urlMatch2[1];
    }
    return null;
  } catch (e) {
    return null;
  }
}

function parseRSSItems(xml) {
  const extractTag = (str, tag) => {
    const re = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[(.*?)\\]\\]></${tag}>|<${tag}[^>]*>(.*?)</${tag}>`, 's');
    const m = str.match(re);
    return m ? (m[1] || m[2] || '').trim() : null;
  };
  const clean = (t) => {
    if (!t) return '';
    let s = t;
    // 1. Retirer les wrappers CDATA
    s = s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
    // 2. Décoder les entités HTML AVANT de strip les tags (Google News encode le HTML)
    s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
    // 2b. Décoder les entités numériques HTML (&#038; → &, &#8217; → ', &#8220; → ", etc.)
    s = s.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)));
    s = s.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
    // 3. Strip TOUS les tags HTML (y compris ceux qui étaient encodés)
    s = s.replace(/<[^>]+>/g, ' ');
    // 4. Nettoyer les espaces multiples
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  };

  const articles = [];
  for (const match of xml.matchAll(/<item>(.*?)<\/item>/gs)) {
    const item = match[1];
    const title = extractTag(item, 'title');
    const link = extractTag(item, 'link');
    const pubDate = extractTag(item, 'pubDate');
    const desc = extractTag(item, 'description');

    // === EXTRACTION URL RÉELLE ===
    let realArticleUrl = null;
    const isGoogleNews = link && link.includes('news.google.com');

    if (isGoogleNews) {
      // Pour Google News: l'URL est la redirection GNews (fonctionne dans les navigateurs)
      // Essayer d'extraire depuis la description HTML (<a href="REAL_URL">)
      if (desc) {
        const decodedDesc = desc.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        const hrefMatch = decodedDesc.match(/<a\s+href="(https?:\/\/[^"]+)"/i);
        if (hrefMatch && !hrefMatch[1].includes('news.google.com')) {
          realArticleUrl = hrefMatch[1];
        }
      }
    } else {
      // Flux direct: l'URL du link EST la vraie URL
      realArticleUrl = link;
    }

    // Extraire le domaine source depuis <source url="...">
    const sourceMatch = item.match(/<source\s+url="(https?:\/\/[^"]+)"/i);

    if (title && link) {
      articles.push({
        title: clean(title),
        url: link,
        realUrl: realArticleUrl || null,
        isGoogleNews: isGoogleNews || false,
        sourceDomain: sourceMatch ? sourceMatch[1] : null,
        summary: desc ? clean(desc).substring(0, 1500) : null,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
      });
    }
  }
  return articles.slice(0, 12);
}

// ============================================
// EXTRACTION DE CONTENU D'ARTICLE RÉEL
// ============================================

// Fetch une page web et retourne le HTML brut (premiers 80KB max)
function fetchPageHTML(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return resolve('');
    }
    const proto = url.startsWith('https') ? https : http;
    const options = {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    };
    const req = proto.get(url, options, (res) => {
      // Suivre les redirections (max 3 niveaux)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.destroy();
        fetchPageHTML(nextUrl, timeoutMs - 1000).then(resolve).catch(() => resolve(''));
        return;
      }
      let data = '';
      let bytes = 0;
      const maxBytes = 80000;
      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes < maxBytes) data += chunk;
        else res.destroy();
      });
      res.on('end', () => resolve(data));
      res.on('close', () => resolve(data));
      res.on('error', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
}

// Extraire le contenu utile d'une page HTML
function extractArticleContent(html) {
  if (!html || html.length < 100) return null;

  // 1. Extraire og:description (résumé éditorial de qualité)
  let ogDesc = '';
  const ogMatch = html.match(/<meta[^>]*property\s*=\s*["']og:description["'][^>]*content\s*=\s*["']([^"']{20,})["']/i)
    || html.match(/<meta[^>]*content\s*=\s*["']([^"']{20,})["'][^>]*property\s*=\s*["']og:description["']/i);
  if (ogMatch) ogDesc = ogMatch[1];

  // 2. Extraire meta description classique
  let metaDesc = '';
  if (!ogDesc) {
    const metaMatch = html.match(/<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']{20,})["']/i)
      || html.match(/<meta[^>]*content\s*=\s*["']([^"']{20,})["'][^>]*name\s*=\s*["']description["']/i);
    if (metaMatch) metaDesc = metaMatch[1];
  }

  // 3. Extraire les paragraphes <p> du corps de l'article
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch;
  while ((pMatch = pRegex.exec(html)) !== null && paragraphs.length < 10) {
    let text = pMatch[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ').trim();
    // Garder seulement les paragraphes substantiels (> 60 chars, pas de nav/menu)
    if (text.length > 60 && !text.match(/cookie|privacy|subscribe|newsletter|sign up|log in|menu|nav/i)) {
      paragraphs.push(text);
    }
  }

  // 4. Extraire og:url pour avoir l'URL réelle
  let realUrl = null;
  const urlMatch = html.match(/<meta[^>]*property\s*=\s*["']og:url["'][^>]*content\s*=\s*["']([^"']+)["']/i);
  if (urlMatch) realUrl = urlMatch[1];

  // 5. Construire la description complète
  let description = '';
  const baseDesc = ogDesc || metaDesc;

  if (paragraphs.length > 0) {
    // Combiner la meta description + les paragraphes pour une description riche
    const paraText = paragraphs.join('\n\n');
    if (baseDesc && !paraText.startsWith(baseDesc.substring(0, 50))) {
      description = baseDesc + '\n\n' + paraText;
    } else {
      description = paraText;
    }
  } else if (baseDesc) {
    description = baseDesc;
  }

  // Décoder les entités HTML restantes
  description = description
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '').trim();

  // Limiter à 2000 caractères
  if (description.length > 2000) description = description.substring(0, 2000) + '...';

  return description.length > 50 ? { description, realUrl } : null;
}

// Enrichir un article : utiliser l'URL réelle extraite du RSS, ou suivre la redirection
async function enrichArticle(article) {
  try {
    // Stratégie 1: Utiliser l'URL réelle extraite du RSS (la plus fiable)
    if (article.realUrl) {
      console.log(`    🔗 URL directe: ${article.realUrl.substring(0, 70)}...`);
      const html = await fetchPageHTML(article.realUrl, 4000);
      if (html && html.length > 500) {
        const content = extractArticleContent(html);
        if (content) {
          console.log(`    ✅ Enrichi: ${article.title?.substring(0, 50)}... (${content.description.length} chars)`);
          return content;
        }
      }
    }

    // Stratégie 2: Essayer l'URL Google News (parfois ça redirige en HTTP)
    const html = await fetchPageHTML(article.url, 3000);
    if (!html || html.length < 200) return null;

    // Vérifier si c'est une page intermédiaire avec meta refresh
    const metaRefresh = html.match(/<meta[^>]*http-equiv\s*=\s*["']refresh["'][^>]*content\s*=\s*["']\d+;\s*url=([^"']+)["']/i);
    if (metaRefresh && metaRefresh[1]) {
      const redirectUrl = metaRefresh[1].replace(/&amp;/g, '&');
      const html2 = await fetchPageHTML(redirectUrl, 3000);
      if (html2 && html2.length > 500) {
        const content = extractArticleContent(html2);
        if (content) {
          console.log(`    ✅ Enrichi (meta refresh): ${article.title?.substring(0, 50)}...`);
          return content;
        }
      }
    }

    // Essayer d'extraire directement du HTML obtenu
    const content = extractArticleContent(html);
    if (content) {
      console.log(`    ✅ Enrichi (direct): ${article.title?.substring(0, 50)}...`);
    }
    return content;
  } catch(e) {
    console.log(`    ❌ Enrichment fail: ${e.message}`);
    return null;
  }
}

// Enrichir un batch d'articles en parallèle (max 8 à la fois)
async function enrichArticlesBatch(articles, batchSize = 8) {
  const enriched = new Map();
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (art) => {
        const content = await enrichArticle(art);
        return { url: art.url, content };
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.content) {
        enriched.set(r.value.url, r.value.content);
      }
    }
  }
  return enriched;
}

// Collecte inline de news : utilise les vrais flux RSS
async function inlineCollectNews() {
  if (!pool) return 0;
  return await collectRealNews(20);
}

// ============================================
// COLLECTE RÉELLE D'OPPORTUNITÉS DEPUIS RSS
// ============================================

// Collecter de vraies opportunités depuis les flux RSS
async function collectRealOpportunities(maxFeeds = 85) {
  if (!pool) return { inserted: 0, errors: [], feeds_ok: 0 };

  // Migration: s'assurer que source_url existe
  try {
    await pool.query("ALTER TABLE investment_opportunities ADD COLUMN IF NOT EXISTS source_url TEXT");
  } catch(e) {}

  // === STRATÉGIE DE SÉLECTION PANAFRICAINE ===
  // 1. TOUS les flux directs (enrichissables) — toujours inclus
  // 2. Compléter avec un échantillon diversifié de Google News par RÉGION
  const directFeeds = OPPORTUNITY_RSS_FEEDS.filter(f => f.direct);
  const googleFeeds = OPPORTUNITY_RSS_FEEDS.filter(f => !f.direct);

  // Distribuer les Google News par région pour diversité géographique
  const regionGroups = {};
  googleFeeds.forEach(f => {
    // Détecter la région du flux par son ID
    const id = f.id;
    let region = 'panafricain';
    if (['ng-invest','gh-invest','sn-invest','ci-invest','ml-invest','bf-invest','gn-invest',
         'bj-tg-invest','ne-invest','sl-invest','lr-invest','mr-invest','cv-invest','gm-invest','gw-invest'].includes(id))
      region = 'west';
    else if (['ke-invest','tz-invest','et-invest','rw-invest','ug-invest','mg-invest','dj-invest',
              'so-invest','ss-invest','er-invest','bi-invest','km-invest'].includes(id))
      region = 'east';
    else if (['eg-invest','ma-invest','tn-invest','dz-invest','ly-invest','sd-invest'].includes(id))
      region = 'north';
    else if (['za-invest','mz-invest','zm-invest','zw-invest','bw-na-invest','ao-invest',
              'mu-invest','sc-invest','mw-invest','sz-invest','ls-invest'].includes(id))
      region = 'south';
    else if (['cd-invest','cm-invest','ga-invest','cg-td-invest','gq-invest','cf-invest','st-invest'].includes(id))
      region = 'central';
    if (!regionGroups[region]) regionGroups[region] = [];
    regionGroups[region].push(f);
  });

  // Inclure TOUS les feeds par région pour garantir la couverture des 54 nations
  // (total ~67 feeds < maxFeeds=85, pas besoin de limiter par région)
  const selectedGoogle = [];
  for (const [region, feeds] of Object.entries(regionGroups)) {
    selectedGoogle.push(...feeds);
  }

  const feeds = [...directFeeds, ...selectedGoogle].slice(0, maxFeeds);
  const errors = [];
  let inserted = 0;
  let feeds_ok = 0;

  console.log(`🌍 [REAL DATA] Fetching ${feeds.length} RSS feeds...`);

  // Fetch en parallèle avec timeout de 6s par feed
  const results = await Promise.allSettled(
    feeds.map(feed =>
      fetchRSSFeedInline(feed.url, 6000)
        .then(xml => ({ feed, articles: parseRSSItems(xml) }))
    )
  );

  // Collecter tous les nouveaux articles (pas encore en base)
  const newArticles = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') {
      errors.push(result.reason?.message || 'Unknown error');
      continue;
    }
    const { feed, articles } = result.value;
    if (articles.length === 0) continue;
    feeds_ok++;
    console.log(`  ✅ ${feed.name}: ${articles.length} articles`);

    for (const article of articles) {
      try {
        // Vérifier par l'URL Google News ET par l'URL réelle (si disponible)
        const urlsToCheck = [article.url];
        if (article.realUrl) urlsToCheck.push(article.realUrl);
        const exists = await pool.query(
          "SELECT id FROM investment_opportunities WHERE source_url = ANY($1) LIMIT 1",
          [urlsToCheck]
        );
        if (exists.rows.length > 0) continue;
        newArticles.push({ ...article, feedName: feed.name, feedId: feed.id });
      } catch(e) {}
    }
  }

  const withRealUrl = newArticles.filter(a => a.realUrl).length;
  console.log(`📰 [REAL DATA] ${newArticles.length} nouveaux articles trouvés (${withRealUrl} avec URL réelle décodée)`);

  // ===== ENRICHISSEMENT : Fetcher le contenu réel (seulement les articles avec URL directe) =====
  // Seuls les articles de flux directs (non Google News) peuvent être enrichis efficacement
  const directArticles = newArticles.filter(a => a.realUrl && !a.isGoogleNews);
  const articlesToEnrich = directArticles.slice(0, 50); // 50 max pour couverture panafricaine
  console.log(`  📊 Direct: ${directArticles.length}, Google News: ${newArticles.length - directArticles.length}`);
  console.log(`📝 [ENRICHMENT] Enrichissement de ${articlesToEnrich.length}/${newArticles.length} articles...`);
  const enrichedMap = await enrichArticlesBatch(articlesToEnrich, 12);
  console.log(`📝 [ENRICHMENT] ${enrichedMap.size}/${articlesToEnrich.length} articles enrichis avec contenu détaillé`);

  // ===== INSERTION EN BASE =====
  for (const article of newArticles) {
    try {
      const enriched = enrichedMap.get(article.url);
      const articleDesc = enriched ? enriched.description : null;
      // Priorité URL: enriched.realUrl > article.realUrl (du RSS) > article.url (Google News)
      const realUrl = (enriched && enriched.realUrl) ? enriched.realUrl
        : (article.realUrl || article.url);

      // Texte complet pour l'analyse (titre + contenu enrichi)
      const fullText = (article.title || '') + ' ' + (articleDesc || article.summary || '');

      // Détecter le pays (texte d'abord, puis fallback par feed ID pour les flux Google News par pays)
      let detectedCountry = detectCountry(fullText);

      // FALLBACK PANAFRICAIN: Si pas de pays détecté dans le texte, utiliser le pays du feed
      // Les feeds Google News par pays ont un ID format "XX-invest" (ex: ao-invest → Angola)
      if (!detectedCountry && article.feedId) {
        const feedMatch = article.feedId.match(/^([a-z]{2})-invest$/);
        if (feedMatch) {
          const feedCode = feedMatch[1].toUpperCase();
          const feedCountry = AFRICAN_COUNTRIES_DETECT.find(c => c.code === feedCode);
          if (feedCountry) {
            detectedCountry = feedCountry;
            console.log(`    🌍 Feed fallback: ${article.feedId} → ${feedCountry.name} (${feedCode})`);
          }
        }
        // Feeds multi-pays: bw-na-invest → Botswana, cg-td-invest → Congo, bj-tg-invest → Bénin
        if (!detectedCountry) {
          const multiMatch = article.feedId.match(/^([a-z]{2})-([a-z]{2})-invest$/);
          if (multiMatch) {
            const code1 = multiMatch[1].toUpperCase();
            const fallback = AFRICAN_COUNTRIES_DETECT.find(c => c.code === code1);
            if (fallback) {
              detectedCountry = fallback;
              console.log(`    🌍 Multi-feed fallback: ${article.feedId} → ${fallback.name} (${code1})`);
            }
          }
        }
      }

      const countryCode = detectedCountry ? detectedCountry.code : 'AF';
      const countryName = detectedCountry ? detectedCountry.name : 'Panafricain';
      const region = detectedCountry ? detectedCountry.region : 'Panafricain';

      // Détecter le secteur (meilleure détection avec le contenu complet)
      const sector = detectSector(fullText);
      const subsector = detectSubsector(sector, fullText);

      // Extraire le nom d'entreprise
      const companyName = extractCompanyName(fullText);

      // Extraire les montants d'investissement
      const amounts = extractInvestmentAmounts(fullText);
      const minInv = amounts ? amounts.min : 500000;
      const maxInv = amounts ? amounts.max : 5000000;

      // Slug
      const slug = `real-${countryCode.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      // Résumé court (pour les cartes) — meta description ou début du contenu
      let summary = articleDesc
        ? articleDesc.split('\n\n')[0].substring(0, 500)
        : (article.summary || article.title);
      if (summary.length > 500) summary = summary.substring(0, 500) + '...';

      // Description complète (pour la page détail) — contenu enrichi complet
      let description = articleDesc || article.summary || article.title;
      if (description.length > 3000) description = description.substring(0, 3000) + '...';

      const oppType = companyName ? 'company' : 'project';

      const r = await pool.query(
        `INSERT INTO investment_opportunities
          (title, slug, sector, subsector, country, country_name, region,
           summary, description, opportunity_type, min_investment, max_investment,
           expected_return_min, expected_return_max, investment_horizon, risk_level,
           company_name, source_name, source_url, status, published_at, updated_at, scraped_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW(),NOW())`,
        [
          article.title, slug, sector, subsector,
          countryCode, countryName, region,
          summary,
          description,
          oppType, minInv, maxInv,
          Math.floor(8 + Math.random() * 12),
          Math.floor(18 + Math.random() * 20),
          'medium', 'medium',
          companyName,
          article.feedName,
          realUrl,
          'active',
          article.published_at
        ]
      );
      if (r.rowCount > 0) inserted++;
    } catch(e) {
      if (!e.message.includes('duplicate')) {
        console.error(`  ❌ Insert error: ${e.message}`);
      }
    }
  }

  console.log(`💼 [REAL DATA] ${inserted} opportunités réelles insérées (${feeds_ok}/${feeds.length} feeds OK, ${enrichedMap.size} enrichis)`);
  return { inserted, errors, feeds_ok, enriched: enrichedMap.size };
}

// Collecter de vraies actualités depuis les flux RSS
async function collectRealNews(maxFeeds = 20) {
  if (!pool) return 0;

  // Migration: ajouter source_url si manquant
  try { await pool.query("ALTER TABLE news ADD COLUMN IF NOT EXISTS source_url TEXT"); } catch(e) {}

  const feeds = [...NEWS_RSS_FEEDS, ...OPPORTUNITY_RSS_FEEDS.slice(0, 5)]
    .slice(0, maxFeeds);
  let total = 0;

  const results = await Promise.allSettled(
    feeds.map(feed =>
      fetchRSSFeedInline(feed.url, 5000)
        .then(xml => ({ feed, articles: parseRSSItems(xml) }))
    )
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { feed, articles } = result.value;

    for (const art of articles) {
      try {
        const existsUrl = art.realUrl || art.url;
        const exists = await pool.query(
          "SELECT id FROM news WHERE url = $1 OR (source_url IS NOT NULL AND source_url = $2) LIMIT 1",
          [art.url, art.realUrl || art.url]
        );
        if (exists.rows.length === 0) {
          const category = detectNewsCategory(art.title, art.summary);
          // Description RSS : stocker jusqu'à 1500 chars (sera enrichi par enrich-news)
          const description = art.summary ? art.summary.substring(0, 1500) : null;
          await pool.query(
            `INSERT INTO news (title, summary, url, source_url, source, category, published_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (url) DO NOTHING`,
            [art.title, description, art.url, art.realUrl || null, feed.name, category, art.published_at]
          );
          total++;
        }
      } catch(e) {
        if (!e.message.includes('duplicate')) {
          console.error(`❌ News insert error: ${e.message}`);
        }
      }
    }
  }

  console.log(`📰 [REAL NEWS] ${total} actualités collectées`);
  return total;
}

// Endpoint statut de collecte
app.get('/api/cron/status', verifyCronSecret, async (req, res) => {
  if (!pool) return res.json({ success: false, error: 'No DB' });
  try {
    const [newsCheck, oppsCheck] = await Promise.all([
      pool.query("SELECT MAX(published_at) as latest, COUNT(*) as total FROM news"),
      pool.query("SELECT MAX(published_at) as latest, COUNT(*) as total FROM investment_opportunities")
    ]);
    const newsAge = newsCheck.rows[0].latest ? Math.floor((Date.now() - new Date(newsCheck.rows[0].latest).getTime()) / 60000) : 999;
    const oppsAge = oppsCheck.rows[0].latest ? Math.floor((Date.now() - new Date(oppsCheck.rows[0].latest).getTime()) / 60000) : 999;
    res.json({
      success: true,
      version: BUILD_VERSION,
      news: { total: parseInt(newsCheck.rows[0].total), lastUpdate: newsCheck.rows[0].latest, ageMinutes: newsAge, stale: newsAge > 480 },
      opportunities: { total: parseInt(oppsCheck.rows[0].total), lastUpdate: oppsCheck.rows[0].latest, ageMinutes: oppsAge, stale: oppsAge > 480 }
    });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// COUVERTURE - Voir quels pays sont couverts dans la base
app.get('/api/coverage', async (req, res) => {
  if (!pool) return res.json({ success: false, error: 'No DB pool' });
  try {
    const result = await pool.query(`
      SELECT country AS code, country_name AS name, region, COUNT(*) AS articles,
        COUNT(CASE WHEN LENGTH(description) > 200 THEN 1 END) AS enriched
      FROM investment_opportunities WHERE status = 'active'
      GROUP BY country, country_name, region ORDER BY articles DESC
    `);
    const totalCountries = result.rows.length;
    const totalArticles = result.rows.reduce((s, r) => s + parseInt(r.articles), 0);
    const totalEnriched = result.rows.reduce((s, r) => s + parseInt(r.enriched), 0);
    const allCodes = AFRICAN_COUNTRIES_DETECT.map(c => c.code);
    const coveredCodes = result.rows.map(r => r.code);
    const missing = AFRICAN_COUNTRIES_DETECT.filter(c => !coveredCodes.includes(c.code)).map(c => ({
      code: c.code, name: c.name, region: c.region
    }));
    res.json({
      success: true,
      version: BUILD_VERSION,
      totalFeeds: OPPORTUNITY_RSS_FEEDS.length,
      directFeeds: OPPORTUNITY_RSS_FEEDS.filter(f => f.direct).length,
      stats: { totalCountries, target: 54, totalArticles, totalEnriched },
      coveragePercent: Math.round(totalCountries / 54 * 100) + '%',
      countries: result.rows,
      missingCountries: missing,
      missingCount: missing.length
    });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// RESET - Purge toutes les anciennes opportunités et collecte des VRAIES nouvelles
app.get('/api/reset-opportunities', verifyCronSecret, async (req, res) => {
  if (!pool) return res.json({ success: false, error: 'No DB pool' });
  try {
    // 1. Voir l'état actuel
    const before = await pool.query(
      "SELECT COUNT(*) as total, MIN(published_at) as oldest, MAX(published_at) as newest FROM investment_opportunities"
    );
    // 2. Tout supprimer
    const deleteResult = await pool.query("DELETE FROM investment_opportunities");
    // 3. Collecter de VRAIES opportunités depuis tous les flux RSS
    const { inserted, errors, feeds_ok, enriched } = await collectRealOpportunities(40); // 40 feeds pour couverture panafricaine 54 pays
    // 4. Vérifier après
    const after = await pool.query(
      "SELECT COUNT(*) as total, MIN(published_at) as oldest, MAX(published_at) as newest FROM investment_opportunities"
    );
    res.json({
      success: true,
      version: BUILD_VERSION,
      mode: 'REAL_DATA',
      deleted: deleteResult.rowCount,
      realInserted: inserted,
      enrichedWithContent: enriched || 0,
      feedsOK: feeds_ok,
      feedErrors: errors.length,
      before: before.rows[0],
      after: after.rows[0]
    });
  } catch(e) {
    res.status(500).json({ success: false, version: BUILD_VERSION, error: e.message, stack: e.stack });
  }
});

// Debug RSS - Diagnostic endpoint pour voir le format RSS et tester l'enrichissement
app.get('/api/debug-rss', verifyCronSecret, async (req, res) => {
  try {
    const testUrl = OPPORTUNITY_RSS_FEEDS[0].url;
    console.log('🔍 [DEBUG] Fetching RSS:', testUrl);
    const xml = await fetchRSSFeedInline(testUrl, 8000);

    // Extraire le premier <item> brut
    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
    const rawItem = itemMatch ? itemMatch[1] : 'NO ITEM FOUND';

    // Parser les articles
    const articles = parseRSSItems(xml);
    const firstArticle = articles[0] || {};

    // Test du décodage base64 sur les 3 premiers articles
    const decodeTests = articles.slice(0, 3).map(a => ({
      title: a.title?.substring(0, 60),
      googleUrl: a.url?.substring(0, 80),
      decodedUrl: a.realUrl || 'NULL',
      sourceDomain: a.sourceDomain || 'NULL'
    }));

    // Tester l'enrichissement sur le premier article si realUrl disponible
    let enrichResult = null;
    if (firstArticle.realUrl) {
      const html = await fetchPageHTML(firstArticle.realUrl, 5000);
      const extracted = html ? extractArticleContent(html) : null;
      enrichResult = {
        realUrl: firstArticle.realUrl,
        htmlLength: html ? html.length : 0,
        htmlStart: html ? html.substring(0, 300) : 'EMPTY',
        descriptionLength: extracted ? extracted.description.length : 0,
        descriptionPreview: extracted ? extracted.description.substring(0, 200) : 'NULL'
      };
    }

    res.json({
      success: true,
      version: BUILD_VERSION,
      feed: OPPORTUNITY_RSS_FEEDS[0].name,
      xmlLength: xml.length,
      rawItemFirst500: rawItem.substring(0, 500),
      decodeTests,
      enrichResult,
      totalArticles: articles.length
    });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message, stack: e.stack });
  }
});

// ============================================
// ROUTES - MARKETS
// ============================================

// ── Real-time market data service (reads from Supabase snapshots) ──────
let getRealMarkets;
try {
  getRealMarkets = require('./services/realTimeMarkets').getMarkets;
  console.log('✅ realTimeMarkets service loaded');
} catch (loadErr) {
  console.error('❌ Failed to load realTimeMarkets:', loadErr.message);
  getRealMarkets = null;
}

app.get('/api/markets', cachePublic(300), async (req, res) => {
  try {
    if (!getRealMarkets) throw new Error('Service not loaded');
    // Pass the PostgreSQL pool to read from market_snapshots table
    const markets = await getRealMarkets(pool);
    res.json(formatResponse({
      markets,
      total: markets.length,
      lastUpdate: new Date().toISOString()
    }));
  } catch (err) {
    console.error('Markets endpoint error:', err.message);
    // Fallback to static data if real-time fails
    const fallbackMarkets = AFRICAN_MARKETS.map((market) => ({
      id: market.id,
      code: market.id.toUpperCase(),
      name: market.name,
      country: market.country,
      countryCode: market.countryCode,
      currency: market.currency,
      indexValue: market.baseValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
      rawValue: market.baseValue,
      change: '+0.00%',
      changePercent: 0,
      positive: true,
      volume: 'N/A',
      status: 'closed',
      openTime: market.openTime,
      closeTime: market.closeTime,
      timezone: market.timezone,
      source: 'Données de référence'
    }));
    res.json(formatResponse({
      markets: fallbackMarkets,
      total: fallbackMarkets.length,
      lastUpdate: new Date().toISOString()
    }));
  }
});

app.get('/api/markets/prices', (req, res) => {
  // Stable reference prices — no random variation (real-time scraping not available)
  const prices = {};
  AFRICAN_STOCKS.forEach(stock => {
    prices[stock.ticker] = {
      price: stock.price,
      change: 0,
      currency: stock.currency,
      source: 'reference'
    };
  });
  res.json(formatResponse(prices));
});

app.get('/api/markets/:id', async (req, res) => {
  const { id } = req.params;
  const normalizedId = id.toLowerCase();

  // Use the same realTimeMarkets source as GET /api/markets to guarantee price consistency
  try {
    if (!getRealMarkets) throw new Error('Service not loaded');
    const allMarkets = await getRealMarkets(pool);
    // Support both numeric index (1-based) and string id
    const numericId = parseInt(id);
    let market;
    if (!isNaN(numericId) && numericId > 0 && numericId <= allMarkets.length) {
      market = allMarkets[numericId - 1];
    } else {
      market = allMarkets.find(m => m.id === normalizedId);
    }
    if (!market) return res.status(404).json(formatError('Marché non trouvé', 404));

    const rMkt = dailySeed(market.id);
    const ref = market.rawValue || market.baseValue || 1;
    res.json(formatResponse({
      ...market,
      volume: Math.floor(rMkt() * 10000000) + 1000000,
      high52w: ref * 1.15,
      low52w: ref * 0.85,
      marketCap: ref * 1000000000,
      stocks: AFRICAN_STOCKS.filter(s => s.exchange === market.id).length,
    }));
  } catch (e) {
    // Fallback to static array if realTimeMarkets fails entirely
    const numericId = parseInt(id);
    let market;
    if (!isNaN(numericId) && numericId > 0 && numericId <= AFRICAN_MARKETS.length) {
      market = AFRICAN_MARKETS[numericId - 1];
    } else {
      market = AFRICAN_MARKETS.find(m => m.id === normalizedId);
    }
    if (!market) return res.status(404).json(formatError('Marché non trouvé', 404));
    const rMkt = dailySeed(market.id);
    const avgChange = (rMkt() * 6 - 3);
    const isPositive = avgChange >= 0;
    res.json(formatResponse({
      ...market,
      value: market.baseValue * (1 + avgChange / 100),
      change: `${isPositive ? '+' : ''}${avgChange.toFixed(2)}%`,
      changePercent: parseFloat(avgChange.toFixed(2)),
      positive: isPositive,
      volume: Math.floor(rMkt() * 10000000) + 1000000,
      high52w: market.baseValue * 1.15,
      low52w: market.baseValue * 0.85,
      marketCap: market.baseValue * 1000000000,
      stocks: AFRICAN_STOCKS.filter(s => s.exchange === market.id).length,
      lastUpdate: new Date().toISOString()
    }));
  }
});

// ── Détection d'anomalies sur les mouvements de marché (z-score) ───────────
let getMarketAnomaliesFn;
try {
  getMarketAnomaliesFn = require('./services/realTimeMarkets').getMarketAnomalies;
} catch (loadErr) {
  console.error('❌ Failed to load getMarketAnomalies:', loadErr.message);
  getMarketAnomaliesFn = null;
}

app.get('/api/market-anomalies', cachePublic(300), async (req, res) => {
  try {
    if (!getMarketAnomaliesFn || !pool) {
      return res.json({ success: true, data: [], count: 0, params: { mode: 'unavailable' } });
    }

    const limit = parseInt(req.query.limit) || 10;
    const threshold = parseFloat(req.query.threshold) || 2.5;
    const minHistory = parseInt(req.query.min_history) || 5;
    const returnAll = req.query.all === 'true';

    let results = await getMarketAnomaliesFn(pool, { minHistory, threshold, days: 14 });
    if (!returnAll) results = results.filter((r) => r.anomaly);
    results = results.slice(0, limit);

    res.json({
      success: true,
      data: results,
      count: results.length,
      params: { threshold, min_history: minHistory, mode: returnAll ? 'all' : 'anomalies_only' }
    });
  } catch (err) {
    console.error('market-anomalies endpoint error:', err.message);
    res.json({ success: true, data: [], count: 0, params: { mode: 'error' } });
  }
});

app.get('/api/markets/:id/history', (req, res) => {
  const { id } = req.params;
  const { period = '1M' } = req.query;
  // Support both numeric IDs and text IDs
  let market;
  const numericId = parseInt(id);
  if (!isNaN(numericId) && numericId > 0 && numericId <= AFRICAN_MARKETS.length) {
    market = AFRICAN_MARKETS[numericId - 1];
  } else {
    market = AFRICAN_MARKETS.find(m => m.id === id.toLowerCase());
  }
  if (!market) {
    return res.status(404).json(formatError('Marché non trouvé', 404));
  }
  const marketSeed = market.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const history = generateHistoricalData(market.baseValue, period.toUpperCase(), marketSeed);
  res.json(formatResponse({
    market_id: market.id,
    market_name: market.name,
    period: period,
    currency: market.currency,
    data: history,
    count: history.length
  }));
});

// ============================================
// ROUTES - STOCKS
// ============================================

app.get('/api/stocks', cachePublic(900), (req, res) => {
  const { exchange, sector, limit = 100, offset = 0 } = req.query;
  let filteredStocks = [...AFRICAN_STOCKS];

  if (exchange) {
    filteredStocks = filteredStocks.filter(s => s.exchange === exchange);
  }
  if (sector) {
    filteredStocks = filteredStocks.filter(s => s.sector === sector);
  }

  const enrichedStocks = filteredStocks.map(stock => {
    const rSt = dailySeed(stock.ticker);
    const change = (rSt() - 0.5) * 10;
    return {
      ...stock,
      currentPrice: stock.price * (1 + change / 100),
      change: change.toFixed(2),
      changePercent: change,
      positive: change >= 0,
      volume: Math.floor(rSt() * 500000) + 10000,
      marketCap: stock.price * (Math.floor(rSt() * 10000000) + 1000000)
    };
  });

  res.json(formatResponse({
    stocks: enrichedStocks.slice(parseInt(offset), parseInt(offset) + parseInt(limit)),
    total: enrichedStocks.length,
    exchanges: [...new Set(AFRICAN_STOCKS.map(s => s.exchange))],
    sectors: [...new Set(AFRICAN_STOCKS.map(s => s.sector))]
  }));
});

app.get('/api/stocks/:ticker', (req, res) => {
  const { ticker } = req.params;
  const stock = AFRICAN_STOCKS.find(s => s.ticker.toLowerCase() === ticker.toLowerCase());
  if (!stock) {
    return res.status(404).json(formatError('Action non trouvée', 404));
  }
  const rTk = dailySeed(stock.ticker);
  const change = (rTk() - 0.5) * 10;
  res.json(formatResponse({
    ...stock,
    currentPrice: stock.price * (1 + change / 100),
    change: change.toFixed(2),
    changePercent: change,
    positive: change >= 0,
    volume: Math.floor(rTk() * 500000) + 10000,
    marketCap: stock.price * (Math.floor(rTk() * 10000000) + 1000000),
    high52w: stock.price * 1.25,
    low52w: stock.price * 0.75,
    pe_ratio: (10 + rTk() * 20).toFixed(2),
    dividend_yield: (rTk() * 5).toFixed(2) + '%'
  }));
});

app.get('/api/stocks/:ticker/history', (req, res) => {
  const { ticker } = req.params;
  const { period = '1M' } = req.query;
  const stock = AFRICAN_STOCKS.find(s => s.ticker.toLowerCase() === ticker.toLowerCase());
  if (!stock) {
    return res.status(404).json(formatError('Action non trouvée', 404));
  }
  const stockSeed = stock.ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const history = generateHistoricalData(stock.price, period.toUpperCase(), stockSeed);
  res.json(formatResponse({
    ticker: stock.ticker,
    name: stock.name,
    period,
    currency: stock.currency,
    data: history,
    count: history.length
  }));
});

// ============================================
// ROUTES - OPPORTUNITIES
// ============================================

app.get('/api/opportunities', cachePublic(1800), async (req, res) => {
  const { sector, country, risk_level, search } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 100, 200); // Cap at 200
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  // Essayer d'abord la DB
  if (pool) {
    try {
      // NOTE: Purge et collecte sont gérées par les crons (collect-all, translate-content)
      // Ne PAS lancer de scraping inline sur les requêtes utilisateur

      let query = 'SELECT * FROM investment_opportunities WHERE status = $1';
      let countQuery = 'SELECT COUNT(*) as total FROM investment_opportunities WHERE status = $1';
      let params = ['active'];
      let countParams = ['active'];
      let paramIndex = 2;

      if (sector) {
        query += ` AND sector = $${paramIndex}`;
        countQuery += ` AND sector = $${paramIndex}`;
        params.push(sector);
        countParams.push(sector);
        paramIndex++;
      }
      if (country) {
        query += ` AND country = $${paramIndex}`;
        countQuery += ` AND country = $${paramIndex}`;
        params.push(country);
        countParams.push(country);
        paramIndex++;
      }
      if (risk_level) {
        query += ` AND risk_level = $${paramIndex}`;
        countQuery += ` AND risk_level = $${paramIndex}`;
        params.push(risk_level);
        countParams.push(risk_level);
        paramIndex++;
      }
      if (search) {
        const searchPattern = `%${search}%`;
        query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex + 1} OR company_name ILIKE $${paramIndex + 2} OR country_name ILIKE $${paramIndex + 3})`;
        countQuery += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex + 1} OR company_name ILIKE $${paramIndex + 2} OR country_name ILIKE $${paramIndex + 3})`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        paramIndex += 4;
      }

      query += ` ORDER BY published_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(query, params);
      const countResult = await pool.query(countQuery, countParams);
      // Parser les champs JSON stockés en string
      let opportunities = result.rows.map(row => ({
        ...row,
        tags: typeof row.tags === 'string' ? (() => { try { return JSON.parse(row.tags); } catch(e) { return []; } })() : (row.tags || []),
        external_links: typeof row.external_links === 'string' ? (() => { try { return JSON.parse(row.external_links); } catch(e) { return null; } })() : row.external_links
      }));
      // Score de pertinence (0-100) — calculé à la volée, pas stocké en base
      opportunities = scoreOpportunities(opportunities);
      if (req.query.sort === 'relevance' || req.query.sort === 'score') {
        opportunities = opportunities.slice().sort((a, b) => b.relevance_score - a.relevance_score);
      }
      return res.json({
        success: true,
        data: {
          opportunities,
          pagination: {
            total: parseInt(countResult.rows[0].total),
            limit,
            offset,
            hasMore: (offset + limit) < parseInt(countResult.rows[0].total)
          }
        }
      });
    } catch (e) {
      console.log('DB query failed:', e.message, '- using demo data');
    }
  }

  // Fallback aux données démo
  let filtered = [...DEMO_OPPORTUNITIES];
  if (sector) filtered = filtered.filter(o => o.sector === sector);
  if (country) filtered = filtered.filter(o => o.country === country);
  if (risk_level) filtered = filtered.filter(o => o.riskLevel === risk_level);
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(o =>
      o.title?.toLowerCase().includes(searchLower) ||
      o.description?.toLowerCase().includes(searchLower) ||
      o.company?.toLowerCase().includes(searchLower)
    );
  }

  // Adapte les champs camelCase des données démo vers le format attendu par
  // le scoring (expected_return_max, risk_level, published_at...) sans muter
  // les objets d'origine.
  const scorable = filtered.map(o => {
    const returnMatch = /(\d+)\s*-\s*(\d+)/.exec(o.expectedReturn || '');
    return {
      ...o,
      expected_return_max: returnMatch ? Number(returnMatch[2]) : undefined,
      expected_return_min: returnMatch ? Number(returnMatch[1]) : undefined,
      risk_level: o.riskLevel,
      published_at: o.publishedAt
    };
  });
  let scoredFiltered = scoreOpportunities(scorable).map(({ expected_return_max, expected_return_min, risk_level, published_at, ...rest }) => rest);
  if (req.query.sort === 'relevance' || req.query.sort === 'score') {
    scoredFiltered = scoredFiltered.slice().sort((a, b) => b.relevance_score - a.relevance_score);
  }

  res.json({
    success: true,
    data: {
      opportunities: scoredFiltered.slice(parseInt(offset), parseInt(offset) + parseInt(limit)),
      pagination: {
        total: scoredFiltered.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < scoredFiltered.length
      }
    }
  });
});

app.get('/api/opportunities/stats', async (req, res) => {
  if (pool) {
    try {
      const totalResult = await pool.query('SELECT COUNT(*) as total FROM investment_opportunities WHERE status = $1', ['active']);
      const sectorResult = await pool.query('SELECT sector, COUNT(*) as count FROM investment_opportunities WHERE status = $1 GROUP BY sector ORDER BY count DESC', ['active']);
      const countryResult = await pool.query('SELECT country, country_name, COUNT(*) as count FROM investment_opportunities WHERE status = $1 GROUP BY country, country_name ORDER BY count DESC', ['active']);
      const riskResult = await pool.query('SELECT risk_level, COUNT(*) as count FROM investment_opportunities WHERE status = $1 GROUP BY risk_level ORDER BY count DESC', ['active']);
      const avgReturnResult = await pool.query('SELECT AVG(expected_return_min) as avg_return, SUM(market_size_usd) as total_market_size FROM investment_opportunities WHERE status = $1', ['active']);

      return res.json({
        success: true,
        data: {
          total: parseInt(totalResult.rows[0].total),
          total_market_size: parseFloat(avgReturnResult.rows[0].total_market_size) || 0,
          avg_return: parseFloat(avgReturnResult.rows[0].avg_return) || 0,
          by_sector: sectorResult.rows.map(r => ({ sector: r.sector, count: parseInt(r.count) })),
          by_country: countryResult.rows.map(r => ({ country: r.country, country_name: r.country_name, count: parseInt(r.count) })),
          by_risk_level: riskResult.rows.map(r => ({ risk_level: r.risk_level, count: parseInt(r.count) }))
        }
      });
    } catch (e) {
      console.log('Stats query failed:', e.message);
    }
  }

  // Fallback démo
  const bySector = {};
  const byCountry = {};
  const byRisk = {};
  DEMO_OPPORTUNITIES.forEach(o => {
    bySector[o.sector] = (bySector[o.sector] || 0) + 1;
    byCountry[o.country] = (byCountry[o.country] || 0) + 1;
    if (o.riskLevel) byRisk[o.riskLevel] = (byRisk[o.riskLevel] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      total: DEMO_OPPORTUNITIES.length,
      total_market_size: 0,
      avg_return: 0,
      by_sector: Object.entries(bySector).map(([sector, count]) => ({ sector, count })),
      by_country: Object.entries(byCountry).map(([country, count]) => ({ country, country_name: country, count })),
      by_risk_level: Object.entries(byRisk).map(([risk_level, count]) => ({ risk_level, count }))
    }
  });
});

app.get('/api/opportunities/sectors', async (req, res) => {
  if (pool) {
    try {
      const result = await pool.query('SELECT DISTINCT sector FROM investment_opportunities WHERE status = $1 AND sector IS NOT NULL ORDER BY sector', ['active']);
      return res.json(formatResponse(result.rows.map(r => r.sector)));
    } catch (e) {}
  }
  const sectors = [...new Set(DEMO_OPPORTUNITIES.map(o => o.sector))];
  res.json(formatResponse(sectors));
});

app.get('/api/opportunities/countries', async (req, res) => {
  if (pool) {
    try {
      const result = await pool.query('SELECT DISTINCT country, country_name FROM investment_opportunities WHERE status = $1 AND country IS NOT NULL ORDER BY country_name', ['active']);
      return res.json(formatResponse(result.rows.map(r => ({ code: r.country, name: r.country_name }))));
    } catch (e) {}
  }
  const countries = DEMO_OPPORTUNITIES.map(o => ({ code: o.countryCode, name: o.country }));
  const unique = [...new Map(countries.map(c => [c.code, c])).values()];
  res.json(formatResponse(unique));
});

app.get('/api/opportunities/:id', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      // Chercher par ID numérique ou par slug
      let result;
      if (!isNaN(id)) {
        result = await pool.query('SELECT * FROM investment_opportunities WHERE id = $1', [parseInt(id)]);
      }
      if (!result || result.rows.length === 0) {
        result = await pool.query('SELECT * FROM investment_opportunities WHERE slug = $1', [id]);
      }

      if (result.rows.length > 0) {
        const opportunity = result.rows[0];

        // Parser les champs JSON stockés en string
        if (typeof opportunity.tags === 'string') {
          try { opportunity.tags = JSON.parse(opportunity.tags); } catch(e) { opportunity.tags = []; }
        }
        if (!Array.isArray(opportunity.tags)) opportunity.tags = [];

        if (typeof opportunity.external_links === 'string') {
          try { opportunity.external_links = JSON.parse(opportunity.external_links); } catch(e) { opportunity.external_links = null; }
        }

        // Charger les highlights associés (table optionnelle)
        try {
          const highlightsResult = await pool.query(
            'SELECT * FROM opportunity_highlights WHERE opportunity_id = $1 ORDER BY display_order',
            [opportunity.id]
          );
          if (highlightsResult.rows.length > 0) {
            opportunity.highlights = highlightsResult.rows;
          }
        } catch (e) {
          // Table n'existe pas encore, on garde highlights vide
          if (!opportunity.highlights) opportunity.highlights = [];
        }

        // Charger les tags depuis la table tags (si elle existe)
        try {
          const tagsResult = await pool.query(
            'SELECT tag FROM opportunity_tags WHERE opportunity_id = $1',
            [opportunity.id]
          );
          if (tagsResult.rows.length > 0) {
            opportunity.tags = tagsResult.rows.map(r => r.tag);
          }
        } catch (e) {
          // Table n'existe pas, on garde les tags parsés du champ JSON
        }

        return res.json(formatResponse(opportunity));
      }
    } catch (e) {
      console.log('Opportunity detail query failed:', e.message);
    }
  }

  const opportunity = DEMO_OPPORTUNITIES.find(o => o.id === parseInt(id) || o.slug === id);
  if (!opportunity) {
    return res.status(404).json(formatError('Opportunité non trouvée', 404));
  }
  res.json(formatResponse(opportunity));
});

// Migration: mettre à jour company_name depuis les données locales
app.get('/api/migrate/company-names', async (req, res) => {
  if (!pool) return res.status(500).json({ error: 'No database connection' });

  // Migration supprimée - intégrée dans initDB()
  res.json({ success: true, message: 'Migration is now automatic via initDB on cold start' });
});

// ============================================
// ROUTES - NEWS
// ============================================

app.get('/api/news', cachePublic(600), async (req, res) => {
  const { market, category } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 20, 200); // Cap at 200
  const dedupeEnabled = req.query.dedupe !== 'false';
  // Sur-échantillonne avant dédup pour ne pas se retrouver avec moins de
  // `limit` articles une fois les quasi-doublons fusionnés
  const rawLimit = dedupeEnabled ? Math.min(limit * 3, 200) : limit;

  if (pool) {
    try {
      // NOTE: Collecte gérée par les crons (collect-all) — pas de scraping inline

      let query = 'SELECT * FROM news WHERE 1=1';
      let params = [];
      let paramIndex = 1;

      if (market) {
        query += ` AND market_id = $${paramIndex}`;
        params.push(market);
        paramIndex++;
      }
      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      query += ` ORDER BY published_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(rawLimit));

      const result = await pool.query(query, params);
      if (result.rows.length > 0) {
        const articles = dedupeEnabled
          ? deduplicateArticles(result.rows).slice(0, limit)
          : result.rows.slice(0, limit);
        return res.json(formatResponse(articles));
      }
    } catch (e) {}
  }

  let filtered = [...DEMO_NEWS];
  if (market) filtered = filtered.filter(n => n.market_id === market);
  if (category) filtered = filtered.filter(n => n.category === category);
  if (dedupeEnabled) filtered = deduplicateArticles(filtered);

  res.json(formatResponse(filtered.slice(0, parseInt(limit))));
});

app.get('/api/news/latest', async (req, res) => {
  const { limit = 50 } = req.query;
  const dedupeEnabled = req.query.dedupe !== 'false';
  const rawLimit = dedupeEnabled ? Math.min(parseInt(limit) * 3, 200) : parseInt(limit);
  // Utiliser les vraies données DB si disponibles
  if (pool) {
    try {
      const result = await pool.query(
        `SELECT *
         FROM news
         ORDER BY published_at DESC
         LIMIT $1`,
        [rawLimit]
      );
      if (result.rows.length > 0) {
        const articles = dedupeEnabled
          ? deduplicateArticles(result.rows).slice(0, parseInt(limit))
          : result.rows.slice(0, parseInt(limit));
        return res.json(formatResponse(articles));
      }
    } catch(e) {}
  }
  const demo = dedupeEnabled ? deduplicateArticles(DEMO_NEWS) : DEMO_NEWS;
  res.json(formatResponse(demo.slice(0, parseInt(limit))));
});

app.get('/api/news/:id', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const result = await pool.query('SELECT * FROM news WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        return res.json(formatResponse(result.rows[0]));
      }
    } catch (e) {}
  }

  const news = DEMO_NEWS.find(n => n.id === parseInt(id));
  if (!news) {
    return res.status(404).json(formatError('Actualité non trouvée', 404));
  }
  res.json(formatResponse(news));
});

app.post('/api/news/refresh', (req, res) => {
  res.json(formatResponse({ message: 'News refreshed successfully', count: DEMO_NEWS.length }));
});

// ============================================
// ROUTES - TECHNICAL INDICATORS
// ============================================

app.get('/api/indicators/:ticker/complete', (req, res) => {
  const { ticker } = req.params;
  const { period = '1M' } = req.query;

  const analysis = generateTechnicalIndicators(ticker, period);
  res.json(formatResponse(analysis));
});

app.get('/api/indicators/:ticker', (req, res) => {
  const { ticker } = req.params;
  const analysis = generateTechnicalIndicators(ticker, '1M');
  res.json(formatResponse(analysis.indicators));
});

// ============================================
// ROUTES - PORTFOLIO (SIMULÉ)
// ============================================


// ============================================================
// ROUTES - PORTFOLIO (REAL DATABASE)
// ============================================================

// Helper: get current price for a ticker
async function getCurrentPrice(ticker) {
  try {
    // Try from opportunities table first
    if (pool) {
      const r = await pool.query(
        `SELECT current_price FROM investment_opportunities WHERE ticker = $1 AND current_price > 0 LIMIT 1`,
        [ticker]
      );
      if (r.rows.length > 0) return parseFloat(r.rows[0].current_price);
    }
  } catch(e) {}
  // Fallback: return a simulated price based on ticker hash
  let hash = 0;
  for (let c of ticker) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return Math.abs(hash % 50000) + 500;
}

// Initialize portfolio cash for a user
async function ensurePortfolioCash(userId) {
  await pool.query(
    `INSERT INTO portfolio_cash (user_id, balance) VALUES ($1, 10000000) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

app.get('/api/portfolio', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!pool || !userId) {
      return res.json(formatResponse({
        id: 1, name: 'Mon Portefeuille', currentBalance: 10000000,
        initialBalance: 10000000, holdings: [], performance: { totalReturn: 0, totalReturnPercent: 0 }
      }));
    }
    await ensurePortfolioCash(userId);
    const cashRow = await pool.query(`SELECT balance FROM portfolio_cash WHERE user_id = $1`, [userId]);
    const cashBalance = parseFloat(cashRow.rows[0]?.balance || 10000000);
    const holdingsRes = await pool.query(
      `SELECT ticker, company_name, quantity, avg_buy_price FROM portfolio_holdings WHERE user_id = $1 AND quantity > 0`,
      [userId]
    );
    // Batch fetch prices — avoids N+1 queries
    const tickers = holdingsRes.rows.map(h => h.ticker);
    const priceMap = {};
    if (tickers.length > 0) {
      try {
        const placeholders = tickers.map((_, i) => `$${i + 1}`).join(',');
        const priceRes = await pool.query(
          `SELECT ticker, current_price FROM investment_opportunities WHERE ticker IN (${placeholders}) AND current_price > 0`,
          tickers
        );
        priceRes.rows.forEach(r => { priceMap[r.ticker] = parseFloat(r.current_price); });
      } catch(e) {}
    }
    const holdings = [];
    let totalValue = cashBalance;
    for (const h of holdingsRes.rows) {
      const currentPrice = priceMap[h.ticker] || await getCurrentPrice(h.ticker);
      const quantity = parseFloat(h.quantity);
      const avgBuy = parseFloat(h.avg_buy_price);
      const value = quantity * currentPrice;
      const costBasis = quantity * avgBuy;
      const pnl = value - costBasis;
      const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      totalValue += value;
      holdings.push({
        ticker: h.ticker, companyName: h.company_name, quantity,
        avgBuyPrice: avgBuy, currentPrice, value,
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPercent: parseFloat(pnlPct.toFixed(2))
      });
    }
    const initialBalance = 10000000;
    const totalReturn = totalValue - initialBalance;
    res.json(formatResponse({
      id: userId, name: 'Mon Portefeuille',
      currentBalance: parseFloat(cashBalance.toFixed(2)),
      totalValue: parseFloat(totalValue.toFixed(2)),
      initialBalance,
      holdings,
      performance: {
        totalReturn: parseFloat(totalReturn.toFixed(2)),
        totalReturnPercent: parseFloat(((totalReturn / initialBalance) * 100).toFixed(2))
      }
    }));
  } catch(e) {
    console.error('Portfolio error:', e.message);
    res.status(500).json(formatError('Erreur interne', 500));
  }
});

app.get('/api/portfolio/summary', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!pool || !userId) return res.json(formatResponse({ cashBalance: 10000000, totalValue: 10000000, holdings: 0 }));
    await ensurePortfolioCash(userId);
    const cashRow = await pool.query(`SELECT balance FROM portfolio_cash WHERE user_id = $1`, [userId]);
    const cash = parseFloat(cashRow.rows[0]?.balance || 10000000);
    const holdingsCount = await pool.query(`SELECT COUNT(*) as c FROM portfolio_holdings WHERE user_id = $1 AND quantity > 0`, [userId]);
    res.json(formatResponse({ cashBalance: cash, totalValue: cash, holdingsCount: parseInt(holdingsCount.rows[0].c) }));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.get('/api/portfolio/transactions', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!pool || !userId) return res.json(formatResponse([]));
    const r = await pool.query(
      `SELECT * FROM portfolio_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [userId]
    );
    res.json(formatResponse(r.rows));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.get('/api/portfolio/performance', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!pool || !userId) return res.json(formatResponse({ points: [], totalReturn: 0 }));
    const txs = await pool.query(
      `SELECT type, total, created_at FROM portfolio_transactions WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    );
    let balance = 10000000;
    const points = [{ date: new Date(Date.now() - 30 * 86400000).toISOString(), value: balance }];
    for (const t of txs.rows) {
      if (t.type === 'BUY') balance -= parseFloat(t.total);
      else balance += parseFloat(t.total);
      points.push({ date: t.created_at, value: parseFloat(balance.toFixed(2)) });
    }
    res.json(formatResponse({ points, totalReturn: balance - 10000000 }));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

async function handlePortfolioTransaction(req, res) {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    if (!pool || !userId) { client.release(); return res.status(401).json(formatError('Connexion requise', 401)); }
    const { ticker, companyName, quantity, price, type } = req.body;
    if (!ticker || !quantity || !price || !type) { client.release(); return res.status(400).json(formatError('Données manquantes', 400)); }
    const qty = parseFloat(quantity);
    const prc = parseFloat(price);
    const total = parseFloat((qty * prc).toFixed(2));
    if (isNaN(qty) || isNaN(prc) || qty <= 0 || prc <= 0) { client.release(); return res.status(400).json(formatError('Valeurs invalides', 400)); }

    await ensurePortfolioCash(userId);

    // BEGIN TRANSACTION — prevents race conditions (double-spend)
    await client.query('BEGIN');

    const cashRow = await client.query(`SELECT balance FROM portfolio_cash WHERE user_id = $1 FOR UPDATE`, [userId]);
    let cash = parseFloat(cashRow.rows[0].balance);

    if (type.toUpperCase() === 'BUY') {
      if (cash < total) { await client.query('ROLLBACK'); client.release(); return res.status(400).json(formatError('Solde insuffisant', 400)); }
      const existing = await client.query(`SELECT * FROM portfolio_holdings WHERE user_id = $1 AND ticker = $2 FOR UPDATE`, [userId, ticker]);
      if (existing.rows.length > 0) {
        const h = existing.rows[0];
        const newQty = parseFloat(h.quantity) + qty;
        const newAvg = ((parseFloat(h.quantity) * parseFloat(h.avg_buy_price)) + total) / newQty;
        await client.query(`UPDATE portfolio_holdings SET quantity = $1, avg_buy_price = $2, updated_at = NOW() WHERE user_id = $3 AND ticker = $4`, [newQty, newAvg, userId, ticker]);
      } else {
        await client.query(`INSERT INTO portfolio_holdings (user_id, ticker, company_name, quantity, avg_buy_price) VALUES ($1, $2, $3, $4, $5)`, [userId, ticker, companyName || ticker, qty, prc]);
      }
      await client.query(`UPDATE portfolio_cash SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2`, [total, userId]);
    } else {
      // SELL
      const holding = await client.query(`SELECT * FROM portfolio_holdings WHERE user_id = $1 AND ticker = $2 FOR UPDATE`, [userId, ticker]);
      if (!holding.rows.length || parseFloat(holding.rows[0].quantity) < qty) { await client.query('ROLLBACK'); client.release(); return res.status(400).json(formatError('Quantité insuffisante', 400)); }
      const newQty = parseFloat(holding.rows[0].quantity) - qty;
      if (newQty < 0.0001) {
        await client.query(`DELETE FROM portfolio_holdings WHERE user_id = $1 AND ticker = $2`, [userId, ticker]);
      } else {
        await client.query(`UPDATE portfolio_holdings SET quantity = $1, updated_at = NOW() WHERE user_id = $2 AND ticker = $3`, [newQty, userId, ticker]);
      }
      await client.query(`UPDATE portfolio_cash SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2`, [total, userId]);
    }
    // Record transaction
    await client.query(`INSERT INTO portfolio_transactions (user_id, ticker, company_name, type, quantity, price, total) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId, ticker, companyName || ticker, type.toUpperCase(), qty, prc, total]);

    await client.query('COMMIT');
    client.release();

    // Send notification (outside transaction, non-critical)
    try {
      await pool.query(`INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)`,
        [userId, 'portfolio', `${type === 'BUY' ? '📈 Achat' : '📉 Vente'} effectué`, `${qty} ${ticker} à ${prc.toFixed(2)} XOF`]);
    } catch(e) {}
    res.json(formatResponse({ success: true, type: type.toUpperCase(), ticker, quantity: qty, price: prc, total }));
  } catch(e) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    console.error('Transaction error:', e.message);
    res.status(500).json(formatError('Erreur interne', 500));
  }
}

app.post('/api/portfolio/transaction', authenticateToken, handlePortfolioTransaction);
app.post('/api/portfolio/buy', authenticateToken, (req, res) => { req.body.type = 'BUY'; return handlePortfolioTransaction(req, res); });
app.post('/api/portfolio/sell', authenticateToken, (req, res) => { req.body.type = 'SELL'; return handlePortfolioTransaction(req, res); });

app.post('/api/portfolio/reset', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!pool || !userId) return res.status(401).json(formatError('Connexion requise', 401));
    await pool.query(`DELETE FROM portfolio_holdings WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM portfolio_transactions WHERE user_id = $1`, [userId]);
    await pool.query(`UPDATE portfolio_cash SET balance = 10000000, updated_at = NOW() WHERE user_id = $1`, [userId]);
    res.json(formatResponse({ message: 'Portefeuille réinitialisé (10 000 000 XOF)' }));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

// Portfolio alerts
app.get('/api/portfolio/alerts', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse([]));
    const r = await pool.query(`SELECT * FROM price_alerts WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    res.json(formatResponse(r.rows));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.post('/api/portfolio/alerts', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(503).json(formatError('Service indisponible', 503));
    const { ticker, condition, targetPrice } = req.body;
    if (!ticker || !condition || !targetPrice) return res.status(400).json(formatError('Données manquantes', 400));
    const r = await pool.query(
      `INSERT INTO price_alerts (user_id, ticker, condition, target_price) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, ticker, condition, parseFloat(targetPrice)]
    );
    res.json(formatResponse(r.rows[0]));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.delete('/api/portfolio/alerts/:id', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.status(503).json(formatError('Service indisponible', 503));
    await pool.query(`DELETE FROM price_alerts WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    res.json(formatResponse({ deleted: true }));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

// ============================================================
// ROUTES - POSITION SIZING
// ============================================================

app.get('/api/position-sizing/comprehensive', (req, res) => {
  const { capital = 1000000, risk = 2, price = 100, stopLoss = 5 } = req.query;
  const riskAmount = parseFloat(capital) * (parseFloat(risk) / 100);
  const stopLossAmount = parseFloat(price) * (parseFloat(stopLoss) / 100);
  const positionSize = Math.floor(riskAmount / stopLossAmount);
  const positionValue = positionSize * parseFloat(price);
  res.json(formatResponse({
    input: { capital: parseFloat(capital), riskPercent: parseFloat(risk), entryPrice: parseFloat(price), stopLossPercent: parseFloat(stopLoss) },
    results: { maxRiskAmount: riskAmount, stopLossPerShare: stopLossAmount, recommendedShares: positionSize, positionValue, portfolioAllocation: (positionValue / parseFloat(capital) * 100).toFixed(2) + '%' },
    kellyResults: { winRate: 55, avgWin: 2.5, avgLoss: 1.5, kellyPercent: 12.5, halfKelly: 6.25, quarterKelly: 3.125 }
  }));
});

// ============================================================
// ROUTES - ANALYTICS (REAL USER DATA)
// ============================================================

app.get('/api/analytics', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    let portfolioStats = { holdingsCount: 0, totalTransactions: 0, totalValue: 10000000 };
    if (pool && userId) {
      const [h, t] = await Promise.all([
        pool.query(`SELECT COUNT(*) as c FROM portfolio_holdings WHERE user_id = $1 AND quantity > 0`, [userId]),
        pool.query(`SELECT COUNT(*) as c FROM portfolio_transactions WHERE user_id = $1`, [userId])
      ]);
      portfolioStats = { holdingsCount: parseInt(h.rows[0].c), totalTransactions: parseInt(t.rows[0].c) };
    }
    const [usersCount, newsCount, oppsCount] = await Promise.all([
      pool ? pool.query(`SELECT COUNT(*) as c FROM users`).then(r => parseInt(r.rows[0].c)).catch(() => 0) : Promise.resolve(0),
      pool ? pool.query(`SELECT COUNT(*) as c FROM news`).then(r => parseInt(r.rows[0].c)).catch(() => 0) : Promise.resolve(0),
      pool ? pool.query(`SELECT COUNT(*) as c FROM investment_opportunities WHERE status = 'active'`).then(r => parseInt(r.rows[0].c)).catch(() => 0) : Promise.resolve(0)
    ]);
    res.json(formatResponse({
      platform: { totalUsers: usersCount, totalNews: newsCount, totalOpportunities: oppsCount, lastUpdated: new Date().toISOString() },
      portfolio: portfolioStats,
      markets: { active: AFRICAN_MARKETS.length, countries: 54 }
    }));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.post('/api/analytics/track', (req, res) => {
  res.json(formatResponse({ tracked: true }));
});

// ============================================================
// ROUTES - AUTH (REAL IMPLEMENTATION)
// ============================================================

app.post('/api/auth/register', authRateLimit, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json(formatError('Email et mot de passe requis', 400));
    if (!validateEmail(email)) return res.status(400).json(formatError('Format email invalide', 400));
    if (password.length < 8) return res.status(400).json(formatError('Mot de passe trop court (min 8 caractères)', 400));
    const safeName = sanitizeHtml((name || '').substring(0, 100));
    if (!pool) {
      // Demo mode
      const token = jwt.sign({ id: Date.now(), email, name: safeName }, JWT_SECRET, { expiresIn: '24h' });
      return res.json(formatResponse({ user: { id: 1, email, name: safeName }, token }));
    }
    const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) return res.status(409).json(formatError('Email déjà utilisé', 409));
    const passwordHash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, preferences, created_at`,
      [email.toLowerCase().trim(), passwordHash, safeName || email.split('@')[0]]
    );
    const user = r.rows[0];
    await pool.query(`INSERT INTO portfolio_cash (user_id, balance) VALUES ($1, 10000000) ON CONFLICT DO NOTHING`, [user.id]);
    await pool.query(`INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'system', 'Bienvenue sur PENDO !', 'Votre compte est créé. Bonne exploration des marchés africains 🌍')`, [user.id]);
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json(formatResponse({ user: { id: user.id, email: user.email, name: user.name, preferences: user.preferences }, token }));
  } catch(e) {
    console.error('Register error:', e.message, 'code:', e.code);
    if (isDbUnavailable(e)) {
      // DB unavailable (tables missing, Neon suspended, etc.) — return demo token
      const safeName2 = (req.body.name || '').substring(0, 100);
      const token = jwt.sign({ id: Date.now(), email: req.body.email, name: safeName2 }, JWT_SECRET, { expiresIn: '24h' });
      return res.json(formatResponse({ user: { id: 1, email: req.body.email, name: safeName2 }, token, demo: true }));
    }
    res.status(500).json(formatError('Erreur interne', 500));
  }
});

app.post('/api/auth/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json(formatError('Email et mot de passe requis', 400));
    if (!pool) {
      const token = jwt.sign({ id: 1, email, name: 'Demo User' }, JWT_SECRET, { expiresIn: '24h' });
      return res.json(formatResponse({ user: { id: 1, email, name: 'Demo User' }, token }));
    }
    const r = await pool.query(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (!r.rows.length) return res.status(401).json(formatError('Email ou mot de passe incorrect', 401));
    const user = r.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json(formatError('Email ou mot de passe incorrect', 401));
    await pool.query(`UPDATE users SET updated_at = NOW() WHERE id = $1`, [user.id]);
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json(formatResponse({ user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, preferences: user.preferences }, token }));
  } catch(e) {
    console.error('Login error:', e.message, 'code:', e.code);
    if (isDbUnavailable(e)) {
      // DB unavailable (Neon suspended, tables missing, etc.) — return demo token
      const token = jwt.sign({ id: 1, email: req.body.email, name: 'Demo User' }, JWT_SECRET, { expiresIn: '24h' });
      return res.json(formatResponse({ user: { id: 1, email: req.body.email, name: 'Demo User' }, token, demo: true }));
    }
    res.status(500).json(formatError('Erreur interne', 500));
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json(formatResponse({ message: 'Déconnexion réussie' }));
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse({ id: req.user.id, email: req.user.email, name: req.user.name, preferences: { language: 'fr', currency: 'XOF', notifications: true } }));
    const r = await pool.query(`SELECT id, email, name, avatar, bio, preferences, created_at FROM users WHERE id = $1`, [req.user.id]);
    if (!r.rows.length) return res.status(404).json(formatError('Utilisateur non trouvé', 404));
    res.json(formatResponse(r.rows[0]));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const safeName = name ? sanitizeHtml(name.substring(0, 100)) : null;
    const safeBio = bio ? sanitizeHtml(bio.substring(0, 500)) : null;
    const safeAvatar = avatar ? avatar.substring(0, 500) : null;
    if (!pool) return res.json(formatResponse({ ...req.user, name: safeName, bio: safeBio }));
    const r = await pool.query(
      `UPDATE users SET name = COALESCE($1, name), bio = COALESCE($2, bio), avatar = COALESCE($3, avatar), updated_at = NOW() WHERE id = $4 RETURNING id, email, name, avatar, bio, preferences`,
      [safeName, safeBio, safeAvatar, req.user.id]
    );
    res.json(formatResponse(r.rows[0]));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    // SECURITY: currentPassword is REQUIRED — prevent token-only password takeover
    if (!currentPassword) return res.status(400).json(formatError('Mot de passe actuel requis', 400));
    if (!newPassword || newPassword.length < 8) return res.status(400).json(formatError('Nouveau mot de passe trop court (min 8 caractères)', 400));
    if (!pool) return res.json(formatResponse({ message: 'Mot de passe mis à jour' }));
    const r = await pool.query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    if (!r.rows.length) return res.status(404).json(formatError('Utilisateur non trouvé', 404));
    const valid = await bcrypt.compare(currentPassword, r.rows[0].password_hash);
    if (!valid) return res.status(401).json(formatError('Mot de passe actuel incorrect', 401));
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hash, req.user.id]);
    res.json(formatResponse({ message: 'Mot de passe mis à jour' }));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.put('/api/auth/preferences', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse({ preferences: req.body }));
    const r = await pool.query(
      `UPDATE users SET preferences = preferences || $1::jsonb, updated_at = NOW() WHERE id = $2 RETURNING preferences`,
      [JSON.stringify(req.body), req.user.id]
    );
    res.json(formatResponse({ preferences: r.rows[0].preferences }));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

// ============================================================
// ROUTES - FORUM (REAL DATABASE)
// ============================================================

app.get('/api/forum/stats', async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse({ totalThreads: 0, totalPosts: 0, totalUsers: 0 }));
    const [threads, posts, users] = await Promise.all([
      pool.query(`SELECT COUNT(*) as c FROM forum_threads`),
      pool.query(`SELECT COUNT(*) as c FROM forum_posts`),
      pool.query(`SELECT COUNT(*) as c FROM users`)
    ]);
    const recent = await pool.query(`SELECT fp.*, ft.title as thread_title FROM forum_posts fp JOIN forum_threads ft ON fp.thread_id = ft.id ORDER BY fp.created_at DESC LIMIT 5`);
    res.json(formatResponse({
      totalThreads: parseInt(threads.rows[0].c),
      totalPosts: parseInt(posts.rows[0].c),
      totalUsers: parseInt(users.rows[0].c),
      latestPosts: recent.rows
    }));
  } catch(e) {
    console.error('Forum stats error:', e.message, 'code:', e.code);
    if (isDbUnavailable(e)) return res.json(formatResponse({ totalThreads: 0, totalPosts: 0, totalUsers: 0, latestPosts: [] }));
    res.status(500).json(formatError('Erreur interne', 500));
  }
});

const DEMO_FORUM_CATEGORIES = [
  { id: 1, name: 'Marchés africains', description: 'Analyses et discussions sur les bourses africaines', sort_order: 1, threads_count: 12, posts_count: 48 },
  { id: 2, name: 'Opportunités d\'investissement', description: 'Partage et évaluation des opportunités du continent', sort_order: 2, threads_count: 8, posts_count: 31 },
  { id: 3, name: 'Actualités économiques', description: 'Commentaires sur l\'actualité financière africaine', sort_order: 3, threads_count: 15, posts_count: 62 },
  { id: 4, name: 'Stratégies & Portefeuille', description: 'Discussions sur la gestion de portefeuille et les stratégies', sort_order: 4, threads_count: 6, posts_count: 24 },
  { id: 5, name: 'Questions & Entraide', description: 'Poser vos questions, aider la communauté', sort_order: 5, threads_count: 20, posts_count: 85 },
];

app.get('/api/forum/categories', async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse(DEMO_FORUM_CATEGORIES));
    const r = await pool.query(`
      SELECT fc.*, COUNT(DISTINCT ft.id) as threads_count, COUNT(DISTINCT fp.id) as posts_count
      FROM forum_categories fc
      LEFT JOIN forum_threads ft ON ft.category_id = fc.id
      LEFT JOIN forum_posts fp ON fp.thread_id = ft.id
      GROUP BY fc.id ORDER BY fc.sort_order
    `);
    res.json(formatResponse(r.rows.length ? r.rows : DEMO_FORUM_CATEGORIES));
  } catch(e) { pgErrHandler(res, DEMO_FORUM_CATEGORIES)(e); }
});

app.get('/api/forum/categories/:id/threads', async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse([]));
    const r = await pool.query(`
      SELECT ft.*, COUNT(fp.id) as replies_count
      FROM forum_threads ft
      LEFT JOIN forum_posts fp ON fp.thread_id = ft.id
      WHERE ft.category_id = $1
      GROUP BY ft.id ORDER BY ft.is_pinned DESC, ft.updated_at DESC LIMIT 50
    `, [req.params.id]);
    res.json(formatResponse(r.rows));
  } catch(e) { pgErrHandler(res, [])(e); }
});

app.get('/api/forum/threads', optionalAuth, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse([]));
    const { limit = 20, offset = 0, category } = req.query;
    let q = `SELECT ft.*, cat.name as category_name, COUNT(fp.id) as replies_count FROM forum_threads ft LEFT JOIN forum_categories cat ON cat.id = ft.category_id LEFT JOIN forum_posts fp ON fp.thread_id = ft.id`;
    const params = [];
    if (category) { q += ` WHERE ft.category_id = $${params.length + 1}`; params.push(category); }
    q += ` GROUP BY ft.id, cat.name ORDER BY ft.is_pinned DESC, ft.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    const r = await pool.query(q, params);
    res.json(formatResponse(r.rows));
  } catch(e) { pgErrHandler(res, [])(e); }
});

app.post('/api/forum/threads', authenticateToken, async (req, res) => {
  try {
    const { title, content, categoryId } = req.body;
    if (!title || !content) return res.status(400).json(formatError('Titre et contenu requis', 400));
    if (!pool) return res.status(503).json(formatError('DB non disponible', 503));
    const safeTitle = sanitizeHtml(title.substring(0, 200));
    const safeContent = sanitizeHtml(content.substring(0, 10000));
    const r = await pool.query(
      `INSERT INTO forum_threads (category_id, user_id, user_name, title, content) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [categoryId || 1, req.user.id, req.user.name, safeTitle, safeContent]
    );
    res.json(formatResponse(r.rows[0]));
  } catch(e) { pgErrHandler(res, null)(e); }
});

app.get('/api/forum/threads/:id', async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse({ id: req.params.id, title: 'Discussion', content: '' }));
    await pool.query(`UPDATE forum_threads SET views = views + 1 WHERE id = $1`, [req.params.id]);
    const r = await pool.query(`SELECT ft.*, cat.name as category_name FROM forum_threads ft LEFT JOIN forum_categories cat ON cat.id = ft.category_id WHERE ft.id = $1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json(formatError('Discussion non trouvée', 404));
    res.json(formatResponse(r.rows[0]));
  } catch(e) { pgErrHandler(res, null)(e); }
});

app.get('/api/forum/threads/:id/posts', async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse([]));
    const r = await pool.query(`SELECT * FROM forum_posts WHERE thread_id = $1 ORDER BY created_at ASC`, [req.params.id]);
    res.json(formatResponse(r.rows));
  } catch(e) { pgErrHandler(res, [])(e); }
});

app.post('/api/forum/threads/:id/posts', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json(formatError('Contenu requis', 400));
    if (!pool) return res.status(503).json(formatError('DB non disponible', 503));
    const safeContent = sanitizeHtml(content.substring(0, 10000));
    const r = await pool.query(
      `INSERT INTO forum_posts (thread_id, user_id, user_name, content) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, req.user.id, req.user.name, safeContent]
    );
    await pool.query(`UPDATE forum_threads SET replies = replies + 1, updated_at = NOW() WHERE id = $1`, [req.params.id]);
    res.json(formatResponse(r.rows[0]));
  } catch(e) { pgErrHandler(res, null)(e); }
});

app.post('/api/forum/posts/:id/like', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse({ liked: true }));
    try {
      await pool.query(`INSERT INTO forum_likes (user_id, target_type, target_id) VALUES ($1, 'post', $2)`, [req.user.id, req.params.id]);
      await pool.query(`UPDATE forum_posts SET likes = likes + 1 WHERE id = $1`, [req.params.id]);
      res.json(formatResponse({ liked: true }));
    } catch(e) {
      if (e.message.includes('unique') || e.message.includes('duplicate')) {
        await pool.query(`DELETE FROM forum_likes WHERE user_id = $1 AND target_type = 'post' AND target_id = $2`, [req.user.id, req.params.id]);
        await pool.query(`UPDATE forum_posts SET likes = GREATEST(0, likes - 1) WHERE id = $1`, [req.params.id]);
        res.json(formatResponse({ liked: false }));
      } else throw e;
    }
  } catch(e) { pgErrHandler(res, { liked: false })(e); }
});

app.post('/api/forum/threads/:id/like', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse({ liked: true }));
    try {
      await pool.query(`INSERT INTO forum_likes (user_id, target_type, target_id) VALUES ($1, 'thread', $2)`, [req.user.id, req.params.id]);
      await pool.query(`UPDATE forum_threads SET likes = likes + 1 WHERE id = $1`, [req.params.id]);
      res.json(formatResponse({ liked: true }));
    } catch(e) {
      if (e.message.includes('unique') || e.message.includes('duplicate')) {
        await pool.query(`DELETE FROM forum_likes WHERE user_id = $1 AND target_type = 'thread' AND target_id = $2`, [req.user.id, req.params.id]);
        await pool.query(`UPDATE forum_threads SET likes = GREATEST(0, likes - 1) WHERE id = $1`, [req.params.id]);
        res.json(formatResponse({ liked: false }));
      } else throw e;
    }
  } catch(e) { pgErrHandler(res, { liked: false })(e); }
});

// ============================================================
// ROUTES - CHAT (HTTP POLLING - Vercel compatible)
// ============================================================

// Public chat room + DMs
app.get('/api/chat/conversations', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const conversations = [{ id: 'public', name: 'Chat Public', type: 'public', unread: 0 }];
    if (pool && userId) {
      const unread = await pool.query(`SELECT COUNT(*) as c FROM chat_messages WHERE conversation_id = 'public' AND user_id != $1 AND created_at > NOW() - interval '7 days'`, [userId]);
      conversations[0].unread = parseInt(unread.rows[0].c);
    }
    res.json(formatResponse(conversations));
  } catch(e) { pgErrHandler(res, [{ id: 'public', name: 'Chat Public', type: 'public', unread: 0 }])(e); }
});

app.post('/api/chat/conversations', authenticateToken, async (req, res) => {
  res.json(formatResponse({ id: 'public', name: 'Chat Public', type: 'public' }));
});

// GET messages (supports ?since=ISO_TIMESTAMP for polling)
app.get('/api/chat/conversations/:id/messages', optionalAuth, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse([]));
    const convId = req.params.id === 'public' ? 'public' : req.params.id;
    const { since, limit = 50 } = req.query;
    let q, params;
    if (since) {
      q = `SELECT * FROM chat_messages WHERE conversation_id = $1 AND created_at > $2 AND is_deleted = false ORDER BY created_at ASC LIMIT $3`;
      params = [convId, since, parseInt(limit)];
    } else {
      q = `SELECT * FROM chat_messages WHERE conversation_id = $1 AND is_deleted = false ORDER BY created_at DESC LIMIT $2`;
      params = [convId, parseInt(limit)];
    }
    const r = await pool.query(q, params);
    const msgs = since ? r.rows : r.rows.reverse();
    res.json(formatResponse(msgs));
  } catch(e) { pgErrHandler(res, [])(e); }
});

app.post('/api/chat/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json(formatError('Message vide', 400));
    const safeContent = sanitizeHtml(content.trim().substring(0, 2000));
    if (!pool) return res.json(formatResponse({ id: Date.now(), content: safeContent, user_name: req.user.name, created_at: new Date().toISOString() }));
    const convId = req.params.id === 'public' ? 'public' : req.params.id;
    const r = await pool.query(
      `INSERT INTO chat_messages (conversation_id, user_id, user_name, avatar, content) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [convId, req.user.id, req.user.name, req.user.avatar || null, safeContent]
    );
    res.json(formatResponse(r.rows[0]));
  } catch(e) { pgErrHandler(res, null)(e); }
});

app.delete('/api/chat/messages/:id', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse({ deleted: true }));
    await pool.query(`UPDATE chat_messages SET is_deleted = true WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    res.json(formatResponse({ deleted: true }));
  } catch(e) { pgErrHandler(res, { deleted: false })(e); }
});

app.put('/api/chat/conversations/:id/read', optionalAuth, async (req, res) => {
  res.json(formatResponse({ read: true }));
});

app.get('/api/chat/unread', optionalAuth, async (req, res) => {
  res.json(formatResponse({ count: 0 }));
});

// ============================================================
// ROUTES - NOTIFICATIONS (REAL DATABASE)
// ============================================================

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse([]));
    const r = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(formatResponse(r.rows));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse({ read: true }));
    await pool.query(`UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    res.json(formatResponse({ read: true }));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse({ updated: 0 }));
    const r = await pool.query(`UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`, [req.user.id]);
    res.json(formatResponse({ updated: r.rowCount }));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse({ deleted: true }));
    await pool.query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    res.json(formatResponse({ deleted: true }));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.post('/api/notifications/subscribe', optionalAuth, async (req, res) => {
  res.json(formatResponse({ subscribed: true }));
});


// ============================================
// ROUTES - FEEDBACK
// ============================================

app.post('/api/feedback', async (req, res) => {
  try {
    const { email, name, category, rating, message, page } = req.body;
    if (!message) return res.status(400).json(formatError('Message requis', 400));
    if (email && !validateEmail(email)) return res.status(400).json(formatError('Format email invalide', 400));

    const safeMessage = sanitizeHtml(message.substring(0, 5000));
    const safeName = name ? sanitizeHtml(name.substring(0, 100)) : null;
    const safeCategory = category ? sanitizeHtml(category.substring(0, 50)) : 'general';

    let userId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET);
        userId = decoded.id;
      } catch(e) {}
    }

    if (!pool) return res.status(503).json(formatError('Service indisponible', 503));

    const r = await pool.query(
      `INSERT INTO feedback (email, name, category, rating, message, page, user_agent, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`,
      [email || null, safeName, safeCategory, rating || null,
       safeMessage, page ? page.substring(0, 200) : null, req.headers['user-agent'] || null, userId]
    );
    res.json(formatResponse({ id: r.rows[0].id, created_at: r.rows[0].created_at }));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

app.get('/api/admin/feedback', verifyCronSecret, async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse([]));
    const r = await pool.query(
      `SELECT id, email, name, category, rating, message, page, user_id, created_at
       FROM feedback ORDER BY created_at DESC LIMIT 200`
    );
    res.json(formatResponse(r.rows));
  } catch(e) { res.status(500).json(formatError('Erreur interne', 500)); }
});

// ROUTES - STATISTIQUES GLOBALES
// ============================================

app.get('/api/stats', (req, res) => {
  res.json(formatResponse({
    markets: {
      total: AFRICAN_MARKETS.length,
      regions: ['Afrique de l\'Ouest', 'Afrique de l\'Est', 'Afrique Centrale', 'Afrique du Nord', 'Afrique Australe']
    },
    stocks: {
      total: AFRICAN_STOCKS.length,
      byExchange: Object.fromEntries(
        [...new Set(AFRICAN_STOCKS.map(s => s.exchange))].map(e => [e, AFRICAN_STOCKS.filter(s => s.exchange === e).length])
      )
    },
    opportunities: {
      total: DEMO_OPPORTUNITIES.length,
      bySector: Object.fromEntries(
        [...new Set(DEMO_OPPORTUNITIES.map(o => o.sector))].map(s => [s, DEMO_OPPORTUNITIES.filter(o => o.sector === s).length])
      )
    },
    currencies: [...new Set(AFRICAN_MARKETS.map(m => m.currency))].length
  }));
});

// ============================================
// CRON ENDPOINTS MANUELS (réutilisent les fonctions inline)
// ============================================

// ── Cron: Collect Market Data ─────────────────────────────────────────
// Fetches ALL 16 markets automatically (no local machine needed):
//   AFX Kwayisi via allorigins.win proxy (10), Investing.com (4), DSE Official (1), RSE Official (1)
app.get('/api/cron/collect-markets', verifyCronSecret, async (req, res) => {
  try {
    if (!pool) return res.status(503).json(formatError('Database not ready', 503));
    const axios = require('axios');
    const https = require('https');
    const insecureAgent = new https.Agent({ rejectUnauthorized: false });

    // Ensure table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_snapshots (
        id SERIAL PRIMARY KEY,
        market_id VARCHAR(20) NOT NULL,
        value NUMERIC NOT NULL,
        change_percent NUMERIC DEFAULT 0,
        source VARCHAR(50),
        fetched_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_market_snapshots_market_id ON market_snapshots(market_id);
      CREATE INDEX IF NOT EXISTS idx_market_snapshots_fetched ON market_snapshots(fetched_at DESC);
    `);

    const results = [];
    const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' };

    // ── Helper: parse AFX HTML (works for both direct and proxied) ──
    function parseAfxHtml(html, id) {
      const tableMatch = html.match(/<table[^>]*style[^>]*>([\s\S]*?)<\/table>/);
      if (!tableMatch) return null;
      const tdMatch = tableMatch[0].match(/<td>([\d,]+\.?\d*)\s*<span\s+class=(hi|lo)>\(([+-]?[\d,.]+)\)<\/span>/);
      if (!tdMatch) return null;
      const value = parseFloat(tdMatch[1].replace(/,/g, ''));
      const dir = tdMatch[2];
      const pts = parseFloat(tdMatch[3].replace(/,/g, ''));
      if (!value) return null;
      const prev = value - pts;
      const pct = prev !== 0 ? (pts / prev) * 100 : 0;
      const h2 = html.match(/<div class=h2[^>]*>[\s\S]*?<span\s+class=(hi|lo)>[\s\S]*?\(([\d.]+)%?\)<\/span>/);
      let change = (h2 && parseFloat(h2[2]) > 0)
        ? (dir === 'lo' ? -parseFloat(h2[2]) : parseFloat(h2[2]))
        : (dir === 'lo' ? -Math.abs(pct) : Math.abs(pct));
      return { id, value, change: parseFloat(change.toFixed(2)), source: 'AFX Kwayisi' };
    }

    // ─ AFX Kwayisi via allorigins.win proxy (10 markets) ─────────
    // allorigins.win proxies requests from non-cloud IPs, bypassing AFX's block
    // Use /get (JSON) endpoint — /raw truncates large pages like JSE
    // Process in 2 batches to avoid overwhelming the proxy and stay within 60s
    const afxMarkets = {
      jse: '/jse/', nse_ng: '/ngx/', brvm: '/brvm/', nse_ke: '/nse/',
      gse: '/gse/', bse: '/bse/', luse: '/luse/', zse: '/zse/', use: '/use/', mse: '/mse/'
    };
    const afxEntries = Object.entries(afxMarkets);
    const afxBatch1 = afxEntries.slice(0, 5); // jse, nse_ng, brvm, nse_ke, gse
    const afxBatch2 = afxEntries.slice(5);     // bse, luse, zse, use, mse

    // Multiple proxy services for redundancy
    const PROXIES = [
      (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    const fetchAfxBatch = (batch) => batch.map(async ([id, path]) => {
      const afxUrl = `https://afx.kwayisi.org${path}`;
      for (let pi = 0; pi < PROXIES.length; pi++) {
        try {
          const proxyUrl = PROXIES[pi](afxUrl);
          const isJson = pi === 0; // allorigins returns JSON, codetabs returns raw HTML
          const { data } = await axios.get(proxyUrl, {
            timeout: 15000, responseType: isJson ? 'json' : 'text',
            ...(isJson ? {} : { transformResponse: [d => d] })
          });
          const html = isJson ? data?.contents : data;
          if (!html || html.length < 500) continue;
          const parsed = parseAfxHtml(html, id);
          if (parsed) { results.push(parsed); return; }
        } catch (e) {
          if (pi === PROXIES.length - 1) console.error(`AFX-proxy ${id}: all proxies failed`);
        }
      }
    });

    // Run batch 1 + Investing + DSE + RSE in parallel
    const afxPromises1 = fetchAfxBatch(afxBatch1);

    // ─ Investing.com via codetabs proxy (EGX, MASI, TUNINDEX, SEMDEX) ─
    // Investing.com blocks Vercel IPs — codetabs.com proxies from different IPs
    const investingMarkets = {
      egx:  'https://www.investing.com/indices/egx30',
      masi: 'https://www.investing.com/indices/masi',
      bvmt: 'https://www.investing.com/indices/tunindex',
      sem:  'https://www.investing.com/indices/semdex'
    };
    const investingPromises = Object.entries(investingMarkets).map(async ([id, url]) => {
      try {
        const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`;
        const { data: html } = await axios.get(proxyUrl, {
          timeout: 18000, responseType: 'text', transformResponse: [d => d], maxContentLength: 2000000
        });
        const priceMatch = html.match(/data-test="instrument-price-last"[^>]*>([\d,.]+)/);
        if (!priceMatch) return;
        const value = parseFloat(priceMatch[1].replace(/,/g, ''));
        if (!value) return;
        let change = 0;
        const chgMatch = html.match(/data-test="instrument-price-change-percent"[^>]*>\(?([+-]?[\d.]+)%?\)?/);
        if (chgMatch) change = parseFloat(chgMatch[1]);
        results.push({ id, value, change: parseFloat(change.toFixed(2)), source: 'Investing.com' });
      } catch (e) { console.error(`Investing ${id}: ${e.message}`); }
    });

    // ─ DSE Tanzania (official API) ───────────────────────────────
    const dsePromise = (async () => {
      try {
        for (let i = 0; i < 6; i++) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const { data } = await axios.get(`https://dse.co.tz/get/last/traded/indices?from=${dateStr}`, {
            headers: { ...headers, 'Accept': 'application/json' }, timeout: 12000, httpsAgent: insecureAgent
          });
          if (data.success && data.data?.length > 0) {
            const dsei = data.data.find(d => d.Code === 'DSEI');
            if (dsei) {
              const value = parseFloat(dsei.ClosingPrice.replace(/,/g, ''));
              results.push({ id: 'dse', value, change: parseFloat((dsei.Change || 0).toFixed(2)), source: 'DSE Official' });
              return;
            }
          }
        }
      } catch (e) { console.error(`DSE: ${e.message}`); }
    })();

    // ─ RSE Rwanda (official website scrape) ──────────────────────
    const rsePromise = (async () => {
      try {
        const { data: html } = await axios.get('https://rse.rw/market-statistics', {
          headers, timeout: 12000, httpsAgent: insecureAgent, responseType: 'text', transformResponse: [d => d]
        });
        const match = html.match(/>ALSI<\/td>\s*<td>([\d.]+)<\/td>\s*<td>([\d.]+)<\/td>/);
        if (match) {
          const current = parseFloat(match[1]);
          const prev = parseFloat(match[2]);
          if (current > 0) {
            const change = prev !== 0 ? ((current - prev) / prev * 100) : 0;
            results.push({ id: 'rse', value: current, change: parseFloat(change.toFixed(2)), source: 'RSE Official' });
          }
        }
      } catch (e) { console.error(`RSE: ${e.message}`); }
    })();

    // Run all sources with a 50s global timeout to stay within Vercel's 60s limit
    const allPromises = [...afxPromises1, ...investingPromises, dsePromise, rsePromise];
    const globalTimeout = new Promise(resolve => setTimeout(resolve, 22000));
    await Promise.race([Promise.allSettled(allPromises), globalTimeout]);
    // Run batch 2 with remaining time
    const afxPromises2 = fetchAfxBatch(afxBatch2);
    const globalTimeout2 = new Promise(resolve => setTimeout(resolve, 22000));
    await Promise.race([Promise.allSettled(afxPromises2), globalTimeout2]);

    // Deduplicate: prefer AFX/Official > Investing
    const sourceRank = { 'AFX Kwayisi': 1, 'DSE Official': 1, 'RSE Official': 1, 'Investing.com': 2 };
    const best = {};
    for (const r of results) {
      if (!best[r.id] || (sourceRank[r.source] || 9) < (sourceRank[best[r.id].source] || 9)) {
        best[r.id] = r;
      }
    }

    // Insert into Supabase
    let saved = 0;
    for (const r of Object.values(best)) {
      try {
        await pool.query(
          'INSERT INTO market_snapshots (market_id, value, change_percent, source) VALUES ($1, $2, $3, $4)',
          [r.id, r.value, r.change, r.source]
        );
        saved++;
      } catch (e) { console.error(`Insert ${r.id}: ${e.message}`); }
    }

    // Cleanup old snapshots
    await pool.query("DELETE FROM market_snapshots WHERE fetched_at < NOW() - INTERVAL '7 days'");

    res.json(formatResponse({ saved, total: Object.keys(best).length, markets: Object.values(best) }));
  } catch (err) {
    console.error('Cron collect-markets error:', err);
    res.status(500).json(formatError(err.message, 500));
  }
});

app.get('/api/cron/collect-news', verifyCronSecret, async (req, res) => {
  try {
    if (!pool) return res.status(503).json(formatError('Database not ready', 503));
    // Auto-migration : créer la table si elle n'existe pas encore
    await pool.query(`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT,
        url TEXT UNIQUE,
        source_url TEXT,
        source TEXT,
        category TEXT,
        market_id TEXT,
        country TEXT,
        published_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    try { await pool.query("ALTER TABLE news ADD COLUMN IF NOT EXISTS source_url TEXT"); } catch(e) {}
    // Purger les news sans URL (données démo) et les vieilles news > 7 jours
    await pool.query("DELETE FROM news WHERE url IS NULL OR url = ''");
    await pool.query("DELETE FROM news WHERE published_at < NOW() - interval '7 days'");
    const countBefore = await pool.query("SELECT COUNT(*) as total FROM news");
    const collected = await inlineCollectNews();
    const countAfter = await pool.query("SELECT COUNT(*) as total FROM news");

    // Déclencher la traduction automatique si de nouvelles news ont été collectées
    let translationTriggered = false;
    const newNewsCount = parseInt(countAfter.rows[0].total) - parseInt(countBefore.rows[0].total);

    res.json({
      success: true,
      collected,
      news_before: parseInt(countBefore.rows[0].total),
      news_after: parseInt(countAfter.rows[0].total),
      translationTriggered: newNewsCount > 0,
      timestamp: new Date().toISOString()
    });

    // Trigger translation AFTER response (ensures dispatch on Vercel Serverless)
    if (newNewsCount > 0) {
      try {
        internalCronFetch(req, '/api/cron/translate-content?limit=30');
        await new Promise(r => setTimeout(r, 1500));
      } catch(e) {}
    }
    return;
  } catch (error) {
    res.status(500).json(formatError('Erreur interne', 500));
  }
});

// =========================================================
// CRON: Enrichir les actualités avec contenu complet des pages
// =========================================================
app.get('/api/cron/enrich-news', verifyCronSecret, async (req, res) => {
  try {
    if (!pool) return res.status(503).json(formatError('Database not ready', 503));

    console.log(`📰 [v${BUILD_VERSION}] CRON: Enrichissement actualités...`);

    // Articles récents avec peu de contenu (< 400 chars) ou sans description
    const limit = parseInt(req.query.limit) || 12;
    const toEnrich = await pool.query(`
      SELECT id, title, url, source_url
      FROM news
      WHERE (summary IS NULL OR LENGTH(summary) < 400)
        AND url IS NOT NULL AND url != ''
      ORDER BY published_at DESC
      LIMIT $1
    `, [limit]);

    if (toEnrich.rows.length === 0) {
      return res.json({ success: true, enriched: 0, message: 'Tous les articles sont déjà enrichis', timestamp: new Date().toISOString() });
    }

    console.log(`  📋 ${toEnrich.rows.length} articles à enrichir`);
    let enriched = 0, failed = 0;

    // Traitement par batch de 6 en parallèle (contrainte timeout Vercel ~25s)
    const batchSize = 6;
    for (let i = 0; i < toEnrich.rows.length; i += batchSize) {
      const batch = toEnrich.rows.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (row) => {
          const artObj = { url: row.url, realUrl: row.source_url || row.url };
          const content = await enrichArticle(artObj);
          if (content && content.description && content.description.length > 100) {
            await pool.query(
              `UPDATE news SET summary = $1 WHERE id = $2`,
              [content.description.substring(0, 3000), row.id]
            );
            return { success: true, chars: content.description.length };
          }
          return { success: false };
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value?.success) enriched++;
        else failed++;
      }
    }

    console.log(`  ✅ Enrichi: ${enriched}, échoué: ${failed}`);
    res.json({ success: true, enriched, failed, processed: toEnrich.rows.length, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json(formatError('Erreur interne', 500));
  }
});

// =========================================================
// CRON: Traduire le contenu (opportunités + actualités)
// Optimisé: traductions PARALLÈLES + auto-chainage pour rester dans le timeout 60s
// =========================================================
app.get('/api/cron/translate-content', verifyCronSecret, async (req, res) => {
  try {
    if (!pool) return res.status(503).json(formatError('Database not ready', 503));

    const { translateText, detectLanguage, GOOGLE_TRANSLATE_SUPPORTED } = require('./utils/autoTranslate');
    const limit = parseInt(req.query.limit) || 2;
    const targetLangs = GOOGLE_TRANSLATE_SUPPORTED.filter(l => l !== 'en');
    // Priority languages first (African + major world languages)
    const PRIORITY_LANGS = ['fr', 'en', 'es', 'ar', 'pt', 'wo', 'bm', 'sw', 'ha', 'yo', 'ln', 'am', 'de', 'ig', 'zu', 'xh', 'af'];
    const sortedLangs = [...PRIORITY_LANGS.filter(l => targetLangs.includes(l)), ...targetLangs.filter(l => !PRIORITY_LANGS.includes(l))];

    const startTime = Date.now();
    const MAX_DURATION_MS = 45000; // 45s hard stop (leaves 15s buffer for cold start + response)

    let oppTranslated = 0, newsTranslated = 0, errors = 0, langsCompleted = 0;

    // SECURITY: Whitelist for valid language codes and table names
    const VALID_LANG_RE = /^[a-z]{2,3}$/;
    const VALID_TABLES = ['investment_opportunities', 'news'];

    // Helper: translate one item into languages IN PARALLEL (batches of 5)
    async function translateItem(item, table) {
      if (!VALID_TABLES.includes(table)) return false;
      const srcLang = await detectLanguage(item.title);
      const langsToTranslate = sortedLangs.filter(l => VALID_LANG_RE.test(l) && l !== srcLang && !item[`title_${l}`]);

      for (let i = 0; i < langsToTranslate.length; i += 5) {
        if (Date.now() - startTime > MAX_DURATION_MS) return false; // Time exceeded
        const batch = langsToTranslate.slice(i, i + 5);
        await Promise.allSettled(batch.map(async (lang) => {
          try {
            const titleTr = await translateText(item.title, lang, srcLang);
            if (!titleTr) return;
            const summaryTr = item.summary ? await translateText(item.summary.substring(0, 1500), lang, srcLang) : null;

            if (table === 'investment_opportunities') {
              const descTr = item.description ? await translateText(item.description.substring(0, 2000), lang, srcLang) : null;
              await pool.query(
                `UPDATE ${table} SET title_${lang} = $1, summary_${lang} = $2, description_${lang} = $3 WHERE id = $4`,
                [titleTr, summaryTr, descTr, item.id]
              );
            } else {
              await pool.query(
                `UPDATE ${table} SET title_${lang} = $1, summary_${lang} = $2 WHERE id = $3`,
                [titleTr, summaryTr, item.id]
              );
            }
            langsCompleted++;
          } catch(e) { errors++; }
        }));
      }
      return true; // Completed all languages for this item
    }

    // --- Traduire les opportunités ---
    // Vérifie TOUTES les langues prioritaires (pas seulement les 5 premières)
    const langCond = PRIORITY_LANGS.filter(l => VALID_LANG_RE.test(l)).map(l => `title_${l} IS NULL`).join(' OR ');
    const untranslatedOpps = await pool.query(
      `SELECT * FROM investment_opportunities WHERE ${langCond} ORDER BY published_at DESC LIMIT $1`, [limit]
    );
    for (const opp of untranslatedOpps.rows) {
      if (Date.now() - startTime > MAX_DURATION_MS) break;
      const completed = await translateItem(opp, 'investment_opportunities');
      oppTranslated++;
      if (!completed) break;
    }

    // --- Traduire les actualités ---
    if (Date.now() - startTime < MAX_DURATION_MS) {
      const newsLangCond = PRIORITY_LANGS.filter(l => VALID_LANG_RE.test(l)).map(l => `title_${l} IS NULL`).join(' OR ');
      const untranslatedNews = await pool.query(
        `SELECT * FROM news WHERE ${newsLangCond} ORDER BY published_at DESC LIMIT $1`, [limit]
      );
      for (const article of untranslatedNews.rows) {
        if (Date.now() - startTime > MAX_DURATION_MS) break;
        const completed = await translateItem(article, 'news');
        newsTranslated++;
        if (!completed) break;
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    // Check if there's more untranslated content (vérifie toutes les langues prioritaires)
    const remainingCond = PRIORITY_LANGS.filter(l => VALID_LANG_RE.test(l)).slice(0, 8).map(l => `title_${l} IS NULL`).join(' OR ');
    const stillUntranslatedCount = await pool.query(
      `SELECT (SELECT COUNT(*) FROM news WHERE ${remainingCond}) + (SELECT COUNT(*) FROM investment_opportunities WHERE ${remainingCond}) as total`
    );
    const remaining = parseInt(stillUntranslatedCount.rows[0]?.total || 0);

    // Auto-chain: trigger next batch if more content remains
    // IMPORTANT: On Vercel Serverless, we must send the response FIRST,
    // then await the chain fetch to ensure it's dispatched before function exits
    let chained = false;

    res.json({
      success: true,
      opportunitiesTranslated: oppTranslated,
      newsTranslated,
      langsCompleted,
      errors,
      remaining,
      duration: `${duration}s`,
      chained: remaining > 0,
      targetLanguages: sortedLangs.length,
      timestamp: new Date().toISOString()
    });

    // Chain AFTER response — wait just enough for HTTP request to be dispatched
    // Vercel keeps function alive briefly after res.json(), so a short delay ensures
    // the fetch TCP connection is established before the function is garbage-collected
    if (remaining > 0) {
      try {
        internalCronFetch(req, `/api/cron/translate-content?limit=${limit}`);
        await new Promise(r => setTimeout(r, 1500)); // 1.5s: enough for TCP handshake
      } catch(e) {}
    }
    return;
  } catch (error) {
    res.status(500).json(formatError('Erreur interne', 500));
  }
});

app.get('/api/cron/collect-opportunities', verifyCronSecret, async (req, res) => {
  try {
    if (!pool) return res.status(503).json(formatError('Database not ready', 503));

    console.log(`🌍 [v${BUILD_VERSION}] CRON: Collecte RÉELLE d'opportunités...`);

    // 1) Purge les opportunités de plus de 14 jours
    const purged = await pool.query("DELETE FROM investment_opportunities WHERE scraped_at < NOW() - interval '14 days'");

    // 2) Vérifier le nombre actuel
    const countBefore = await pool.query("SELECT COUNT(*) as total FROM investment_opportunities");
    const currentCount = parseInt(countBefore.rows[0].total);

    // 3) Si trop d'opportunités, purger les plus anciennes
    if (currentCount > 500) {
      await pool.query("DELETE FROM investment_opportunities WHERE id IN (SELECT id FROM investment_opportunities ORDER BY published_at ASC LIMIT 50)");
    }

    // 4) COLLECTER DE VRAIES OPPORTUNITÉS depuis les flux RSS
    const { inserted, errors, feeds_ok } = await collectRealOpportunities(40);

    // 5) Collecter de vraies actualités financières (20 flux RSS)
    let newsCollected = 0;
    let newsEnriched = 0;
    try {
      newsCollected = await collectRealNews(20);
    } catch(e) {
      console.error('News collection error:', e.message);
    }

    // 5b) Enrichir les 6 articles les plus récents avec contenu complet
    try {
      const toEnrich = await pool.query(`
        SELECT id, url, source_url FROM news
        WHERE (summary IS NULL OR LENGTH(summary) < 400)
          AND url IS NOT NULL AND url != ''
        ORDER BY published_at DESC LIMIT 6
      `);
      if (toEnrich.rows.length > 0) {
        const results = await Promise.allSettled(
          toEnrich.rows.map(async (row) => {
            const content = await enrichArticle({ url: row.url, realUrl: row.source_url || row.url });
            if (content?.description?.length > 100) {
              await pool.query(`UPDATE news SET summary = $1 WHERE id = $2`, [content.description.substring(0, 3000), row.id]);
              return true;
            }
            return false;
          })
        );
        newsEnriched = results.filter(r => r.status === 'fulfilled' && r.value).length;
      }
    } catch(e) {
      console.error('News enrichment error:', e.message);
    }

    // 6) Compter les résultats finaux
    const countAfter = await pool.query("SELECT COUNT(*) as total FROM investment_opportunities");
    const countriesResult = await pool.query("SELECT COUNT(DISTINCT country) as countries FROM investment_opportunities");

    const shouldTranslate = inserted > 0 || newsCollected > 0;

    res.json({
      success: true,
      version: BUILD_VERSION,
      mode: 'REAL_DATA',
      purged: purged.rowCount,
      realInserted: inserted,
      newsCollected,
      newsEnriched,
      feedsOK: feeds_ok,
      feedErrors: errors.length,
      currentTotal: parseInt(countAfter.rows[0].total),
      countriesCovered: parseInt(countriesResult.rows[0].countries),
      translationTriggered: shouldTranslate,
      timestamp: new Date().toISOString()
    });

    // 7) Trigger translation AFTER response (ensures dispatch on Vercel Serverless)
    if (shouldTranslate) {
      try {
        internalCronFetch(req, '/api/cron/translate-content?limit=30');
        await new Promise(r => setTimeout(r, 1500));
        console.log('🌐 Traduction automatique déclenchée pour le nouveau contenu');
      } catch(e) {}
    }
    return;
  } catch (error) {
    console.error('Cron error:', error);
    res.status(500).json(formatError('Erreur interne', 500));
  }
});

// ============================================
// CRON: Collecte complète (remplace GitHub Actions)
// Collecte news + opportunités + enrichissement + traduction en un seul appel
// ============================================
app.get('/api/cron/collect-all', verifyCronSecret, async (req, res) => {
  try {
    if (!pool) return res.status(503).json(formatError('Database not ready', 503));

    console.log(`🚀 [v${BUILD_VERSION}] CRON COLLECT-ALL: Début collecte complète...`);
    const startTime = Date.now();
    const MAX_DURATION_MS = 50000; // Stop at 50s to stay under 60s timeout
    const limit = parseInt(req.query.limit) || 5;
    const results = { news: 0, opportunities: 0, enriched: 0, errors: [], skipped: [] };

    // 1) Collecte des opportunités (reduced limit + time guard)
    if (Date.now() - startTime < MAX_DURATION_MS) {
      try {
        await pool.query("DELETE FROM investment_opportunities WHERE scraped_at < NOW() - interval '14 days'");
        const countBefore = await pool.query("SELECT COUNT(*) as total FROM investment_opportunities");
        if (parseInt(countBefore.rows[0].total) > 500) {
          await pool.query("DELETE FROM investment_opportunities WHERE id IN (SELECT id FROM investment_opportunities ORDER BY published_at ASC LIMIT 50)");
        }
        const oppResult = await collectRealOpportunities(Math.min(limit * 3, 15));
        results.opportunities = oppResult.inserted || 0;
        console.log(`  ✅ Opportunités collectées: ${results.opportunities}`);
      } catch(e) {
        results.errors.push(`opportunities: ${e.message}`);
        console.error('  ❌ Erreur collecte opportunités:', e.message);
      }
    } else { results.skipped.push('opportunities'); }

    // 2) Collecte des actualités (reduced limit + time guard)
    if (Date.now() - startTime < MAX_DURATION_MS) {
      try {
        await pool.query("DELETE FROM news WHERE url IS NULL OR url = ''");
        await pool.query("DELETE FROM news WHERE published_at < NOW() - interval '7 days'");
        results.news = await collectRealNews(Math.min(limit * 2, 10));
        console.log(`  ✅ Actualités collectées: ${results.news}`);
      } catch(e) {
        results.errors.push(`news: ${e.message}`);
        console.error('  ❌ Erreur collecte actualités:', e.message);
      }
    } else { results.skipped.push('news'); }

    // 3) Enrichissement des articles récents (smaller batch + time guard)
    if (Date.now() - startTime < MAX_DURATION_MS) {
      try {
        const toEnrich = await pool.query(`
          SELECT id, url, source_url FROM news
          WHERE (summary IS NULL OR LENGTH(summary) < 400) AND url IS NOT NULL AND url != ''
          ORDER BY published_at DESC LIMIT 5
        `);
        if (toEnrich.rows.length > 0) {
          for (const row of toEnrich.rows) {
            if (Date.now() - startTime > MAX_DURATION_MS) break;
            try {
              const content = await enrichArticle({ url: row.url, realUrl: row.source_url || row.url });
              if (content?.description?.length > 100) {
                await pool.query(`UPDATE news SET summary = $1 WHERE id = $2`, [content.description.substring(0, 3000), row.id]);
                results.enriched++;
              }
            } catch(e) { /* skip individual enrichment errors */ }
          }
          console.log(`  ✅ Articles enrichis: ${results.enriched}`);
        }
      } catch(e) {
        results.errors.push(`enrichment: ${e.message}`);
        console.error('  ❌ Erreur enrichissement:', e.message);
      }
    } else { results.skipped.push('enrichment'); }

    results.translationTriggered = true;

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`🏁 COLLECT-ALL terminé en ${duration}s`);

    res.json({
      success: true,
      version: BUILD_VERSION,
      mode: 'COLLECT_ALL',
      duration: `${duration}s`,
      results,
      timestamp: new Date().toISOString()
    });

    // 4) Trigger translation AFTER response (ensures dispatch on Vercel Serverless)
    try {
      internalCronFetch(req, '/api/cron/translate-content?limit=3');
      await new Promise(r => setTimeout(r, 1500));
      console.log('  🌐 Traduction en chaîne déclenchée');
    } catch(e) {}
    return;
  } catch (error) {
    console.error('Collect-all error:', error);
    res.status(500).json(formatError('Erreur interne', 500));
  }
});

// ============================================
// FORUM: Route racine /api/forum (vue d'ensemble)
// ============================================
app.get('/api/forum', async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse({ stats: { total_threads: 0, total_posts: 0, total_categories: 0 }, categories: [], recentThreads: [] }));

    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM forum_threads) as total_threads,
        (SELECT COUNT(*) FROM forum_posts) as total_posts,
        (SELECT COUNT(*) FROM forum_categories) as total_categories
    `);

    const categories = await pool.query(`
      SELECT fc.id, fc.name, fc.description, fc.icon, fc.color, fc.sort_order,
             COUNT(DISTINCT ft.id) as threads_count, COUNT(DISTINCT fp.id) as posts_count
      FROM forum_categories fc
      LEFT JOIN forum_threads ft ON ft.category_id = fc.id
      LEFT JOIN forum_posts fp ON fp.thread_id = ft.id
      GROUP BY fc.id ORDER BY fc.sort_order
    `);

    let recentThreads = { rows: [] };
    try {
      recentThreads = await pool.query(`
        SELECT ft.id, ft.title, ft.created_at, ft.views, ft.likes,
               fc.name as category_name, COUNT(fp.id) as reply_count
        FROM forum_threads ft
        LEFT JOIN forum_categories fc ON ft.category_id = fc.id
        LEFT JOIN forum_posts fp ON fp.thread_id = ft.id
        GROUP BY ft.id, ft.title, ft.created_at, ft.views, ft.likes, fc.name
        ORDER BY ft.created_at DESC LIMIT 5
      `);
    } catch(e) { /* table may not exist yet */ }

    res.json(formatResponse({
      stats: stats.rows[0],
      categories: categories.rows,
      recentThreads: recentThreads.rows
    }));
  } catch (error) {
    res.status(500).json(formatError('Erreur interne', 500));
  }
});

// ============================================
// FORUM: Route /api/forum/posts (tous les posts récents)
// ============================================
app.get('/api/forum/posts', async (req, res) => {
  try {
    if (!pool) return res.json(formatResponse([]));

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const posts = await pool.query(`
      SELECT fp.id, fp.content, fp.created_at, fp.likes,
             fp.thread_id, ft.title as thread_title
      FROM forum_posts fp
      LEFT JOIN forum_threads ft ON fp.thread_id = ft.id
      ORDER BY fp.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json(formatResponse(posts.rows));
  } catch (error) {
    res.status(500).json(formatError('Erreur interne', 500));
  }
});

// ============================================
// WARM-UP: Endpoint pour ping externe (éviter cold start)
// ============================================
app.get('/api/ping', (req, res) => {
  res.json({ pong: true, version: BUILD_VERSION, timestamp: new Date().toISOString() });
});

// ============================================

app.use((req, res) => {
  res.status(404).json(formatError(`Route non trouvée: ${req.method} ${req.path}`, 404));
});

// ============================================
// DÉMARRAGE
// ============================================

// Initialiser la DB au démarrage (compatible Vercel serverless)
// _dbInitPromise was already started as middleware above (called once at module load)
const initPromise = _dbInitPromise;
initPromise.then(ok => {
  console.log(ok ? '✅ Base de données connectée et tables créées' : '⚠️  Mode démonstration (sans DB)');
}).catch(err => {
  console.error('❌ Erreur init DB:', err.message);
});

// ── Client-side error reporting (from ErrorBoundary) ──────────────────────
app.post('/api/client-error', (req, res) => {
  const { message, stack, componentStack, url, timestamp } = req.body || {};
  if (message) {
    console.error('[CLIENT-ERROR]', JSON.stringify({ message, url, timestamp, stack: stack?.slice(0, 300), componentStack: componentStack?.slice(0, 300) }));
  }
  res.status(204).end(); // No content — fire-and-forget from client
});

// ── Global error handler — catch unhandled errors in routes ───────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[UNHANDLED]', req.method, req.path, err.message, err.stack?.slice(0, 500));
  res.status(500).json(formatError('Erreur interne du serveur', 500));
});

// Mode Vercel serverless : exporter l'app
// Mode classique (Railway, local) : démarrer le serveur
if (process.env.VERCEL) {
  module.exports = app;
} else {
  initPromise.then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n✅ PENDO Backend COMPLET démarré sur port ${PORT}`);
      console.log(`🌍 http://localhost:${PORT}`);
      console.log('\n📡 Routes disponibles:');
      console.log('   ✓ GET  /api/status');
      console.log('   ✓ GET  /api/markets (+ /:id, /:id/history)');
      console.log('   ✓ GET  /api/stocks (+ /:ticker, /:ticker/history)');
      console.log('   ✓ GET  /api/opportunities (+ /:id, /sectors, /countries)');
      console.log('   ✓ GET  /api/news (+ /:id, /latest)');
      console.log('   ✓ GET  /api/portfolio (+ /summary, /transactions, /performance)');
      console.log('   ✓ POST /api/portfolio/transaction (+ /buy, /sell, /reset)');
      console.log('   ✓ GET  /api/indicators/:ticker/complete');
      console.log('   ✓ GET  /api/position-sizing/comprehensive');
      console.log('   ✓ ALL  /api/auth/*');
      console.log('   ✓ ALL  /api/forum/*');
      console.log('   ✓ ALL  /api/chat/*');
      console.log('   ✓ GET  /api/notifications');
      console.log('   ✓ GET  /api/analytics');
      console.log('   ✓ GET  /api/stats');
    });
  }).catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

  module.exports = app;
}
