/**
 * Alpha Vantage Data Source
 *
 * API officielle avec clé - Utilisée en fallback tertiaire
 * Couverture limitée pour les marchés africains
 * Limite: 25 requêtes/jour (gratuit)
 *
 * @module sources/alphaVantage
 */

const axios = require('axios');

const SOURCE_NAME = 'Alpha Vantage';
const BASE_URL = 'https://www.alphavantage.co/query';

// Clé API (sera chargée depuis les variables d'environnement)
let API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';

// Mapping des marchés vers les symboles Alpha Vantage
// Note: Alpha Vantage a une couverture limitée des marchés africains
const MARKET_SYMBOLS = {
  jse: { symbol: '^J203', name: 'JSE All Share', country: 'Afrique du Sud', exchange: 'JSE' },
  egx: { symbol: 'EGX30.CA', name: 'EGX 30', country: 'Égypte', exchange: 'EGX' }
  // NGX, BRVM, NSE Kenya, MASI non disponibles sur Alpha Vantage
};

// Compteur de requêtes quotidiennes
let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();
const MAX_DAILY_REQUESTS = 25;

/**
 * Définit la clé API
 * @param {string} key - Clé API Alpha Vantage
 */
function setApiKey(key) {
  API_KEY = key;
}

/**
 * Vérifie et réinitialise le compteur quotidien si nécessaire
 */
function checkAndResetDailyCounter() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyRequestCount = 0;
    lastResetDate = today;
    console.log(`[Alpha] 🔄 Compteur quotidien réinitialisé`);
  }
}

/**
 * Vérifie si on peut faire une requête (rate limiting)
 * @returns {boolean}
 */
function canMakeRequest() {
  checkAndResetDailyCounter();
  return dailyRequestCount < MAX_DAILY_REQUESTS;
}

/**
 * Retourne le nombre de requêtes restantes
 * @returns {number}
 */
function getRemainingRequests() {
  checkAndResetDailyCounter();
  return MAX_DAILY_REQUESTS - dailyRequestCount;
}

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
 * Récupère les données d'un marché via Alpha Vantage
 * @param {string} marketId - Identifiant du marché
 * @returns {Promise<Object|null>} Données du marché ou null si échec
 */
async function fetchMarket(marketId) {
  const config = MARKET_SYMBOLS[marketId];
  if (!config) {
    // Ce marché n'est pas disponible sur Alpha Vantage
    return null;
  }

  if (!API_KEY) {
    console.log(`[Alpha] ⚠️ Clé API non configurée`);
    return null;
  }

  if (!canMakeRequest()) {
    console.log(`[Alpha] 🚫 Limite quotidienne atteinte (${MAX_DAILY_REQUESTS} req/jour)`);
    return null;
  }

  try {
    const response = await axios.get(BASE_URL, {
      timeout: 15000,
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: config.symbol,
        apikey: API_KEY
      }
    });

    dailyRequestCount++;
    console.log(`[Alpha] 📊 Requêtes aujourd'hui: ${dailyRequestCount}/${MAX_DAILY_REQUESTS}`);

    const data = response.data;

    // Vérifier les erreurs API
    if (data['Error Message']) {
      console.log(`[Alpha] ⚠️ ${marketId}: ${data['Error Message']}`);
      return null;
    }

    if (data['Note']) {
      // Rate limit message from Alpha Vantage
      console.log(`[Alpha] 🚫 Rate limit: ${data['Note']}`);
      return null;
    }

    const quote = data['Global Quote'];
    if (!quote || Object.keys(quote).length === 0) {
      console.log(`[Alpha] ⚠️ ${marketId}: Données non disponibles`);
      return null;
    }

    // Extraire les valeurs
    const currentPrice = parseFloat(quote['05. price']);
    const previousClose = parseFloat(quote['08. previous close']);
    const volume = parseInt(quote['06. volume']) || 0;
    const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;

    if (!currentPrice || isNaN(currentPrice)) {
      console.log(`[Alpha] ⚠️ ${marketId}: Prix invalide`);
      return null;
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
      exchange: config.exchange,
      lastTradingDay: quote['07. latest trading day']
    };

    console.log(`[Alpha] ✅ ${marketId}: ${marketData.value} (${marketData.change})`);
    return marketData;

  } catch (error) {
    dailyRequestCount++; // Compter même les requêtes échouées

    if (error.code === 'ECONNABORTED') {
      console.log(`[Alpha] ⏱️ ${marketId}: Timeout`);
    } else if (error.response?.status === 429) {
      console.log(`[Alpha] 🚫 ${marketId}: Rate limit HTTP`);
    } else if (error.response) {
      console.log(`[Alpha] ❌ ${marketId}: HTTP ${error.response.status}`);
    } else {
      console.log(`[Alpha] ❌ ${marketId}: ${error.message}`);
    }
    return null;
  }
}

