/**
 * Yahoo Finance Data Source
 *
 * Utilise l'API Yahoo Finance (query2.finance.yahoo.com)
 * Couverture: JSE, NGX, EGX, MASI
 * Fiabilité: Moyenne - API non officielle mais stable
 *
 * @module sources/yahooFinance
 */

const axios = require('axios');

const SOURCE_NAME = 'Yahoo Finance';
const BASE_URL = 'https://query2.finance.yahoo.com/v8/finance/chart';

// Mapping des marchés vers les symboles Yahoo Finance
const MARKET_SYMBOLS = {
  jse: { symbol: '^J203', name: 'JSE All Share', country: 'Afrique du Sud' },
  nse_ng: { symbol: '^NGSE', name: 'NGX All Share', country: 'Nigeria' },
  egx: { symbol: '^CASE30', name: 'EGX 30', country: 'Égypte' },
  masi: { symbol: '^MASI', name: 'MASI', country: 'Maroc' }
  // BRVM et NSE Kenya non disponibles sur Yahoo Finance
};

/**
 * Formate une valeur d'indice pour l'affichage
 * @param {number} value - Valeur numérique
 * @returns {string}
 */
function formatValue(value) {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formate le volume pour l'affichage
 * @param {number} volume - Volume brut
 * @returns {string}
 */
function formatVolume(volume) {
  if (!volume || volume === 0) return 'N/A';
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toString();
}

/**
 * Récupère les données d'un marché via Yahoo Finance API
 * @param {string} marketId - Identifiant du marché (jse, nse_ng, etc.)
 * @returns {Promise<Object|null>} Données du marché ou null si échec
 */
async function fetchMarket(marketId) {
  const config = MARKET_SYMBOLS[marketId];
  if (!config) {
    // Ce marché n'est pas disponible sur Yahoo Finance
    return null;
  }

  const url = `${BASE_URL}/${config.symbol}`;

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      params: {
        interval: '1d',
        range: '2d' // 2 jours pour calculer le changement
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    const data = response.data;

    // Vérifier la structure de la réponse
    if (!data?.chart?.result?.[0]) {
      console.log(`[Yahoo] ⚠️ ${marketId}: Réponse invalide`);
      return null;
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];

    // Extraire les valeurs
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose || meta.chartPreviousClose;
    const volume = meta.regularMarketVolume || (quotes?.volume?.slice(-1)[0]);

    if (!currentPrice) {
      console.log(`[Yahoo] ⚠️ ${marketId}: Prix non disponible`);
      return null;
    }

    // Calculer le changement
    let changePercent = 0;
    let changeValue = 0;
    if (previousClose && previousClose !== 0) {
      changeValue = currentPrice - previousClose;
      changePercent = ((changeValue / previousClose) * 100);
    }

    const positive = changePercent >= 0;
    const changeFormatted = `${positive ? '+' : ''}${changePercent.toFixed(2)}%`;

    const marketData = {
      id: marketId,
      name: config.name,
      country: config.country,
      value: formatValue(currentPrice),
      rawValue: currentPrice,
      change: changeFormatted,
      changePercent: changePercent,
      positive: positive,
      volume: formatVolume(volume),
      rawVolume: volume,
      source: SOURCE_NAME,
      timestamp: new Date().toISOString(),
      currency: meta.currency || 'N/A',
      exchangeTimezone: meta.exchangeTimezoneName || 'N/A'
    };

    console.log(`[Yahoo] ✅ ${marketId}: ${marketData.value} (${marketData.change})`);
    return marketData;

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log(`[Yahoo] ⏱️ ${marketId}: Timeout`);
    } else if (error.response?.status === 404) {
      console.log(`[Yahoo] ⚠️ ${marketId}: Symbole non trouvé`);
    } else if (error.response?.status === 429) {
      console.log(`[Yahoo] 🚫 ${marketId}: Rate limit atteint`);
    } else if (error.response) {
      console.log(`[Yahoo] ❌ ${marketId}: HTTP ${error.response.status}`);
    } else {
      console.log(`[Yahoo] ❌ ${marketId}: ${error.message}`);
    }
    return null;
  }
}

/**
 * Récupère les données de tous les marchés disponibles
 * @returns {Promise<Object[]>} Tableau des données de marchés
 */
async function fetchAllMarkets() {
  console.log(`[Yahoo] 🔄 Récupération des marchés...`);

  const marketIds = Object.keys(MARKET_SYMBOLS);
  const promises = marketIds.map(id => fetchMarket(id));

  const results = await Promise.allSettled(promises);
  const successfulResults = results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);

  console.log(`[Yahoo] 📊 ${successfulResults.length}/${marketIds.length} marchés récupérés`);
  return successfulResults;
}

/**
 * Récupère plusieurs marchés en une seule requête (batch)
 * @param {string[]} marketIds - Liste des identifiants de marchés
 * @returns {Promise<Object[]>} Tableau des données de marchés
 */
async function fetchMarketsBatch(marketIds) {
  // Yahoo Finance ne supporte pas vraiment le batch pour les indices
  // On fait des requêtes parallèles mais limitées
  const validIds = marketIds.filter(id => MARKET_SYMBOLS[id]);

  const results = [];
  // Traiter par lots de 3 pour éviter le rate limiting
  for (let i = 0; i < validIds.length; i += 3) {
    const batch = validIds.slice(i, i + 3);
    const promises = batch.map(id => fetchMarket(id));
    const batchResults = await Promise.allSettled(promises);

    batchResults.forEach(r => {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value);
      }
    });

    // Pause entre les lots
    if (i + 3 < validIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Vérifie si la source est disponible
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  try {
    // Test avec un symbole connu (S&P 500)
    const response = await axios.get(`${BASE_URL}/^GSPC`, {
      timeout: 5000,
      params: { interval: '1d', range: '1d' }
    });
    return response.data?.chart?.result?.[0] !== undefined;
  } catch {
    return false;
  }
}

/**
 * Retourne les métadonnées de la source
 * @returns {Object}
 */
function getMetadata() {
  return {
    name: SOURCE_NAME,
    baseUrl: BASE_URL,
    markets: Object.keys(MARKET_SYMBOLS),
    reliability: 'medium',
    rateLimit: {
      requestsPerMinute: 60,
      delayBetweenRequests: 500
    },
    features: ['realtime', 'volume', 'currency', 'timezone']
  };
}

/**
 * Retourne les marchés supportés par cette source
 * @returns {string[]}
 */
function getSupportedMarkets() {
  return Object.keys(MARKET_SYMBOLS);
}

module.exports = {
  fetchMarket,
  fetchAllMarkets,
  fetchMarketsBatch,
  isAvailable,
  getMetadata,
  getSupportedMarkets,
  SOURCE_NAME,
  MARKET_SYMBOLS
};
