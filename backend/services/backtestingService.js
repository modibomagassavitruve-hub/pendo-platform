const Database = require('better-sqlite3');
const path = require('path');
const ti = require('technicalindicators');

/**
 * Backtesting Engine - Phase 3.1
 *
 * Permet de tester des stratégies de trading sur données historiques
 *
 * Fonctionnalités:
 * - Exécution de stratégies personnalisées
 * - Stratégies prédéfinies (SMA Crossover, RSI, MACD, etc.)
 * - Gestion complète des positions (buy/sell)
 * - Calcul de métriques de performance
 * - Support des frais de transaction
 * - Stop-loss et take-profit
 * - Position sizing
 */
class BacktestingService {
  constructor() {
    const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  /**
   * Initialise les tables pour le backtesting
   */
  initializeTables() {
    this.db.exec(`
      -- Table pour sauvegarder les backtests
      CREATE TABLE IF NOT EXISTS backtests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        ticker TEXT NOT NULL,
        strategy_type TEXT NOT NULL,
        strategy_params TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        initial_capital REAL NOT NULL,
        commission_rate REAL DEFAULT 0.001,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      -- Table pour les résultats de backtest
      CREATE TABLE IF NOT EXISTS backtest_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backtest_id INTEGER NOT NULL,
        total_return REAL,
        total_return_pct REAL,
        annualized_return REAL,
        sharpe_ratio REAL,
        max_drawdown REAL,
        max_drawdown_pct REAL,
        win_rate REAL,
        profit_factor REAL,
        total_trades INTEGER,
        winning_trades INTEGER,
        losing_trades INTEGER,
        avg_win REAL,
        avg_loss REAL,
        largest_win REAL,
        largest_loss REAL,
        avg_trade_duration REAL,
        buy_and_hold_return REAL,
        alpha REAL,
        final_capital REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(backtest_id) REFERENCES backtests(id) ON DELETE CASCADE
      );

      -- Table pour les trades individuels du backtest
      CREATE TABLE IF NOT EXISTS backtest_trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backtest_id INTEGER NOT NULL,
        entry_date DATE NOT NULL,
        exit_date DATE,
        entry_price REAL NOT NULL,
        exit_price REAL,
        quantity INTEGER NOT NULL,
        side TEXT NOT NULL,
        pnl REAL,
        pnl_pct REAL,
        commission REAL,
        entry_reason TEXT,
        exit_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(backtest_id) REFERENCES backtests(id) ON DELETE CASCADE
      );

      -- Table pour l'équité au fil du temps
      CREATE TABLE IF NOT EXISTS backtest_equity_curve (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backtest_id INTEGER NOT NULL,
        date DATE NOT NULL,
        equity REAL NOT NULL,
        cash REAL NOT NULL,
        position_value REAL NOT NULL,
        drawdown REAL,
        drawdown_pct REAL,
        FOREIGN KEY(backtest_id) REFERENCES backtests(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_backtests_user ON backtests(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_backtest_results ON backtest_results(backtest_id);
      CREATE INDEX IF NOT EXISTS idx_backtest_trades ON backtest_trades(backtest_id, entry_date);
      CREATE INDEX IF NOT EXISTS idx_backtest_equity ON backtest_equity_curve(backtest_id, date);
    `);

    console.log('✅ Backtesting tables initialized');
  }

  /**
   * Exécute un backtest avec une stratégie donnée
   *
   * @param {Object} config - Configuration du backtest
   * @returns {Object} Résultats du backtest
   */
  async runBacktest(config) {
    const {
      userId = null,
      name,
      description = '',
      ticker,
      strategyType,
      strategyParams = {},
      startDate,
      endDate,
      initialCapital = 100000,
      commissionRate = 0.001, // 0.1% par défaut
      stopLoss = null, // % ou null
      takeProfit = null, // % ou null
      positionSize = 1.0 // 1.0 = 100% du capital disponible
    } = config;

    // 1. Créer l'entrée backtest
    const backtestId = this.createBacktest({
      userId,
      name,
      description,
      ticker,
      strategyType,
      strategyParams,
      startDate,
      endDate,
      initialCapital,
      commissionRate
    });

    try {
      // 2. Récupérer les données historiques
      const historicalData = this.getHistoricalData(ticker, startDate, endDate);

      if (historicalData.length === 0) {
        throw new Error(`Aucune donnée historique trouvée pour ${ticker} entre ${startDate} et ${endDate}`);
      }

      console.log(`📊 Backtest ${backtestId}: ${historicalData.length} jours de données pour ${ticker}`);

      // 3. Calculer les indicateurs techniques
      const dataWithIndicators = await this.calculateIndicators(historicalData);

      // 4. Exécuter la stratégie
      const strategyFunction = this.getStrategyFunction(strategyType);
      const signals = strategyFunction(dataWithIndicators, strategyParams);

      // 5. Simuler les trades
      const simulation = this.simulateTrades({
        data: dataWithIndicators,
        signals,
        initialCapital,
        commissionRate,
        stopLoss,
        takeProfit,
        positionSize,
        backtestId
      });

      // 6. Calculer les métriques de performance
      const metrics = this.calculateMetrics({
        trades: simulation.trades,
        equityCurve: simulation.equityCurve,
        initialCapital,
        startDate,
        endDate,
        ticker
      });

      // 7. Sauvegarder les résultats
      this.saveBacktestResults(backtestId, metrics, simulation);

      // 8. Marquer comme complété
      this.db.prepare(`
        UPDATE backtests
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(backtestId);

      return {
        success: true,
        backtestId,
        ticker,
        strategyType,
        metrics,
        trades: simulation.trades,
        equityCurve: simulation.equityCurve
      };

    } catch (error) {
      // Marquer comme échoué
      this.db.prepare(`
        UPDATE backtests
        SET status = 'failed'
        WHERE id = ?
      `).run(backtestId);

      throw error;
    }
  }

  /**
   * Crée une entrée backtest dans la base de données
   */
  createBacktest(config) {
    const stmt = this.db.prepare(`
      INSERT INTO backtests (
        user_id, name, description, ticker, strategy_type,
        strategy_params, start_date, end_date, initial_capital, commission_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      config.userId,
      config.name,
      config.description,
      config.ticker,
      config.strategyType,
      JSON.stringify(config.strategyParams),
      config.startDate,
      config.endDate,
      config.initialCapital,
      config.commissionRate
    );

    return result.lastInsertRowid;
  }

  /**
   * Récupère les données historiques pour le backtest
   */
  getHistoricalData(ticker, startDate, endDate) {
    const stmt = this.db.prepare(`
      SELECT
        date,
        open,
        high,
        low,
        close,
        volume,
        adjusted_close
      FROM extended_market_data
      WHERE ticker = ?
        AND date >= ?
        AND date <= ?
      ORDER BY date ASC
    `);

    return stmt.all(ticker, startDate, endDate);
  }

  /**
   * Calcule les indicateurs techniques sur les données
   */
  async calculateIndicators(data) {
    if (data.length === 0) return data;

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);

    // Calculer tous les indicateurs en une fois avec technicalindicators
    const sma20 = ti.SMA.calculate({ period: 20, values: closes });
    const sma50 = ti.SMA.calculate({ period: 50, values: closes });
    const sma200 = ti.SMA.calculate({ period: 200, values: closes });
    const ema12 = ti.EMA.calculate({ period: 12, values: closes });
    const ema26 = ti.EMA.calculate({ period: 26, values: closes });
    const rsi = ti.RSI.calculate({ period: 14, values: closes });
    const macd = ti.MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    const bb = ti.BollingerBands.calculate({
      period: 20,
      values: closes,
      stdDev: 2
    });
    const stoch = ti.Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
      signalPeriod: 3
    });

    // Ajouter les indicateurs à chaque point de données
    // Les indicateurs ont des longueurs différentes à cause des périodes de warmup
    return data.map((d, i) => {
      const sma20Index = i - (closes.length - sma20.length);
      const sma50Index = i - (closes.length - sma50.length);
      const sma200Index = i - (closes.length - sma200.length);
      const ema12Index = i - (closes.length - ema12.length);
      const ema26Index = i - (closes.length - ema26.length);
      const rsiIndex = i - (closes.length - rsi.length);
      const macdIndex = i - (closes.length - macd.length);
      const bbIndex = i - (closes.length - bb.length);
      const stochIndex = i - (closes.length - stoch.length);

      return {
        ...d,
        sma20: sma20Index >= 0 ? sma20[sma20Index] : null,
        sma50: sma50Index >= 0 ? sma50[sma50Index] : null,
        sma200: sma200Index >= 0 ? sma200[sma200Index] : null,
        ema12: ema12Index >= 0 ? ema12[ema12Index] : null,
        ema26: ema26Index >= 0 ? ema26[ema26Index] : null,
        rsi: rsiIndex >= 0 ? rsi[rsiIndex] : null,
        macd: macdIndex >= 0 && macd[macdIndex] ? macd[macdIndex].MACD : null,
        macd_signal: macdIndex >= 0 && macd[macdIndex] ? macd[macdIndex].signal : null,
        macd_histogram: macdIndex >= 0 && macd[macdIndex] ? macd[macdIndex].histogram : null,
        bb_upper: bbIndex >= 0 && bb[bbIndex] ? bb[bbIndex].upper : null,
        bb_middle: bbIndex >= 0 && bb[bbIndex] ? bb[bbIndex].middle : null,
        bb_lower: bbIndex >= 0 && bb[bbIndex] ? bb[bbIndex].lower : null,
        stoch_k: stochIndex >= 0 && stoch[stochIndex] ? stoch[stochIndex].k : null,
        stoch_d: stochIndex >= 0 && stoch[stochIndex] ? stoch[stochIndex].d : null
      };
    });
  }

