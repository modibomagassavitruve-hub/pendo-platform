/**
 * PENDO Market Data Scraper
 * Service de collecte des données des bourses africaines
 * Version 2.0 - Support de 21 bourses africaines
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { getExchange, getAllExchanges } = require('../config/africanExchanges');

// Configuration des sources
const SOURCES = {
  // Yahoo Finance symbols for African markets
  YAHOO: {
    JSE: '^J203',      // JSE All Share (Afrique du Sud)
    EGX: '^EGX30',     // EGX 30 (Égypte)
    NSE_NG: '^NGSE',   // Nigerian Stock Exchange
    MASI: '^MASI'      // Morocco
  },

  // AFX Kwayisi API
  AFX_API: {
    baseUrl: 'https://dev.kwayisi.org/apis',
    gse: '/gse/live'
  },

  // AFX Kwayisi Web
  AFX_WEB: {
    baseUrl: 'https://afx.kwayisi.org'
  },

  // African Markets
  AFRICAN_MARKETS: {
    baseUrl: 'https://www.african-markets.com/en/stock-markets'
  }
};

// Headers pour simuler un navigateur
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
};

/**
 * Collecte les données depuis Yahoo Finance
 */
async function fetchYahooData(symbol, marketId, marketName, country) {
  try {
    const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
    const response = await axios.get(url, { 
      headers: HEADERS,
      timeout: 10000 
    });
    
    const $ = cheerio.load(response.data);
    
    // Sélecteurs Yahoo Finance (peuvent changer)
    const priceText = $('[data-testid="qsp-price"]').first().text() || 
                      $('fin-streamer[data-field="regularMarketPrice"]').first().text();
    const changeText = $('[data-testid="qsp-price-change"]').first().text() ||
                       $('fin-streamer[data-field="regularMarketChange"]').first().text();
    const changePercentText = $('[data-testid="qsp-price-change-percent"]').first().text() ||
                              $('fin-streamer[data-field="regularMarketChangePercent"]').first().text();
    
    if (!priceText) {
      throw new Error('Prix non trouvé');
    }

    const price = parseFloat(priceText.replace(/,/g, ''));
    const changePercent = parseFloat(changePercentText.replace(/[()%]/g, '')) || 0;
    const positive = changePercent >= 0;

    return {
      id: marketId,
      name: marketName,
      country: country,
      value: price.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
      change: `${positive ? '+' : ''}${changePercent.toFixed(2)}%`,
      positive: positive,
      volume: 'N/A',
      source: 'Yahoo Finance'
    };
  } catch (error) {
    console.log(`⚠️  Yahoo ${marketId}: ${error.message}`);
    return null;
  }
}

/**
 * Collecte les données BRVM (Bourse Régionale des Valeurs Mobilières)
 */
async function fetchBRVMData() {
  try {
    const url = 'https://www.brvm.org/';
    const response = await axios.get(url, { 
      headers: HEADERS,
      timeout: 10000 
    });
    
    const $ = cheerio.load(response.data);
    
    // Chercher l'indice composite (les sélecteurs peuvent varier)
    let indexValue = null;
    let changeValue = null;

    // Essayer différents sélecteurs
    $('table tr, .indice, .index-value').each((i, el) => {
      const text = $(el).text();
      if (text.includes('Composite') || text.includes('BRVM')) {
        const numbers = text.match(/[\d\s]+[,.][\d]+/g);
        if (numbers && numbers.length > 0) {
          indexValue = numbers[0];
        }
      }
    });

    if (indexValue) {
      const value = parseFloat(indexValue.replace(/\s/g, '').replace(',', '.'));
      return {
        id: 'brvm',
        name: 'BRVM Composite',
        country: 'UEMOA (Afrique de l\'Ouest)',
        value: value.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
        change: '+0.00%', // À améliorer avec le vrai changement
        positive: true,
        volume: 'N/A',
        source: 'BRVM Direct'
      };
    }
    
    throw new Error('Données non trouvées');
  } catch (error) {
    console.log(`⚠️  BRVM: ${error.message}`);
    return null;
  }
}

