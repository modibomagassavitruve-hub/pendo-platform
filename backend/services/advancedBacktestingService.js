const BacktestingService = require('./backtestingService');

/**
 * Advanced Backtesting Service - Améliorations Phase 3
 *
 * Fonctionnalités avancées:
 * - Walk-Forward Analysis
 * - Monte Carlo Simulations
 * - Parameter Optimization
 * - Out-of-Sample Testing
 */
class AdvancedBacktestingService extends BacktestingService {
  /**
   * Walk-Forward Analysis
   * Teste la stratégie sur des fenêtres glissantes
   */
  async walkForwardAnalysis(config) {
    const {
      ticker,
      strategyType,
      strategyParams = {},
      startDate,
      endDate,
      windowSize = 252, // 1 an
      stepSize = 63, // 3 mois
      initialCapital = 100000
    } = config;

    const allData = this.getHistoricalData(ticker, startDate, endDate);

    if (allData.length < windowSize * 2) {
      throw new Error('Pas assez de données pour walk-forward analysis');
    }

    const results = [];
    let currentIndex = 0;

    while (currentIndex + windowSize < allData.length) {
      const windowData = allData.slice(currentIndex, currentIndex + windowSize);

      const windowStart = windowData[0].date;
      const windowEnd = windowData[windowData.length - 1].date;

      console.log(`   Fenêtre: ${windowStart} → ${windowEnd}`);

      // Backtester sur cette fenêtre
      const result = await this.runBacktest({
        ticker,
        strategyType,
        strategyParams,
        startDate: windowStart,
        endDate: windowEnd,
        initialCapital,
        commissionRate: 0.001
      });

      results.push({
        window_start: windowStart,
        window_end: windowEnd,
        total_return_pct: result.metrics.totalReturnPct,
        sharpe_ratio: result.metrics.sharpeRatio,
        max_drawdown_pct: result.metrics.maxDrawdownPct,
        win_rate: result.metrics.winRate,
        total_trades: result.metrics.totalTrades
      });

      currentIndex += stepSize;
    }

    // Calculer statistiques globales
    const avgReturn = results.reduce((sum, r) => sum + r.total_return_pct, 0) / results.length;
    const avgSharpe = results.reduce((sum, r) => sum + r.sharpe_ratio, 0) / results.length;
    const avgWinRate = results.reduce((sum, r) => sum + r.win_rate, 0) / results.length;

    const stdReturn = Math.sqrt(
      results.reduce((sum, r) => sum + Math.pow(r.total_return_pct - avgReturn, 2), 0) / results.length
    );

    const winningWindows = results.filter(r => r.total_return_pct > 0).length;
    const consistencyScore = (winningWindows / results.length) * 100;

    return {
      ticker,
      strategy: strategyType,
      windows: results,
      summary: {
        total_windows: results.length,
        avg_return: avgReturn,
        std_return: stdReturn,
        avg_sharpe: avgSharpe,
        avg_win_rate: avgWinRate,
        winning_windows: winningWindows,
        consistency_score: consistencyScore
      }
    };
  }

  /**
   * Monte Carlo Simulation
   * Simule de multiples scénarios en randomisant l'ordre des trades
   */
  async monteCarloSimulation(backtestId, numSimulations = 1000) {
    // Récupérer les trades du backtest original
    const trades = this.db.prepare(`
      SELECT * FROM backtest_trades
      WHERE backtest_id = ?
      ORDER BY entry_date ASC
    `).all(backtestId);

    if (trades.length === 0) {
      throw new Error('Aucun trade trouvé pour ce backtest');
    }

    const backtest = this.getBacktest(backtestId);
    const initialCapital = this.db.prepare(`
      SELECT initial_capital FROM backtests WHERE id = ?
    `).get(backtestId).initial_capital;

    const simResults = [];

    console.log(`🎲 Monte Carlo: ${numSimulations} simulations...`);

    for (let sim = 0; sim < numSimulations; sim++) {
      // Mélanger aléatoirement l'ordre des trades
      const shuffledTrades = this.shuffleArray([...trades]);

      let capital = initialCapital;
      let peak = initialCapital;
      let maxDrawdown = 0;

      // Appliquer les trades dans l'ordre mélangé
      for (const trade of shuffledTrades) {
        capital += trade.pnl;

        if (capital > peak) {
          peak = capital;
        }

        const drawdown = peak - capital;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      const finalReturn = ((capital - initialCapital) / initialCapital) * 100;
      const maxDrawdownPct = (maxDrawdown / peak) * 100;

      simResults.push({
        final_capital: capital,
        total_return_pct: finalReturn,
        max_drawdown_pct: maxDrawdownPct
      });
    }

    // Calculer statistiques
    const returns = simResults.map(r => r.total_return_pct);
    const drawdowns = simResults.map(r => r.max_drawdown_pct);

    returns.sort((a, b) => a - b);
    drawdowns.sort((a, b) => b - a);

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdReturn = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );

    const percentile5 = returns[Math.floor(returns.length * 0.05)];
    const percentile25 = returns[Math.floor(returns.length * 0.25)];
    const percentile50 = returns[Math.floor(returns.length * 0.50)];
    const percentile75 = returns[Math.floor(returns.length * 0.75)];
    const percentile95 = returns[Math.floor(returns.length * 0.95)];

    const worstCase = returns[0];
    const bestCase = returns[returns.length - 1];

    const profitableSimulations = returns.filter(r => r > 0).length;
    const winProbability = (profitableSimulations / numSimulations) * 100;

    return {
      backtest_id: backtestId,
      num_simulations: numSimulations,
      statistics: {
        avg_return: avgReturn,
        std_return: stdReturn,
        best_case: bestCase,
        worst_case: worstCase,
        percentile_5: percentile5,
        percentile_25: percentile25,
        median: percentile50,
        percentile_75: percentile75,
        percentile_95: percentile95,
        win_probability: winProbability,
        avg_drawdown: drawdowns.reduce((sum, d) => sum + d, 0) / drawdowns.length,
        max_drawdown: Math.max(...drawdowns)
      },
      interpretation: {
        confidence_95: `95% de confiance que le rendement sera entre ${percentile5.toFixed(2)}% et ${percentile95.toFixed(2)}%`,
        risk_assessment: winProbability > 70 ? 'Faible' : winProbability > 50 ? 'Modéré' : 'Élevé',
        recommendation: winProbability > 70 && percentile5 > -10 ? 'RECOMMANDÉ' : winProbability > 50 ? 'ACCEPTABLE' : 'NON RECOMMANDÉ'
      }
    };
  }

