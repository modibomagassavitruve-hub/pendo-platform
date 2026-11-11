/**
 * Web Scraper pour les marchés africains
 * Récupère les données historiques depuis les sites officiels
 */

const https = require('https');
const http = require('http');

// Configuration des sources pour chaque marché
const SCRAPING_SOURCES = {
  // Botswana Stock Exchange
  bse_bw: {
    name: 'Botswana BSE',
    url: 'https://www.bse.co.bw',
    indexUrl: 'https://www.bse.co.bw/indices/domestic-indices/',
    currency: 'BWP',
    parseMethod: 'bse'
  },
  
  // Dar es Salaam Stock Exchange (Tanzania)
  dse: {
    name: 'Tanzania DSE',
    url: 'https://www.dse.co.tz',
    indexUrl: 'https://www.dse.co.tz/market-statistics',
    currency: 'TZS',
    parseMethod: 'dse'
  },
  
  // Uganda Securities Exchange
  use: {
    name: 'Uganda USE',
    url: 'https://www.use.or.ug',
    indexUrl: 'https://www.use.or.ug/market-statistics',
    currency: 'UGX',
    parseMethod: 'use'
  },
  
  // Lusaka Securities Exchange (Zambia)
  luse: {
    name: 'Zambia LuSE',
    url: 'https://www.luse.co.zm',
    indexUrl: 'https://www.luse.co.zm/market-information/',
    currency: 'ZMW',
    parseMethod: 'luse'
  },
  
  // Zimbabwe Stock Exchange
  zse: {
    name: 'Zimbabwe ZSE',
    url: 'https://www.zse.co.zw',
    indexUrl: 'https://www.zse.co.zw/market-data/',
    currency: 'ZWL',
    parseMethod: 'zse'
  },
  
  // Stock Exchange of Mauritius
  sem: {
    name: 'Mauritius SEMDEX',
    url: 'https://www.stockexchangeofmauritius.com',
    indexUrl: 'https://www.stockexchangeofmauritius.com/market-statistics',
    currency: 'MUR',
    parseMethod: 'sem'
  },
  semdex: {
    name: 'Mauritius SEMDEX',
    url: 'https://www.stockexchangeofmauritius.com',
    indexUrl: 'https://www.stockexchangeofmauritius.com/market-statistics',
    currency: 'MUR',
    parseMethod: 'sem'
  },
  
  // Bourse de Tunis
  tunindex: {
    name: 'Tunisia TUNINDEX',
    url: 'https://www.bvmt.com.tn',
    indexUrl: 'https://www.bvmt.com.tn/en/market-data',
    currency: 'TND',
    parseMethod: 'bvmt'
  },
  bvmt: {
    name: 'Tunisia BVMT',
    url: 'https://www.bvmt.com.tn',
    indexUrl: 'https://www.bvmt.com.tn/en/market-data',
    currency: 'TND',
    parseMethod: 'bvmt'
  },
  
  // Algiers Stock Exchange
  alsi: {
    name: 'Algeria SGBV',
    url: 'https://www.sgbv.dz',
    indexUrl: 'https://www.sgbv.dz/?page=indices',
    currency: 'DZD',
    parseMethod: 'sgbv'
  },
  
  // Malawi Stock Exchange
  mse: {
    name: 'Malawi MSE',
    url: 'https://www.mse.co.mw',
    indexUrl: 'https://www.mse.co.mw/market-data/',
    currency: 'MWK',
    parseMethod: 'mse'
  },
  
  // Rwanda Stock Exchange
  rse: {
    name: 'Rwanda RSE',
    url: 'https://www.rse.rw',
    indexUrl: 'https://www.rse.rw/market-data/',
    currency: 'RWF',
    parseMethod: 'rse'
  },
  
  // Bolsa de Valores de Moçambique
  bvm: {
    name: 'Mozambique BVM',
    url: 'https://www.bvm.co.mz',
    indexUrl: 'https://www.bvm.co.mz/index.php/mercado',
    currency: 'MZN',
    parseMethod: 'bvm'
  },
  
  // Namibian Stock Exchange
  nsx: {
    name: 'Namibia NSX',
    url: 'https://www.nsx.com.na',
    indexUrl: 'https://www.nsx.com.na/index.php/market-data',
    currency: 'NAD',
    parseMethod: 'nsx'
  },
  
  // Seychelles Securities Exchange (inactive)
  sse: {
    name: 'Seychelles SSE',
    url: 'https://www.trop-x.sc',
    currency: 'SCR',
    parseMethod: 'sse'
  },
  
  // Bourse de Douala (Cameroon)
  dsx: {
    name: 'Cameroon DSX',
    url: 'https://www.douala-stock-exchange.com',
    currency: 'XAF',
    parseMethod: 'dsx'
  },
  
  // BVMAC (Central Africa)
  bvmac: {
    name: 'BVMAC',
    url: 'https://www.bfrm-cemac.org',
    currency: 'XAF',
    parseMethod: 'bvmac'
  },
  
  // Libyan Stock Market
  lsm: {
    name: 'Libya LSM',
    url: 'https://www.lsm.ly',
    currency: 'LYD',
    parseMethod: 'lsm'
  },
  
  // Khartoum Stock Exchange (Sudan)
  kse: {
    name: 'Sudan KSE',
    url: 'https://www.kse.com.sd',
    currency: 'SDG',
    parseMethod: 'kse'
  },
  
  // Cape Verde Stock Exchange
  bvc: {
    name: 'Cape Verde BVC',
    url: 'https://www.bvc.cv',
    currency: 'CVE',
    parseMethod: 'bvc'
  },
  
  // Eswatini (Swaziland) Stock Exchange
  sse_sz: {
    name: 'Eswatini SSX',
    url: 'https://www.ssx.org.sz',
    currency: 'SZL',
    parseMethod: 'ssx'
  },
  
  // Somali Stock Exchange
  somse: {
    name: 'Somalia SOMSE',
    url: null,
    currency: 'SOS',
    parseMethod: 'somse'
  },
};

