/**
 * Yahoo Finance Scraper pour les marchés africains
 * Collecte des données en temps réel depuis Yahoo Finance
 */

const { default: yahooFinance } = require('yahoo-finance2');
const logger = require('../utils/logger');

// Configuration des symboles par marché africain
// Format Yahoo: SYMBOL.SUFFIX (ex: MTN.JO pour MTN à la JSE)
const MARKET_SYMBOLS = {
  // JSE - Johannesburg Stock Exchange (Afrique du Sud) - Suffix: .JO
  jse: [
    'AGL.JO',   // Anglo American
    'MTN.JO',   // MTN Group
    'NPN.JO',   // Naspers
    'SBK.JO',   // Standard Bank
    'SOL.JO',   // Sasol
    'FSR.JO',   // FirstRand
    'ABG.JO',   // Absa Group
    'SHP.JO',   // Shoprite
    'VOD.JO',   // Vodacom
    'BID.JO'    // Bid Corporation
  ],

  // NSE Kenya - Nairobi Securities Exchange - Suffix: .NR
  nse_ke: [
    'EQTY.NR',  // Equity Group
    'KCB.NR',   // KCB Group
    'SCBK.NR',  // Standard Chartered Kenya
    'SCOM.NR',  // Safaricom
    'EABL.NR',  // East African Breweries
    'BAT.NR',   // British American Tobacco Kenya
    'NCBA.NR',  // NCBA Group
    'COOP.NR'   // Co-operative Bank
  ],

  // EGX - Egyptian Exchange - Suffix: .CA (Certains symboles)
  egx: [
    'COMI.CA',  // Commercial International Bank
    'HELI.CA',  // Heliopolis Housing
    'ETEL.CA',  // Egypt Telecom
    'SKPC.CA',  // Suez Cement
    'JUFO.CA'   // Juhayna Food
  ],

  // MASI - Casablanca Stock Exchange (Maroc) - Suffix: .CS
  masi: [
    'ATW.CS',   // Attijariwafa Bank
    'IAM.CS',   // Maroc Telecom
    'BCP.CS',   // Banque Centrale Populaire
    'LHM.CS',   // LafargeHolcim Maroc
    'CIH.CS'    // CIH Bank
  ],

  // NGX - Nigerian Exchange - Certains symboles disponibles
  nse_ng: [
    'DANGCEM.LG',  // Dangote Cement
    'ZENITH.LG',   // Zenith Bank
    'GTCO.LG',     // GT Bank
    'MTNN.LG',     // MTN Nigeria
    'BUACEMENT.LG', // BUA Cement
    'AIRTELAFRI.LG' // Airtel Africa
  ],

  // GSE - Ghana Stock Exchange
  gse: [
    'MTNGH.GH',    // MTN Ghana
    'TOTAL.GH',    // TotalEnergies Ghana
    'GCB.GH',      // GCB Bank
    'SOGEGH.GH'    // Societe Generale Ghana
  ],

  // SEM - Stock Exchange of Mauritius
  sem: [
    'MCB.MU',      // Mauritius Commercial Bank
    'SBM.MU',      // State Bank of Mauritius
    'ENL.MU',      // ENL Limited
    'SUN.MU'       // Sun Limited
  ],

  // BSE - Botswana Stock Exchange
  bse: [
    'CHOBE.BW',    // Chobe Holdings
    'FNBB.BW',     // First National Bank Botswana
    'SEFALANA.BW', // Sefalana
    'PRIMETIME.BW' // Primetime
  ],

  // NSX - Namibia Stock Exchange
  nsx: [
    'FNB.NX',      // First National Bank Namibia
    'NAM.NX',      // Namibia Breweries
    'OMLU.NX'      // Old Mutual Namibia
  ],

  // ZSE - Zimbabwe Stock Exchange
  zse: [
    'OK.ZW',       // OK Zimbabwe
    'DELTA.ZW',    // Delta Corporation
    'INNSCOR.ZW'   // Innscor Africa
  ],

  // LUSE - Lusaka Securities Exchange (Zambie)
  luse: [
    'ZCCM.LU'      // ZCCM Investments
  ],

  // DSE - Dar es Salaam Stock Exchange (Tanzanie)
  dse: [
    'CRDB.TZ',     // CRDB Bank
    'NMB.TZ'       // NMB Bank
  ],

  // USE - Uganda Securities Exchange
  use: [
    'DFCU.UG',     // DFCU Bank
    'SBU.UG'       // Stanbic Uganda
  ],

  // RSE - Rwanda Stock Exchange
  rse: [
    'BK.RW',       // Bank of Kigali
    'I&M.RW'       // I&M Bank Rwanda
  ],

  // BVMT - Bourse de Tunis
  bvmt: [
    'BNA.TN',      // Banque Nationale Agricole
    'ATB.TN',      // Arab Tunisian Bank
    'BT.TN'        // Banque de Tunisie
  ],

  // MSE - Malawi Stock Exchange
  mse: [
    'NBM.MW',      // National Bank of Malawi
    'NICO.MW'      // NICO Holdings
  ]
};