  /**
   * Retourne la fonction de stratégie appropriée
   */
  getStrategyFunction(strategyType) {
    const strategies = {
      sma_crossover: this.strategySMACrossover.bind(this),
      rsi_oversold: this.strategyRSIOversold.bind(this),
      macd_crossover: this.strategyMACDCrossover.bind(this),
      bollinger_bounce: this.strategyBollingerBounce.bind(this),
      golden_cross: this.strategyGoldenCross.bind(this),
      momentum: this.strategyMomentum.bind(this),
      mean_reversion: this.strategyMeanReversion.bind(this),
      breakout: this.strategyBreakout.bind(this)
    };

    if (!strategies[strategyType]) {
      throw new Error(`Stratégie inconnue: ${strategyType}`);
    }

    return strategies[strategyType];
  }

  /**
   * STRATÉGIE 1: SMA Crossover
   * Achat quand SMA courte croise au-dessus de SMA longue
   * Vente quand SMA courte croise en-dessous de SMA longue
   */
  strategySMACrossover(data, params = {}) {
    const { shortPeriod = 20, longPeriod = 50 } = params;
    const signals = [];

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];

      const shortSMA = shortPeriod === 20 ? curr.sma20 : curr.sma50;
      const longSMA = longPeriod === 50 ? curr.sma50 : curr.sma200;
      const prevShortSMA = shortPeriod === 20 ? prev.sma20 : prev.sma50;
      const prevLongSMA = longPeriod === 50 ? prev.sma50 : prev.sma200;