// Fonction HTTP/HTTPS générique
function fetchUrl(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout
    }, (res) => {
      // Gérer les redirections
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// Scraper pour African Markets (afx.kwayisi.org) - source fiable
async function scrapeAfricanMarkets(marketId) {
  const afxMapping = {
    'bse_bw': 'bse',
    'dse': 'dse',
    'use': 'use',
    'luse': 'luse',
    'zse': 'zse',
    'sem': 'sem',
    'semdex': 'sem',
    'tunindex': 'bvmt',
    'bvmt': 'bvmt',
    'mse': 'mse',
    'rse': 'rse',
    'nsx': 'nsx',
    'bvm': 'bvm',
  };
  
  const afxId = afxMapping[marketId];
  if (!afxId) return null;
  
  try {
    const url = `https://afx.kwayisi.org/ngn/${afxId}/`;
    console.log(`[Scraper] Fetching AFX: ${url}`);
    
    const response = await fetchUrl(url);
    if (response.status !== 200) return null;
    
    const html = response.data;
    
    // Extraire les données du tableau
    const data = [];
    
    // Pattern pour extraire les lignes du tableau historique
    const tableMatch = html.match(/<table[^>]*class="[^"]*hist[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      if (rows) {
        for (const row of rows.slice(1)) { // Skip header
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
          if (cells && cells.length >= 5) {
            const date = cells[0].replace(/<[^>]+>/g, '').trim();
            const close = parseFloat(cells[1].replace(/<[^>]+>/g, '').replace(/,/g, ''));
            const change = parseFloat(cells[2].replace(/<[^>]+>/g, '').replace(/[%,]/g, ''));
            
            if (date && !isNaN(close)) {
              data.push({
                timestamp: new Date(date).getTime(),
                date: date,
                open: close,
                high: close * (1 + Math.abs(change) / 200),
                low: close * (1 - Math.abs(change) / 200),
                close: close,
                volume: 0
              });
            }
          }
        }
      }
    }
    
    // Pattern alternatif: chercher dans les scripts JavaScript
    if (data.length === 0) {
      const chartMatch = html.match(/var\s+chart_data\s*=\s*(\[[\s\S]*?\]);/);
      if (chartMatch) {
        try {
          const chartData = JSON.parse(chartMatch[1]);
          for (const item of chartData) {
            data.push({
              timestamp: new Date(item[0]).getTime(),
              date: item[0],
              open: item[1],
              high: item[1] * 1.01,
              low: item[1] * 0.99,
              close: item[1],
              volume: 0
            });
          }
        } catch (e) {}
      }
    }
    
    if (data.length > 0) {
      console.log(`[Scraper] AFX got ${data.length} points for ${marketId}`);
      return data.sort((a, b) => a.timestamp - b.timestamp);
    }
  } catch (e) {
    console.error(`[Scraper] AFX error for ${marketId}:`, e.message);
  }
  
  return null;
}

// Scraper pour Investing.com
async function scrapeInvesting(marketId) {
  const investingIds = {
    'bse_bw': '101481',
    'dse': '101492',
    'use': '101493',
    'luse': '101494',
    'zse': '101495',
    'sem': '101488',
    'semdex': '101488',
    'tunindex': '101477',
    'bvmt': '101477',
    'mse': '101496',
    'rse': '101497',
    'nsx': '101486',
    'bvm': '101498',
    'alsi': '101499',
  };
  
  const id = investingIds[marketId];
  if (!id) return null;
  
  try {
    const url = `https://api.investing.com/api/financialdata/${id}/historical/chart/?period=P1M&interval=P1D&pointscount=60`;
    console.log(`[Scraper] Fetching Investing: ${marketId}`);
    
    const response = await fetchUrl(url);
    if (response.status === 200) {
      const json = JSON.parse(response.data);
      if (json.data && json.data.length > 0) {
        const data = json.data.map(item => ({
          timestamp: item[0],
          date: new Date(item[0]).toISOString(),
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
          volume: item[5] || 0
        }));
        console.log(`[Scraper] Investing got ${data.length} points for ${marketId}`);
        return data;
      }
    }
  } catch (e) {
    console.error(`[Scraper] Investing error for ${marketId}:`, e.message);
  }
  
  return null;
}

// Scraper pour Trading Economics
async function scrapeTradingEconomics(marketId) {
  const teSymbols = {
    'bse_bw': 'botswana',
    'dse': 'tanzania',
    'use': 'uganda',
    'luse': 'zambia',
    'zse': 'zimbabwe',
    'sem': 'mauritius',
    'semdex': 'mauritius',
    'tunindex': 'tunisia',
    'bvmt': 'tunisia',
    'mse': 'malawi',
    'rse': 'rwanda',
    'nsx': 'namibia',
    'bvm': 'mozambique',
    'alsi': 'algeria',
  };
  
  const country = teSymbols[marketId];
  if (!country) return null;
  
  try {
    const url = `https://tradingeconomics.com/${country}/stock-market`;
    console.log(`[Scraper] Fetching TradingEconomics: ${marketId}`);
    
    const response = await fetchUrl(url);
    if (response.status === 200) {
      // Extraire la valeur actuelle et générer un historique approximatif
      const valueMatch = response.data.match(/<span[^>]*id="p"[^>]*>([0-9,.]+)<\/span>/);
      if (valueMatch) {
        const currentValue = parseFloat(valueMatch[1].replace(/,/g, ''));
        if (!isNaN(currentValue)) {
          console.log(`[Scraper] TradingEconomics found value: ${currentValue}`);
          return { currentValue, source: 'tradingeconomics' };
        }
      }
    }
  } catch (e) {
    console.error(`[Scraper] TradingEconomics error for ${marketId}:`, e.message);
  }
  
  return null;
}

// Fonction principale de scraping
async function scrapeMarketHistory(marketId, period = '1mo') {
  console.log(`[Scraper] === Scraping ${marketId} ===`);
  
  // 1. Essayer African Markets (afx.kwayisi.org)
  let data = await scrapeAfricanMarkets(marketId);
  if (data && data.length > 1) {
    return { success: true, source: 'African Markets', data };
  }
  
  // 2. Essayer Investing.com
  data = await scrapeInvesting(marketId);
  if (data && data.length > 1) {
    return { success: true, source: 'Investing.com', data };
  }
  
  // 3. Essayer Trading Economics pour au moins la valeur actuelle
  const teData = await scrapeTradingEconomics(marketId);
  if (teData && teData.currentValue) {
    return { success: true, source: 'Trading Economics', currentValue: teData.currentValue };
  }
  
  return { success: false, error: 'Aucune source disponible' };
}

// Exporter les fonctions
module.exports = {
  scrapeMarketHistory,
  scrapeAfricanMarkets,
  scrapeInvesting,
  scrapeTradingEconomics,
  SCRAPING_SOURCES
};
