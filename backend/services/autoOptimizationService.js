const Database = require('better-sqlite3');
const path = require('path');
const BacktestingService = require('./backtestingService');

/**
 * Auto-Optimization Service - Phase 4.3
 *
 * Optimise automatiquement les stratégies de trading
 *
 * Fonctionnalités:
 * - Optimisation automatique de paramètres
 * - Walk-forward validation
 * - Adaptive parameter tuning
 * - Multi-objective optimization
 * - Performance tracking
 */
class AutoOptimizationService {
  constructor(dbPath = null) {
    const defaultPath = path.join(__dirname, '..', 'data', 'pendo.db');
    this.db = new Database(dbPath || defaultPath);
    this.backtestingService = new BacktestingService();
    this.initDatabase();
  }

  /**
   * Initialise les tables de la base de données
   */
  initDatabase() {
    // Table des optimisations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS strategy_optimizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        strategy_type TEXT NOT NULL,
        optimization_type TEXT NOT NULL,
        parameter_space TEXT NOT NULL,
        best_params TEXT NOT NULL,
        best_score REAL NOT NULL,
        metric_optimized TEXT NOT NULL,
        total_combinations_tested INTEGER,
        validation_score REAL,
        is_validated BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des adaptive strategies
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS adaptive_strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        strategy_type TEXT NOT NULL,
        current_params TEXT NOT NULL,
        performance_score REAL,
        market_regime TEXT,
        last_adapted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        adaptation_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1
      )
    `);

    // Index
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_opt_ticker ON strategy_optimizations(ticker);
      CREATE INDEX IF NOT EXISTS idx_adaptive_ticker ON adaptive_strategies(ticker);
    `);
  }

  /**
   * Optimisation grid search
   */
  async gridSearchOptimization(config) {
    const {
      ticker,
      strategyType,
      parameterSpace,
      startDate,
      endDate,
      optimizationMetric = 'sharpe_ratio',
      maxCombinations = 100,
      initialCapital = 100000
    } = config;

    console.log(`🔧 Grid Search Optimization pour ${ticker} - ${strategyType}...`);
    console.log(`   Métrique: ${optimizationMetric}`);

    // Générer combinaisons de paramètres
    const combinations = this.generateParameterCombinations(parameterSpace);

    if (combinations.length > maxCombinations) {
      // Échantillonnage aléatoire si trop de combinaisons
      console.log(`   ${combinations.length} combinaisons possibles (limité à ${maxCombinations})`);
      this.shuffleArray(combinations);
      combinations.splice(maxCombinations);
    } else {
      console.log(`   ${combinations.length} combinaisons à tester`);
    }

    const results = [];

    for (let i = 0; i < combinations.length; i++) {
      const params = combinations[i];

      try {
        const backtest = await this.backtestingService.runBacktest({
          ticker,
          strategyType,
          strategyParams: params,
          startDate,
          endDate,
          initialCapital
        });

        const score = this.getMetricValue(backtest.metrics, optimizationMetric);

        results.push({
          params,
          score,
          metrics: backtest.metrics
        });

        if ((i + 1) % 10 === 0) {
          console.log(`   Progression: ${i + 1}/${combinations.length}`);
        }
      } catch (error) {
        console.error(`   Erreur avec params ${JSON.stringify(params)}:`, error.message);
      }
    }

    // Trier par score
    results.sort((a, b) => b.score - a.score);

    const bestResult = results[0];

    // Sauvegarder l'optimisation
    const optId = this.saveOptimization(
      ticker,
      strategyType,
      'grid_search',
      parameterSpace,
      bestResult.params,
      bestResult.score,
      optimizationMetric,
      results.length
    );

    return {
      optimization_id: optId,
      ticker,
      strategy_type: strategyType,
      optimization_metric: optimizationMetric,
      total_tested: results.length,
      best_params: bestResult.params,
      best_score: bestResult.score,
      best_metrics: bestResult.metrics,
      top_10: results.slice(0, 10).map(r => ({
        params: r.params,
        score: r.score
      }))
    };
  }

  /**
   * Optimisation génétique (algorithme génétique simplifié)
   */
  async geneticOptimization(config) {
    const {
      ticker,
      strategyType,
      parameterSpace,
      startDate,
      endDate,
      optimizationMetric = 'sharpe_ratio',
      populationSize = 20,
      generations = 10,
      initialCapital = 100000
    } = config;

    console.log(`🧬 Genetic Optimization pour ${ticker} - ${strategyType}...`);
    console.log(`   Population: ${populationSize}, Générations: ${generations}`);

    // Générer population initiale
    let population = [];
    for (let i = 0; i < populationSize; i++) {
      population.push(this.randomParameters(parameterSpace));
    }

    let bestOverall = null;
    let bestOverallScore = -Infinity;

    for (let gen = 0; gen < generations; gen++) {
      console.log(`   Génération ${gen + 1}/${generations}...`);

      // Évaluer population
      const evaluated = [];
      for (const params of population) {
        try {
          const backtest = await this.backtestingService.runBacktest({
            ticker,
            strategyType,
            strategyParams: params,
            startDate,
            endDate,
            initialCapital
          });

          const score = this.getMetricValue(backtest.metrics, optimizationMetric);

          evaluated.push({
            params,
            score,
            metrics: backtest.metrics
          });

          if (score > bestOverallScore) {
            bestOverallScore = score;
            bestOverall = { params, score, metrics: backtest.metrics };
          }
        } catch (error) {
          evaluated.push({ params, score: -Infinity });
        }
      }

      // Trier par score
      evaluated.sort((a, b) => b.score - a.score);

      // Sélection: garder les 50% meilleurs
      const selected = evaluated.slice(0, Math.floor(populationSize / 2));

      // Génération suivante: élites + mutations + crossovers
      const nextGen = [];

      // Élites (10%)
      nextGen.push(...selected.slice(0, Math.floor(populationSize * 0.1)).map(e => e.params));

      // Mutations (40%)
      while (nextGen.length < populationSize * 0.5) {
        const parent = selected[Math.floor(Math.random() * selected.length)];
        nextGen.push(this.mutateParameters(parent.params, parameterSpace));
      }

      // Crossovers (50%)
      while (nextGen.length < populationSize) {
        const parent1 = selected[Math.floor(Math.random() * selected.length)];
        const parent2 = selected[Math.floor(Math.random() * selected.length)];
        nextGen.push(this.crossoverParameters(parent1.params, parent2.params));
      }

      population = nextGen;
    }

    // Sauvegarder
    const optId = this.saveOptimization(
      ticker,
      strategyType,
      'genetic',
      parameterSpace,
      bestOverall.params,
      bestOverallScore,
      optimizationMetric,
      populationSize * generations
    );

    return {
      optimization_id: optId,
      ticker,
      strategy_type: strategyType,
      optimization_metric: optimizationMetric,
      generations: generations,
      total_evaluated: populationSize * generations,
      best_params: bestOverall.params,
      best_score: bestOverallScore,
      best_metrics: bestOverall.metrics
    };
  }

  /**
   * Adaptive Strategy: ajuste automatiquement les paramètres selon les conditions de marché
   */
  async adaptiveStrategy(config) {
    const {
      ticker,
      strategyType,
      baseParams,
      lookbackPeriod = 60,
      reoptimizationInterval = 30,
      initialCapital = 100000
    } = config;

    console.log(`🎯 Adaptive Strategy pour ${ticker} - ${strategyType}...`);

    // Détecter le régime de marché
    const marketRegime = await this.detectMarketRegime(ticker, lookbackPeriod);

    console.log(`   Régime de marché: ${marketRegime.regime}`);

    // Vérifier si une stratégie adaptative existe
    let adaptiveStrategy = this.db.prepare(`
      SELECT * FROM adaptive_strategies
      WHERE ticker = ? AND strategy_type = ? AND is_active = 1
    `).get(ticker, strategyType);

    let shouldReoptimize = false;

    if (!adaptiveStrategy) {
      shouldReoptimize = true;
    } else {
      // Vérifier si dernière adaptation date de plus de reoptimizationInterval jours
      const lastAdapted = new Date(adaptiveStrategy.last_adapted_at);
      const daysSince = (Date.now() - lastAdapted.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince >= reoptimizationInterval) {
        shouldReoptimize = true;
      }

      // Vérifier si régime de marché a changé
      if (adaptiveStrategy.market_regime !== marketRegime.regime) {
        shouldReoptimize = true;
      }
    }

    let optimizedParams = baseParams;
    let performanceScore = 0;

    if (shouldReoptimize) {
      console.log(`   Ré-optimisation nécessaire...`);

      // Définir espace de paramètres basé sur stratégie
      const parameterSpace = this.getDefaultParameterSpace(strategyType);

      // Optimiser
      const optimization = await this.gridSearchOptimization({
        ticker,
        strategyType,
        parameterSpace,
        startDate: marketRegime.periodStart,
        endDate: marketRegime.periodEnd,
        optimizationMetric: 'sharpe_ratio',
        maxCombinations: 50,
        initialCapital
      });

      optimizedParams = optimization.best_params;
      performanceScore = optimization.best_score;

      // Sauvegarder/mettre à jour stratégie adaptative
      if (adaptiveStrategy) {
        this.db.prepare(`
          UPDATE adaptive_strategies
          SET current_params = ?,
              performance_score = ?,
              market_regime = ?,
              last_adapted_at = datetime('now'),
              adaptation_count = adaptation_count + 1
          WHERE id = ?
        `).run(
          JSON.stringify(optimizedParams),
          performanceScore,
          marketRegime.regime,
          adaptiveStrategy.id
        );
      } else {
        this.db.prepare(`
          INSERT INTO adaptive_strategies (ticker, strategy_type, current_params, performance_score, market_regime, adaptation_count)
          VALUES (?, ?, ?, ?, ?, 1)
        `).run(ticker, strategyType, JSON.stringify(optimizedParams), performanceScore, marketRegime.regime);
      }
    } else {
      console.log(`   Utilisation des paramètres existants`);
      optimizedParams = JSON.parse(adaptiveStrategy.current_params);
      performanceScore = adaptiveStrategy.performance_score;
    }

    return {
      ticker,
      strategy_type: strategyType,
      market_regime: marketRegime.regime,
      market_characteristics: marketRegime.characteristics,
      optimized_params: optimizedParams,
      performance_score: performanceScore,
      reoptimized: shouldReoptimize,
      recommendation: performanceScore > 1 ? 'DEPLOY' : performanceScore > 0.5 ? 'TEST' : 'AVOID'
    };
  }

  /**
   * Détecte le régime de marché (trending, ranging, volatile)
   */
  async detectMarketRegime(ticker, lookbackDays = 60) {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Récupérer données
    const stock = this.db.prepare('SELECT id FROM stocks WHERE symbol = ?').get(ticker);
    if (!stock) {
      throw new Error(`Ticker ${ticker} introuvable`);
    }

    const data = this.db.prepare(`
      SELECT close, high, low
      FROM market_history_data
      WHERE market_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(stock.id, lookbackDays);

    if (data.length < 20) {
      return { regime: 'unknown', characteristics: {}, periodStart: startDate, periodEnd: endDate };
    }

    data.reverse();

    const closes = data.map(d => d.close);

    // Calculer tendance
    const firstPrice = closes[0];
    const lastPrice = closes[closes.length - 1];
    const trend = (lastPrice - firstPrice) / firstPrice * 100;

    // Calculer volatilité
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    const volatility = this.standardDeviation(returns) * Math.sqrt(252) * 100;

    // Calculer ADX simplifié (Average Directional Index)
    let upMoves = 0;
    let downMoves = 0;
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) upMoves++;
      if (closes[i] < closes[i - 1]) downMoves++;
    }
    const directionalStrength = Math.abs(upMoves - downMoves) / closes.length;

    // Déterminer régime
    let regime;
    if (directionalStrength > 0.4 && Math.abs(trend) > 5) {
      regime = trend > 0 ? 'uptrend' : 'downtrend';
    } else if (volatility > 30) {
      regime = 'volatile';
    } else {
      regime = 'ranging';
    }

    return {
      regime,
      characteristics: {
        trend_pct: trend,
        volatility_pct: volatility,
        directional_strength: directionalStrength
      },
      periodStart: startDate,
      periodEnd: endDate
    };
  }

  /**
   * Obtient l'espace de paramètres par défaut pour une stratégie
   */
  getDefaultParameterSpace(strategyType) {
    const spaces = {
      sma_crossover: {
        shortPeriod: [5, 10, 15, 20],
        longPeriod: [30, 40, 50, 60]
      },
      rsi_oversold: {
        period: [10, 14, 20],
        oversoldLevel: [20, 25, 30],
        overboughtLevel: [70, 75, 80]
      },
      macd_crossover: {
        fastPeriod: [8, 12, 16],
        slowPeriod: [20, 26, 30],
        signalPeriod: [7, 9, 11]
      },
      bollinger_bounce: {
        period: [15, 20, 25],
        stdDev: [1.5, 2, 2.5]
      },
      golden_cross: {
        shortPeriod: [40, 50, 60],
        longPeriod: [180, 200, 220]
      },
      momentum: {
        lookbackPeriod: [10, 14, 20],
        threshold: [0.02, 0.03, 0.05]
      }
    };

    return spaces[strategyType] || {};
  }

  /**
   * Fonctions utilitaires
   */
  generateParameterCombinations(paramSpace) {
    const keys = Object.keys(paramSpace);
    if (keys.length === 0) return [{}];

    const combinations = [];

    function generate(index, current) {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }

      const key = keys[index];
      const values = paramSpace[key];

      for (const value of values) {
        current[key] = value;
        generate(index + 1, current);
      }
    }

    generate(0, {});
    return combinations;
  }

  randomParameters(paramSpace) {
    const params = {};
    for (const [key, values] of Object.entries(paramSpace)) {
      params[key] = values[Math.floor(Math.random() * values.length)];
    }
    return params;
  }

  mutateParameters(params, paramSpace, mutationRate = 0.3) {
    const mutated = { ...params };
    for (const key of Object.keys(params)) {
      if (Math.random() < mutationRate) {
        const values = paramSpace[key];
        mutated[key] = values[Math.floor(Math.random() * values.length)];
      }
    }
    return mutated;
  }

  crossoverParameters(params1, params2) {
    const child = {};
    for (const key of Object.keys(params1)) {
      child[key] = Math.random() > 0.5 ? params1[key] : params2[key];
    }
    return child;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  standardDeviation(values) {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  getMetricValue(metrics, metricName) {
    const map = {
      'sharpe_ratio': metrics.sharpeRatio,
      'total_return': metrics.totalReturnPct,
      'win_rate': metrics.winRate,
      'profit_factor': metrics.profitFactor,
      'alpha': metrics.alpha
    };
    return map[metricName] || 0;
  }

  saveOptimization(ticker, strategyType, optimizationType, parameterSpace, bestParams, bestScore, metricOptimized, totalCombinations) {
    const result = this.db.prepare(`
      INSERT INTO strategy_optimizations (
        ticker, strategy_type, optimization_type, parameter_space,
        best_params, best_score, metric_optimized, total_combinations_tested
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ticker,
      strategyType,
      optimizationType,
      JSON.stringify(parameterSpace),
      JSON.stringify(bestParams),
      bestScore,
      metricOptimized,
      totalCombinations
    );

    return result.lastInsertRowid;
  }

  getOptimizations(ticker, limit = 10) {
    return this.db.prepare(`
      SELECT * FROM strategy_optimizations
      WHERE ticker = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(ticker, limit);
  }

  getAdaptiveStrategies(ticker = null) {
    if (ticker) {
      return this.db.prepare(`
        SELECT * FROM adaptive_strategies
        WHERE ticker = ? AND is_active = 1
      `).all(ticker);
    } else {
      return this.db.prepare(`
        SELECT * FROM adaptive_strategies
        WHERE is_active = 1
        ORDER BY performance_score DESC
      `).all();
    }
  }
}

module.exports = AutoOptimizationService;