      if (!shortSMA || !longSMA || !prevShortSMA || !prevLongSMA) continue;

      // Signal d'achat: crossover haussier
      if (prevShortSMA <= prevLongSMA && shortSMA > longSMA) {
        signals.push({
          date: curr.date,
          type: 'buy',
          price: curr.close,
          reason: `SMA${shortPeriod} croise au-dessus de SMA${longPeriod}`
        });
      }

      // Signal de vente: crossover baissier
      if (prevShortSMA >= prevLongSMA && shortSMA < longSMA) {
        signals.push({
          date: curr.date,
          type: 'sell',
          price: curr.close,
          reason: `SMA${shortPeriod} croise en-dessous de SMA${longPeriod}`
        });
      }
    }

    return signals;
  }

  /**
   * STRATÉGIE 2: RSI Oversold/Overbought
   * Achat quand RSI < seuil survendu
   * Vente quand RSI > seuil suracheté
   */
  strategyRSIOversold(data, params = {}) {
    const { oversoldThreshold = 30, overboughtThreshold = 70 } = params;
    const signals = [];

    for (let i = 1; i < data.length; i++) {
      const curr = data[i];

      if (!curr.rsi) continue;

      // Signal d'achat: RSI survendu
      if (curr.rsi < oversoldThreshold) {
        signals.push({
          date: curr.date,
          type: 'buy',
          price: curr.close,
          reason: `RSI survendu (${curr.rsi.toFixed(2)})`
        });
      }

      // Signal de vente: RSI suracheté
      if (curr.rsi > overboughtThreshold) {
        signals.push({
          date: curr.date,
          type: 'sell',
          price: curr.close,
          reason: `RSI suracheté (${curr.rsi.toFixed(2)})`
        });
      }
    }

    return signals;
  }

  /**
   * STRATÉGIE 3: MACD Crossover
   * Achat quand MACD croise au-dessus du signal
   * Vente quand MACD croise en-dessous du signal
   */
  strategyMACDCrossover(data, params = {}) {
    const signals = [];

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];

      if (!curr.macd || !curr.macd_signal || !prev.macd || !prev.macd_signal) continue;

      // Signal d'achat: MACD croise au-dessus du signal
      if (prev.macd <= prev.macd_signal && curr.macd > curr.macd_signal) {
        signals.push({
          date: curr.date,
          type: 'buy',
          price: curr.close,
          reason: 'MACD croise au-dessus du signal'
        });
      }

      // Signal de vente: MACD croise en-dessous du signal
      if (prev.macd >= prev.macd_signal && curr.macd < curr.macd_signal) {
        signals.push({
          date: curr.date,
          type: 'sell',
          price: curr.close,
          reason: 'MACD croise en-dessous du signal'
        });
      }
    }

    return signals;
  }

  /**
   * STRATÉGIE 4: Bollinger Bounce
   * Achat quand prix touche bande inférieure
   * Vente quand prix touche bande supérieure
   */
  strategyBollingerBounce(data, params = {}) {
    const signals = [];

    for (let i = 0; i < data.length; i++) {
      const curr = data[i];

      if (!curr.bb_upper || !curr.bb_lower) continue;

      // Signal d'achat: prix touche bande inférieure
      if (curr.low <= curr.bb_lower) {
        signals.push({
          date: curr.date,
          type: 'buy',
          price: curr.close,
          reason: 'Prix touche bande de Bollinger inférieure'
        });
      }

      // Signal de vente: prix touche bande supérieure
      if (curr.high >= curr.bb_upper) {
        signals.push({
          date: curr.date,
          type: 'sell',
          price: curr.close,
          reason: 'Prix touche bande de Bollinger supérieure'
        });
      }
    }

    return signals;
  }

  /**
   * STRATÉGIE 5: Golden Cross
   * Achat quand SMA50 croise au-dessus de SMA200 (Golden Cross)
   * Vente quand SMA50 croise en-dessous de SMA200 (Death Cross)
   */
  strategyGoldenCross(data, params = {}) {
    const signals = [];

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];

      if (!curr.sma50 || !curr.sma200 || !prev.sma50 || !prev.sma200) continue;

      // Golden Cross
      if (prev.sma50 <= prev.sma200 && curr.sma50 > curr.sma200) {
        signals.push({
          date: curr.date,
          type: 'buy',
          price: curr.close,
          reason: 'Golden Cross (SMA50 > SMA200)'
        });
      }

      // Death Cross
      if (prev.sma50 >= prev.sma200 && curr.sma50 < curr.sma200) {
        signals.push({
          date: curr.date,
          type: 'sell',
          price: curr.close,
          reason: 'Death Cross (SMA50 < SMA200)'
        });
      }
    }

    return signals;
  }

  /**
   * STRATÉGIE 6: Momentum
   * Combinaison RSI > 50, MACD positif, prix > SMA20
   */
  strategyMomentum(data, params = {}) {
    const { rsiThreshold = 50 } = params;
    const signals = [];

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];

      if (!curr.rsi || !curr.macd || !curr.sma20) continue;

      const bullishMomentum = curr.rsi > rsiThreshold && curr.macd > 0 && curr.close > curr.sma20;
      const prevBullishMomentum = prev.rsi > rsiThreshold && prev.macd > 0 && prev.close > prev.sma20;

      // Signal d'achat: momentum devient haussier
      if (!prevBullishMomentum && bullishMomentum) {
        signals.push({
          date: curr.date,
          type: 'buy',
          price: curr.close,
          reason: 'Momentum haussier confirmé'
        });
      }

      // Signal de vente: momentum devient baissier
      if (prevBullishMomentum && !bullishMomentum) {
        signals.push({
          date: curr.date,
          type: 'sell',
          price: curr.close,
          reason: 'Momentum haussier perdu'
        });
      }
    }

    return signals;
  }

  /**
   * STRATÉGIE 7: Mean Reversion
   * Achat quand prix s'écarte trop de la moyenne (oversold)
   * Vente quand prix revient vers la moyenne
   */
  strategyMeanReversion(data, params = {}) {
    const { deviationThreshold = 2 } = params; // Écart en écarts-types
    const signals = [];

    for (let i = 0; i < data.length; i++) {
      const curr = data[i];

      if (!curr.bb_middle || !curr.bb_lower || !curr.bb_upper) continue;

      const bbWidth = curr.bb_upper - curr.bb_lower;
      const deviationFromMean = (curr.close - curr.bb_middle) / (bbWidth / 4);

      // Signal d'achat: prix trop bas par rapport à la moyenne
      if (deviationFromMean < -deviationThreshold) {
        signals.push({
          date: curr.date,
          type: 'buy',
          price: curr.close,
          reason: `Prix ${Math.abs(deviationFromMean).toFixed(1)} σ sous la moyenne`
        });
      }

      // Signal de vente: prix revient vers ou au-dessus de la moyenne
      if (deviationFromMean > 0) {
        signals.push({
          date: curr.date,
          type: 'sell',
          price: curr.close,
          reason: 'Prix revenu vers la moyenne'
        });
      }
    }

    return signals;
  }

  /**
   * STRATÉGIE 8: Breakout
   * Achat quand prix casse au-dessus du plus haut sur N jours avec volume élevé
   * Vente quand prix casse en-dessous du plus bas sur N jours
   */
  strategyBreakout(data, params = {}) {
    const { lookbackPeriod = 20, volumeMultiplier = 1.5 } = params;
    const signals = [];

    for (let i = lookbackPeriod; i < data.length; i++) {
      const curr = data[i];
      const lookbackData = data.slice(i - lookbackPeriod, i);

      const highestHigh = Math.max(...lookbackData.map(d => d.high));
      const lowestLow = Math.min(...lookbackData.map(d => d.low));
      const avgVolume = lookbackData.reduce((sum, d) => sum + d.volume, 0) / lookbackPeriod;

      // Signal d'achat: breakout haussier avec volume
      if (curr.close > highestHigh && curr.volume > avgVolume * volumeMultiplier) {
        signals.push({
          date: curr.date,
          type: 'buy',
          price: curr.close,
          reason: `Breakout haussier (plus haut ${lookbackPeriod}j)`
        });
      }

      // Signal de vente: breakout baissier
      if (curr.close < lowestLow) {
        signals.push({
          date: curr.date,
          type: 'sell',
          price: curr.close,
          reason: `Breakout baissier (plus bas ${lookbackPeriod}j)`
        });
      }
    }

    return signals;
  }

  /**
   * Simule l'exécution des trades basés sur les signaux
   */
  simulateTrades(config) {
    const {
      data,
      signals,
      initialCapital,
      commissionRate,
      stopLoss,
      takeProfit,
      positionSize,
      backtestId
    } = config;

    let cash = initialCapital;
    let position = null; // { entryDate, entryPrice, quantity, stopLossPrice, takeProfitPrice }
    const trades = [];
    const equityCurve = [];

    // Créer un index des signaux par date pour accès rapide
    const signalsByDate = {};
    signals.forEach(signal => {
      if (!signalsByDate[signal.date]) {
        signalsByDate[signal.date] = [];
      }
      signalsByDate[signal.date].push(signal);
    });

    // Parcourir toutes les données jour par jour
    for (let i = 0; i < data.length; i++) {
      const curr = data[i];
      let positionValue = 0;

      // Vérifier stop-loss et take-profit si on a une position
      if (position) {
        let exitReason = null;
        let exitPrice = null;

        // Stop-loss déclenché
        if (position.stopLossPrice && curr.low <= position.stopLossPrice) {
          exitPrice = position.stopLossPrice;
          exitReason = `Stop-loss à ${stopLoss}%`;
        }
        // Take-profit déclenché
        else if (position.takeProfitPrice && curr.high >= position.takeProfitPrice) {
          exitPrice = position.takeProfitPrice;
          exitReason = `Take-profit à ${takeProfit}%`;
        }

        // Fermer la position si SL ou TP déclenché
        if (exitReason) {
          const commission = exitPrice * position.quantity * commissionRate;
          const proceeds = exitPrice * position.quantity - commission;
          cash += proceeds;

          const pnl = proceeds - (position.entryPrice * position.quantity);
          const pnlPct = (pnl / (position.entryPrice * position.quantity)) * 100;

          trades.push({
            backtestId,
            entryDate: position.entryDate,
            exitDate: curr.date,
            entryPrice: position.entryPrice,
            exitPrice,
            quantity: position.quantity,
            side: 'long',
            pnl,
            pnlPct,
            commission: position.entryCommission + commission,
            entryReason: position.entryReason,
            exitReason
          });

          position = null;
        } else {
          positionValue = curr.close * position.quantity;
        }
      }

      // Vérifier les signaux pour ce jour
      const daySignals = signalsByDate[curr.date] || [];

      for (const signal of daySignals) {
        // Signal d'achat
        if (signal.type === 'buy' && !position && cash > 0) {
          const investAmount = cash * positionSize;
          const quantity = Math.floor(investAmount / signal.price);

          if (quantity > 0) {
            const cost = signal.price * quantity;
            const commission = cost * commissionRate;
            const totalCost = cost + commission;

            if (totalCost <= cash) {
              cash -= totalCost;

              position = {
                entryDate: signal.date,
                entryPrice: signal.price,
                quantity,
                entryCommission: commission,
                entryReason: signal.reason,
                stopLossPrice: stopLoss ? signal.price * (1 - stopLoss / 100) : null,
                takeProfitPrice: takeProfit ? signal.price * (1 + takeProfit / 100) : null
              };

              positionValue = signal.price * quantity;
            }
          }
        }

        // Signal de vente
        if (signal.type === 'sell' && position) {
          const commission = signal.price * position.quantity * commissionRate;
          const proceeds = signal.price * position.quantity - commission;
          cash += proceeds;

          const pnl = proceeds - (position.entryPrice * position.quantity);
          const pnlPct = (pnl / (position.entryPrice * position.quantity)) * 100;

          trades.push({
            backtestId,
            entryDate: position.entryDate,
            exitDate: signal.date,
            entryPrice: position.entryPrice,
            exitPrice: signal.price,
            quantity: position.quantity,
            side: 'long',
            pnl,
            pnlPct,
            commission: position.entryCommission + commission,
            entryReason: position.entryReason,
            exitReason: signal.reason
          });

          position = null;
          positionValue = 0;
        }
      }

      // Enregistrer l'équité du jour
      const equity = cash + positionValue;
      equityCurve.push({
        backtestId,
        date: curr.date,
        equity,
        cash,
        positionValue
      });
    }

    // Fermer la position finale si elle existe encore
    if (position) {
      const lastDay = data[data.length - 1];
      const commission = lastDay.close * position.quantity * commissionRate;
      const proceeds = lastDay.close * position.quantity - commission;
      cash += proceeds;

      const pnl = proceeds - (position.entryPrice * position.quantity);
      const pnlPct = (pnl / (position.entryPrice * position.quantity)) * 100;

      trades.push({
        backtestId,
        entryDate: position.entryDate,
        exitDate: lastDay.date,
        entryPrice: position.entryPrice,
        exitPrice: lastDay.close,
        quantity: position.quantity,
        side: 'long',
        pnl,
        pnlPct,
        commission: position.entryCommission + commission,
        entryReason: position.entryReason,
        exitReason: 'Position fermée à la fin du backtest'
      });
    }

    return { trades, equityCurve };
  }

  /**
   * Calcule les métriques de performance du backtest
   */
  calculateMetrics(config) {
    const { trades, equityCurve, initialCapital, startDate, endDate, ticker } = config;

    if (trades.length === 0) {
      return {
        totalReturn: 0,
        totalReturnPct: 0,
        annualizedReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        maxDrawdownPct: 0,
        winRate: 0,
        profitFactor: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        avgWin: 0,
        avgLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        avgTradeDuration: 0,
        buyAndHoldReturn: 0,
        alpha: 0,
        finalCapital: equityCurve[equityCurve.length - 1]?.equity || initialCapital
      };
    }

    // Métriques de base
    const finalCapital = equityCurve[equityCurve.length - 1].equity;
    const totalReturn = finalCapital - initialCapital;
    const totalReturnPct = (totalReturn / initialCapital) * 100;

    // Rendement annualisé
    const days = Math.max(1, Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
    const years = days / 365.25;
    const annualizedReturn = (Math.pow(finalCapital / initialCapital, 1 / years) - 1) * 100;

    // Trades gagnants/perdants
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const winRate = (winningTrades.length / trades.length) * 100;

    // PnL moyen
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
      : 0;

    // Plus grand gain/perte
    const largestWin = winningTrades.length > 0
      ? Math.max(...winningTrades.map(t => t.pnl))
      : 0;
    const largestLoss = losingTrades.length > 0
      ? Math.min(...losingTrades.map(t => t.pnl))
      : 0;

    // Profit factor
    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

    // Durée moyenne des trades
    const avgTradeDuration = trades.reduce((sum, t) => {
      const duration = Math.floor((new Date(t.exitDate) - new Date(t.entryDate)) / (1000 * 60 * 60 * 24));
      return sum + duration;
    }, 0) / trades.length;

    // Maximum drawdown
    let peak = initialCapital;
    let maxDrawdown = 0;
    let maxDrawdownPct = 0;

    for (const point of equityCurve) {
      if (point.equity > peak) {
        peak = point.equity;
      }
      const drawdown = peak - point.equity;
      const drawdownPct = (drawdown / peak) * 100;

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPct = drawdownPct;
      }
    }

    // Sharpe Ratio (simplifié, sans taux sans risque)
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const dailyReturn = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
      returns.push(dailyReturn);
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualisé

    // Buy and hold return
    const firstPrice = this.db.prepare(`
      SELECT close FROM extended_market_data
      WHERE ticker = ? AND date >= ?
      ORDER BY date ASC LIMIT 1
    `).get(ticker, startDate);

    const lastPrice = this.db.prepare(`
      SELECT close FROM extended_market_data
      WHERE ticker = ? AND date <= ?
      ORDER BY date DESC LIMIT 1
    `).get(ticker, endDate);

    const buyAndHoldReturn = firstPrice && lastPrice
      ? ((lastPrice.close - firstPrice.close) / firstPrice.close) * 100
      : 0;

    // Alpha (rendement stratégie - buy and hold)
    const alpha = totalReturnPct - buyAndHoldReturn;

    return {
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      totalReturnPct: parseFloat(totalReturnPct.toFixed(2)),
      annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      maxDrawdownPct: parseFloat(maxDrawdownPct.toFixed(2)),
      winRate: parseFloat(winRate.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgWin: parseFloat(avgWin.toFixed(2)),
      avgLoss: parseFloat(avgLoss.toFixed(2)),
      largestWin: parseFloat(largestWin.toFixed(2)),
      largestLoss: parseFloat(largestLoss.toFixed(2)),
      avgTradeDuration: parseFloat(avgTradeDuration.toFixed(1)),
      buyAndHoldReturn: parseFloat(buyAndHoldReturn.toFixed(2)),
      alpha: parseFloat(alpha.toFixed(2)),
      finalCapital: parseFloat(finalCapital.toFixed(2))
    };
  }

  /**
   * Sauvegarde les résultats du backtest
   */
  saveBacktestResults(backtestId, metrics, simulation) {
    // Sauvegarder les métriques
    const metricsStmt = this.db.prepare(`
      INSERT INTO backtest_results (
        backtest_id, total_return, total_return_pct, annualized_return,
        sharpe_ratio, max_drawdown, max_drawdown_pct, win_rate,
        profit_factor, total_trades, winning_trades, losing_trades,
        avg_win, avg_loss, largest_win, largest_loss, avg_trade_duration,
        buy_and_hold_return, alpha, final_capital
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    metricsStmt.run(
      backtestId,
      metrics.totalReturn,
      metrics.totalReturnPct,
      metrics.annualizedReturn,
      metrics.sharpeRatio,
      metrics.maxDrawdown,
      metrics.maxDrawdownPct,
      metrics.winRate,
      metrics.profitFactor,
      metrics.totalTrades,
      metrics.winningTrades,
      metrics.losingTrades,
      metrics.avgWin,
      metrics.avgLoss,
      metrics.largestWin,
      metrics.largestLoss,
      metrics.avgTradeDuration,
      metrics.buyAndHoldReturn,
      metrics.alpha,
      metrics.finalCapital
    );

    // Sauvegarder les trades
    const tradeStmt = this.db.prepare(`
      INSERT INTO backtest_trades (
        backtest_id, entry_date, exit_date, entry_price, exit_price,
        quantity, side, pnl, pnl_pct, commission, entry_reason, exit_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTrades = this.db.transaction((trades) => {
      for (const trade of trades) {
        tradeStmt.run(
          trade.backtestId,
          trade.entryDate,
          trade.exitDate,
          trade.entryPrice,
          trade.exitPrice,
          trade.quantity,
          trade.side,
          trade.pnl,
          trade.pnlPct,
          trade.commission,
          trade.entryReason,
          trade.exitReason
        );
      }
    });
    insertTrades(simulation.trades);

    // Sauvegarder la courbe d'équité
    const equityStmt = this.db.prepare(`
      INSERT INTO backtest_equity_curve (
        backtest_id, date, equity, cash, position_value
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const insertEquity = this.db.transaction((curve) => {
      for (const point of curve) {
        equityStmt.run(
          point.backtestId,
          point.date,
          point.equity,
          point.cash,
          point.positionValue
        );
      }
    });
    insertEquity(simulation.equityCurve);
  }

  /**
   * Récupère un backtest par ID
   */
  getBacktest(backtestId, includeDetails = false) {
    const backtest = this.db.prepare(`
      SELECT * FROM backtests WHERE id = ?
    `).get(backtestId);

    if (!backtest) {
      return null;
    }

    backtest.strategy_params = JSON.parse(backtest.strategy_params);

    if (includeDetails) {
      // Ajouter les résultats
      backtest.results = this.db.prepare(`
        SELECT * FROM backtest_results WHERE backtest_id = ?
      `).get(backtestId);

      // Ajouter les trades
      backtest.trades = this.db.prepare(`
        SELECT * FROM backtest_trades WHERE backtest_id = ? ORDER BY entry_date ASC
      `).all(backtestId);

      // Ajouter la courbe d'équité
      backtest.equityCurve = this.db.prepare(`
        SELECT * FROM backtest_equity_curve WHERE backtest_id = ? ORDER BY date ASC
      `).all(backtestId);
    }

    return backtest;
  }

  /**
   * Liste les backtests pour un utilisateur
   */
  getUserBacktests(userId, limit = 50) {
    const backtests = this.db.prepare(`
      SELECT
        b.*,
        r.total_return_pct,
        r.sharpe_ratio,
        r.win_rate,
        r.total_trades
      FROM backtests b
      LEFT JOIN backtest_results r ON b.id = r.backtest_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
      LIMIT ?
    `).all(userId, limit);

    return backtests.map(bt => {
      bt.strategy_params = JSON.parse(bt.strategy_params);
      return bt;
    });
  }

  /**
   * Supprime un backtest
   */
  deleteBacktest(backtestId) {
    const result = this.db.prepare(`
      DELETE FROM backtests WHERE id = ?
    `).run(backtestId);

    return result.changes > 0;
  }

  /**
   * Obtient les stratégies disponibles
   */
  getAvailableStrategies() {
    return {
      sma_crossover: {
        name: 'SMA Crossover',
        description: 'Achat quand SMA courte croise au-dessus de SMA longue',
        params: {
          shortPeriod: { type: 'number', default: 20, description: 'Période SMA courte' },
          longPeriod: { type: 'number', default: 50, description: 'Période SMA longue' }
        }
      },
      rsi_oversold: {
        name: 'RSI Oversold/Overbought',
        description: 'Achat en zone de survente, vente en zone de surachat',
        params: {
          oversoldThreshold: { type: 'number', default: 30, description: 'Seuil RSI survendu' },
          overboughtThreshold: { type: 'number', default: 70, description: 'Seuil RSI suracheté' }
        }
      },
      macd_crossover: {
        name: 'MACD Crossover',
        description: 'Signaux basés sur le croisement MACD/Signal',
        params: {}
      },
      bollinger_bounce: {
        name: 'Bollinger Bounce',
        description: 'Rebond sur les bandes de Bollinger',
        params: {}
      },
      golden_cross: {
        name: 'Golden Cross',
        description: 'SMA50 croise SMA200 (tendance long terme)',
        params: {}
      },
      momentum: {
        name: 'Momentum Trading',
        description: 'Combinaison RSI, MACD et prix > SMA20',
        params: {
          rsiThreshold: { type: 'number', default: 50, description: 'Seuil RSI minimum' }
        }
      },
      mean_reversion: {
        name: 'Mean Reversion',
        description: 'Retour vers la moyenne mobile',
        params: {
          deviationThreshold: { type: 'number', default: 2, description: 'Écart en σ' }
        }
      },
      breakout: {
        name: 'Breakout',
        description: 'Cassure des plus hauts/bas avec volume',
        params: {
          lookbackPeriod: { type: 'number', default: 20, description: 'Période de lookback' },
          volumeMultiplier: { type: 'number', default: 1.5, description: 'Multiplicateur volume' }
        }
      }
    };
  }
}

module.exports = BacktestingService;