/**
 * Récupère les données de tous les marchés disponibles
 * Note: Utiliser avec parcimonie à cause de la limite de 25 req/jour
 * @returns {Promise<Object[]>} Tableau des données de marchés
 */
async function fetchAllMarkets() {
  console.log(`[Alpha] 🔄 Récupération des marchés (${getRemainingRequests()} requêtes restantes)...`);

  if (!canMakeRequest()) {
    console.log(`[Alpha] 🚫 Limite quotidienne atteinte`);
    return [];
  }

  const marketIds = Object.keys(MARKET_SYMBOLS);
  const results = [];

  // Exécuter séquentiellement pour économiser les requêtes
  for (const marketId of marketIds) {
    if (!canMakeRequest()) {
      console.log(`[Alpha] 🚫 Arrêt - limite atteinte`);
      break;
    }

    const data = await fetchMarket(marketId);
    if (data) {
      results.push(data);
    }

    // Pause entre les requêtes (Alpha Vantage recommande 12 sec entre les appels gratuits)
    await new Promise(resolve => setTimeout(resolve, 12000));
  }

  console.log(`[Alpha] 📊 ${results.length}/${marketIds.length} marchés récupérés`);
  return results;
}

/**
 * Vérifie si la source est disponible
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  if (!API_KEY) return false;
  if (!canMakeRequest()) return false;

  try {
    // Test avec IBM (symbole stable)
    const response = await axios.get(BASE_URL, {
      timeout: 5000,
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: 'IBM',
        apikey: API_KEY
      }
    });

    // Ne pas compter cette requête de test dans le quota
    return response.data['Global Quote'] !== undefined;
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
    reliability: 'high',
    rateLimit: {
      requestsPerDay: MAX_DAILY_REQUESTS,
      remainingToday: getRemainingRequests(),
      delayBetweenRequests: 12000
    },
    features: ['official-api', 'volume', 'previous-close'],
    requiresApiKey: true,
    hasApiKey: !!API_KEY
  };
}

/**
 * Retourne les marchés supportés par cette source
 * @returns {string[]}
 */
function getSupportedMarkets() {
  return Object.keys(MARKET_SYMBOLS);
}

/**
 * Retourne les statistiques d'utilisation
 * @returns {Object}
 */
function getUsageStats() {
  checkAndResetDailyCounter();
  return {
    dailyRequestCount,
    maxDailyRequests: MAX_DAILY_REQUESTS,
    remainingRequests: MAX_DAILY_REQUESTS - dailyRequestCount,
    lastResetDate,
    apiKeyConfigured: !!API_KEY
  };
}

module.exports = {
  fetchMarket,
  fetchAllMarkets,
  isAvailable,
  getMetadata,
  getSupportedMarkets,
  getUsageStats,
  setApiKey,
  canMakeRequest,
  getRemainingRequests,
  SOURCE_NAME,
  MARKET_SYMBOLS
};
