/**
 * Service de Calcul des Indicateurs Techniques
 * Utilise technicalindicators pour tous les calculs
 *
 * Indicateurs disponibles:
 * - RSI (Relative Strength Index)
 * - MACD (Moving Average Convergence Divergence)
 * - Bollinger Bands
 * - SMA/EMA (Simple/Exponential Moving Averages)
 * - Stochastic
 * - ATR (Average True Range)
 * - OBV (On-Balance Volume)
 * - VWAP (Volume Weighted Average Price)
 */

const ti = require('technicalindicators');
const Database = require('better-sqlite3');
const path = require('path');

// Database configuration
const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

class TechnicalIndicatorService {
  /**
   * Récupère les données OHLCV pour un ticker
   */
  async getOHLCVData(ticker, period = '1M', limit = 200) {
    const query = `
      SELECT
        date,
        open,
        high,
        low,
        close,
        volume
      FROM market_history_data
      WHERE ticker = ?
      ORDER BY date DESC
      LIMIT ?
    `;

    const rows = db.prepare(query).all(ticker, limit);

    // Inverser pour avoir ordre chronologique
    return rows.reverse();
  }

  /**
   * Calcule le RSI (Relative Strength Index)
   * @param {string} ticker - Symbol de l'action
   * @param {number} period - Période (défaut: 14)
   * @returns {Object} RSI values et signal
   */
  async calculateRSI(ticker, period = 14) {
    const data = await this.getOHLCVData(ticker, '1M', 200);

    if (data.length < period + 1) {
      throw new Error('Pas assez de données pour calculer RSI');
    }

    const closes = data.map(d => parseFloat(d.close));

    const rsiValues = ti.RSI.calculate({
      values: closes,
      period: period
    });

    const currentRSI = rsiValues[rsiValues.length - 1];

    // Déterminer le signal
    let signal = 'neutral';
    if (currentRSI > 70) signal = 'overbought'; // Sur-acheté
    if (currentRSI < 30) signal = 'oversold';   // Sur-vendu

    return {
      indicator: 'RSI',
      period,
      current: currentRSI,
      signal,
      values: rsiValues.slice(-50), // Garder 50 dernières valeurs
      interpretation: this.interpretRSI(currentRSI),
      dates: data.slice(-50).map(d => d.date)
    };
  }

  /**
   * Calcule le MACD
   * @param {string} ticker
   * @param {number} fastPeriod - Défaut: 12
   * @param {number} slowPeriod - Défaut: 26
   * @param {number} signalPeriod - Défaut: 9
   */
  async calculateMACD(ticker, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const data = await this.getOHLCVData(ticker, '1M', 200);

    if (data.length < slowPeriod + signalPeriod) {
      throw new Error('Pas assez de données pour calculer MACD');
    }

    const closes = data.map(d => parseFloat(d.close));

    const macdValues = ti.MACD.calculate({
      values: closes,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });

    const current = macdValues[macdValues.length - 1];
    const previous = macdValues[macdValues.length - 2];

    // Déterminer crossover
    let signal = 'neutral';
    if (current && previous) {
      if (current.MACD > current.signal && previous.MACD <= previous.signal) {
        signal = 'bullish_cross'; // Croisement haussier
      } else if (current.MACD < current.signal && previous.MACD >= previous.signal) {
        signal = 'bearish_cross'; // Croisement baissier
      } else if (current.MACD > current.signal) {
        signal = 'bullish';
      } else {
        signal = 'bearish';
      }
    }

    return {
      indicator: 'MACD',
      fastPeriod,
      slowPeriod,
      signalPeriod,
      current: current || {},
      signal,
      values: macdValues.slice(-50),
      interpretation: this.interpretMACD(current, signal),
      dates: data.slice(-50).map(d => d.date)
    };
  }

  /**
   * Calcule les Bollinger Bands
   */
  async calculateBollingerBands(ticker, period = 20, stdDev = 2) {
    const data = await this.getOHLCVData(ticker, '1M', 200);

    if (data.length < period) {
      throw new Error('Pas assez de données pour calculer Bollinger Bands');
    }

    const closes = data.map(d => parseFloat(d.close));

    const bbValues = ti.BollingerBands.calculate({
      period,
      values: closes,
      stdDev
    });

    const current = bbValues[bbValues.length - 1];
    const currentPrice = closes[closes.length - 1];

    // Déterminer position par rapport aux bandes
    let signal = 'neutral';
    let position = 0;

    if (current) {
      const bandwidth = current.upper - current.lower;
      const relativePosition = (currentPrice - current.lower) / bandwidth;
      position = relativePosition;

      if (currentPrice >= current.upper) signal = 'overbought';
      else if (currentPrice <= current.lower) signal = 'oversold';
      else if (relativePosition > 0.8) signal = 'near_upper';
      else if (relativePosition < 0.2) signal = 'near_lower';
    }

    return {
      indicator: 'BollingerBands',
      period,
      stdDev,
      current: current || {},
      currentPrice,
      signal,
      position,
      values: bbValues.slice(-50),
      interpretation: this.interpretBollingerBands(current, currentPrice, signal),
      dates: data.slice(-50).map(d => d.date)
    };
  }

