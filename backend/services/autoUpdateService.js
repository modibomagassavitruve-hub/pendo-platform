/**
 * Service de mise à jour automatique des valeurs des marchés
 * Scrape les sources fiables pour obtenir les vraies valeurs
 */

const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
let db;

try {
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS market_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id TEXT UNIQUE NOT NULL,
      value REAL,
      change_percent REAL,
      volume INTEGER,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      source TEXT
    );
    CREATE TABLE IF NOT EXISTS market_values_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id TEXT NOT NULL,
      value REAL,
      change_percent REAL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Tables market_values prêtes');
} catch(e) {
  console.error('DB Error:', e.message);
}

function httpsGet(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/json,*/*',
      },
      timeout
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// Scraper Trading View (via leur API non-officielle)
async function scrapeTradingView() {
  const symbols = {
    'JSE:J203': 'jse',
    'EGX:EGX30': 'egx', 
    'CSEMA:MASI': 'masi',
    'NGX:NGXASI': 'nse_ng',
    'NSE:NSEI': 'nse_ke',
  };

  const results = {};
  
  for (const [tvSymbol, marketId] of Object.entries(symbols)) {
    try {
      const url = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(tvSymbol)}&type=index`;
      const res = await httpsGet(url);
      if (res.status === 200) {
        const json = JSON.parse(res.data);
        if (json[0]) {
          results[marketId] = {
            symbol: json[0].symbol,
            description: json[0].description
          };
        }
      }
    } catch(e) {
      console.error(`[AutoUpdate] TradingView error for ${marketId}:`, e.message);
    }
  }
  
  return results;
}

// Scraper African Markets (afx.kwayisi.org)
async function scrapeAFX() {
  const markets = {
    'gse': 'https://afx.kwayisi.org/gse/',
    'nse': 'https://afx.kwayisi.org/nse/',
    'jse': 'https://afx.kwayisi.org/jse/',
    'egx': 'https://afx.kwayisi.org/egx/',
    'brvm': 'https://afx.kwayisi.org/brvm/',
  };

  const results = {};

  for (const [marketId, url] of Object.entries(markets)) {
    try {
      console.log(`[AutoUpdate] Scraping AFX: ${marketId}`);
      const res = await httpsGet(url);
      
      if (res.status === 200) {
        // Chercher la valeur de l'indice dans le HTML
        const indexMatch = res.data.match(/<span[^>]*class="[^"]*index[^"]*"[^>]*>([0-9,.]+)<\/span>/i);
        const changeMatch = res.data.match(/<span[^>]*class="[^"]*change[^"]*"[^>]*>([+-]?[0-9,.]+)%?<\/span>/i);
        
        if (indexMatch) {
          results[marketId] = {
            value: parseFloat(indexMatch[1].replace(/,/g, '')),
            change: changeMatch ? parseFloat(changeMatch[1].replace(/,/g, '')) : 0,
            source: 'AFX'
          };
          console.log(`[AutoUpdate] AFX ${marketId}: ${results[marketId].value}`);
        }
      }
    } catch(e) {
      console.error(`[AutoUpdate] AFX error for ${marketId}:`, e.message);
    }
    
    // Pause entre les requêtes
    await new Promise(r => setTimeout(r, 1000));
  }

  return results;
}

// Scraper Investing.com indices africains
async function scrapeInvesting() {
  const indices = {
    'jse': { id: '37434', name: 'JSE All Share' },
    'egx': { id: '51622', name: 'EGX 30' },
    'masi': { id: '51529', name: 'Morocco MASI' },
    'nse_ng': { id: '101459', name: 'Nigeria NGX' },
    'nse_ke': { id: '101453', name: 'Kenya NSE' },
    'brvm': { id: '101495', name: 'BRVM' },
    'gse': { id: '101461', name: 'Ghana GSE' },
    'bse_bw': { id: '101481', name: 'Botswana BSE' },
    'sem': { id: '101488', name: 'Mauritius SEMDEX' },
    'tunindex': { id: '101477', name: 'Tunisia TUNINDEX' },
    'dse': { id: '101492', name: 'Tanzania DSE' },
    'use': { id: '101493', name: 'Uganda USE' },
    'luse': { id: '101494', name: 'Zambia LuSE' },
    'zse': { id: '101495', name: 'Zimbabwe ZSE' },
    'nsx': { id: '101486', name: 'Namibia NSX' },
  };

  const results = {};

  for (const [marketId, info] of Object.entries(indices)) {
    try {
      const url = `https://api.investing.com/api/financialdata/${info.id}/historical/chart/?period=P1D&interval=PT1M&pointscount=1`;
      const res = await httpsGet(url);
      
      if (res.status === 200) {
        const json = JSON.parse(res.data);
        if (json.data && json.data.length > 0) {
          const lastPoint = json.data[json.data.length - 1];
          results[marketId] = {
            value: lastPoint[4], // close price
            change: ((lastPoint[4] - lastPoint[1]) / lastPoint[1] * 100).toFixed(2),
            source: 'Investing.com'
          };
          console.log(`[AutoUpdate] Investing ${marketId}: ${results[marketId].value}`);
        }
      }
    } catch(e) {
      // Silencieux - Investing.com bloque souvent
    }
    
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

// Sauvegarder les valeurs en base
function saveMarketValue(marketId, value, changePercent, source) {
  if (!db || !value) return;
  
  try {
    // Mettre à jour ou insérer la valeur actuelle
    db.prepare(`
      INSERT INTO market_values (market_id, value, change_percent, source, last_updated)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(market_id) DO UPDATE SET
        value = excluded.value,
        change_percent = excluded.change_percent,
        source = excluded.source,
        last_updated = datetime('now')
    `).run(marketId, value, changePercent, source);

    // Ajouter à l'historique
    db.prepare(`
      INSERT INTO market_values_history (market_id, value, change_percent)
      VALUES (?, ?, ?)
    `).run(marketId, value, changePercent);

    console.log(`[AutoUpdate] Saved ${marketId}: ${value} (${changePercent}%)`);
  } catch(e) {
    console.error(`[AutoUpdate] Save error:`, e.message);
  }
}

// Récupérer la dernière valeur d'un marché
function getMarketValue(marketId) {
  if (!db) return null;
  
  try {
    return db.prepare(`
      SELECT * FROM market_values WHERE market_id = ?
    `).get(marketId);
  } catch(e) {
    return null;
  }
}

// Récupérer toutes les valeurs
function getAllMarketValues() {
  if (!db) return [];
  
  try {
    return db.prepare(`SELECT * FROM market_values ORDER BY market_id`).all();
  } catch(e) {
    return [];
  }
}

// Fonction principale de mise à jour
async function updateAllMarkets() {
  console.log('\n[AutoUpdate] === Démarrage mise à jour automatique ===');
  console.log(`[AutoUpdate] ${new Date().toISOString()}`);

  let updated = 0;

  // 1. Essayer Investing.com
  const investingData = await scrapeInvesting();
  for (const [marketId, data] of Object.entries(investingData)) {
    saveMarketValue(marketId, data.value, data.change, data.source);
    updated++;
  }

  // 2. Essayer AFX
  const afxData = await scrapeAFX();
  for (const [marketId, data] of Object.entries(afxData)) {
    if (!investingData[marketId]) { // Ne pas écraser les données Investing
      saveMarketValue(marketId, data.value, data.change, data.source);
      updated++;
    }
  }

  console.log(`[AutoUpdate] === Terminé: ${updated} marchés mis à jour ===\n`);
  return updated;
}

// Planifier les mises à jour automatiques
function scheduleAutoUpdate(intervalMinutes = 15) {
  console.log(`[AutoUpdate] Planification toutes les ${intervalMinutes} minutes`);
  
  // Mise à jour immédiate au démarrage
  updateAllMarkets();
  
  // Puis toutes les X minutes
  setInterval(updateAllMarkets, intervalMinutes * 60 * 1000);
}

module.exports = {
  updateAllMarkets,
  scheduleAutoUpdate,
  getMarketValue,
  getAllMarketValues,
  saveMarketValue
};
