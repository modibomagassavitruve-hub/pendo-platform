const Database = require('better-sqlite3');
const path = require('path');
const technicalService = require('./technicalIndicators');

/**
 * Service de screener d'actions avancé
 *
 * Fonctionnalités:
 * - Filtres techniques (RSI, MACD, volume, etc.)
 * - Filtres fondamentaux (prix, variation, capitalisation)
 * - Scans sauvegardés
 * - Alertes personnalisées
 * - Résultats en temps réel
 */
class StockScreenerService {
  constructor() {
    const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
    this.db = new Database(dbPath);
    this.technicalService = technicalService;
    this.initializeTables();
  }

  /**
   * Initialise les tables pour le screener
   */
  initializeTables() {
    // Table des scans sauvegardés
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS saved_scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        filters TEXT NOT NULL, -- JSON des critères de filtrage
        is_public BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_saved_scans_user
        ON saved_scans(user_id, created_at DESC);
    `);

    // Table des alertes personnalisées
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stock_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ticker TEXT NOT NULL,
        alert_type TEXT NOT NULL, -- price, rsi, volume, pattern
        condition TEXT NOT NULL, -- above, below, crosses, etc.
        target_value REAL NOT NULL,
        current_value REAL,
        status TEXT DEFAULT 'active', -- active, triggered, cancelled
        message TEXT,
        triggered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_stock_alerts_user
        ON stock_alerts(user_id, status, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_stock_alerts_ticker
        ON stock_alerts(ticker, status);
    `);