/**
 * Collecte les données NSE Kenya
 */
async function fetchNSEKenyaData() {
  try {
    const url = 'https://www.nse.co.ke/';
    const response = await axios.get(url, { 
      headers: HEADERS,
      timeout: 10000 
    });
    
    const $ = cheerio.load(response.data);
    
    // Chercher NSE 20 Share Index
    let indexValue = null;
    
    $('*').each((i, el) => {
      const text = $(el).text();
      if (text.includes('NSE 20') || text.includes('NASI')) {
        const numbers = text.match(/[\d,]+\.[\d]+/g);
        if (numbers) {
          indexValue = numbers[0];
        }
      }
    });

    if (indexValue) {
      const value = parseFloat(indexValue.replace(/,/g, ''));
      return {
        id: 'nse_ke',
        name: 'NSE 20',
        country: 'Kenya',
        value: value.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
        change: '+0.00%',
        positive: true,
        volume: 'N/A',
        source: 'NSE Kenya'
      };
    }
    
    throw new Error('Données non trouvées');
  } catch (error) {
    console.log(`⚠️  NSE Kenya: ${error.message}`);
    return null;
  }
}

/**
 * Génère des données de fallback réalistes pour toutes les bourses
 */
function generateFallbackData() {
  const baseData = [
    // Bourses originales
    { id: 'jse', name: 'JSE All Share', country: 'Afrique du Sud', baseValue: 78000, volatility: 500 },
    { id: 'nse_ng', name: 'NSE ASI', country: 'Nigeria', baseValue: 98000, volatility: 1000 },
    { id: 'egx', name: 'EGX 30', country: 'Égypte', baseValue: 24500, volatility: 300 },
    { id: 'brvm', name: 'BRVM Composite', country: 'UEMOA', baseValue: 215, volatility: 5 },
    { id: 'nse_ke', name: 'NSE 20', country: 'Kenya', baseValue: 1850, volatility: 50 },
    { id: 'masi', name: 'MASI', country: 'Maroc', baseValue: 13400, volatility: 100 },

    // Nouvelles bourses - Haute priorité
    { id: 'gse', name: 'GSE Composite', country: 'Ghana', baseValue: 3200, volatility: 80 },
    { id: 'bse', name: 'BSE DCI', country: 'Botswana', baseValue: 7800, volatility: 150 },
    { id: 'luse', name: 'LASI', country: 'Zambie', baseValue: 5400, volatility: 120 },
    { id: 'zse', name: 'ZSE All Share', country: 'Zimbabwe', baseValue: 12500, volatility: 500 },
    { id: 'sem', name: 'SEMDEX', country: 'Maurice', baseValue: 2100, volatility: 45 },

    // Nouvelles bourses - Moyenne priorité
    { id: 'dse', name: 'DSE All Share', country: 'Tanzanie', baseValue: 1900, volatility: 40 },
    { id: 'use', name: 'USE All Share', country: 'Ouganda', baseValue: 1450, volatility: 35 },
    { id: 'rse', name: 'RSE All Share', country: 'Rwanda', baseValue: 158, volatility: 5 },
    { id: 'bvmt', name: 'TUNINDEX', country: 'Tunisie', baseValue: 8950, volatility: 180 },

    // Nouvelles bourses - Basse priorité
    { id: 'nsx', name: 'NSX Overall', country: 'Namibie', baseValue: 1650, volatility: 30 },
    { id: 'mse', name: 'MSE All Share', country: 'Malawi', baseValue: 42500, volatility: 850 }
  ];

  return baseData.map(market => {
    const randomChange = (Math.random() - 0.5) * 2 * market.volatility;
    const value = market.baseValue + randomChange;
    const changePercent = ((randomChange / market.baseValue) * 100);
    const positive = changePercent >= 0;

    return {
      id: market.id,
      name: market.name,
      country: market.country,
      value: value.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
      change: `${positive ? '+' : ''}${changePercent.toFixed(2)}%`,
      positive: positive,
      volume: 'N/A',
      source: 'Simulation'
    };
  });
}