/**
 * Collecter les données d'un marché depuis Yahoo Finance
 * @param {string} exchange - Code du marché (ex: 'jse', 'nse_ke')
 * @returns {Promise<Array>} - Liste des actions avec leurs données
 */
async function scrapeYahooFinance(exchange) {
  const symbols = MARKET_SYMBOLS[exchange];

  if (!symbols || symbols.length === 0) {
    logger.warn(`No symbols configured for exchange: ${exchange}`);
    return [];
  }

  logger.info(`Collecting data for ${exchange} (${symbols.length} symbols)`);

  const results = [];

  // Collecter les données pour chaque symbole
  for (const symbol of symbols) {
    try {
      const quote = await yahooFinance.quote(symbol, {
        fields: ['symbol', 'longName', 'shortName', 'regularMarketPrice', 'regularMarketChangePercent', 'regularMarketVolume']
      });

      if (quote && quote.regularMarketPrice) {
        results.push({
          symbol: quote.symbol.replace(/\.\w+$/, ''), // Retirer suffix (.JO, .NR, etc.)
          name: quote.longName || quote.shortName || quote.symbol,
          price: quote.regularMarketPrice,
          change_percent: quote.regularMarketChangePercent || 0,
          volume: quote.regularMarketVolume || 0,
          exchange: exchange.toUpperCase(),
          sector: null, // Yahoo ne fournit pas toujours le secteur dans quote simple
          timestamp: new Date().toISOString()
        });

        logger.debug(`✓ ${symbol}: ${quote.regularMarketPrice}`);
      } else {
        logger.warn(`No price data for ${symbol}`);
      }
    } catch (error) {
      logger.error(`Failed to fetch ${symbol}:`, error.message);
      // Continue avec les autres symboles
    }

    // Petite pause pour éviter rate limiting (Yahoo limite à 2000 req/h)
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  logger.info(`✓ Collected ${results.length}/${symbols.length} stocks for ${exchange}`);

  return results;
}

/**
 * Collecter les données de tous les marchés
 * @returns {Promise<Object>} - Données collectées par marché
 */
async function scrapeAllMarkets() {
  const exchanges = Object.keys(MARKET_SYMBOLS);
  const results = {};

  for (const exchange of exchanges) {
    try {
      results[exchange] = await scrapeYahooFinance(exchange);
    } catch (error) {
      logger.error(`Failed to collect ${exchange}:`, error);
      results[exchange] = [];
    }
  }

  return results;
}

/**
 * Obtenir la liste des marchés disponibles
 */
function getAvailableMarkets() {
  return Object.keys(MARKET_SYMBOLS).map(key => ({
    id: key,
    symbols_count: MARKET_SYMBOLS[key].length
  }));
}

module.exports = {
  scrapeYahooFinance,
  scrapeAllMarkets,
  getAvailableMarkets,
  MARKET_SYMBOLS
};
