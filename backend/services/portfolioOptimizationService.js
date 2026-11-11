const Database = require('better-sqlite3');
const path = require('path');

/**
 * Portfolio Optimization Service - Phase 3.4
 *
 * Modern Portfolio Theory (MPT) et optimisation de portefeuille:
 * - Frontière efficiente
 * - Ratio de Sharpe maximisé
 * - Portfolio à variance minimale
 * - Allocation optimale
 * - Corrélation entre actifs
 * - Value at Risk (VaR)
 * - Rééquilibrage
 */
class PortfolioOptimizationService {
  constructor() {
    const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  initializeTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS optimized_portfolios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        tickers TEXT NOT NULL,
        weights TEXT NOT NULL,
        expected_return REAL,
        volatility REAL,
        sharpe_ratio REAL,
        optimization_method TEXT,
        constraints TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_optimized_portfolios_user
        ON optimized_portfolios(user_id, created_at DESC);
    `);

    console.log('✅ Portfolio Optimization tables initialized');
  }

  /**
   * Calcule la matrice de corrélation entre actifs
   */
  calculateCorrelationMatrix(tickers, days = 252) {
    const returns = {};

    // Récupérer les rendements pour chaque ticker
    for (const ticker of tickers) {
      const data = this.db.prepare(`
        SELECT close, date FROM extended_market_data
        WHERE ticker = ?
        ORDER BY date DESC
        LIMIT ?
      `).all(ticker, days + 1);

      if (data.length < 2) continue;

      data.reverse();
      returns[ticker] = [];

      for (let i = 1; i < data.length; i++) {
        const dailyReturn = (data[i].close - data[i - 1].close) / data[i - 1].close;
        returns[ticker].push(dailyReturn);
      }
    }

    // Calculer la matrice de corrélation
    const matrix = {};

    for (const ticker1 of tickers) {
      matrix[ticker1] = {};

      for (const ticker2 of tickers) {
        if (!returns[ticker1] || !returns[ticker2]) {
          matrix[ticker1][ticker2] = 0;
          continue;
        }

        matrix[ticker1][ticker2] = this.calculateCorrelation(
          returns[ticker1],
          returns[ticker2]
        );
      }
    }

    return matrix;
  }

  /**
   * Calcule la corrélation entre deux séries
   */
  calculateCorrelation(x, y) {
    const n = Math.min(x.length, y.length);

    if (n === 0) return 0;

    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;

      numerator += diffX * diffY;
      denomX += diffX * diffX;
      denomY += diffY * diffY;
    }

    const denom = Math.sqrt(denomX * denomY);
    return denom === 0 ? 0 : numerator / denom;
  }

  /**
   * Calcule rendement et volatilité attendus
   */
  calculateExpectedReturns(tickers, days = 252) {
    const stats = {};

    for (const ticker of tickers) {
      const data = this.db.prepare(`
        SELECT close FROM extended_market_data
        WHERE ticker = ?
        ORDER BY date DESC
        LIMIT ?
      `).all(ticker, days + 1);

      if (data.length < 2) {
        stats[ticker] = { return: 0, volatility: 0 };
        continue;
      }

      data.reverse();
      const returns = [];

      for (let i = 1; i < data.length; i++) {
        const dailyReturn = (data[i].close - data[i - 1].close) / data[i - 1].close;
        returns.push(dailyReturn);
      }

      const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance);

      // Annualiser (252 jours de trading)
      stats[ticker] = {
        return: meanReturn * 252 * 100, // En %
        volatility: volatility * Math.sqrt(252) * 100 // En %
      };
    }

    return stats;
  }

  /**
   * Optimise le portefeuille pour maximiser le ratio de Sharpe
   */
  optimizeMaxSharpe(tickers, riskFreeRate = 0) {
    const stats = this.calculateExpectedReturns(tickers);
    const correlation = this.calculateCorrelationMatrix(tickers);

    // Algorithme simplifié: tester plusieurs allocations
    const numIterations = 10000;
    let bestSharpe = -Infinity;
    let bestWeights = null;
    let bestReturn = 0;
    let bestVolatility = 0;

    for (let i = 0; i < numIterations; i++) {
      // Générer poids aléatoires
      let weights = tickers.map(() => Math.random());
      const sum = weights.reduce((s, w) => s + w, 0);
      weights = weights.map(w => w / sum); // Normaliser à 100%

      // Calculer rendement du portefeuille
      const portfolioReturn = tickers.reduce((sum, ticker, idx) => {
        return sum + weights[idx] * stats[ticker].return;
      }, 0);

      // Calculer volatilité du portefeuille
      let portfolioVariance = 0;

      for (let j = 0; j < tickers.length; j++) {
        for (let k = 0; k < tickers.length; k++) {
          const corr = correlation[tickers[j]][tickers[k]];
          const vol1 = stats[tickers[j]].volatility;
          const vol2 = stats[tickers[k]].volatility;

          portfolioVariance += weights[j] * weights[k] * vol1 * vol2 * corr;
        }
      }

      const portfolioVolatility = Math.sqrt(portfolioVariance);

      // Calculer Sharpe Ratio
      const sharpeRatio = portfolioVolatility > 0
        ? (portfolioReturn - riskFreeRate) / portfolioVolatility
        : 0;

      if (sharpeRatio > bestSharpe) {
        bestSharpe = sharpeRatio;
        bestWeights = [...weights];
        bestReturn = portfolioReturn;
        bestVolatility = portfolioVolatility;
      }
    }

    // Formatter les résultats
    const allocation = {};
    tickers.forEach((ticker, idx) => {
      allocation[ticker] = bestWeights[idx] * 100; // En %
    });

    return {
      allocation,
      expected_return: bestReturn,
      volatility: bestVolatility,
      sharpe_ratio: bestSharpe,
      optimization_method: 'max_sharpe'
    };
  }

  /**
   * Optimise pour variance minimale
   */
  optimizeMinVariance(tickers) {
    const stats = this.calculateExpectedReturns(tickers);
    const correlation = this.calculateCorrelationMatrix(tickers);

    const numIterations = 10000;
    let minVariance = Infinity;
    let bestWeights = null;
    let bestReturn = 0;
    let bestVolatility = 0;

    for (let i = 0; i < numIterations; i++) {
      let weights = tickers.map(() => Math.random());
      const sum = weights.reduce((s, w) => s + w, 0);
      weights = weights.map(w => w / sum);

      const portfolioReturn = tickers.reduce((sum, ticker, idx) => {
        return sum + weights[idx] * stats[ticker].return;
      }, 0);

      let portfolioVariance = 0;

      for (let j = 0; j < tickers.length; j++) {
        for (let k = 0; k < tickers.length; k++) {
          const corr = correlation[tickers[j]][tickers[k]];
          const vol1 = stats[tickers[j]].volatility;
          const vol2 = stats[tickers[k]].volatility;

          portfolioVariance += weights[j] * weights[k] * vol1 * vol2 * corr;
        }
      }

      if (portfolioVariance < minVariance) {
        minVariance = portfolioVariance;
        bestWeights = [...weights];
        bestReturn = portfolioReturn;
        bestVolatility = Math.sqrt(portfolioVariance);
      }
    }

    const allocation = {};
    tickers.forEach((ticker, idx) => {
      allocation[ticker] = bestWeights[idx] * 100;
    });

    const sharpeRatio = bestVolatility > 0 ? bestReturn / bestVolatility : 0;

    return {
      allocation,
      expected_return: bestReturn,
      volatility: bestVolatility,
      sharpe_ratio: sharpeRatio,
      optimization_method: 'min_variance'
    };
  }

  /**
   * Portfolio équipondéré (Equal Weight)
   */
  equalWeightPortfolio(tickers) {
    const stats = this.calculateExpectedReturns(tickers);
    const correlation = this.calculateCorrelationMatrix(tickers);

    const weight = 1 / tickers.length;
    const weights = tickers.map(() => weight);

    const portfolioReturn = tickers.reduce((sum, ticker) => {
      return sum + weight * stats[ticker].return;
    }, 0);

    let portfolioVariance = 0;

    for (let j = 0; j < tickers.length; j++) {
      for (let k = 0; k < tickers.length; k++) {
        const corr = correlation[tickers[j]][tickers[k]];
        const vol1 = stats[tickers[j]].volatility;
        const vol2 = stats[tickers[k]].volatility;

        portfolioVariance += weights[j] * weights[k] * vol1 * vol2 * corr;
      }
    }

    const portfolioVolatility = Math.sqrt(portfolioVariance);
    const sharpeRatio = portfolioVolatility > 0 ? portfolioReturn / portfolioVolatility : 0;

    const allocation = {};
    tickers.forEach(ticker => {
      allocation[ticker] = weight * 100;
    });

    return {
      allocation,
      expected_return: portfolioReturn,
      volatility: portfolioVolatility,
      sharpe_ratio: sharpeRatio,
      optimization_method: 'equal_weight'
    };
  }

  /**
   * Calcule Value at Risk (VaR)
   */
  calculateVaR(tickers, weights, confidence = 0.95, days = 1) {
    const stats = this.calculateExpectedReturns(tickers);
    const correlation = this.calculateCorrelationMatrix(tickers);

    // Rendement attendu du portefeuille
    const portfolioReturn = tickers.reduce((sum, ticker, idx) => {
      return sum + weights[idx] * stats[ticker].return;
    }, 0);

    // Volatilité du portefeuille
    let portfolioVariance = 0;

    for (let j = 0; j < tickers.length; j++) {
      for (let k = 0; k < tickers.length; k++) {
        const corr = correlation[tickers[j]][tickers[k]];
        const vol1 = stats[tickers[j]].volatility;
        const vol2 = stats[tickers[k]].volatility;

        portfolioVariance += weights[j] * weights[k] * vol1 * vol2 * corr;
      }
    }

    const portfolioVolatility = Math.sqrt(portfolioVariance);

    // VaR paramétrique (distribution normale)
    const zScore = confidence === 0.95 ? 1.645 : (confidence === 0.99 ? 2.326 : 1.645);
    const dailyReturn = portfolioReturn / 252;
    const dailyVolatility = portfolioVolatility / Math.sqrt(252);

    const VaR = dailyReturn - zScore * dailyVolatility * Math.sqrt(days);

    return {
      VaR: VaR * 100, // En %
      confidence: confidence * 100,
      time_horizon: days,
      interpretation: `${confidence * 100}% de confiance que la perte ne dépassera pas ${Math.abs(VaR * 100).toFixed(2)}% sur ${days} jour(s)`
    };
  }

  /**
   * Sauvegarde un portfolio optimisé
   */
  saveOptimizedPortfolio(userId, name, tickers, result) {
    const stmt = this.db.prepare(`
      INSERT INTO optimized_portfolios (
        user_id, name, tickers, weights, expected_return,
        volatility, sharpe_ratio, optimization_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      name,
      JSON.stringify(tickers),
      JSON.stringify(result.allocation),
      result.expected_return,
      result.volatility,
      result.sharpe_ratio,
      result.optimization_method
    );
  }

  /**
   * Récupère les portfolios optimisés d'un utilisateur
   */
  getUserPortfolios(userId, limit = 50) {
    const portfolios = this.db.prepare(`
      SELECT * FROM optimized_portfolios
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);

    return portfolios.map(p => ({
      ...p,
      tickers: JSON.parse(p.tickers),
      weights: JSON.parse(p.weights)
    }));
  }
}

module.exports = PortfolioOptimizationService;