  /**
   * Calcule les Moving Averages (SMA et EMA)
   */
  async calculateMovingAverages(ticker, periods = [20, 50, 100, 200]) {
    const data = await this.getOHLCVData(ticker, '6M', 250);

    if (data.length < Math.max(...periods)) {
      throw new Error('Pas assez de données pour calculer toutes les MA');
    }

    const closes = data.map(d => parseFloat(d.close));
    const currentPrice = closes[closes.length - 1];

    const results = {
      indicator: 'MovingAverages',
      currentPrice,
      sma: {},
      ema: {},
      signals: [],
      dates: data.slice(-100).map(d => d.date)
    };

    // Calculer SMA et EMA pour chaque période
    for (const period of periods) {
      // SMA
      const smaValues = ti.SMA.calculate({
        period,
        values: closes
      });
      const currentSMA = smaValues[smaValues.length - 1];
      results.sma[`ma${period}`] = {
        value: currentSMA,
        values: smaValues.slice(-100),
        signal: currentPrice > currentSMA ? 'above' : 'below'
      };

      // EMA
      const emaValues = ti.EMA.calculate({
        period,
        values: closes
      });
      const currentEMA = emaValues[emaValues.length - 1];
      results.ema[`ema${period}`] = {
        value: currentEMA,
        values: emaValues.slice(-100),
        signal: currentPrice > currentEMA ? 'above' : 'below'
      };
    }

    // Détecter golden cross / death cross (MA50 vs MA200)
    if (periods.includes(50) && periods.includes(200)) {
      const sma50 = results.sma.ma50.values;
      const sma200 = results.sma.ma200.values;

      if (sma50.length > 1 && sma200.length > 1) {
        const current50 = sma50[sma50.length - 1];
        const current200 = sma200[sma200.length - 1];
        const prev50 = sma50[sma50.length - 2];
        const prev200 = sma200[sma200.length - 2];

        if (current50 > current200 && prev50 <= prev200) {
          results.signals.push({
            type: 'golden_cross',
            description: 'MA50 a croisé MA200 à la hausse - Signal très haussier',
            strength: 'strong_bullish'
          });
        } else if (current50 < current200 && prev50 >= prev200) {
          results.signals.push({
            type: 'death_cross',
            description: 'MA50 a croisé MA200 à la baisse - Signal très baissier',
            strength: 'strong_bearish'
          });
        }
      }
    }

    results.interpretation = this.interpretMovingAverages(results);

    return results;
  }

