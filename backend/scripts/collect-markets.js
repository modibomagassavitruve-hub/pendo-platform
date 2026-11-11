#!/usr/bin/env node
/**
 * PENDO Market Data Collector
 * Runs via GitHub Actions cron — fetches real data and stores in Supabase.
 *
 * Sources (16/17 markets covered):
 *   AFX Kwayisi    → JSE, NGX, BRVM, NSE Kenya, GSE, BSE, LuSE, ZSE, USE, MSE
 *   Investing.com  → EGX, MASI, TUNINDEX, SEMDEX
 *   DSE Official   → DSEI (Tanzania) — JSON API
 *   RSE Official   → ALSI (Rwanda) — HTML scrape
 *   Yahoo Finance  → backup for Investing.com markets
 *   (no source)    → NSX Namibia — keeps last known value
 *
 * Usage: node scripts/collect-markets.js
 * Env:   DATABASE_URL (Supabase PostgreSQL)
 */

const axios = require('axios');
const https = require('https');
const { Pool } = require('pg');

// Some African exchange sites have self-signed/expired SSL certs
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

// ── AFX Kwayisi markets (10) ─────────────────────────────────────────
const AFX_MARKETS = {
  jse:    { path: '/jse/',  name: 'JSE All Share' },
  nse_ng: { path: '/ngx/',  name: 'NGX All Share' },
  brvm:   { path: '/brvm/', name: 'BRVM Composite' },
  nse_ke: { path: '/nse/',  name: 'NSE Kenya' },
  gse:    { path: '/gse/',  name: 'GSE Composite' },
  bse:    { path: '/bse/',  name: 'BSE DCI' },
  luse:   { path: '/luse/', name: 'LASI' },
  zse:    { path: '/zse/',  name: 'ZSE All Share' },
  use:    { path: '/use/',  name: 'USE Uganda' },
  mse:    { path: '/mse/',  name: 'MSE Malawi' }
};

// ── Investing.com markets (4) ────────────────────────────────────────
// Scrape the instrument page and extract data-test="instrument-price-last"
const INVESTING_MARKETS = {
  egx:  { url: 'https://www.investing.com/indices/egx30',     name: 'EGX 30' },
  masi: { url: 'https://www.investing.com/indices/masi',      name: 'MASI' },
  bvmt: { url: 'https://www.investing.com/indices/tunindex',  name: 'TUNINDEX' },
  sem:  { url: 'https://www.investing.com/indices/semdex',    name: 'SEMDEX' }
};

// ── Yahoo Finance (backup for Investing.com markets) ─────────────────
const YAHOO_SYMBOLS = {
  egx:  '^CASE30',
  masi: '^MASI',
  bvmt: 'TUNINDEX.TN',
  sem:  '^SEMDEX',
  jse:  '^J203.JO'
};

// ── HTTP helpers ─────────────────────────────────────────────────────
async function httpGet(url, opts = {}) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/json,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      ...opts.headers
    },
    timeout: opts.timeout || 15000,
    maxRedirects: 5,
    responseType: 'text',
    transformResponse: [(data) => data]
  });
  return data;
}