  /**
   * Parameter Optimization
   * Teste différentes combinaisons de paramètres pour trouver l'optimal
   */
  async optimizeParameters(config) {
    const {
      ticker,
      strategyType,
      paramRanges,
      startDate,
      endDate,
      optimizationMetric = 'sharpe_ratio',
      initialCapital = 100000
    } = config;

    const results = [];

    console.log(`🔧 Optimisation paramètres pour ${strategyType}...`);

    // Générer toutes les combinaisons de paramètres
    const combinations = this.generateParameterCombinations(paramRanges);

    console.log(`   ${combinations.length} combinaisons à tester`);

    for (const params of combinations) {
      try {
        const result = await this.runBacktest({
          ticker,
          strategyType,
          strategyParams: params,
          startDate,
          endDate,
          initialCapital,
          commissionRate: 0.001
        });

        results.push({
          params,
          metrics: result.metrics
        });
      } catch (error) {
        console.error(`Erreur avec params ${JSON.stringify(params)}:`, error.message);
      }
    }

    // Trier par métrique d'optimisation
    results.sort((a, b) => {
      const metricA = a.metrics[optimizationMetric] || -Infinity;
      const metricB = b.metrics[optimizationMetric] || -Infinity;
      return metricB - metricA;
    });

    const best = results[0];
    const worst = results[results.length - 1];

    return {
      ticker,
      strategy: strategyType,
      optimization_metric: optimizationMetric,
      total_combinations: combinations.length,
      best_params: best.params,
      best_metrics: best.metrics,
      worst_params: worst.params,
      worst_metrics: worst.metrics,
      all_results: results.slice(0, 10) // Top 10
    };
  }

  /**
   * Out-of-Sample Testing
   * Teste sur période séparée pour validation
   */
  async outOfSampleTest(config) {
    const {
      ticker,
      strategyType,
      strategyParams,
      inSampleStart,
      inSampleEnd,
      outSampleStart,
      outSampleEnd,
      initialCapital = 100000
    } = config;

    console.log('📊 Out-of-Sample Testing...');

    // In-Sample (optimisation/training)
    console.log('   In-Sample period...');
    const inSample = await this.runBacktest({
      ticker,
      strategyType,
      strategyParams,
      startDate: inSampleStart,
      endDate: inSampleEnd,
      initialCapital
    });

    // Out-of-Sample (validation)
    console.log('   Out-of-Sample period...');
    const outSample = await this.runBacktest({
      ticker,
      strategyType,
      strategyParams,
      startDate: outSampleStart,
      endDate: outSampleEnd,
      initialCapital
    });

    // Comparer les performances
    const returnDegradation = outSample.metrics.totalReturnPct - inSample.metrics.totalReturnPct;
    const sharpeDegradation = outSample.metrics.sharpeRatio - inSample.metrics.sharpeRatio;

    const isOverfitted = returnDegradation < -20 || (inSample.metrics.totalReturnPct > 0 && outSample.metrics.totalReturnPct < -10);

    return {
      ticker,
      strategy: strategyType,
      params: strategyParams,
      in_sample: {
        period: `${inSampleStart} → ${inSampleEnd}`,
        return_pct: inSample.metrics.totalReturnPct,
        sharpe: inSample.metrics.sharpeRatio,
        trades: inSample.metrics.totalTrades
      },
      out_sample: {
        period: `${outSampleStart} → ${outSampleEnd}`,
        return_pct: outSample.metrics.totalReturnPct,
        sharpe: outSample.metrics.sharpeRatio,
        trades: outSample.metrics.totalTrades
      },
      degradation: {
        return_pct: returnDegradation,
        sharpe: sharpeDegradation
      },
      assessment: {
        is_overfitted: isOverfitted,
        robustness: isOverfitted ? 'FAIBLE' : returnDegradation > -10 ? 'BONNE' : 'MODÉRÉE',
        recommendation: !isOverfitted && outSample.metrics.totalReturnPct > 0 ? 'VALIDÉ' : 'NON VALIDÉ'
      }
    };
  }

  /**
   * Fonctions utilitaires
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  generateParameterCombinations(paramRanges) {
    const keys = Object.keys(paramRanges);

    if (keys.length === 0) return [{}];

    const combinations = [];

    function generate(index, current) {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }

      const key = keys[index];
      const values = paramRanges[key];

      for (const value of values) {
        current[key] = value;
        generate(index + 1, current);
      }
    }

    generate(0, {});
    return combinations;
  }
}

module.exports = AdvancedBacktestingService;
