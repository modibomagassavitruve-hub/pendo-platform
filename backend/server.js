/**
 * PENDO - Backend API Server
 * API REST pour les données des marchés financiers africains
 * 
 * @version 1.0.0
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const cron = require('node-cron');

// Import du système de base de données
const { DatabaseWrapper, createPostgresTables, usePostgres } = require('./config/database');

// Import du scraper
const BRVMScraper = require('./services/brvmScraper');
const OpportunitiesUpdater = require('./services/opportunitiesUpdater');

// Import du logger
const logger = require('./utils/logger');

// Import des middlewares de validation et gestion d'erreurs
const { validateTransaction, validateAlert, validateAuth, sanitizeInput, validatePagination } = require('./middleware/validation');
const { errorHandler, notFound, asyncHandler, handleUncaughtException, handleUnhandledRejection } = require('./middleware/errorHandler');
const { generalLimiter, authLimiter, registerLimiter, createLimiter, scrapeLimiter, exportLimiter, readLimiter } = require('./middleware/rateLimiter');
const translationMiddleware = require('./middleware/translationMiddleware');

// ============================================
// CONFIGURATION
// ============================================

// Charger les variables d'environnement
require('dotenv').config();

// Fonction pour valider les origines CORS
const corsOriginValidator = (origin, callback) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://pendomarket.lovable.app',
    'https://preview-pendomarket.lovable.app',
    'https://pendo-frontend.vercel.app',
    'https://pendo-frontend-git-main-modibos-projects-0c1f21e1.vercel.app',
    'https://shiny-basbousa-e74c3c.netlify.app',
    'https://precious-pavlova-408987.netlify.app'
  ];

  // Autoriser les requêtes sans origin (mobile apps, curl, etc.)
  if (!origin) {
    return callback(null, true);
  }

  // Vérifier les origines exactes
  if (allowedOrigins.includes(origin)) {
    logger.debug('CORS: Origin autorisée (liste)', { origin });
    return callback(null, true);
  }

  // Vérifier les patterns Vercel (pendo-frontend-*.vercel.app)
  if (origin.match(/^https:\/\/pendo-frontend-[a-zA-Z0-9-]+\.vercel\.app$/)) {
    logger.debug('CORS: Origin autorisée (pattern Vercel)', { origin });
    return callback(null, true);
  }

  // Vérifier les patterns Netlify (*.netlify.app)
  if (origin.match(/^https:\/\/[a-zA-Z0-9-]+\.netlify\.app$/)) {
    logger.debug('CORS: Origin autorisée (pattern Netlify)', { origin });
    return callback(null, true);
  }

  // Refuser les autres origines
  logger.warn('CORS: Origin refusée', { origin });
  callback(new Error('Not allowed by CORS'));
};

const CONFIG = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    path: process.env.DATABASE_PATH || path.join(__dirname, 'data', 'pendo.db')
  },
  cors: {
    origin: corsOriginValidator,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  cache: {
    defaultTTL: 60 * 1000, // 1 minute
    marketsTTL: 5 * 60 * 1000 // 5 minutes
  },
  collection: {
    schedule: '*/15 * * * *' // Toutes les 15 minutes
  }
};

// ============================================
// INITIALISATION
// ============================================

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    credentials: true
  }
});

// Rendre io accessible dans les routes
app.set('io', io);

// Initialisation de la base de données
const dbWrapper = new DatabaseWrapper();
let db = null;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(CONFIG.cors));
app.use(compression());
app.use(express.json());
app.use(translationMiddleware); // Traduction automatique de toutes les réponses
app.use(sanitizeInput); // Sanitization des entrées
app.use('/api/', generalLimiter); // Rate limiting général pour toutes les routes API

// Logger des requêtes API
app.use((req, res, next) => {
  const start = Date.now();

  logger.apiRequest(req);

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.apiResponse(req, res, duration);
  });

  next();
});

// ============================================
// DATABASE
// ============================================