  /**
   * Calcule le Stochastic Oscillator
   */
  async calculateStochastic(ticker, period = 14, signalPeriod = 3) {
    const data = await this.getOHLCVData(ticker, '1M', 200);

    if (data.length < period) {
      throw new Error('Pas assez de données pour calculer Stochastic');
    }

    const highs = data.map(d => parseFloat(d.high));
    const lows = data.map(d => parseFloat(d.low));
    const closes = data.map(d => parseFloat(d.close));

    const stochValues = ti.Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period,
      signalPeriod
    });

    const current = stochValues[stochValues.length - 1];

    let signal = 'neutral';
    if (current) {
      if (current.k > 80) signal = 'overbought';
      else if (current.k < 20) signal = 'oversold';
    }

    return {
      indicator: 'Stochastic',
      period,
      signalPeriod,
      current: current || {},
      signal,
      values: stochValues.slice(-50),
      interpretation: this.interpretStochastic(current, signal),
      dates: data.slice(-50).map(d => d.date)
    };
  }

  /**
   * Calcule l'ATR (Average True Range) - Mesure de volatilité
   */
  async calculateATR(ticker, period = 14) {
    const data = await this.getOHLCVData(ticker, '1M', 200);

    if (data.length < period) {
      throw new Error('Pas assez de données pour calculer ATR');
    }

    const highs = data.map(d => parseFloat(d.high));
    const lows = data.map(d => parseFloat(d.low));
    const closes = data.map(d => parseFloat(d.close));

    const atrValues = ti.ATR.calculate({
      high: highs,
      low: lows,
      close: closes,
      period
    });

    const currentATR = atrValues[atrValues.length - 1];
    const currentPrice = closes[closes.length - 1];
    const atrPercent = (currentATR / currentPrice) * 100;

    // Évaluer volatilité
    let volatility = 'normal';
    if (atrPercent > 5) volatility = 'high';
    else if (atrPercent > 3) volatility = 'elevated';
    else if (atrPercent < 1) volatility = 'low';

    return {
      indicator: 'ATR',
      period,
      current: currentATR,
      currentPrice,
      atrPercent,
      volatility,
      values: atrValues.slice(-50),
      interpretation: this.interpretATR(currentATR, atrPercent, volatility),
      dates: data.slice(-50).map(d => d.date)
    };
  }

  /**
   * Calcule OBV (On-Balance Volume)
   */
  async calculateOBV(ticker) {
    const data = await this.getOHLCVData(ticker, '3M', 200);

    const closes = data.map(d => parseFloat(d.close));
    const volumes = data.map(d => parseFloat(d.volume || 0));

    const obvValues = ti.OBV.calculate({
      close: closes,
      volume: volumes
    });

    const current = obvValues[obvValues.length - 1];

    // Calculer tendance OBV (20 derniers jours)
    const recent = obvValues.slice(-20);
    const trend = recent[recent.length - 1] > recent[0] ? 'bullish' : 'bearish';

    return {
      indicator: 'OBV',
      current,
      trend,
      values: obvValues.slice(-50),
      interpretation: this.interpretOBV(trend),
      dates: data.slice(-50).map(d => d.date)
    };
  }

  /**
   * Analyse technique complète - Tous les indicateurs
   */
  async getCompleteAnalysis(ticker) {
    try {
      const [rsi, macd, bb, ma, stoch, atr, obv] = await Promise.all([
        this.calculateRSI(ticker).catch(e => ({ error: e.message })),
        this.calculateMACD(ticker).catch(e => ({ error: e.message })),
        this.calculateBollingerBands(ticker).catch(e => ({ error: e.message })),
        this.calculateMovingAverages(ticker).catch(e => ({ error: e.message })),
        this.calculateStochastic(ticker).catch(e => ({ error: e.message })),
        this.calculateATR(ticker).catch(e => ({ error: e.message })),
        this.calculateOBV(ticker).catch(e => ({ error: e.message }))
      ]);

      // Score global (0-100)
      const overallScore = this.calculateOverallScore({
        rsi, macd, bb, ma, stoch, obv
      });

      return {
        ticker,
        timestamp: new Date().toISOString(),
        indicators: {
          rsi,
          macd,
          bollingerBands: bb,
          movingAverages: ma,
          stochastic: stoch,
          atr,
          obv
        },
        overallScore,
        recommendation: this.getRecommendation(overallScore)
      };
    } catch (error) {
      throw new Error(`Erreur analyse complète: ${error.message}`);
    }
  }

  // ===== FONCTIONS D'INTERPRÉTATION =====

  interpretRSI(value) {
    if (value > 70) return 'Sur-acheté - Possible correction à la baisse';
    if (value > 60) return 'Fort momentum haussier';
    if (value > 50) return 'Momentum haussier modéré';
    if (value > 40) return 'Momentum neutre';
    if (value > 30) return 'Momentum baissier modéré';
    if (value > 20) return 'Fort momentum baissier';
    return 'Sur-vendu - Possible rebond technique';
  }

  interpretMACD(current, signal) {
    if (!current) return 'Données insuffisantes';

    if (signal === 'bullish_cross') return 'Croisement haussier - Signal d\'achat';
    if (signal === 'bearish_cross') return 'Croisement baissier - Signal de vente';
    if (signal === 'bullish') return 'Tendance haussière confirmée';
    if (signal === 'bearish') return 'Tendance baissière confirmée';
    return 'Momentum neutre';
  }

  interpretBollingerBands(current, price, signal) {
    if (!current) return 'Données insuffisantes';

    if (signal === 'overbought') return 'Prix au niveau de la bande supérieure - Possible retournement';
    if (signal === 'oversold') return 'Prix au niveau de la bande inférieure - Possible rebond';
    if (signal === 'near_upper') return 'Prix proche de la bande supérieure - Prudence';
    if (signal === 'near_lower') return 'Prix proche de la bande inférieure - Opportunité potentielle';
    return 'Prix dans la zone neutre';
  }

  interpretMovingAverages(results) {
    const { currentPrice, sma } = results;

    let interpretation = '';

    if (sma.ma20 && sma.ma50 && sma.ma200) {
      const above20 = currentPrice > sma.ma20.value;
      const above50 = currentPrice > sma.ma50.value;
      const above200 = currentPrice > sma.ma200.value;

      if (above20 && above50 && above200) {
        interpretation = 'Tendance haussière forte - Prix au-dessus de toutes les MA';
      } else if (!above20 && !above50 && !above200) {
        interpretation = 'Tendance baissière forte - Prix en-dessous de toutes les MA';
      } else if (above20 && above50) {
        interpretation = 'Tendance haussière court/moyen terme';
      } else if (!above20 && !above50) {
        interpretation = 'Tendance baissière court/moyen terme';
      } else {
        interpretation = 'Tendance mixte - Consolidation possible';
      }
    }

    return interpretation;
  }

  interpretStochastic(current, signal) {
    if (!current) return 'Données insuffisantes';

    if (signal === 'overbought') return 'Sur-acheté - Possible correction';
    if (signal === 'oversold') return 'Sur-vendu - Possible rebond';
    return 'Zone neutre';
  }

  interpretATR(value, percent, volatility) {
    return `Volatilité ${volatility === 'high' ? 'élevée' : volatility === 'low' ? 'faible' : 'normale'} (${percent.toFixed(2)}%)`;
  }

  interpretOBV(trend) {
    if (trend === 'bullish') return 'Volume confirme la tendance haussière';
    if (trend === 'bearish') return 'Volume confirme la tendance baissière';
    return 'Volume neutre';
  }

  // ===== SCORE ET RECOMMANDATION =====

  calculateOverallScore(indicators) {
    let score = 50; // Score neutre de base
    let factors = 0;

    // RSI (poids: 20%)
    if (indicators.rsi && !indicators.rsi.error) {
      factors++;
      if (indicators.rsi.signal === 'oversold') score += 10;
      else if (indicators.rsi.signal === 'overbought') score -= 10;
      else if (indicators.rsi.current > 50) score += 5;
      else if (indicators.rsi.current < 50) score -= 5;
    }

    // MACD (poids: 20%)
    if (indicators.macd && !indicators.macd.error) {
      factors++;
      if (indicators.macd.signal === 'bullish_cross') score += 15;
      else if (indicators.macd.signal === 'bearish_cross') score -= 15;
      else if (indicators.macd.signal === 'bullish') score += 7;
      else if (indicators.macd.signal === 'bearish') score -= 7;
    }

    // Bollinger Bands (poids: 15%)
    if (indicators.bb && !indicators.bb.error) {
      factors++;
      if (indicators.bb.signal === 'oversold') score += 10;
      else if (indicators.bb.signal === 'overbought') score -= 10;
    }

    // Moving Averages (poids: 25%)
    if (indicators.ma && !indicators.ma.error) {
      factors++;
      const signals = indicators.ma.signals || [];
      if (signals.some(s => s.type === 'golden_cross')) score += 20;
      if (signals.some(s => s.type === 'death_cross')) score -= 20;
    }

    // Stochastic (poids: 10%)
    if (indicators.stoch && !indicators.stoch.error) {
      factors++;
      if (indicators.stoch.signal === 'oversold') score += 5;
      else if (indicators.stoch.signal === 'overbought') score -= 5;
    }

    // OBV (poids: 10%)
    if (indicators.obv && !indicators.obv.error) {
      factors++;
      if (indicators.obv.trend === 'bullish') score += 5;
      else if (indicators.obv.trend === 'bearish') score -= 5;
    }

    // Normaliser le score entre 0 et 100
    return Math.max(0, Math.min(100, score));
  }

  getRecommendation(score) {
    if (score >= 70) return {
      action: 'BUY',
      strength: 'STRONG',
      message: 'Signaux techniques très positifs - Forte opportunité d\'achat'
    };
    if (score >= 60) return {
      action: 'BUY',
      strength: 'MODERATE',
      message: 'Signaux techniques positifs - Opportunité d\'achat'
    };
    if (score >= 50) return {
      action: 'HOLD',
      strength: 'NEUTRAL',
      message: 'Signaux mixtes - Attendre confirmation'
    };
    if (score >= 40) return {
      action: 'SELL',
      strength: 'MODERATE',
      message: 'Signaux techniques négatifs - Envisager de vendre'
    };
    return {
      action: 'SELL',
      strength: 'STRONG',
      message: 'Signaux techniques très négatifs - Forte recommandation de vente'
    };
  }
}

module.exports = new TechnicalIndicatorService();