// ── AFX Kwayisi parser ───────────────────────────────────────────────
async function fetchAfx(marketId) {
  const config = AFX_MARKETS[marketId];
  if (!config) return null;

  try {
    const html = await httpGet(`https://afx.kwayisi.org${config.path}`);

    // First styled table: <td>VALUE <span class=hi/lo>(±CHANGE)</span></td>
    const tableMatch = html.match(/<table\s+style[^>]*>([\s\S]*?)<\/table>/);
    if (!tableMatch) return null;

    const tdMatch = tableMatch[0].match(/<td>([\d,]+\.?\d*)\s*<span\s+class=(hi|lo)>\(([+-]?[\d,.]+)\)<\/span>/);
    if (!tdMatch) return null;

    const value = parseFloat(tdMatch[1].replace(/,/g, ''));
    const direction = tdMatch[2]; // 'hi' or 'lo'
    const pointChange = parseFloat(tdMatch[3].replace(/,/g, ''));
    if (!value || value === 0) return null;

    // Calculate % change from points
    const prevValue = value - pointChange;
    const calcPct = prevValue !== 0 ? (pointChange / prevValue) * 100 : 0;

    // Prefer h2 percentage when non-zero (more reliable rounding)
    const h2Match = html.match(/<div class=h2[^>]*>[\s\S]*?<span\s+class=(hi|lo)>[\s\S]*?\(([\d.]+)%?\)<\/span>/);
    let change;
    if (h2Match && parseFloat(h2Match[2]) > 0) {
      change = direction === 'lo' ? -parseFloat(h2Match[2]) : parseFloat(h2Match[2]);
    } else {
      change = direction === 'lo' ? -Math.abs(calcPct) : Math.abs(calcPct);
    }

    return { value, change: parseFloat(change.toFixed(2)), source: 'AFX Kwayisi' };
  } catch (e) {
    console.error(`  ❌ AFX ${marketId}: ${e.message}`);
    return null;
  }
}

// ── Investing.com parser ─────────────────────────────────────────────
async function fetchInvesting(marketId) {
  const config = INVESTING_MARKETS[marketId];
  if (!config) return null;

  try {
    const html = await httpGet(config.url, { timeout: 20000 });

    // Extract: data-test="instrument-price-last">17,514.80</...>
    const priceMatch = html.match(/data-test="instrument-price-last"[^>]*>([\d,.]+)/);
    if (!priceMatch) return null;

    const value = parseFloat(priceMatch[1].replace(/,/g, ''));
    if (!value || value === 0) return null;

    // Extract: data-test="instrument-price-change-percent">(+0.55%)</...>
    let change = 0;
    const chgMatch = html.match(/data-test="instrument-price-change-percent"[^>]*>\(?([+-]?[\d.]+)%?\)?/);
    if (chgMatch) {
      change = parseFloat(chgMatch[1]);
    }

    return { value, change: parseFloat(change.toFixed(2)), source: 'Investing.com' };
  } catch (e) {
    console.error(`  ❌ Investing ${marketId}: ${e.message}`);
    return null;
  }
}