/**
 * Collecte les données depuis AFX Kwayisi API (Ghana, etc.)
 */
async function fetchAfxApiData(exchangeId) {
  const exchange = getExchange(exchangeId);
  if (!exchange || !exchange.dataSources.afxApi) return null;

  try {
    const { baseUrl, endpoints } = exchange.dataSources.afxApi;
    const url = `${baseUrl}${endpoints.live}`;

    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 10000
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Aucune donnée retournée');
    }

    // Calculer l'indice composite à partir de toutes les actions
    const indexValue = calculateIndexFromStocks(response.data);
    const changePercent = response.data[0]?.change || 0;
    const positive = changePercent >= 0;

    return {
      id: exchange.id,
      name: exchange.name,
      country: exchange.country,
      value: indexValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
      change: `${positive ? '+' : ''}${changePercent.toFixed(2)}%`,
      positive: positive,
      volume: 'N/A',
      source: 'AFX Kwayisi API'
    };
  } catch (error) {
    console.log(`⚠️  AFX API ${exchangeId}: ${error.message}`);
    return null;
  }
}

/**
 * Collecte les données depuis AFX Kwayisi Web (scraping)
 */
async function fetchAfxWebData(exchangeId) {
  const exchange = getExchange(exchangeId);
  if (!exchange || !exchange.dataSources.afxKwayisi?.available) return null;

  try {
    const { path } = exchange.dataSources.afxKwayisi;
    const url = `${SOURCES.AFX_WEB.baseUrl}${path}`;

    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Recherche de l'indice principal
    let indexValue = null;
    let changeValue = null;

    // Sélecteurs génériques pour AFX
    $('.index-value, .composite-index, table tr').each((i, el) => {
      const text = $(el).text();
      const numbers = text.match(/[\d,]+\.[\d]+/g);
      if (numbers && numbers.length > 0) {
        indexValue = numbers[0];
        if (numbers.length > 1) changeValue = numbers[1];
      }
    });

    if (indexValue) {
      const value = parseFloat(indexValue.replace(/,/g, ''));
      const changePercent = changeValue ? parseFloat(changeValue) : 0;
      const positive = changePercent >= 0;

      return {
        id: exchange.id,
        name: exchange.name,
        country: exchange.country,
        value: value.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
        change: `${positive ? '+' : ''}${changePercent.toFixed(2)}%`,
        positive: positive,
        volume: 'N/A',
        source: 'AFX Kwayisi'
      };
    }

    throw new Error('Données non trouvées');
  } catch (error) {
    console.log(`⚠️  AFX Web ${exchangeId}: ${error.message}`);
    return null;
  }
}

/**
 * Collecte les données depuis African Markets (scraping)
 */
async function fetchAfricanMarketsData(exchangeId) {
  const exchange = getExchange(exchangeId);
  if (!exchange || !exchange.dataSources.africanMarkets?.available) return null;

  try {
    const { url } = exchange.dataSources.africanMarkets;

    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    let indexValue = null;
    let changePercent = null;

    // Sélecteurs pour African Markets
    $('.market-index, .index-value, table.market-data tr').each((i, el) => {
      const text = $(el).text();

      // Recherche de valeurs numériques
      const valueMatch = text.match(/[\d,]+\.[\d]+/);
      const changeMatch = text.match(/([+-]?[\d.]+)%/);

      if (valueMatch && !indexValue) indexValue = valueMatch[0];
      if (changeMatch && !changePercent) changePercent = changeMatch[1];
    });

    if (indexValue) {
      const value = parseFloat(indexValue.replace(/,/g, ''));
      const change = changePercent ? parseFloat(changePercent) : 0;
      const positive = change >= 0;

      return {
        id: exchange.id,
        name: exchange.name,
        country: exchange.country,
        value: value.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
        change: `${positive ? '+' : ''}${change.toFixed(2)}%`,
        positive: positive,
        volume: 'N/A',
        source: 'African Markets'
      };
    }

    throw new Error('Données non trouvées');
  } catch (error) {
    console.log(`⚠️  African Markets ${exchangeId}: ${error.message}`);
    return null;
  }
}

