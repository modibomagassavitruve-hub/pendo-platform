/**
 * AFX Kwayisi Data Source
 *
 * Source: https://afx.kwayisi.org
 * Couverture: JSE, NGX, EGX, BRVM, NSE Kenya, MASI (Casablanca)
 * Fiabilité: Haute - Site dédié aux marchés africains
 *
 * @module sources/afxKwayisi
 */

const axios = require('axios');
const cheerio = require('cheerio');

const SOURCE_NAME = 'AFX Kwayisi';
const BASE_URL = 'https://afx.kwayisi.org';

// Mapping des marchés vers les URLs AFX
// Note: EGX et MASI ne sont pas disponibles sur AFX, ils utilisent d'autres sources
const MARKET_ENDPOINTS = {
  jse: { path: '/jse', name: 'JSE All Share', country: 'Afrique du Sud', indexSelector: 'J203' },
  nse_ng: { path: '/ngx', name: 'NGX All Share', country: 'Nigeria', indexSelector: 'ASI' },
  brvm: { path: '/brvm', name: 'BRVM Composite', country: 'UEMOA', indexSelector: 'COMP' },
  nse_ke: { path: '/nse', name: 'NSE 20', country: 'Kenya', indexSelector: 'NSE20' },
  gse: { path: '/gse', name: 'GSE Composite', country: 'Ghana', indexSelector: 'GSE' }
  // EGX (Égypte) - Utiliser Yahoo Finance
  // MASI (Maroc) - Source dédiée nécessaire
};

/**
 * Parse une valeur numérique depuis un texte
 * @param {string} text - Texte contenant le nombre
 * @returns {number|null}
 */