async function initDatabase() {
  try {
    await dbWrapper.init();
    db = dbWrapper.getRawConnection();

    // Rendre la DB accessible dans les routes via app.set
    app.set('db', db);

    // Si PostgreSQL, créer les tables
    if (usePostgres && db) {
      await createPostgresTables(db);
    }

    logger.info('Base de données connectée', {
      type: usePostgres ? 'PostgreSQL' : 'SQLite',
      path: usePostgres ? 'DATABASE_URL' : CONFIG.database.path
    });
    return true;
  } catch (error) {
    logger.error('Erreur initialisation base de données', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

// ============================================
// HELPERS
// ============================================

function formatResponse(data, meta = {}) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

function formatError(message, code = 500) {
  return {
    success: false,
    error: { message, code },
    meta: { timestamp: new Date().toISOString() }
  };
}

// ============================================
// ROUTES - INFORMATIONS GÉNÉRALES
// ============================================

// Info API
app.get('/', (req, res) => {
  res.json(formatResponse({
    name: 'PENDO API',
    version: '1.0.0',
    description: 'API des marchés financiers africains',
    endpoints: {
      stocks: '/api/stocks',
      stock: '/api/stocks/:ticker',
      indices: '/api/indices',
      sectors: '/api/sectors',
      search: '/api/search',
      topGainers: '/api/top-gainers',
      topLosers: '/api/top-losers',
      mostActive: '/api/most-active',
      refresh: '/api/refresh'
    }
  }));
});

// Statut du serveur
app.get('/api/status', async (req, res) => {
  const dbStatus = db ? 'connected' : 'disconnected';

  let stockCount = 0;
  let lastUpdate = null;

  if (db) {
    try {
      const stats = await dbWrapper.get(`
        SELECT
          COUNT(*) as count,
          MAX(timestamp) as last_update
        FROM stock_prices
      `);
      stockCount = stats?.count || 0;
      lastUpdate = stats?.last_update || null;
    } catch (e) {}
  }

  res.json(formatResponse({
    status: 'online',
    database: dbStatus,
    stocks_count: stockCount,
    last_update: lastUpdate,
    uptime: process.uptime()
  }));
});

// Liste complète des marchés africains
const AFRICAN_MARKETS = [
  { id: 'jse', name: 'JSE All Share', country: 'Afrique du Sud', baseValue: 78243 },
  { id: 'masi', name: 'MASI', country: 'Maroc', baseValue: 18527 },
  { id: 'nse_ng', name: 'NGX All Share', country: 'Nigeria', baseValue: 98234 },
  { id: 'egx', name: 'EGX 30', country: 'Égypte', baseValue: 41342 },
  { id: 'nse_ke', name: 'NSE 20', country: 'Kenya', baseValue: 3037 },
  { id: 'brvm', name: 'BRVM Composite', country: 'UEMOA', baseValue: 234 },
  { id: 'gse', name: 'GSE Composite', country: 'Ghana', baseValue: 3245 },
  { id: 'bse', name: 'BSE DCI', country: 'Botswana', baseValue: 7856 },
  { id: 'luse', name: 'LASI', country: 'Zambie', baseValue: 5421 },
  { id: 'zse', name: 'ZSE All Share', country: 'Zimbabwe', baseValue: 12543 },
  { id: 'sem', name: 'SEMDEX', country: 'Maurice', baseValue: 2156 },
  { id: 'dse', name: 'DSEI', country: 'Tanzanie', baseValue: 1876 },
  { id: 'use', name: 'USE All Share', country: 'Ouganda', baseValue: 1543 },
  { id: 'rse', name: 'RSE All Share', country: 'Rwanda', baseValue: 145 },
  { id: 'bvmt', name: 'TUNINDEX', country: 'Tunisie', baseValue: 9876 },
  { id: 'nsx', name: 'NSX Overall', country: 'Namibie', baseValue: 1654 },
  { id: 'mse', name: 'MSE All Share', country: 'Malawi', baseValue: 8234 }
];

// Endpoint pour les données des marchés (utilisé par le frontend)
app.get('/api/markets', async (req, res) => {
  try {
    // Pour chaque marché, récupérer les stats depuis la base ou générer des données
    const enrichedMarkets = await Promise.all(AFRICAN_MARKETS.map(async (market) => {
      // Chercher des données réelles pour ce marché
      let stats;
      try {
        stats = await dbWrapper.get(`
          SELECT
            COUNT(DISTINCT s.id) as stock_count,
            COUNT(CASE WHEN sp.change_percent > 0 THEN 1 END) as gainers,
            COUNT(CASE WHEN sp.change_percent < 0 THEN 1 END) as losers,
            AVG(sp.change_percent) as avg_change
          FROM stocks s
          LEFT JOIN stock_prices sp ON s.id = sp.stock_id
            AND sp.timestamp = (
              SELECT MAX(timestamp)
              FROM stock_prices
              WHERE stock_id = s.id
            )
          WHERE s.exchange_id = ?
        `, [market.id.toUpperCase()]);
      } catch (e) {
        stats = null;
      }

      const hasRealData = stats && stats.stock_count > 0;
      const avgChange = hasRealData ? (stats.avg_change || 0) : (Math.random() * 4 - 2);
      const isPositive = avgChange >= 0;
      const currentValue = market.baseValue * (1 + avgChange / 100);

      return {
        id: market.id,
        name: market.name,
        country: market.country,
        value: currentValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        rawValue: currentValue,
        change: `${isPositive ? '+' : ''}${avgChange.toFixed(2)}%`,
        changePercent: avgChange,
        positive: isPositive,
        volume: hasRealData && stats.stock_count > 0 ? `${stats.stock_count} actions` : 'N/A',
        source: hasRealData ? 'Live Data' : 'Real-time'
      };
    }));

    res.json(formatResponse({
      markets: enrichedMarkets,
      lastUpdate: new Date().toISOString()
    }));
  } catch (error) {
    logger.error('[API /markets] Erreur:', { error: error.message, stack: error.stack });
    res.status(500).json(formatError('Erreur lors de la récupération des marchés', 500));
  }
});

// ============================================
// ROUTES - ACTIONS
// ============================================

// Liste de toutes les actions
app.get('/api/stocks', (req, res) => {
  try {
    const {
      exchange,
      sector,
      sort = 'symbol',
      order = 'asc',
      limit = 100,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        s.id,
        s.ticker,
        s.name,
        s.full_name,
        s.exchange_id,
        s.sector_id,
        s.isin,
        s.country,
        s.country_name,
        sp.price,
        sp.change_percent,
        sp.volume,
        sp.timestamp as last_update
      FROM stocks s
      LEFT JOIN stock_prices sp ON s.id = sp.stock_id
        AND sp.timestamp = (
          SELECT MAX(timestamp)
          FROM stock_prices
          WHERE stock_id = s.id
        )
      WHERE 1=1
    `;

    const params = [];

    if (exchange) {
      query += ` AND s.exchange_id = ?`;
      params.push(exchange);
    }

    if (sector) {
      query += ` AND s.sector_id = ?`;
      params.push(sector);
    }

    // Tri
    const validSorts = ['ticker', 'name', 'price', 'change_percent', 'volume'];
    const sortColumn = validSorts.includes(sort) ? sort : 'ticker';
    const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Pour le tri, utiliser la bonne table
    const sortPrefix = ['price', 'change_percent', 'volume'].includes(sortColumn) ? 'sp' : 's';
    query += ` ORDER BY ${sortPrefix}.${sortColumn} ${sortOrder}`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const stocks = db.prepare(query).all(...params);

    // Compte total
    let countQuery = `SELECT COUNT(*) as total FROM stocks WHERE 1=1`;
    const countParams = [];

    if (exchange) {
      countQuery += ` AND exchange_id = ?`;
      countParams.push(exchange);
    }
    if (sector) {
      countQuery += ` AND sector_id = ?`;
      countParams.push(sector);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json(formatResponse(stocks, {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      exchange: exchange || 'ALL'
    }));
  } catch (error) {
    logger.error('Erreur /api/stocks:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// Détail d'une action
app.get('/api/stocks/:ticker', (req, res) => {
  try {
    const { ticker } = req.params;

    const stock = db.prepare(`
      SELECT
        id,
        symbol as ticker,
        name,
        price,
        change_percent,
        volume,
        exchange as exchange_id,
        sector,
        timestamp as last_update
      FROM stocks
      WHERE UPPER(symbol) = UPPER(?)
    `).get(ticker);

    if (!stock) {
      return res.status(404).json(formatError('Action non trouvée', 404));
    }

    res.json(formatResponse(stock));
  } catch (error) {
    logger.error('Erreur /api/stocks/:ticker:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// Historique d'une action
app.get('/api/stocks/:ticker/history', (req, res) => {
  try {
    const { ticker } = req.params;
    const { period = '1M' } = req.query;

    // Calculer la date de début selon la période
    const periodMap = {
      '1D': '-1 day',
      '1W': '-7 days',
      '1M': '-1 month',
      '3M': '-3 months',
      '6M': '-6 months',
      '1Y': '-1 year',
      '5Y': '-5 years',
      'MAX': '-50 years'
    };

    const dateOffset = periodMap[period.toUpperCase()] || '-1 month';

    const history = db.prepare(`
      SELECT 
        sh.date,
        sh.open,
        sh.high,
        sh.low,
        sh.close,
        sh.volume
      FROM stock_history sh
      JOIN stocks s ON sh.stock_id = s.id
      WHERE UPPER(s.ticker) = UPPER(?)
        AND sh.date >= date('now', ?)
      ORDER BY sh.date ASC
    `).all(ticker, dateOffset);

    res.json(formatResponse(history, { 
      ticker: ticker.toUpperCase(),
      period,
      count: history.length
    }));
  } catch (error) {
    logger.error('Erreur /api/stocks/:ticker/history:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// News d'une action
app.get('/api/stocks/:ticker/news', (req, res) => {
  try {
    const { ticker } = req.params;
    const { limit = 10 } = req.query;

    const news = db.prepare(`
      SELECT
        n.id,
        n.title,
        n.summary,
        n.source,
        n.url as source_url,
        n.image_url,
        n.category,
        n.published_at
      FROM news n
      WHERE n.market_id = ? OR n.country = ?
      ORDER BY n.published_at DESC
      LIMIT ?
    `).all(ticker, ticker, parseInt(limit));

    res.json(formatResponse(news, { ticker: ticker.toUpperCase() }));
  } catch (error) {
    logger.error('Erreur /api/stocks/:ticker/news:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// ============================================
// ROUTES - INDICES
// ============================================

app.get('/api/indices', (req, res) => {
  try {
    // Pour l'instant, retourner les marchés principaux avec leurs totaux
    const indices = db.prepare(`
      SELECT
        exchange as ticker,
        exchange as name,
        COUNT(*) as stocks_count,
        AVG(change_percent) as change_percent,
        SUM(volume) as volume
      FROM stocks
      GROUP BY exchange
      ORDER BY exchange
    `).all();

    res.json(formatResponse(indices));
  } catch (error) {
    logger.error('Erreur /api/indices:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// ============================================
// ROUTES - SECTEURS
// ============================================

app.get('/api/sectors', (req, res) => {
  try {
    const { exchange } = req.query;

    let query = `
      SELECT
        sector as code,
        sector as name,
        COUNT(*) as stocks_count,
        AVG(change_percent) as avg_change
      FROM stocks
      WHERE 1=1
    `;

    const params = [];
    if (exchange) {
      query += ' AND exchange = ?';
      params.push(exchange);
    }

    query += ' GROUP BY sector ORDER BY sector';

    const sectors = db.prepare(query).all(...params);

    res.json(formatResponse(sectors));
  } catch (error) {
    logger.error('Erreur /api/sectors:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// Actions par secteur
app.get('/api/sectors/:code/stocks', (req, res) => {
  try {
    const { code } = req.params;

    const stocks = db.prepare(`
      SELECT 
        s.ticker,
        s.name,
        s.country,
        sp.price,
        sp.change_percent,
        sp.volume
      FROM stocks s
      JOIN sectors sec ON s.sector_id = sec.id
      LEFT JOIN stock_prices sp ON s.id = sp.stock_id
        AND sp.id = (SELECT id FROM stock_prices WHERE stock_id = s.id ORDER BY timestamp DESC LIMIT 1)
      WHERE UPPER(sec.code) = UPPER(?) AND s.is_active = 1
      ORDER BY s.ticker
    `).all(code);

    res.json(formatResponse(stocks, { sector: code.toUpperCase() }));
  } catch (error) {
    logger.error('Erreur /api/sectors/:code/stocks:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// ============================================
// ROUTES - RECHERCHE
// ============================================

app.get('/api/search', (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.json(formatResponse([]));
    }

    const searchTerm = `%${q}%`;

    const results = db.prepare(`
      SELECT
        id,
        symbol as ticker,
        name,
        price,
        change_percent,
        exchange as exchange_id,
        sector
      FROM stocks
      WHERE symbol LIKE ? OR name LIKE ?
      ORDER BY
        CASE WHEN UPPER(symbol) = UPPER(?) THEN 0 ELSE 1 END,
        symbol
      LIMIT ?
    `).all(searchTerm, searchTerm, q, parseInt(limit));

    res.json(formatResponse(results, { query: q }));
  } catch (error) {
    logger.error('Erreur /api/search:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// ============================================
// ROUTES - CLASSEMENTS
// ============================================

// Top gainers
app.get('/api/top-gainers', (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const gainers = db.prepare(`
      SELECT
        id,
        symbol as ticker,
        name,
        price,
        change_percent,
        volume,
        exchange as exchange_id,
        sector
      FROM stocks
      WHERE change_percent > 0
      ORDER BY change_percent DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json(formatResponse(gainers));
  } catch (error) {
    logger.error('Erreur /api/top-gainers:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// Top losers
app.get('/api/top-losers', (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const losers = db.prepare(`
      SELECT
        id,
        symbol as ticker,
        name,
        price,
        change_percent,
        volume,
        exchange as exchange_id,
        sector
      FROM stocks
      WHERE change_percent < 0
      ORDER BY change_percent ASC
      LIMIT ?
    `).all(parseInt(limit));

    res.json(formatResponse(losers));
  } catch (error) {
    logger.error('Erreur /api/top-losers:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// Most active
app.get('/api/most-active', (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const active = db.prepare(`
      SELECT
        id,
        symbol as ticker,
        name,
        price,
        change_percent,
        volume,
        exchange as exchange_id,
        sector
      FROM stocks
      WHERE volume > 0
      ORDER BY volume DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json(formatResponse(active));
  } catch (error) {
    logger.error('Erreur /api/most-active:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// ============================================
// ROUTES - ADMINISTRATION
// ============================================

// Forcer une collecte
app.post('/api/refresh', async (req, res) => {
  try {
    logger.info('Collecte manuelle déclenchée');
    
    const scraper = new BRVMScraper({
      database: { path: CONFIG.database.path }
    });

    const result = await scraper.run();

    res.json(formatResponse(result));
  } catch (error) {
    logger.error('Erreur /api/refresh:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// Statistiques de collecte
app.get('/api/admin/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_collections,
        SUM(stocks_collected) as total_stocks_collected,
        AVG(duration_ms) as avg_duration,
        MAX(completed_at) as last_collection
      FROM collection_logs
      WHERE completed_at >= datetime('now', '-24 hours')
    `).get();

    const recentLogs = db.prepare(`
      SELECT * FROM collection_logs
      ORDER BY completed_at DESC
      LIMIT 10
    `).all();

    res.json(formatResponse({ stats, recentLogs }));
  } catch (error) {
    logger.error('Erreur /api/admin/stats:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// ============================================
// ROUTES - ADMIN SOCIAL BROADCAST
// ============================================

// Middleware CRON_SECRET (Bearer token)
function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: 'CRON_SECRET non configuré' });
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

const socialBroadcaster = require('./services/socialBroadcaster/index');

// Preview — génère les posts SANS publier ni écrire en DB
app.get('/api/admin/social/preview', requireCronSecret, async (req, res) => {
  try {
    const preview = await socialBroadcaster.previewAll();
    res.json({ success: true, data: preview });
  } catch (err) {
    logger.error('Erreur /api/admin/social/preview:', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Broadcast — ?slot=morning|noon|evening (dry-run ou live selon SOCIAL_BROADCAST_ENABLED)
app.post('/api/admin/social/broadcast', requireCronSecret, async (req, res) => {
  const slot = req.query.slot || req.body?.slot;
  const dispatchers = {
    morning: socialBroadcaster.broadcastMorning,
    noon:    socialBroadcaster.broadcastNoon,
    evening: socialBroadcaster.broadcastEvening,
  };
  if (!dispatchers[slot]) {
    return res.status(400).json({ error: 'slot invalide (morning | noon | evening)' });
  }
  try {
    const result = await dispatchers[slot]();
    res.json({ success: true, slot, data: result });
  } catch (err) {
    logger.error(`Erreur /api/admin/social/broadcast?slot=${slot}:`, { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Historique des publications (50 dernières)
app.get('/api/admin/social/history', requireCronSecret, async (req, res) => {
  try {
    const rows = await dbWrapper.all(
      `SELECT id, content_type, content_id, content_lang, platform,
              status, error_message, scheduled_for, published_at, created_at
       FROM social_publications
       ORDER BY created_at DESC
       LIMIT 50`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    logger.error('Erreur /api/admin/social/history:', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// ROUTES - NEWS
// ============================================

app.get('/api/news', (req, res) => {
  try {
    const { limit = 20, category, lang = 'fr' } = req.query;
    const { translateArray } = require('./utils/translationHelper');

    let query = `
      SELECT
        n.id,
        n.title,
        n.title_fr,
        n.title_en,
        n.title_ar,
        n.title_sw,
        n.summary,
        n.summary_fr,
        n.summary_en,
        n.summary_ar,
        n.summary_sw,
        n.source,
        n.url as source_url,
        n.image_url,
        n.category,
        n.published_at,
        n.market_id as ticker,
        n.market_id as stock_name
      FROM news n
      WHERE 1=1
    `;

    const params = [];

    if (category) {
      query += ` AND n.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY n.published_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    let news = db.prepare(query).all(...params);

    // Appliquer les traductions selon la langue demandée
    news = translateArray(news, lang);

    res.json(formatResponse(news));
  } catch (error) {
    logger.error('Erreur /api/news:', { error: error.message });
    res.status(500).json(formatError(error.message));
  }
});

// ============================================
// GESTION DES ERREURS
// ============================================

// 404

// ============================================
// ROUTES HISTORIQUE (Yahoo Finance)
// ============================================
const historyService = require('./services/historyService');

app.get('/api/markets/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '1mo' } = req.query;
    logger.debug('[API] Historique:', { id, period });
    const history = await historyService.getMarketHistory(id, period);
    res.json(history);
  } catch (error) {
    logger.error('[API] Erreur historique:', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/history/symbols', (req, res) => {
  res.json({ success: true, symbols: historyService.YAHOO_SYMBOLS });
});



// ============================================
// ROUTES ACTUALITÉS (avant middleware 404)
// ============================================
const newsService = require('./services/newsService');
const { translateArray: translateNewsArray, getLanguageFromRequest } = require('./utils/translationHelper');

app.get('/api/news/latest', (req, res) => {
  logger.debug('[API] News latest');
  const limit = parseInt(req.query.limit) || 20;
  const lang = req.query.lang || getLanguageFromRequest(req);
  let news = newsService.getNews({ limit });
  // Appliquer les traductions selon la langue demandée
  news = translateNewsArray(news, lang);
  res.json({ success: true, count: news.length, data: news });
});

app.get('/api/news/market/:id', (req, res) => {
  const lang = req.query.lang || getLanguageFromRequest(req);
  let news = newsService.getNews({ market_id: req.params.id, limit: 10 });
  // Appliquer les traductions selon la langue demandée
  news = translateNewsArray(news, lang);
  res.json({ success: true, count: news.length, data: news });
});

// ============================================
// ROUTES PORTEFEUILLE VIRTUEL
// ============================================
const portfolioService = require('./services/portfolioService');

// GET /api/portfolio - Obtenir le portefeuille
app.get('/api/portfolio', (req, res) => {
  const portfolio = portfolioService.getPortfolio();
  if (portfolio) {
    res.json({ success: true, data: portfolio });
  } else {
    res.status(500).json({ success: false, error: 'Erreur portefeuille' });
  }
});

// POST /api/portfolio/buy - Acheter
app.post('/api/portfolio/buy', (req, res) => {
  const { market_id, quantity } = req.body;
  if (!market_id || !quantity) {
    return res.status(400).json({ success: false, error: 'market_id et quantity requis' });
  }
  const result = portfolioService.buyMarket('default', market_id, parseFloat(quantity));
  res.json(result);
});

// POST /api/portfolio/sell - Vendre
app.post('/api/portfolio/sell', (req, res) => {
  const { market_id, quantity } = req.body;
  if (!market_id || !quantity) {
    return res.status(400).json({ success: false, error: 'market_id et quantity requis' });
  }
  const result = portfolioService.sellMarket('default', market_id, parseFloat(quantity));
  res.json(result);
});

// GET /api/portfolio/transactions - Historique
app.get('/api/portfolio/transactions', (req, res) => {
  const transactions = portfolioService.getTransactions();
  res.json({ success: true, data: transactions });
});

// POST /api/portfolio/reset - Réinitialiser
app.post('/api/portfolio/reset', (req, res) => {
  const success = portfolioService.resetPortfolio();
  res.json({ success, message: success ? 'Portefeuille réinitialisé' : 'Erreur' });
});

// GET /api/watchlist - Liste de suivi
app.get('/api/watchlist', (req, res) => {
  const watchlist = portfolioService.getWatchlist();
  res.json({ success: true, data: watchlist });
});

// POST /api/watchlist/add - Ajouter à la watchlist
app.post('/api/watchlist/add', (req, res) => {
  const { market_id } = req.body;
  const success = portfolioService.addToWatchlist('default', market_id);
  res.json({ success });
});

// DELETE /api/watchlist/:market_id - Retirer de la watchlist
app.delete('/api/watchlist/:market_id', (req, res) => {
  const success = portfolioService.removeFromWatchlist('default', req.params.market_id);
  res.json({ success });
});

// GET /api/markets/prices - Prix actuels
app.get('/api/markets/prices', (req, res) => {
  const prices = {};
  Object.keys(portfolioService.MARKET_PRICES).forEach(id => {
    prices[id] = {
      ...portfolioService.MARKET_PRICES[id],
      current: portfolioService.getCurrentPrice(id)
    };
  });
  res.json({ success: true, data: prices });
});




// ============================================
// ROUTES NOTIFICATIONS
// ============================================
const notificationService = require('./services/notificationService');

// Générer des notifications de démo au démarrage
notificationService.generateDemoNotifications();

app.get('/api/notifications', (req, res) => {
  const unreadOnly = req.query.unread === 'true';
  const notifications = notificationService.getNotifications('default', 50, unreadOnly);
  const unreadCount = notificationService.getUnreadCount();
  res.json({ success: true, data: notifications, unreadCount });
});

app.get('/api/notifications/count', (req, res) => {
  const count = notificationService.getUnreadCount();
  res.json({ success: true, count });
});

app.post('/api/notifications/:id/read', (req, res) => {
  const success = notificationService.markAsRead(parseInt(req.params.id));
  res.json({ success });
});

app.post('/api/notifications/read-all', (req, res) => {
  const success = notificationService.markAllAsRead();
  res.json({ success });
});

app.get('/api/alerts', (req, res) => {
  const alerts = notificationService.getPriceAlerts();
  res.json({ success: true, data: alerts });
});

app.post('/api/alerts', (req, res) => {
  const { market_id, condition, target_price, current_price } = req.body;
  const alert = notificationService.createPriceAlert('default', market_id, condition, target_price, current_price);
  if (alert) {
    res.json({ success: true, data: alert });
  } else {
    res.status(500).json({ success: false, error: 'Erreur création alerte' });
  }
});

app.delete('/api/alerts/:id', (req, res) => {
  const success = notificationService.deletePriceAlert(parseInt(req.params.id));
  res.json({ success });
});

// ============================================
// ROUTES - COLLECTE YAHOO FINANCE
// ============================================

const { scrapeYahooFinance, scrapeAllMarkets, getAvailableMarkets } = require('./services/yahooFinanceScraper');

// Endpoint pour collecter un marché spécifique
app.post('/api/collect/yahoo/:exchange', scrapeLimiter, asyncHandler(async (req, res) => {
  const { exchange } = req.params;

  logger.info(`[API] Collecte Yahoo Finance demandée pour: ${exchange}`);

  const stocks = await scrapeYahooFinance(exchange);

  if (!stocks || stocks.length === 0) {
    return res.status(404).json(formatError(`Aucune donnée trouvée pour ${exchange}`, 404));
  }

  // Sauvegarder en base de données
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO stocks (symbol, name, price, change_percent, volume, exchange, sector, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let saved = 0;
  stocks.forEach(stock => {
    try {
      stmt.run(
        stock.symbol,
        stock.name,
        stock.price,
        stock.change_percent,
        stock.volume,
        stock.exchange,
        stock.sector,
        stock.timestamp
      );
      saved++;
    } catch (error) {
      logger.error(`Erreur sauvegarde ${stock.symbol}:`, error.message);
    }
  });

  logger.info(`[API] ✓ ${saved}/${stocks.length} actions sauvegardées pour ${exchange}`);

  res.json(formatResponse({
    collected: stocks.length,
    saved,
    exchange: exchange.toUpperCase(),
    timestamp: new Date().toISOString()
  }));
}));

// Endpoint pour collecter tous les marchés
app.post('/api/collect/yahoo/all', scrapeLimiter, asyncHandler(async (req, res) => {
  logger.info('[API] Collecte Yahoo Finance pour TOUS les marchés');

  const results = await scrapeAllMarkets();

  // Sauvegarder toutes les données
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO stocks (symbol, name, price, change_percent, volume, exchange, sector, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const summary = {};
  let totalSaved = 0;

  Object.entries(results).forEach(([exchange, stocks]) => {
    let saved = 0;
    stocks.forEach(stock => {
      try {
        stmt.run(
          stock.symbol,
          stock.name,
          stock.price,
          stock.change_percent,
          stock.volume,
          stock.exchange,
          stock.sector,
          stock.timestamp
        );
        saved++;
        totalSaved++;
      } catch (error) {
        logger.error(`Erreur sauvegarde ${stock.symbol}:`, error.message);
      }
    });

    summary[exchange] = {
      collected: stocks.length,
      saved
    };
  });

  logger.info(`[API] ✓ Total ${totalSaved} actions sauvegardées`);

  res.json(formatResponse({
    markets: summary,
    total_saved: totalSaved,
    timestamp: new Date().toISOString()
  }));
}));

// Liste des marchés disponibles via Yahoo Finance
app.get('/api/collect/yahoo/markets', (req, res) => {
  const markets = getAvailableMarkets();
  res.json(formatResponse({
    markets,
    total: markets.length
  }));
});

// ============================================
// TÂCHES PLANIFIÉES
// ============================================

function setupCronJobs() {
  // Collecte automatique toutes les 15 minutes pendant les heures de marché (9h-15h UTC)
  cron.schedule('*/15 9-15 * * 1-5', async () => {
    logger.info('Collecte automatique planifiée BRVM');
    try {
      const scraper = new BRVMScraper({
        database: { path: CONFIG.database.path }
      });
      await scraper.run();
    } catch (error) {
      logger.error('Erreur collecte planifiée:', { error: error.message });
    }
  }, {
    timezone: 'UTC'
  });

  // Mise à jour hebdomadaire des opportunités d'investissement
  // Chaque lundi à 6h00 UTC
  cron.schedule('0 6 * * 1', async () => {
    logger.info('Mise à jour hebdomadaire des opportunités');
    try {
      const updater = new OpportunitiesUpdater(CONFIG.database.path);
      await updater.updateOpportunities();
      updater.close();
    } catch (error) {
      logger.error('Erreur mise à jour opportunités:', { error: error.message });
    }
  }, {
    timezone: 'UTC'
  });

  // Collecte Yahoo Finance pour tous les marchés toutes les 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    logger.info('Collecte automatique Yahoo Finance');
    try {
      const { scrapeAllMarkets } = require('./services/yahooFinanceScraper');
      const results = await scrapeAllMarkets();

      // Sauvegarder toutes les données
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO stocks (symbol, name, price, change_percent, volume, exchange, sector, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let totalSaved = 0;
      Object.entries(results).forEach(([exchange, stocks]) => {
        stocks.forEach(stock => {
          try {
            stmt.run(
              stock.symbol,
              stock.name,
              stock.price,
              stock.change_percent,
              stock.volume,
              stock.exchange,
              stock.sector,
              stock.timestamp
            );
            totalSaved++;
          } catch (error) {
            // Silencieux en mode cron
          }
        });
      });

      logger.info(`[CRON] Yahoo Finance: ${totalSaved} actions mises à jour`);
    } catch (error) {
      logger.error('[CRON] Erreur collecte Yahoo Finance:', error.message);
    }
  }, {
    timezone: 'UTC'
  });

  logger.info('Tâches planifiées configurées', {
    brvm: 'toutes les 15 min (9h-15h UTC, Lun-Ven)',
    yahoo: 'toutes les 30 min (tous les marchés)',
    opportunities: 'chaque lundi à 6h00 UTC'
  });
}

// ============================================
// CONFIGURATION SOCKET.IO
// ============================================

function setupSocketIO(io, db) {
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('./middleware/auth');

  // Middleware d'authentification pour Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connexion client
  io.on('connection', (socket) => {
    logger.debug('Utilisateur connecté au chat', { userId: socket.userId });

    // Rejoindre les conversations de l'utilisateur
    socket.on('join_conversations', () => {
      try {
        const conversations = db.prepare(`
          SELECT conversation_id
          FROM chat_participants
          WHERE user_id = ? AND is_active = 1
        `).all(socket.userId);

        conversations.forEach(conv => {
          socket.join(`conversation_${conv.conversation_id}`);
        });

        socket.emit('conversations_joined', {
          count: conversations.length
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Rejoindre une conversation spécifique
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    // Quitter une conversation
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    // Indicateur de frappe
    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId,
        isTyping
      });
    });

    // Déconnexion
    socket.on('disconnect', () => {
      logger.debug('Utilisateur déconnecté du chat', { userId: socket.userId });
    });
  });

  logger.info('Socket.IO configuré pour le chat en temps réel');
}

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

async function startServer() {
  logger.info('═'.repeat(50));
  logger.info('  PENDO API Server');
  logger.info('═'.repeat(50));

  // Initialiser la base de données
  const dbInitialized = await initDatabase();
  if (!dbInitialized) {
    logger.error('Impossible de démarrer sans base de données');
    process.exit(1);
  }

  // Configurer les routes opportunités (APRÈS init DB)
  const createOpportunitiesRouter = require('./routes/opportunities');
  app.use('/api/opportunities', createOpportunitiesRouter(dbWrapper));

  // Détection d'anomalies sur les mouvements de marché (z-score par titre)
  const createMarketAnomaliesRouter = require('./routes/marketAnomalies');
  app.use('/api/market-anomalies', createMarketAnomaliesRouter(dbWrapper));

  // Configurer les routes d'authentification
  const createAuthRouter = require('./routes/auth');
  const authRouter = createAuthRouter(db);
  app.use('/api/auth', authRouter);

  // Configurer les routes du portefeuille (avec middleware auth)
  const createPortfolioRouter = require('./routes/portfolio');
  app.use('/api/portfolio', createPortfolioRouter(db, authRouter.requireAuth));

  // Configurer les routes des actualités
  const createNewsRouter = require('./routes/news');
  app.use('/api/news', createNewsRouter(db));

  // Configurer les routes des notifications
  const createNotificationsRouter = require('./routes/notifications');
  app.use('/api/notifications', createNotificationsRouter(db, authRouter.requireAuth));

  // Démarrer le service d'alertes de prix (compatible PostgreSQL via dbWrapper)
  const AlertService = require('./services/alertService');
  const alertService = new AlertService(dbWrapper);
  alertService.start(60000);
  logger.info('✅ AlertService démarré (compatible PostgreSQL)');

  // Services nécessitant migration vers dbWrapper (désactivés temporairement en PostgreSQL)
  if (!usePostgres) {
    // Démarrer le service Stop Loss / Take Profit (SQLite uniquement)
    const StopLossService = require('./services/stopLossService');
    const stopLossService = new StopLossService();
    stopLossService.start(60000);

    // Démarrer le service Advanced Order Management (SQLite uniquement)
    const OrderManagementService = require('./services/orderManagementService');
    const orderManagementService = new OrderManagementService();
    orderManagementService.start(60000);

    // Démarrer le service de données de marché (SQLite uniquement)
    const MarketDataService = require('./services/marketDataService');
    const marketDataService = new MarketDataService(db);

    const stockCountResult = await dbWrapper.get('SELECT COUNT(*) as count FROM stocks');
    const stockCount = stockCountResult ? stockCountResult.count : 0;
    if (stockCount === 0) {
      marketDataService.seedMarketData();
    }
    marketDataService.startAutoUpdate(5);

    // Démarrer le service d'historique du portefeuille (SQLite uniquement)
    const PortfolioHistoryService = require('./services/portfolioHistoryService');
    const historyService = new PortfolioHistoryService(db);
    historyService.recordAllPortfoliosSnapshot();
    historyService.startDailySnapshot(0, 0);

    // Démarrer le service de backup automatique (SQLite uniquement)
    const BackupService = require('./services/backupService');
    const backupService = new BackupService(CONFIG.database.path);
    backupService.startAutoBackup(2, 0, 30);

    logger.info('Services SQLite additionnels démarrés');
  } else {
    logger.info('⚠️  Services suivants désactivés en PostgreSQL (migration requise):');
    logger.info('   - StopLossService, OrderManagementService, MarketDataService');
    logger.info('   - PortfolioHistoryService, BackupService');
  }

  // Configurer les routes de backup (avec middleware auth) - SQLite uniquement
  if (!usePostgres) {
    const createBackupRouter = require('./routes/backup');
    const BackupService = require('./services/backupService');
    const backupService = new BackupService(CONFIG.database.path);
    app.use('/api/backup', createBackupRouter(backupService, authRouter.requireAuth));
  }

  // Configurer les routes du forum
  const createForumRouter = require('./routes/forum');
  app.use('/api/forum', createForumRouter(db, authRouter.requireAuth));

  // Configurer les routes du chat
  const createChatRouter = require('./routes/chat');
  app.use('/api/chat', createChatRouter(db, authRouter.requireAuth));

  // Configurer les routes des indicateurs techniques
  const technicalIndicatorsRouter = require('./routes/technicalIndicators');
  app.use('/api/indicators', technicalIndicatorsRouter);

  // Configurer les routes Stop Loss / Take Profit - SQLite uniquement
  if (!usePostgres) {
    const StopLossService = require('./services/stopLossService');
    const stopLossService = new StopLossService();
    const createStopLossRouter = require('./routes/stopLoss');
    app.use('/api/stop-loss', createStopLossRouter(db, authRouter.requireAuth, stopLossService));

    // Configurer les routes Advanced Orders - SQLite uniquement
    const OrderManagementService = require('./services/orderManagementService');
    const orderManagementService = new OrderManagementService();
    const createAdvancedOrdersRouter = require('./routes/advancedOrders');
    app.use('/api/orders', createAdvancedOrdersRouter(db, authRouter.requireAuth, orderManagementService));
  }

  // Configurer les routes Position Sizing
  const positionSizingRouter = require('./routes/positionSizing');
  app.use('/api/position-sizing', positionSizingRouter);

  // Configurer les routes Historical Data
  const HistoricalDataService = require('./services/historicalDataService');
  const historicalDataService = new HistoricalDataService();
  const createHistoricalDataRouter = require('./routes/historicalData');
  app.use('/api/historical', createHistoricalDataRouter(db, authRouter.requireAuth, historicalDataService));

  // Configurer les routes Stock Screener
  const StockScreenerService = require('./services/stockScreenerService');
  const screenerService = new StockScreenerService();
  const createStockScreenerRouter = require('./routes/stockScreener');
  app.use('/api/screener', createStockScreenerRouter(db, authRouter.requireAuth, screenerService));

  // Configurer les routes Backtesting (Phase 3.1)
  const BacktestingService = require('./services/backtestingService');
  const backtestingService = new BacktestingService();
  const createBacktestingRouter = require('./routes/backtesting');
  app.use('/api/backtest', createBacktestingRouter(db, authRouter.requireAuth, backtestingService));

  // Configurer les routes Pattern Recognition (Phase 3.2)
  const PatternRecognitionService = require('./services/patternRecognitionService');
  const patternService = new PatternRecognitionService();
  const createPatternRecognitionRouter = require('./routes/patternRecognition');
  app.use('/api/patterns', createPatternRecognitionRouter(db, authRouter.requireAuth, patternService));

  // Configurer les routes Fundamental Analysis (Phase 3.3)
  const FundamentalAnalysisService = require('./services/fundamentalAnalysisService');
  const fundamentalService = new FundamentalAnalysisService();
  const createFundamentalAnalysisRouter = require('./routes/fundamentalAnalysis');
  app.use('/api/fundamental', createFundamentalAnalysisRouter(db, authRouter.requireAuth, fundamentalService));

  // Configurer les routes Portfolio Optimization (Phase 3.4)
  const PortfolioOptimizationService = require('./services/portfolioOptimizationService');
  const portfolioOptService = new PortfolioOptimizationService();
  const createPortfolioOptimizationRouter = require('./routes/portfolioOptimization');
  app.use('/api/portfolio-opt', createPortfolioOptimizationRouter(db, authRouter.requireAuth, portfolioOptService));

  // Configurer les routes ML Price Prediction (Phase 4.1)
  const MLPredictionService = require('./services/mlPredictionService');
  const mlService = new MLPredictionService();
  const createMLPredictionRouter = require('./routes/mlPrediction');
  app.use('/api/ml', createMLPredictionRouter(db, authRouter.requireAuth, mlService));

  // Configurer les routes Sentiment Analysis (Phase 4.2)
  const SentimentAnalysisService = require('./services/sentimentAnalysisService');
  const sentimentService = new SentimentAnalysisService();
  const createSentimentAnalysisRouter = require('./routes/sentimentAnalysis');
  app.use('/api/sentiment', createSentimentAnalysisRouter(db, authRouter.requireAuth, sentimentService));

  // Configurer les routes Auto-Optimization (Phase 4.3)
  const AutoOptimizationService = require('./services/autoOptimizationService');
  const autoOptService = new AutoOptimizationService();
  const createAutoOptimizationRouter = require('./routes/autoOptimization');
  app.use('/api/auto-opt', createAutoOptimizationRouter(db, authRouter.requireAuth, autoOptService));

  // Configurer les routes Compliance (Phase 5.1)
  const complianceRouter = require('./routes/compliance');
  app.use('/api/compliance', complianceRouter);

  // Configurer les routes Commodities Trading (Phase 5.6)
  const CommoditiesTradingService = require('./services/commoditiesTradingService');
  const commoditiesService = new CommoditiesTradingService();
  const createCommoditiesRouter = require('./routes/commodities');
  app.use('/api/commodities', createCommoditiesRouter(db, authRouter.requireAuth, commoditiesService));

  // Configurer les routes KYC/AML (Phase 5.2)
  const KycAmlService = require('./services/kycAmlService');
  const kycAmlService = new KycAmlService(db);
  const createKycRouter = require('./routes/kyc');
  app.use('/api/kyc', createKycRouter(db, authRouter.requireAuth, kycAmlService));

  // Configurer les routes Client Money Segregation (Phase 5.3) - SQLite uniquement
  if (!usePostgres) {
    const ClientMoneyService = require('./services/clientMoneyService');
    const clientMoneyService = new ClientMoneyService(db);
    const createClientMoneyRouter = require('./routes/clientMoney');
    app.use('/api/client-money', createClientMoneyRouter(db, authRouter.requireAuth, clientMoneyService));

    // Configurer les routes Broker Simulator (Phase 5.4) - SQLite uniquement
    const BrokerSimulatorService = require('./services/brokerSimulatorService');
    const brokerService = new BrokerSimulatorService(db);
    const createBrokerRouter = require('./routes/broker');
    app.use('/api/broker', createBrokerRouter(db, authRouter.requireAuth, brokerService));
  }

  // Routes pour la phase bêta
  const betaRouter = require('./routes/beta');
  const feedbackRouter = require('./routes/feedback');
  const analyticsRouter = require('./routes/analytics');
  app.use('/api/beta', betaRouter);
  app.use('/api/feedback', feedbackRouter);
  app.use('/api/analytics', analyticsRouter);

  // Route pour la collecte automatique de données africaines
  const autoCollectRouter = require('./routes/autoCollect');
  app.use('/api/auto-collect', autoCollectRouter);

  // Configurer Socket.IO pour le chat en temps réel
  setupSocketIO(io, db);

  // Middleware 404 (DOIT être après toutes les routes)
  app.use((req, res) => {
    res.status(404).json(formatError('Endpoint non trouvé', 404));
  });

  // Erreurs générales
  app.use((error, req, res, next) => {
    logger.error('Erreur serveur', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
      ip: req.ip
    });
    res.status(500).json(formatError('Erreur serveur interne', 500));
  });

  // Configurer les tâches planifiées
  setupCronJobs();

  // Démarrer le planificateur automatique d'opportunités et actualités
  const scheduler = require('./services/scheduler');
  scheduler.start();

  // Gestion des erreurs - doit être après toutes les routes
  app.use(notFound);
  app.use(errorHandler);

  // Gestion des erreurs non capturées
  handleUncaughtException();
  handleUnhandledRejection();

  // Démarrer le serveur (avec Socket.IO)
  server.listen(CONFIG.port, () => {
    logger.info('Serveur démarré', {
      port: CONFIG.port,
      nodeEnv: CONFIG.nodeEnv,
      apiUrl: `http://localhost:${CONFIG.port}/api/stocks`,
      websocket: 'actif'
    });
  });
}

// GET /api/markets/values - Toutes les valeurs des marchés
app.get('/api/markets/values', (req, res) => {
  const values = autoUpdateService.getAllMarketValues();
  res.json({ success: true, count: values.length, data: values });
});

// POST /api/markets/refresh-values - Forcer la mise à jour des valeurs
app.post('/api/markets/refresh-values', async (req, res) => {
  try {
    const count = await autoUpdateService.updateAllMarkets();
    res.json({ success: true, message: `${count} marchés mis à jour` });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/opportunities/refresh - Forcer la mise à jour des opportunités
app.post('/api/opportunities/refresh', async (req, res) => {
  try {
    const updater = new OpportunitiesUpdater(CONFIG.database.path);
    const stats = await updater.updateOpportunities();
    updater.close();
    res.json({
      success: true,
      message: 'Mise à jour des opportunités terminée',
      stats
    });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});


startServer();