/**
 * Fonction intelligente de collecte avec fallback automatique
 */
async function fetchExchangeData(exchangeId) {
  const exchange = getExchange(exchangeId);
  if (!exchange || !exchange.active) return null;

  console.log(`📡 Collecte ${exchange.code}...`);

  // Essayer les sources dans l'ordre de priorité
  const sources = exchange.dataSources;

  // 1. Essayer AFX API en premier (si disponible)
  if (sources.afxApi?.available) {
    const data = await fetchAfxApiData(exchangeId);
    if (data) return data;
  }

  // 2. Essayer AFX Web
  if (sources.afxKwayisi?.available) {
    const data = await fetchAfxWebData(exchangeId);
    if (data) return data;
  }

  // 3. Essayer Yahoo Finance
  if (sources.yahoo?.available && sources.yahoo.symbol) {
    const data = await fetchYahooData(
      sources.yahoo.symbol,
      exchange.id,
      exchange.name,
      exchange.country
    );
    if (data) return data;
  }

  // 4. Essayer African Markets
  if (sources.africanMarkets?.available) {
    const data = await fetchAfricanMarketsData(exchangeId);
    if (data) return data;
  }

  // 5. Essayer site officiel (implémentation future)
  if (sources.officialWebsite?.available) {
    // TODO: Implémenter scraping site officiel
  }

  console.log(`❌ ${exchange.code}: Aucune source disponible`);
  return null;
}

/**
 * Helper: Calcule un indice composite à partir des données d'actions
 */
function calculateIndexFromStocks(stocks) {
  if (!stocks || stocks.length === 0) return 0;

  // Moyenne simple des prix (simplification)
  const avgPrice = stocks.reduce((sum, stock) => {
    return sum + (stock.price || 0);
  }, 0) / stocks.length;

  return avgPrice * 100; // Normalisation
}

/**
 * Collecte toutes les données des marchés
 */
async function collectAllMarkets() {
  console.log('📊 Début de la collecte des marchés africains...');

  const results = [];
  const exchanges = getAllExchanges();

  // Liste des bourses actives prioritaires
  const activeExchangeIds = [
    'jse', 'nse_ng', 'egx', 'brvm', 'nse_ke', 'masi', // Originales
    'gse', 'bse', 'luse', 'zse', 'sem',                // Haute priorité
    'dse', 'use', 'rse', 'bvmt',                       // Moyenne priorité
    'nsx', 'mse'                                        // Basse priorité
  ];

  // Collecte en parallèle avec limite de concurrence
  const batchSize = 5; // 5 requêtes simultanées max
  for (let i = 0; i < activeExchangeIds.length; i += batchSize) {
    const batch = activeExchangeIds.slice(i, i + batchSize);
    const promises = batch.map(id => fetchExchangeData(id));
    const responses = await Promise.allSettled(promises);

    responses.forEach((response) => {
      if (response.status === 'fulfilled' && response.value) {
        results.push(response.value);
      }
    });

    // Petit délai entre les batches pour éviter le rate limiting
    if (i + batchSize < activeExchangeIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`📈 Collecte terminée: ${results.length}/${activeExchangeIds.length} marchés récupérés`);

  // Si moins de 6 marchés (les originaux), utiliser le fallback
  if (results.length < 6) {
    console.log('⚠️  Données insuffisantes, utilisation du fallback...');
    return generateFallbackData();
  }

  // Compléter avec les marchés manquants du fallback
  const fallback = generateFallbackData();
  const existingIds = results.map(r => r.id);

  fallback.forEach(fb => {
    if (!existingIds.includes(fb.id)) {
      fb.source = 'Fallback';
      results.push(fb);
    }
  });

  return results;
}

module.exports = {
  collectAllMarkets,
  fetchYahooData,
  fetchBRVMData,
  fetchNSEKenyaData,
  fetchExchangeData,
  fetchAfxApiData,
  fetchAfxWebData,
  fetchAfricanMarketsData,
  generateFallbackData
};