function parseNumber(text) {
  if (!text) return null;
  // Nettoyer le texte et extraire le nombre
  const cleaned = text.replace(/[^\d.,\-]/g, '').replace(',', '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse le pourcentage de changement
 * @param {string} text - Texte contenant le pourcentage
 * @returns {{ value: number, formatted: string, positive: boolean }}
 */
function parseChange(text) {
  if (!text) return { value: 0, formatted: '0.00%', positive: true };

  const match = text.match(/([+-]?\d+\.?\d*)\s*%?/);
  if (!match) return { value: 0, formatted: '0.00%', positive: true };

  const value = parseFloat(match[1]);
  const positive = value >= 0;
  const formatted = `${positive ? '+' : ''}${value.toFixed(2)}%`;

  return { value, formatted, positive };
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
 * Récupère les données d'un marché spécifique depuis AFX Kwayisi
 * @param {string} marketId - Identifiant du marché (jse, nse_ng, etc.)
 * @returns {Promise<Object|null>} Données du marché ou null si échec
 */
async function fetchMarket(marketId) {
  const config = MARKET_ENDPOINTS[marketId];
  if (!config) {
    console.log(`[AFX] ⚠️ Marché inconnu: ${marketId}`);
    return null;
  }

  const url = `${BASE_URL}${config.path}`;

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    });

    const $ = cheerio.load(response.data);

    let indexValue = null;
    let changeValue = null;
    let changeText = '';
    let marketCap = null;

    // Stratégie 1: Parser la première table (table d'index principale)
    // Structure: <th>J203 Index</th> ... <td>113,301.77 <span class="hi">(+1,178.17)</span></td>
    const firstTable = $('table').first();
    const headerText = firstTable.find('th').first().text().trim();

    // Vérifier si c'est bien la table d'index
    if (headerText.includes(config.indexSelector) || headerText.toLowerCase().includes('index')) {
      const firstCell = firstTable.find('tbody td').first();
      const cellText = firstCell.text().trim();

      // Extraire la valeur principale (ex: "113,301.77")
      const valueMatch = cellText.match(/^([\d,]+\.?\d*)/);
      if (valueMatch) {
        indexValue = parseNumber(valueMatch[1]);
      }

      // Extraire le changement (ex: "(+1,178.17)" ou "(-500.00)")
      const changeMatch = cellText.match(/\(([\+\-]?[\d,]+\.?\d*)\)/);
      if (changeMatch) {
        changeValue = parseNumber(changeMatch[1]);
      }

      // Chercher le pourcentage dans la cellule YTD ou autre
      const allCells = firstTable.find('tbody td');
      allCells.each((i, cell) => {
        const text = $(cell).text();
        const pctMatch = text.match(/([\+\-]?\d+\.?\d*)\s*%/);
        if (pctMatch && !changeText) {
          changeText = pctMatch[0];
        }
      });

      // Extraire le market cap si disponible
      const lastCell = firstTable.find('tbody td').last();
      const capText = lastCell.text();
      if (capText.includes('Tr') || capText.includes('Bn') || capText.includes('M')) {
        marketCap = capText.trim();
      }
    }

    // Stratégie 2: Si pas trouvé, chercher dans toutes les tables
    if (!indexValue) {
      $('table').each((i, table) => {
        if (indexValue) return false; // break si trouvé

        const tableText = $(table).text();
        if (tableText.includes(config.indexSelector)) {
          $(table).find('td').each((j, cell) => {
            const cellText = $(cell).text().trim();
            const numMatch = cellText.match(/^([\d,]+\.?\d*)/);
            if (numMatch) {
              const num = parseNumber(numMatch[1]);
              // L'index devrait être un grand nombre
              if (num && num > 500) {
                indexValue = num;
                return false;
              }
            }
          });
        }
      });
    }

    // Stratégie 3: Chercher dans le texte de la page
    if (!indexValue) {
      const pageText = $('body').text();
      const pattern = new RegExp(`${config.indexSelector}[^\\d]*(\\d{1,3}(?:,\\d{3})*\\.\\d{2})`, 'i');
      const match = pageText.match(pattern);
      if (match) {
        indexValue = parseNumber(match[1]);
      }
    }

    if (!indexValue) {
      console.log(`[AFX] ⚠️ ${marketId}: Valeur d'indice non trouvée`);
      return null;
    }

    // Calculer le changement en pourcentage si on a la valeur absolue
    let change;
    if (changeText) {
      change = parseChange(changeText);
    } else if (changeValue !== null && indexValue) {
      const previousValue = indexValue - changeValue;
      const pct = previousValue !== 0 ? (changeValue / previousValue) * 100 : 0;
      change = {
        value: pct,
        formatted: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
        positive: pct >= 0
      };
    } else {
      change = { value: 0, formatted: '0.00%', positive: true };
    }

    const result = {
      id: marketId,
      name: config.name,
      country: config.country,
      value: formatValue(indexValue),
      rawValue: indexValue,
      change: change.formatted,
      changePercent: change.value,
      positive: change.positive,
      volume: marketCap || 'N/A',
      source: SOURCE_NAME,
      timestamp: new Date().toISOString(),
      url: url
    };

    console.log(`[AFX] ✅ ${marketId}: ${result.value} (${result.change})`);
    return result;

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log(`[AFX] ⏱️ ${marketId}: Timeout`);
    } else if (error.response) {
      console.log(`[AFX] ❌ ${marketId}: HTTP ${error.response.status}`);
    } else {
      console.log(`[AFX] ❌ ${marketId}: ${error.message}`);
    }
    return null;
  }
}

/**
 * Récupère les données de tous les marchés
 * @returns {Promise<Object[]>} Tableau des données de marchés
 */
async function fetchAllMarkets() {
  console.log(`[AFX] 🔄 Récupération de tous les marchés...`);

  const marketIds = Object.keys(MARKET_ENDPOINTS);
  const results = [];

  // Exécuter séquentiellement pour respecter le rate limiting
  for (const marketId of marketIds) {
    const data = await fetchMarket(marketId);
    if (data) {
      results.push(data);
    }
    // Pause de 2 secondes entre chaque requête (respectueux)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`[AFX] 📊 ${results.length}/${marketIds.length} marchés récupérés`);
  return results;
}

/**
 * Vérifie si la source est disponible
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  try {
    const response = await axios.get(BASE_URL, { timeout: 5000 });
    return response.status === 200;
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
    markets: Object.keys(MARKET_ENDPOINTS),
    reliability: 'high',
    rateLimit: {
      requestsPerMinute: 6,
      delayBetweenRequests: 2000
    }
  };
}

module.exports = {
  fetchMarket,
  fetchAllMarkets,
  isAvailable,
  getMetadata,
  SOURCE_NAME,
  MARKET_ENDPOINTS
};