// ── DSE Tanzania parser (official API) ────────────────────────────────
// https://dse.co.tz/get/last/traded/indices?from=YYYY-MM-DD
async function fetchDse() {
  try {
    // Try today and last 5 days (market may be closed)
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const { data } = await axios.get(`https://dse.co.tz/get/last/traded/indices?from=${dateStr}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120', 'Accept': 'application/json' },
        timeout: 12000,
        httpsAgent: insecureAgent
      });
      if (data.success && data.data?.length > 0) {
        const dsei = data.data.find(d => d.Code === 'DSEI');
        if (dsei) {
          const value = parseFloat(dsei.ClosingPrice.replace(/,/g, ''));
          const change = parseFloat(dsei.Change) || 0;
          // Change is in percentage points already
          return { value, change: parseFloat(change.toFixed(2)), source: 'DSE Official' };
        }
      }
    }
    return null;
  } catch (e) {
    console.error(`  ❌ DSE: ${e.message}`);
    return null;
  }
}

// ── RSE Rwanda parser (scrape market-statistics page) ────────────────
// Table row: <td>ALSI</td> <td>189.48</td> <td>189.48</td>
async function fetchRse() {
  try {
    const { data: html } = await axios.get('https://rse.rw/market-statistics', {
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120' },
      timeout: 12000,
      httpsAgent: insecureAgent,
      responseType: 'text',
      transformResponse: [(data) => data]
    });

    // Extract ALSI from table
    const alsiMatch = html.match(/>ALSI<\/td>\s*<td>([\d.]+)<\/td>\s*<td>([\d.]+)<\/td>/);
    if (!alsiMatch) return null;

    const current = parseFloat(alsiMatch[1]);
    const prev = parseFloat(alsiMatch[2]);
    if (!current || current === 0) return null;

    const change = prev !== 0 ? ((current - prev) / prev * 100) : 0;
    return { value: current, change: parseFloat(change.toFixed(2)), source: 'RSE Official' };
  } catch (e) {
    console.error(`  ❌ RSE: ${e.message}`);
    return null;
  }
}

// ── Yahoo Finance fetcher (backup) ───────────────────────────────────
async function fetchYahoo(marketId) {
  const symbol = YAHOO_SYMBOLS[marketId];
  if (!symbol) return null;

  try {
    const raw = await httpGet(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
    );
    const result = JSON.parse(raw)?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    if (!price || price === 0) return null;

    const change = prevClose ? ((price - prevClose) / prevClose * 100) : 0;
    return { value: price, change: parseFloat(change.toFixed(2)), source: 'Yahoo Finance' };
  } catch (e) {
    console.error(`  ❌ Yahoo ${marketId}: ${e.message}`);
    return null;
  }
}

// ── Collect one market with fallback chain ───────────────────────────
async function fetchMarket(marketId) {
  // 1) AFX Kwayisi (fastest, most reliable for African exchanges)
  if (AFX_MARKETS[marketId]) {
    const data = await fetchAfx(marketId);
    if (data) return data;
  }

  // 2) Investing.com
  if (INVESTING_MARKETS[marketId]) {
    const data = await fetchInvesting(marketId);
    if (data) return data;
  }

  // 3) DSE Tanzania (official API)
  if (marketId === 'dse') {
    const data = await fetchDse();
    if (data) return data;
  }

  // 4) RSE Rwanda (official website scrape)
  if (marketId === 'rse') {
    const data = await fetchRse();
    if (data) return data;
  }

  // 5) Yahoo Finance (backup)
  if (YAHOO_SYMBOLS[marketId]) {
    const data = await fetchYahoo(marketId);
    if (data) return data;
  }

  return null;
}

// ── All market IDs to collect ────────────────────────────────────────
const ALL_MARKET_IDS = [
  // AFX Kwayisi (10)
  'jse', 'nse_ng', 'brvm', 'nse_ke', 'gse', 'bse', 'luse', 'zse', 'use', 'mse',
  // Investing.com (4)
  'egx', 'masi', 'bvmt', 'sem',
  // DSE Tanzania (official API), RSE Rwanda (official scrape)
  'dse', 'rse',
  // No live source yet (1) — NSX Namibia keeps last known value
  // 'nsx'
];

// ── Main ─────────────────────────────────────────────────────────────
async function collectAndStore() {
  const connString = process.env.DATABASE_URL;
  if (!connString) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: connString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 10000
  });

  try {
    // Ensure table exists
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

    console.log('📊 Collecting market data...');
    const start = Date.now();
    let success = 0;
    let failed = 0;

    // Fetch all markets in parallel
    const results = await Promise.allSettled(
      ALL_MARKET_IDS.map(async (id) => {
        const data = await fetchMarket(id);
        return { id, data };
      })
    );

    // Insert successful results
    const collected = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(r => r.data !== null);

    for (const { id, data } of collected) {
      try {
        await pool.query(
          `INSERT INTO market_snapshots (market_id, value, change_percent, source) VALUES ($1, $2, $3, $4)`,
          [id, data.value, data.change, data.source]
        );
        console.log(`  ✅ ${id.padEnd(7)}: ${String(data.value).padStart(12)} (${data.change >= 0 ? '+' : ''}${data.change}%) [${data.source}]`);
        success++;
      } catch (e) {
        console.error(`  ❌ Insert ${id}: ${e.message}`);
        failed++;
      }
    }

    // Cleanup old snapshots (keep last 7 days)
    const { rowCount } = await pool.query(
      `DELETE FROM market_snapshots WHERE fetched_at < NOW() - INTERVAL '7 days'`
    );
    if (rowCount > 0) console.log(`  🧹 Cleaned ${rowCount} old snapshots`);

    const elapsed = Date.now() - start;
    console.log(`\n📊 Done in ${elapsed}ms: ${success} saved, ${failed} failed, ${ALL_MARKET_IDS.length - success - failed} skipped`);

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

collectAndStore();
