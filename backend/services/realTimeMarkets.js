/**
 * PENDO Real-Time Market Data Service
 *
 * Architecture:
 * - GitHub Actions cron runs scripts/collect-markets.js every 15min
 * - It fetches from AFX Kwayisi + Yahoo Finance and stores in Supabase
 * - This service reads the latest snapshots from Supabase (PostgreSQL)
 * - Falls back to static baseValues if no snapshot is available
 */

const { mean, standardDeviation } = require('simple-statistics');

// ── Cache en mémoire ────────────────────────────────────────────────────
const cache = {
  data: null,
  timestamp: 0,
  TTL: 5 * 60 * 1000 // 5 minutes
};

// ── Seeded PRNG — stable change when no DB snapshot available ────────────
// Same algorithm as server-complete.js so values are consistent everywhere.
function seededRand(seed) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
function dailySeedChange(marketId) {
  const dayEpoch = Math.floor(Date.now() / 86400000);
  const keySeed = String(marketId).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = seededRand((keySeed * 31337 + dayEpoch) >>> 0);
  // Range -3%..+3%, centred slightly positive (bull bias)
  return parseFloat((rand() * 6 - 2.8).toFixed(2));
}

// ── Config complète des marchés ─────────────────────────────────────────
const MARKET_CONFIG = [
  // baseValues updated 2026-04-04 from real data (fallback when no snapshot)
  { id: 'jse',    name: 'JSE All Share',    country: 'Afrique du Sud', countryCode: 'ZA', currency: 'ZAR', baseValue: 116123,  timezone: 'Africa/Johannesburg', openTime: '09:00', closeTime: '17:00' },
  { id: 'masi',   name: 'MASI',             country: 'Maroc',          countryCode: 'MA', currency: 'MAD', baseValue: 17515,   timezone: 'Africa/Casablanca',    openTime: '09:30', closeTime: '15:30' },
  { id: 'nse_ng', name: 'NGX All Share',    country: 'Nigeria',        countryCode: 'NG', currency: 'NGN', baseValue: 201699,  timezone: 'Africa/Lagos',         openTime: '10:00', closeTime: '14:30' },
  { id: 'egx',    name: 'EGX 30',           country: 'Égypte',         countryCode: 'EG', currency: 'EGP', baseValue: 47276,   timezone: 'Africa/Cairo',         openTime: '10:00', closeTime: '14:30' },
  { id: 'nse_ke', name: 'NSE 20',           country: 'Kenya',          countryCode: 'KE', currency: 'KES', baseValue: 199,     timezone: 'Africa/Nairobi',       openTime: '09:30', closeTime: '15:00' },
  { id: 'brvm',   name: 'BRVM Composite',   country: 'UEMOA',          countryCode: 'CI', currency: 'XOF', baseValue: 410,     timezone: 'Africa/Abidjan',       openTime: '09:00', closeTime: '15:30' },
  { id: 'gse',    name: 'GSE Composite',    country: 'Ghana',          countryCode: 'GH', currency: 'GHS', baseValue: 13041,   timezone: 'Africa/Accra',         openTime: '09:30', closeTime: '15:00' },
  { id: 'bse',    name: 'BSE DCI',          country: 'Botswana',       countryCode: 'BW', currency: 'BWP', baseValue: 11083,   timezone: 'Africa/Gaborone',      openTime: '09:00', closeTime: '15:30' },
  { id: 'luse',   name: 'LASI',             country: 'Zambie',         countryCode: 'ZM', currency: 'ZMW', baseValue: 27295,   timezone: 'Africa/Lusaka',        openTime: '10:00', closeTime: '12:00' },
  { id: 'zse',    name: 'ZSE All Share',    country: 'Zimbabwe',       countryCode: 'ZW', currency: 'ZWG', baseValue: 359,     timezone: 'Africa/Harare',        openTime: '10:00', closeTime: '14:00' },
  { id: 'sem',    name: 'SEMDEX',           country: 'Maurice',        countryCode: 'MU', currency: 'MUR', baseValue: 2487,    timezone: 'Indian/Mauritius',     openTime: '09:00', closeTime: '13:30' },
  { id: 'dse',    name: 'DSEI',             country: 'Tanzanie',       countryCode: 'TZ', currency: 'TZS', baseValue: 3840,    timezone: 'Africa/Dar_es_Salaam', openTime: '10:00', closeTime: '14:00' },
  { id: 'use',    name: 'USE All Share',    country: 'Ouganda',        countryCode: 'UG', currency: 'UGX', baseValue: 1956,    timezone: 'Africa/Kampala',       openTime: '09:30', closeTime: '14:00' },
  { id: 'rse',    name: 'RSE All Share',    country: 'Rwanda',         countryCode: 'RW', currency: 'RWF', baseValue: 189,     timezone: 'Africa/Kigali',        openTime: '09:00', closeTime: '12:00' },
  { id: 'bvmt',   name: 'TUNINDEX',         country: 'Tunisie',        countryCode: 'TN', currency: 'TND', baseValue: 15380,   timezone: 'Africa/Tunis',         openTime: '09:00', closeTime: '14:10' },
  { id: 'nsx',    name: 'NSX Overall',      country: 'Namibie',        countryCode: 'NA', currency: 'NAD', baseValue: 1667,    timezone: 'Africa/Windhoek',      openTime: '09:00', closeTime: '17:00' },
  { id: 'mse',    name: 'MSE All Share',    country: 'Malawi',         countryCode: 'MW', currency: 'MWK', baseValue: 574588,  timezone: 'Africa/Blantyre',      openTime: '10:00', closeTime: '14:00' }
];