    // Table des résultats de scan
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scan_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_id INTEGER,
        ticker TEXT NOT NULL,
        score REAL,
        matched_criteria TEXT, -- JSON des critères matchés
        technical_data TEXT, -- JSON des indicateurs
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scan_id) REFERENCES saved_scans(id)
      );

      CREATE INDEX IF NOT EXISTS idx_scan_results_scan
        ON scan_results(scan_id, score DESC);
    `);
  }

  /**
   * Exécute un scan avec filtres
   *
   * @param {Object} filters - Critères de filtrage
   * @returns {Array} Actions correspondantes
   */
  async executeScan(filters) {
    const {
      // Filtres de prix et volume
      priceMin,
      priceMax,
      volumeMin,
      changePercentMin,
      changePercentMax,

      // Filtres techniques
      rsiMin,
      rsiMax,
      rsiOversold, // < 30
      rsiOverbought, // > 70
      macdSignal, // bullish, bearish

      // Filtres de moyennes mobiles
      aboveSMA20,
      aboveSMA50,
      aboveSMA200,
      goldenCross, // SMA50 > SMA200
      deathCross, // SMA50 < SMA200

      // Filtres de volatilité
      atrMin,
      atrMax,

      // Filtres de tendance
      stochasticOversold, // < 20
      stochasticOverbought, // > 80

      // Filtres généraux
      exchange,
      sector,
      limit = 50
    } = filters;

    // Récupérer toutes les actions
    let query = `
      SELECT DISTINCT
        s.id,
        s.symbol as ticker,
        s.name,
        s.price,
        s.change_percent,
        s.volume,
        s.exchange,
        s.sector
      FROM stocks s
      WHERE 1=1
    `;

    const params = [];

    // Filtres SQL directs
    if (priceMin !== undefined) {
      query += ` AND s.price >= ?`;
      params.push(priceMin);
    }

    if (priceMax !== undefined) {
      query += ` AND s.price <= ?`;
      params.push(priceMax);
    }

    if (volumeMin !== undefined) {
      query += ` AND s.volume >= ?`;
      params.push(volumeMin);
    }

    if (changePercentMin !== undefined) {
      query += ` AND s.change_percent >= ?`;
      params.push(changePercentMin);
    }

    if (changePercentMax !== undefined) {
      query += ` AND s.change_percent <= ?`;
      params.push(changePercentMax);
    }

    if (exchange) {
      query += ` AND s.exchange = ?`;
      params.push(exchange);
    }

    if (sector) {
      query += ` AND s.sector = ?`;
      params.push(sector);
    }

    query += ` ORDER BY s.volume DESC LIMIT ?`;
    params.push(limit);

    const stocks = this.db.prepare(query).all(...params);

    // Filtrer par indicateurs techniques
    const results = [];

    for (const stock of stocks) {
      try {
        const ticker = stock.ticker;
        const matchedCriteria = [];
        let score = 0;

        // Récupérer les indicateurs techniques
        const indicators = await this.getTechnicalIndicators(ticker);

        if (!indicators) {
          continue;
        }

        // Filtre RSI
        if (rsiMin !== undefined && indicators.rsi < rsiMin) continue;
        if (rsiMax !== undefined && indicators.rsi > rsiMax) continue;

        if (rsiOversold && indicators.rsi < 30) {
          matchedCriteria.push('RSI Oversold');
          score += 10;
        }

        if (rsiOverbought && indicators.rsi > 70) {
          matchedCriteria.push('RSI Overbought');
          score += 10;
        }

        // Filtre MACD
        if (macdSignal) {
          if (macdSignal === 'bullish' && indicators.macd?.signal === 'bullish') {
            matchedCriteria.push('MACD Bullish');
            score += 15;
          } else if (macdSignal === 'bearish' && indicators.macd?.signal === 'bearish') {
            matchedCriteria.push('MACD Bearish');
            score += 15;
          } else if (macdSignal !== indicators.macd?.signal) {
            continue;
          }
        }

        // Filtres moyennes mobiles
        if (aboveSMA20 && stock.price <= indicators.sma20) continue;
        if (aboveSMA20 && stock.price > indicators.sma20) {
          matchedCriteria.push('Above SMA20');
          score += 5;
        }

        if (aboveSMA50 && stock.price <= indicators.sma50) continue;
        if (aboveSMA50 && stock.price > indicators.sma50) {
          matchedCriteria.push('Above SMA50');
          score += 10;
        }

        if (aboveSMA200 && stock.price <= indicators.sma200) continue;
        if (aboveSMA200 && stock.price > indicators.sma200) {
          matchedCriteria.push('Above SMA200');
          score += 15;
        }

        // Golden Cross / Death Cross
        if (goldenCross && indicators.sma50 <= indicators.sma200) continue;
        if (goldenCross && indicators.sma50 > indicators.sma200) {
          matchedCriteria.push('Golden Cross');
          score += 20;
        }

        if (deathCross && indicators.sma50 >= indicators.sma200) continue;
        if (deathCross && indicators.sma50 < indicators.sma200) {
          matchedCriteria.push('Death Cross');
          score += 20;
        }

        // Filtre ATR
        if (atrMin !== undefined && indicators.atr < atrMin) continue;
        if (atrMax !== undefined && indicators.atr > atrMax) continue;

        // Filtre Stochastic
        if (stochasticOversold && indicators.stochastic?.k < 20) {
          matchedCriteria.push('Stochastic Oversold');
          score += 10;
        }

        if (stochasticOverbought && indicators.stochastic?.k > 80) {
          matchedCriteria.push('Stochastic Overbought');
          score += 10;
        }

        // Ajouter aux résultats
        results.push({
          ...stock,
          score,
          matchedCriteria,
          indicators: {
            rsi: indicators.rsi,
            macd: indicators.macd,
            sma20: indicators.sma20,
            sma50: indicators.sma50,
            sma200: indicators.sma200,
            atr: indicators.atr,
            stochastic: indicators.stochastic
          }
        });

      } catch (error) {
        console.error(`Erreur lors du screening de ${stock.ticker}:`, error.message);
      }
    }

    // Trier par score décroissant
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Récupère les indicateurs techniques pour un ticker
   */
  async getTechnicalIndicators(ticker) {
    try {
      const rsi = await this.technicalService.calculateRSI(ticker);
      const macd = await this.technicalService.calculateMACD(ticker);
      const sma = await this.technicalService.calculateMovingAverages(ticker);
      const atr = await this.technicalService.calculateATR(ticker);
      const stochastic = await this.technicalService.calculateStochastic(ticker);

      return {
        rsi: rsi.current,
        macd: {
          value: macd.current,
          signal: macd.signal,
          histogram: macd.histogram
        },
        sma20: sma.sma20,
        sma50: sma.sma50,
        sma200: sma.sma200,
        atr: atr.current,
        stochastic: {
          k: stochastic.k,
          d: stochastic.d
        }
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Sauvegarde un scan
   */
  saveScan(userId, name, description, filters, isPublic = false) {
    try {
      const result = this.db.prepare(`
        INSERT INTO saved_scans (user_id, name, description, filters, is_public)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        userId,
        name,
        description,
        JSON.stringify(filters),
        isPublic ? 1 : 0
      );

      return {
        success: true,
        scanId: result.lastInsertRowid,
        message: 'Scan sauvegardé avec succès'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Récupère les scans sauvegardés d'un utilisateur
   */
  getSavedScans(userId, includePublic = true) {
    let query = `
      SELECT
        s.*,
        u.username as creator_name
      FROM saved_scans s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
    `;

    const params = [userId];

    if (includePublic) {
      query += ` OR s.is_public = 1`;
    }

    query += ` ORDER BY s.created_at DESC`;

    const scans = this.db.prepare(query).all(...params);

    return scans.map(scan => ({
      ...scan,
      filters: JSON.parse(scan.filters)
    }));
  }

  /**
   * Supprime un scan
   */
  deleteScan(scanId, userId) {
    const result = this.db.prepare(`
      DELETE FROM saved_scans
      WHERE id = ? AND user_id = ?
    `).run(scanId, userId);

    if (result.changes > 0) {
      // Supprimer aussi les résultats associés
      this.db.prepare(`
        DELETE FROM scan_results WHERE scan_id = ?
      `).run(scanId);

      return { success: true, message: 'Scan supprimé' };
    }

    return { success: false, message: 'Scan non trouvé ou accès refusé' };
  }

  /**
   * Crée une alerte
   */
  createAlert(userId, ticker, alertType, condition, targetValue, message = null) {
    try {
      const result = this.db.prepare(`
        INSERT INTO stock_alerts
          (user_id, ticker, alert_type, condition, target_value, message)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, ticker, alertType, condition, targetValue, message);

      return {
        success: true,
        alertId: result.lastInsertRowid,
        message: 'Alerte créée avec succès'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Récupère les alertes d'un utilisateur
   */
  getUserAlerts(userId, status = 'active') {
    const query = `
      SELECT * FROM stock_alerts
      WHERE user_id = ? AND status = ?
      ORDER BY created_at DESC
    `;

    return this.db.prepare(query).all(userId, status);
  }

  /**
   * Vérifie les alertes et déclenche si conditions remplies
   */
  async checkAlerts() {
    const activeAlerts = this.db.prepare(`
      SELECT * FROM stock_alerts WHERE status = 'active'
    `).all();

    const triggered = [];

    for (const alert of activeAlerts) {
      try {
        let currentValue;

        // Récupérer la valeur actuelle selon le type d'alerte
        switch (alert.alert_type) {
          case 'price':
            const stock = this.db.prepare(`
              SELECT price FROM stocks WHERE symbol = ?
            `).get(alert.ticker);
            currentValue = stock?.price;
            break;

          case 'rsi':
            const rsi = await this.technicalService.calculateRSI(alert.ticker);
            currentValue = rsi.current;
            break;

          case 'volume':
            const volStock = this.db.prepare(`
              SELECT volume FROM stocks WHERE symbol = ?
            `).get(alert.ticker);
            currentValue = volStock?.volume;
            break;

          default:
            continue;
        }

        if (!currentValue) continue;

        // Vérifier la condition
        let shouldTrigger = false;

        switch (alert.condition) {
          case 'above':
            shouldTrigger = currentValue > alert.target_value;
            break;
          case 'below':
            shouldTrigger = currentValue < alert.target_value;
            break;
          case 'equals':
            shouldTrigger = Math.abs(currentValue - alert.target_value) < 0.01;
            break;
        }

        if (shouldTrigger) {
          // Déclencher l'alerte
          this.db.prepare(`
            UPDATE stock_alerts
            SET status = 'triggered',
                current_value = ?,
                triggered_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(currentValue, alert.id);

          triggered.push({
            ...alert,
            current_value: currentValue
          });
        }

      } catch (error) {
        console.error(`Erreur vérification alerte ${alert.id}:`, error.message);
      }
    }

    return triggered;
  }

  /**
   * Annule une alerte
   */
  cancelAlert(alertId, userId) {
    const result = this.db.prepare(`
      UPDATE stock_alerts
      SET status = 'cancelled'
      WHERE id = ? AND user_id = ?
    `).run(alertId, userId);

    if (result.changes > 0) {
      return { success: true, message: 'Alerte annulée' };
    }

    return { success: false, message: 'Alerte non trouvée ou accès refusé' };
  }

  /**
   * Scans prédéfinis populaires
   */
  getPresetScans() {
    return {
      momentum: {
        name: 'Momentum Trading',
        description: 'Actions avec forte dynamique haussière',
        filters: {
          rsiMin: 50,
          rsiMax: 70,
          macdSignal: 'bullish',
          aboveSMA20: true,
          aboveSMA50: true,
          volumeMin: 100000
        }
      },

      oversold: {
        name: 'Oversold Bounce',
        description: 'Actions survendues prêtes à rebondir',
        filters: {
          rsiOversold: true,
          stochasticOversold: true,
          changePercentMin: -10,
          changePercentMax: -2
        }
      },

      goldenCross: {
        name: 'Golden Cross',
        description: 'SMA50 vient de croiser au-dessus de SMA200',
        filters: {
          goldenCross: true,
          aboveSMA50: true
        }
      },

      highVolatility: {
        name: 'High Volatility',
        description: 'Actions très volatiles pour day trading',
        filters: {
          atrMin: 5,
          volumeMin: 500000,
          changePercentMin: -15,
          changePercentMax: 15
        }
      },

      breakout: {
        name: 'Breakout Candidates',
        description: 'Actions cassant leurs résistances',
        filters: {
          aboveSMA20: true,
          aboveSMA50: true,
          aboveSMA200: true,
          rsiMin: 60,
          volumeMin: 200000
        }
      },

      valueStocks: {
        name: 'Value Stocks',
        description: 'Actions sous-évaluées',
        filters: {
          changePercentMax: 0,
          rsiMax: 50,
          priceMax: 100
        }
      }
    };
  }
}

module.exports = StockScreenerService;
