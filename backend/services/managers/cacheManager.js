const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  dbPath: path.join(__dirname, '../../data/pendo.db'),
  memoryTTL: 5 * 60 * 1000,
  staleTTL: 30 * 60 * 1000,
  maxHistoryDays: 365
};

const memoryCache = new Map();
let db = null;

function initializeDatabase() {
  try {
    const dataDir = path.dirname(CONFIG.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(CONFIG.dbPath);
    db.pragma('journal_mode = WAL');
    db.exec("CREATE TABLE IF NOT EXISTS market_cache (market_id TEXT PRIMARY KEY, data TEXT NOT NULL, source TEXT, fetched_at TEXT NOT NULL, expires_at TEXT NOT NULL);");
    db.exec("CREATE TABLE IF NOT EXISTS market_history (id INTEGER PRIMARY KEY AUTOINCREMENT, market_id TEXT NOT NULL, value REAL, change_percent REAL, volume TEXT, source TEXT, recorded_at TEXT NOT NULL);");
    db.exec("CREATE INDEX IF NOT EXISTS idx_history_market_date ON market_history(market_id, recorded_at);");
    db.exec("CREATE TABLE IF NOT EXISTS collection_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT NOT NULL, completed_at TEXT, markets_fetched INTEGER DEFAULT 0, sources_used TEXT, duration_ms INTEGER, success INTEGER DEFAULT 1);");
    console.log('[Cache] DB OK');
    return true;
  } catch (error) {
    console.error('[Cache] Erreur:', error.message);
    return false;
  }
}

function closeDatabase() {
  if (db) { db.close(); db = null; }
}

function get(marketId) {
  var memEntry = memoryCache.get(marketId);
  if (memEntry && Date.now() < memEntry.expiresAt) return memEntry.data;
  if (!db) return null;
  try {
    var row = db.prepare('SELECT data, fetched_at, expires_at FROM market_cache WHERE market_id = ?').get(marketId);
    if (!row) return null;
    var data = JSON.parse(row.data);
    var expiresAt = new Date(row.expires_at).getTime();
    if (Date.now() <= expiresAt) {
      memoryCache.set(marketId, { data: data, expiresAt: expiresAt });
      return data;
    }
    var staleTTL = new Date(row.fetched_at).getTime() + CONFIG.staleTTL;
    if (Date.now() < staleTTL) {
      data._stale = true;
      return data;
    }
    return null;
  } catch (error) { return null; }
}

function getAll(includeStale) {
  if (includeStale === undefined) includeStale = true;
  if (memoryCache.size > 0) {
    var now = Date.now();
    var results = [];
    memoryCache.forEach(function(entry) {
      if (now < entry.expiresAt) {
        results.push(entry.data);
      } else if (includeStale) {
        var copy = JSON.parse(JSON.stringify(entry.data));
        copy._stale = true;
        results.push(copy);
      }
    });
    if (results.length > 0) return results;
  }
  if (!db) return [];
  try {
    var staleLimit = new Date(Date.now() - CONFIG.staleTTL).toISOString();
    var nowISO = new Date().toISOString();
    var query = includeStale 
      ? db.prepare('SELECT data, expires_at FROM market_cache WHERE fetched_at > ?')
      : db.prepare('SELECT data, expires_at FROM market_cache WHERE expires_at > ?');
    var rows = query.all(includeStale ? staleLimit : nowISO);
    return rows.map(function(row) {
      var data = JSON.parse(row.data);
      if (new Date(row.expires_at).getTime() < Date.now()) {
        data._stale = true;
      }
      return data;
    });
  } catch (error) { return []; }
}

function set(marketId, data, ttlMs) {
  if (!ttlMs) ttlMs = CONFIG.memoryTTL;
  var now = Date.now();
  var expiresAt = now + ttlMs;
  memoryCache.set(marketId, { data: data, expiresAt: expiresAt });
  if (!db) return;
  try {
    db.prepare('INSERT OR REPLACE INTO market_cache (market_id, data, source, fetched_at, expires_at) VALUES (?, ?, ?, ?, ?)').run(marketId, JSON.stringify(data), data.source || 'unknown', new Date(now).toISOString(), new Date(expiresAt).toISOString());
  } catch (error) {}
}

function setMany(markets, ttlMs) {
  if (!ttlMs) ttlMs = CONFIG.memoryTTL;
  if (!markets || markets.length === 0) return;
  var now = Date.now();
  var expiresAt = now + ttlMs;
  var expiresAtISO = new Date(expiresAt).toISOString();
  var fetchedAtISO = new Date(now).toISOString();
  for (var i = 0; i < markets.length; i++) {
    memoryCache.set(markets[i].id, { data: markets[i], expiresAt: expiresAt });
  }
  console.log('[Cache] ' + markets.length + ' marches en memoire');
  if (!db) return;
  try {
    var stmt = db.prepare('INSERT OR REPLACE INTO market_cache (market_id, data, source, fetched_at, expires_at) VALUES (?, ?, ?, ?, ?)');
    var insertMany = db.transaction(function(items) {
      for (var j = 0; j < items.length; j++) {
        stmt.run(items[j].id, JSON.stringify(items[j]), items[j].source || 'unknown', fetchedAtISO, expiresAtISO);
      }
    });
    insertMany(markets);
    console.log('[Cache] ' + markets.length + ' marches SQLite OK');
  } catch (error) { console.error('[Cache] Erreur:', error.message); }
}

function recordHistory(markets) {
  if (!db || !markets || markets.length === 0) return;
  try {
    var stmt = db.prepare('INSERT INTO market_history (market_id, value, change_percent, volume, source, recorded_at) VALUES (?, ?, ?, ?, ?, ?)');
    var now = new Date().toISOString();
    db.transaction(function(items) {
      for (var i = 0; i < items.length; i++) {
        stmt.run(items[i].id, items[i].rawValue || null, items[i].changePercent || null, items[i].volume || null, items[i].source || 'unknown', now);
      }
    })(markets);
  } catch (error) {}
}

function getHistory(marketId, days) {
  if (!days) days = 30;
  if (!db) return [];
  try {
    var since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return db.prepare('SELECT value, change_percent, volume, source, recorded_at FROM market_history WHERE market_id = ? AND recorded_at > ? ORDER BY recorded_at ASC').all(marketId, since);
  } catch (error) { return []; }
}

function recordCollectionStats(stats) {
  if (!db) return;
  try {
    db.prepare('INSERT INTO collection_stats (started_at, completed_at, markets_fetched, sources_used, duration_ms, success) VALUES (?, ?, ?, ?, ?, ?)').run(stats.startedAt, stats.completedAt, stats.marketsFetched, JSON.stringify(stats.sourcesUsed || []), stats.durationMs, stats.success ? 1 : 0);
  } catch (error) {}
}

function cleanup() {
  if (!db) return;
  try {
    var limit = new Date(Date.now() - CONFIG.maxHistoryDays * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('DELETE FROM market_history WHERE recorded_at < ?').run(limit);
    db.exec('VACUUM');
  } catch (error) {}
}

function clearMemory() { memoryCache.clear(); }
function clearAll() { clearMemory(); if (db) db.exec('DELETE FROM market_cache'); }
function has(marketId) { return get(marketId) !== null; }
function remove(marketId) { memoryCache.delete(marketId); if (db) db.prepare('DELETE FROM market_cache WHERE market_id = ?').run(marketId); }
function getStats() { return { memory: { size: memoryCache.size, entries: Array.from(memoryCache.keys()) }, sqlite: { connected: !!db, path: CONFIG.dbPath } }; }

initializeDatabase();
process.on('exit', closeDatabase);
process.on('SIGINT', function() { closeDatabase(); process.exit(0); });
process.on('SIGTERM', function() { closeDatabase(); process.exit(0); });

module.exports = { get: get, getAll: getAll, set: set, setMany: setMany, has: has, remove: remove, recordHistory: recordHistory, getHistory: getHistory, recordCollectionStats: recordCollectionStats, cleanup: cleanup, clearMemory: clearMemory, clearAll: clearAll, getStats: getStats, closeDatabase: closeDatabase, CONFIG: CONFIG };