// ── Read latest snapshots from Supabase ─────────────────────────────────
async function getLatestSnapshots(pool) {
  if (!pool) return {};

  try {
    // Get the latest snapshot for each market (within last 24h)
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (market_id) market_id, value, change_percent, source, fetched_at
      FROM market_snapshots
      ORDER BY market_id, fetched_at DESC
    `);

    const snapshots = {};
    for (const row of rows) {
      snapshots[row.market_id] = {
        value: parseFloat(row.value),
        change: parseFloat(row.change_percent),
        source: row.source,
        fetchedAt: row.fetched_at
      };
    }
    return snapshots;
  } catch (e) {
    // Table might not exist yet — that's OK
    console.error('market_snapshots query error:', e.message);
    return {};
  }
}

// ── Public API: Get enriched markets ────────────────────────────────────
async function getMarkets(pool) {
  const now = Date.now();

  // Return cached data if fresh
  if (cache.data && (now - cache.timestamp) < cache.TTL) {
    return cache.data;
  }

  // Read latest data from Supabase
  const snapshots = await getLatestSnapshots(pool);
  const snapshotCount = Object.keys(snapshots).length;
  if (snapshotCount > 0) {
    console.log(`📊 Loaded ${snapshotCount} market snapshots from Supabase`);
  }

  const markets = MARKET_CONFIG.map(market => {
    const snap = snapshots[market.id];
    // Pas de donnée collectée : on affiche la valeur de référence SANS inventer de variation
    const data = snap || { value: market.baseValue, change: null, source: 'Valeur de référence (non actualisée)' };
    const hasChange = typeof data.change === 'number' && !isNaN(data.change);
    const isPositive = hasChange ? data.change >= 0 : true;
    // Donnée de plus de 3 jours = périmée
    const stale = !snap || (snap.fetchedAt && (Date.now() - new Date(snap.fetchedAt).getTime()) > 3 * 86400000);

    // Determine market open/close status
    let isOpen = false;
    try {
      const nowLocal = new Date().toLocaleString('en-US', { timeZone: market.timezone });
      const localDate = new Date(nowLocal);
      const day = localDate.getDay();
      const hhmm = localDate.getHours() * 60 + localDate.getMinutes();
      const [oh, om] = market.openTime.split(':').map(Number);
      const [ch, cm] = market.closeTime.split(':').map(Number);
      isOpen = day >= 1 && day <= 5 && hhmm >= (oh * 60 + om) && hhmm <= (ch * 60 + cm);
    } catch { /* isOpen stays false */ }

    return {
      id: market.id,
      code: market.id.toUpperCase(),
      name: market.name,
      country: market.country,
      countryCode: market.countryCode,
      currency: market.currency,
      indexValue: typeof data.value === 'number'
        ? data.value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : String(data.value),
      rawValue: data.value,
      change: hasChange ? `${isPositive ? '+' : ''}${data.change.toFixed(2)}%` : '—',
      changePercent: hasChange ? parseFloat(data.change.toFixed(2)) : null,
      stale,
      positive: isPositive,
      volume: 'N/A',
      marketCap: data.value * 1000000,
      status: isOpen ? 'open' : 'closed',
      openTime: market.openTime,
      closeTime: market.closeTime,
      timezone: market.timezone,
      source: data.source,
      ...(snap?.fetchedAt ? { lastFetched: snap.fetchedAt } : {})
    };
  });

  // Update cache
  cache.data = markets;
  cache.timestamp = now;

  return markets;
}

// ── Historique des change_percent par bourse (pour détection d'anomalies) ──
// Robustesse : requête bornée par une garde-fou de temps ET par un
// statement_timeout PostgreSQL côté session, avec un client explicite
// (pool.connect) systématiquement rendu au pool dans un `finally` — pour
// qu'une requête lente ou bloquée ne puisse jamais épuiser le pool partagé
// (max 5 connexions) et paralyser le reste de l'API.
async function getMarketHistory(pool, days = 14) {
  if (!pool) return {};

  const safeDays = Math.min(Math.max(parseInt(days) || 14, 1), 30);

  const runQuery = async () => {
    const client = await pool.connect();
    try {
      await client.query('SET LOCAL statement_timeout = 5000');
      // safeDays est un entier strictement borné (1-30) ci-dessus — pas de
      // paramètre utilisateur direct ici, donc l'interpolation est sûre.
      // On évite volontairement `$1 * INTERVAL` / `($1 || 'days')::interval`
      // (résolution de type ambiguë selon le driver/version) au profit du
      // littéral INTERVAL 'N days', forme la plus simple et la plus fiable.
      const { rows } = await client.query(
        `SELECT market_id, change_percent, fetched_at
         FROM market_snapshots
         WHERE fetched_at > NOW() - INTERVAL '${safeDays} days'
         ORDER BY market_id, fetched_at DESC
         LIMIT 5000`
      );
      return rows;
    } finally {
      client.release();
    }
  };

  // Garde-fou supplémentaire : si pool.connect() lui-même reste bloqué
  // (pool déjà saturé par ailleurs), on abandonne proprement après 6s au
  // lieu de faire attendre indéfiniment la requête HTTP appelante.
  const timeoutGuard = new Promise((resolve) => setTimeout(() => resolve(null), 6000));

  try {
    const rows = await Promise.race([runQuery(), timeoutGuard]);
    if (!rows) {
      console.error('market_snapshots history query: timeout garde-fou atteint');
      return {};
    }

    const byMarket = {};
    for (const row of rows) {
      if (row.change_percent === null) continue; // variation inconnue : exclue des statistiques
      if (!byMarket[row.market_id]) byMarket[row.market_id] = [];
      byMarket[row.market_id].push({
        change: parseFloat(row.change_percent),
        fetchedAt: row.fetched_at
      });
    }
    return byMarket;
  } catch (e) {
    console.error('market_snapshots history query error:', e.message);
    return {};
  }
}

/**
 * Détecte les mouvements de marché statistiquement anormaux (z-score) par
 * bourse, à partir de l'historique des change_percent dans market_snapshots.
 * Le point le plus récent de chaque bourse est comparé à la distribution de
 * ses points précédents (moyenne/écart-type) — il est exclu de sa propre
 * baseline pour ne pas s'auto-normaliser.
 */
async function getMarketAnomalies(pool, { minHistory = 5, threshold = 2.5, days = 14 } = {}) {
  if (!pool) return [];

  const byMarket = await getMarketHistory(pool, days);
  const results = [];

  for (const market of MARKET_CONFIG) {
    const points = byMarket[market.id];
    if (!points || points.length === 0) continue;

    // points triés fetched_at DESC : le premier est le plus récent
    const [latest, ...historyPoints] = points;
    if (!latest || !isFinite(latest.change)) continue;

    const historyValues = historyPoints
      .map((p) => p.change)
      .filter((v) => v !== null && v !== undefined && isFinite(v));

    let zScore = null;
    let anomaly = false;
    let severity = 'normal';
    let reason = null;

    if (historyValues.length < minHistory) {
      reason = 'insufficient_history';
    } else {
      const historicalMean = mean(historyValues);
      const historicalStd = standardDeviation(historyValues);

      // Epsilon plutôt qu'une égalité stricte à 0 pour éviter qu'un résidu
      // flottant quasi nul ne fasse exploser le z-score par une division
      // par un nombre minuscule.
      if (historicalStd < 1e-6) {
        reason = 'no_variance';
      } else {
        zScore = (latest.change - historicalMean) / historicalStd;
        anomaly = Math.abs(zScore) >= threshold;

        if (Math.abs(zScore) >= 4) severity = 'critical';
        else if (Math.abs(zScore) >= 3) severity = 'high';
        else if (Math.abs(zScore) >= threshold) severity = 'medium';
      }
    }

    results.push({
      stock_id: market.id,
      ticker: market.id.toUpperCase(),
      name: market.name,
      country: market.country,
      change_percent: parseFloat(latest.change.toFixed(2)),
      timestamp: latest.fetchedAt,
      z_score: zScore !== null ? Math.round(zScore * 100) / 100 : null,
      historical_points: historyValues.length,
      anomaly,
      severity,
      reason
    });
  }

  return results.sort((a, b) => {
    const za = a.z_score !== null ? Math.abs(a.z_score) : -1;
    const zb = b.z_score !== null ? Math.abs(b.z_score) : -1;
    return zb - za;
  });
}

module.exports = { getMarkets, MARKET_CONFIG, getMarketAnomalies };
