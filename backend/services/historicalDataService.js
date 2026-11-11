const { default: YahooFinance } = require('yahoo-finance2');
const Database = require('better-sqlite3');
const path = require('path');

/**
 * Service de collecte et gestion des données historiques
 *
 * Fonctionnalités:
 * - Collecte de 5+ ans de données OHLCV
 * - Support pour marchés africains et internationaux
 * - Mise à jour incrémentale
 * - Validation et nettoyage des données
 */
class HistoricalDataService {
  constructor() {
    const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
    this.db = new Database(dbPath);
    this.yahooFinance = new YahooFinance();
    this.initializeTables();
  }

  /**
   * Initialise les tables pour données historiques étendues
   */
  initializeTables() {
    // Table pour données historiques étendues
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS extended_market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        date DATE NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume INTEGER NOT NULL,
        adjusted_close REAL,
        dividend REAL DEFAULT 0,
        split_coefficient REAL DEFAULT 1,
        source TEXT DEFAULT 'yahoo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ticker, date)
      );

      CREATE INDEX IF NOT EXISTS idx_extended_ticker_date
        ON extended_market_data(ticker, date DESC);

      CREATE INDEX IF NOT EXISTS idx_extended_date
        ON extended_market_data(date DESC);
    `);

    // Table de métadonnées pour tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS data_fetch_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        records_fetched INTEGER,
        source TEXT,
        status TEXT, -- success, partial, failed
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_fetch_log_ticker
        ON data_fetch_log(ticker, created_at DESC);
    `);

    // Table de mapping des tickers (africains → Yahoo)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ticker_mapping (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pendo_ticker TEXT UNIQUE NOT NULL,
        yahoo_ticker TEXT NOT NULL,
        exchange TEXT,
        country TEXT,
        active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insérer les mappings par défaut pour marchés africains
    const mappings = [
      // Nigeria (NSE)
      ['SNTS', 'SEPLAT.LG', 'NSE', 'NG'],
      ['DANO', 'DANGCEM.LG', 'NSE', 'NG'],
      ['FBNH', 'FBNH.LG', 'NSE', 'NG'],
      ['NGXG', 'NESTLE.LG', 'NSE', 'NG'],
      ['MTNN', 'MTNN.LG', 'NSE', 'NG'],

      // South Africa (JSE)
      ['AGL', 'AGL.JO', 'JSE', 'ZA'],
      ['BHP', 'BHP.JO', 'JSE', 'ZA'],
      ['SHP', 'SHP.JO', 'JSE', 'ZA'],
      ['NPN', 'NPN.JO', 'JSE', 'ZA'],
      ['MTN', 'MTN.JO', 'JSE', 'ZA'],

      // Kenya (NSE)
      ['SCOM', 'SCOM.NR', 'NSE', 'KE'],
      ['EQTY', 'EQTY.NR', 'NSE', 'KE'],
      ['KCB', 'KCB.NR', 'NSE', 'KE'],

      // Egypt (EGX)
      ['CIB', 'COMI.CA', 'EGX', 'EG'],
      ['TMGH', 'TMGH.CA', 'EGX', 'EG'],

      // Morocco (CSE)
      ['IAM', 'IAM.CS', 'CSE', 'MA'],
      ['ATW', 'ATW.CS', 'CSE', 'MA'],
    ];

    const insertMapping = this.db.prepare(`
      INSERT OR IGNORE INTO ticker_mapping (pendo_ticker, yahoo_ticker, exchange, country)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((mappings) => {
      for (const mapping of mappings) {
        insertMapping.run(mapping);
      }
    });

    insertMany(mappings);
  }

  /**
   * Récupère le mapping Yahoo Finance pour un ticker PENDO
   */
  getYahooTicker(pendoTicker) {
    const row = this.db.prepare(`
      SELECT yahoo_ticker, exchange, country
      FROM ticker_mapping
      WHERE pendo_ticker = ? AND active = 1
    `).get(pendoTicker);

    return row;
  }

  /**
   * Collecte les données historiques depuis Yahoo Finance
   *
   * @param {string} ticker - Ticker PENDO
   * @param {number} years - Nombre d'années à récupérer (défaut: 5)
   * @returns {Object} Résultat de la collecte
   */
  async fetchHistoricalData(ticker, years = 5) {
    const mapping = this.getYahooTicker(ticker);

    if (!mapping) {
      return {
        success: false,
        message: `Aucun mapping trouvé pour ${ticker}`,
        ticker,
        recordsFetched: 0
      };
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - years);

    console.log(`📊 Récupération de ${years} ans de données pour ${ticker} (${mapping.yahoo_ticker})...`);

    try {
      // Récupérer les données depuis Yahoo Finance
      const queryOptions = {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      };

      const result = await this.yahooFinance.chart(mapping.yahoo_ticker, queryOptions);

      if (!result || !result.quotes || result.quotes.length === 0) {
        this.logFetch(ticker, startDate, endDate, 0, 'yahoo', 'failed', 'No data returned');
        return {
          success: false,
          message: `Aucune donnée trouvée pour ${ticker}`,
          ticker,
          recordsFetched: 0
        };
      }

      // Insérer les données dans la base
      const insertStmt = this.db.prepare(`
        INSERT OR REPLACE INTO extended_market_data
          (ticker, date, open, high, low, close, volume, adjusted_close, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = this.db.transaction((data) => {
        let inserted = 0;
        for (const row of data) {
          try {
            // Vérifier que toutes les valeurs sont présentes
            if (!row.date || row.open === null || row.high === null ||
                row.low === null || row.close === null) {
              continue;
            }

            insertStmt.run(
              ticker,
              row.date.toISOString().split('T')[0],
              row.open,
              row.high,
              row.low,
              row.close,
              row.volume || 0,
              row.adjclose || row.close,
              'yahoo'
            );
            inserted++;
          } catch (err) {
            console.error(`Erreur insertion ${ticker} ${row.date}:`, err.message);
          }
        }
        return inserted;
      });

      const recordsFetched = insertMany(result.quotes);

      // Log du fetch
      this.logFetch(
        ticker,
        startDate,
        endDate,
        recordsFetched,
        'yahoo',
        recordsFetched > 0 ? 'success' : 'partial',
        null
      );

      console.log(`✅ ${ticker}: ${recordsFetched} enregistrements insérés`);

      return {
        success: true,
        ticker,
        recordsFetched,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        source: 'yahoo'
      };

    } catch (error) {
      console.error(`❌ Erreur pour ${ticker}:`, error.message);

      this.logFetch(ticker, startDate, endDate, 0, 'yahoo', 'failed', error.message);

      return {
        success: false,
        message: error.message,
        ticker,
        recordsFetched: 0
      };
    }
  }

  /**
   * Collecte les données pour plusieurs tickers
   *
   * @param {Array<string>} tickers - Liste de tickers PENDO
   * @param {number} years - Années à récupérer
   * @param {number} delayMs - Délai entre chaque requête (pour éviter rate limiting)
   * @returns {Array} Résultats pour chaque ticker
   */
  async fetchMultipleTickers(tickers, years = 5, delayMs = 2000) {
    const results = [];

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];

      console.log(`\n[${i + 1}/${tickers.length}] Traitement de ${ticker}...`);

      const result = await this.fetchHistoricalData(ticker, years);
      results.push(result);

      // Délai pour éviter rate limiting (sauf pour le dernier)
      if (i < tickers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Met à jour les données (récupère uniquement les nouvelles données)
   *
   * @param {string} ticker - Ticker PENDO
   * @returns {Object} Résultat de la mise à jour
   */
  async updateData(ticker) {
    // Trouver la date la plus récente en base
    const lastDate = this.db.prepare(`
      SELECT MAX(date) as last_date
      FROM extended_market_data
      WHERE ticker = ?
    `).get(ticker);

    if (!lastDate || !lastDate.last_date) {
      // Pas de données existantes, récupérer 5 ans
      return await this.fetchHistoricalData(ticker, 5);
    }

    const mapping = this.getYahooTicker(ticker);
    if (!mapping) {
      return { success: false, message: `No mapping for ${ticker}` };
    }

    const startDate = new Date(lastDate.last_date);
    startDate.setDate(startDate.getDate() + 1); // Jour suivant

    const endDate = new Date();

    // Si moins d'un jour de différence, pas besoin de mise à jour
    if (endDate - startDate < 24 * 60 * 60 * 1000) {
      return {
        success: true,
        message: 'Already up to date',
        ticker,
        recordsFetched: 0
      };
    }

    try {
      const result = await this.yahooFinance.chart(mapping.yahoo_ticker, {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      });

      if (!result || !result.quotes || result.quotes.length === 0) {
        return { success: true, message: 'No new data', ticker, recordsFetched: 0 };
      }

      const insertStmt = this.db.prepare(`
        INSERT OR REPLACE INTO extended_market_data
          (ticker, date, open, high, low, close, volume, adjusted_close, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = this.db.transaction((data) => {
        let inserted = 0;
        for (const row of data) {
          if (!row.date || row.open === null || row.high === null ||
              row.low === null || row.close === null) {
            continue;
          }
          insertStmt.run(
            ticker,
            row.date.toISOString().split('T')[0],
            row.open,
            row.high,
            row.low,
            row.close,
            row.volume || 0,
            row.adjclose || row.close,
            'yahoo'
          );
          inserted++;
        }
        return inserted;
      });

      const recordsFetched = insertMany(result.quotes);

      return {
        success: true,
        ticker,
        recordsFetched,
        message: `Updated with ${recordsFetched} new records`
      };

    } catch (error) {
      return {
        success: false,
        message: error.message,
        ticker,
        recordsFetched: 0
      };
    }
  }

  /**
   * Log d'une tentative de fetch
   */
  logFetch(ticker, startDate, endDate, recordsFetched, source, status, errorMessage) {
    this.db.prepare(`
      INSERT INTO data_fetch_log (ticker, start_date, end_date, records_fetched, source, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      ticker,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      recordsFetched,
      source,
      status,
      errorMessage
    );
  }

  /**
   * Récupère les statistiques de données pour un ticker
   */
  getDataStats(ticker) {
    const stats = this.db.prepare(`
      SELECT
        ticker,
        COUNT(*) as total_days,
        MIN(date) as oldest_date,
        MAX(date) as newest_date,
        AVG(volume) as avg_volume,
        MIN(low) as all_time_low,
        MAX(high) as all_time_high
      FROM extended_market_data
      WHERE ticker = ?
      GROUP BY ticker
    `).get(ticker);

    return stats;
  }

  /**
   * Récupère les statistiques globales
   */
  getGlobalStats() {
    const stats = this.db.prepare(`
      SELECT
        COUNT(DISTINCT ticker) as total_tickers,
        COUNT(*) as total_records,
        MIN(date) as oldest_date,
        MAX(date) as newest_date
      FROM extended_market_data
    `).get();

    const byTicker = this.db.prepare(`
      SELECT
        ticker,
        COUNT(*) as records,
        MIN(date) as start_date,
        MAX(date) as end_date
      FROM extended_market_data
      GROUP BY ticker
      ORDER BY records DESC
    `).all();

    return {
      ...stats,
      tickers: byTicker
    };
  }

  /**
   * Récupère les données OHLCV pour une période donnée
   * (Compatible avec le format attendu par technicalIndicators)
   */
  getOHLCVData(ticker, startDate = null, endDate = null, limit = null) {
    let query = `
      SELECT
        date,
        open,
        high,
        low,
        close,
        volume
      FROM extended_market_data
      WHERE ticker = ?
    `;

    const params = [ticker];

    if (startDate) {
      query += ` AND date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND date <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY date DESC`;

    if (limit) {
      query += ` LIMIT ?`;
      params.push(limit);
    }

    const rows = this.db.prepare(query).all(...params);

    return rows.reverse(); // Retourner dans l'ordre chronologique
  }

  /**
   * Ajoute un nouveau mapping de ticker
   */
  addTickerMapping(pendoTicker, yahooTicker, exchange, country) {
    try {
      this.db.prepare(`
        INSERT INTO ticker_mapping (pendo_ticker, yahoo_ticker, exchange, country)
        VALUES (?, ?, ?, ?)
      `).run(pendoTicker, yahooTicker, exchange, country);

      return { success: true, message: `Mapping ajouté: ${pendoTicker} → ${yahooTicker}` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Liste tous les mappings actifs
   */
  getAllMappings() {
    return this.db.prepare(`
      SELECT * FROM ticker_mapping WHERE active = 1 ORDER BY country, pendo_ticker
    `).all();
  }

  /**
   * Récupère l'historique des fetches
   */
  getFetchHistory(ticker = null, limit = 50) {
    let query = `SELECT * FROM data_fetch_log`;
    const params = [];

    if (ticker) {
      query += ` WHERE ticker = ?`;
      params.push(ticker);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }
}

module.exports = HistoricalDataService;
