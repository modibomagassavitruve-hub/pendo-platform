const Database = require('better-sqlite3');
const path = require('path');

/**
 * Pattern Recognition Service - Phase 3.2
 *
 * Détection automatique de patterns graphiques classiques:
 * - Head and Shoulders (H&S)
 * - Inverse Head and Shoulders
 * - Double Top
 * - Double Bottom
 * - Triangle Ascendant/Descendant
 * - Flag (Bullish/Bearish)
 * - Wedge (Rising/Falling)
 * - Cup and Handle
 * - Engulfing (Bullish/Bearish)
 * - Doji
 * - Hammer/Hanging Man
 * - Morning Star/Evening Star
 *
 * + Détection de niveaux de support/résistance
 */
class PatternRecognitionService {
  constructor() {
    const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  /**
   * Initialise les tables pour les patterns
   */
  initializeTables() {
    this.db.exec(`
      -- Table pour les patterns détectés
      CREATE TABLE IF NOT EXISTS detected_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        pattern_type TEXT NOT NULL,
        pattern_name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        confidence REAL NOT NULL,
        signal TEXT NOT NULL,
        target_price REAL,
        stop_loss REAL,
        details TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Table pour les niveaux de support/résistance
      CREATE TABLE IF NOT EXISTS support_resistance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        level_type TEXT NOT NULL,
        price REAL NOT NULL,
        strength REAL NOT NULL,
        touches INTEGER NOT NULL,
        first_touch_date DATE NOT NULL,
        last_touch_date DATE NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Index
      CREATE INDEX IF NOT EXISTS idx_patterns_ticker ON detected_patterns(ticker, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_patterns_type ON detected_patterns(pattern_type, confidence DESC);
      CREATE INDEX IF NOT EXISTS idx_sr_ticker ON support_resistance(ticker, strength DESC);
    `);

    console.log('✅ Pattern Recognition tables initialized');
  }

  /**
   * Récupère les données OHLCV pour analyse
   */
  getHistoricalData(ticker, days = 100) {
    const stmt = this.db.prepare(`
      SELECT date, open, high, low, close, volume
      FROM extended_market_data
      WHERE ticker = ?
      ORDER BY date DESC
      LIMIT ?
    `);

    const data = stmt.all(ticker, days);
    return data.reverse(); // Ordre chronologique
  }

  /**
   * Détecte tous les patterns pour un ticker
   */
  async detectAllPatterns(ticker, days = 100) {
    const data = this.getHistoricalData(ticker, days);

    if (data.length < 20) {
      throw new Error(`Pas assez de données pour ${ticker} (minimum 20 jours)`);
    }

    const patterns = [];

    // Patterns de continuation et retournement
    patterns.push(...this.detectHeadAndShoulders(data, ticker));
    patterns.push(...this.detectInverseHeadAndShoulders(data, ticker));
    patterns.push(...this.detectDoubleTop(data, ticker));
    patterns.push(...this.detectDoubleBottom(data, ticker));
    patterns.push(...this.detectTriangles(data, ticker));
    patterns.push(...this.detectFlags(data, ticker));
    patterns.push(...this.detectWedges(data, ticker));
    patterns.push(...this.detectCupAndHandle(data, ticker));

    // Patterns de chandelier (1-3 bougies)
    patterns.push(...this.detectCandlestickPatterns(data, ticker));

    // Sauvegarder les patterns trouvés
    patterns.forEach(pattern => this.savePattern(pattern));

    return {
      ticker,
      totalPatterns: patterns.length,
      patterns: patterns.sort((a, b) => b.confidence - a.confidence)
    };
  }

  /**
   * PATTERN 1: Head and Shoulders (Tête et Épaules)
   * Pattern de retournement baissier
   */
  detectHeadAndShoulders(data, ticker) {
    const patterns = [];
    const window = 40; // Fenêtre de recherche

    for (let i = window; i < data.length - 5; i++) {
      const slice = data.slice(i - window, i);

      // Trouver les 3 pics (épaule gauche, tête, épaule droite)
      const peaks = this.findPeaks(slice);

      if (peaks.length >= 3) {
        const [leftShoulder, head, rightShoulder] = peaks.slice(-3);

        // Vérifier pattern H&S
        const isHeadHigher = head.price > leftShoulder.price && head.price > rightShoulder.price;
        const shouldersAligned = Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price < 0.03; // 3% tolérance
        const necklineSlope = Math.abs((rightShoulder.valley - leftShoulder.valley) / leftShoulder.valley) < 0.02;

        if (isHeadHigher && shouldersAligned && necklineSlope) {
          const neckline = (leftShoulder.valley + rightShoulder.valley) / 2;
          const currentPrice = data[i].close;
          const targetPrice = neckline - (head.price - neckline); // Projection baissière

          patterns.push({
            ticker,
            pattern_type: 'reversal',
            pattern_name: 'Head and Shoulders',
            start_date: data[i - window].date,
            end_date: data[i].date,
            confidence: this.calculateConfidence([isHeadHigher, shouldersAligned, necklineSlope]),
            signal: currentPrice < neckline ? 'sell' : 'watch',
            target_price: targetPrice,
            stop_loss: head.price,
            details: JSON.stringify({
              leftShoulder: leftShoulder.price,
              head: head.price,
              rightShoulder: rightShoulder.price,
              neckline
            })
          });
        }
      }
    }

    return patterns;
  }

  /**
   * PATTERN 2: Inverse Head and Shoulders
   * Pattern de retournement haussier
   */
  detectInverseHeadAndShoulders(data, ticker) {
    const patterns = [];
    const window = 40;

    for (let i = window; i < data.length - 5; i++) {
      const slice = data.slice(i - window, i);
      const valleys = this.findValleys(slice);

      if (valleys.length >= 3) {
        const [leftShoulder, head, rightShoulder] = valleys.slice(-3);

        const isHeadLower = head.price < leftShoulder.price && head.price < rightShoulder.price;
        const shouldersAligned = Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price < 0.03;

        if (isHeadLower && shouldersAligned) {
          const neckline = (leftShoulder.peak + rightShoulder.peak) / 2;
          const currentPrice = data[i].close;
          const targetPrice = neckline + (neckline - head.price);

          patterns.push({
            ticker,
            pattern_type: 'reversal',
            pattern_name: 'Inverse Head and Shoulders',
            start_date: data[i - window].date,
            end_date: data[i].date,
            confidence: this.calculateConfidence([isHeadLower, shouldersAligned]),
            signal: currentPrice > neckline ? 'buy' : 'watch',
            target_price: targetPrice,
            stop_loss: head.price,
            details: JSON.stringify({ leftShoulder: leftShoulder.price, head: head.price, rightShoulder: rightShoulder.price, neckline })
          });
        }
      }
    }

    return patterns;
  }

  /**
   * PATTERN 3: Double Top
   * Deux pics à peu près au même niveau
   */
  detectDoubleTop(data, ticker) {
    const patterns = [];
    const window = 30;

    for (let i = window; i < data.length - 5; i++) {
      const slice = data.slice(i - window, i);
      const peaks = this.findPeaks(slice);

      if (peaks.length >= 2) {
        const [peak1, peak2] = peaks.slice(-2);

        const pricesSimilar = Math.abs(peak1.price - peak2.price) / peak1.price < 0.02; // 2% tolérance
        const timeSeparation = peak2.index - peak1.index > 5; // Au moins 5 jours d'écart

        if (pricesSimilar && timeSeparation) {
          const valley = Math.min(...slice.slice(peak1.index, peak2.index).map(d => d.low));
          const currentPrice = data[i].close;
          const targetPrice = valley - (peak1.price - valley);

          patterns.push({
            ticker,
            pattern_type: 'reversal',
            pattern_name: 'Double Top',
            start_date: data[i - window].date,
            end_date: data[i].date,
            confidence: this.calculateConfidence([pricesSimilar, timeSeparation]),
            signal: currentPrice < valley ? 'sell' : 'watch',
            target_price: targetPrice,
            stop_loss: Math.max(peak1.price, peak2.price),
            details: JSON.stringify({ peak1: peak1.price, peak2: peak2.price, valley })
          });
        }
      }
    }

    return patterns;
  }

  /**
   * PATTERN 4: Double Bottom
   * Deux creux à peu près au même niveau
   */
  detectDoubleBottom(data, ticker) {
    const patterns = [];
    const window = 30;

    for (let i = window; i < data.length - 5; i++) {
      const slice = data.slice(i - window, i);
      const valleys = this.findValleys(slice);

      if (valleys.length >= 2) {
        const [valley1, valley2] = valleys.slice(-2);

        const pricesSimilar = Math.abs(valley1.price - valley2.price) / valley1.price < 0.02;
        const timeSeparation = valley2.index - valley1.index > 5;

        if (pricesSimilar && timeSeparation) {
          const peak = Math.max(...slice.slice(valley1.index, valley2.index).map(d => d.high));
          const currentPrice = data[i].close;
          const targetPrice = peak + (peak - valley1.price);

          patterns.push({
            ticker,
            pattern_type: 'reversal',
            pattern_name: 'Double Bottom',
            start_date: data[i - window].date,
            end_date: data[i].date,
            confidence: this.calculateConfidence([pricesSimilar, timeSeparation]),
            signal: currentPrice > peak ? 'buy' : 'watch',
            target_price: targetPrice,
            stop_loss: Math.min(valley1.price, valley2.price),
            details: JSON.stringify({ valley1: valley1.price, valley2: valley2.price, peak })
          });
        }
      }
    }

    return patterns;
  }

  /**
   * PATTERN 5: Triangles (Ascendant, Descendant, Symétrique)
   */
  detectTriangles(data, ticker) {
    const patterns = [];
    const window = 20;

    for (let i = window; i < data.length - 5; i++) {
      const slice = data.slice(i - window, i);

      const highs = slice.map((d, idx) => ({ price: d.high, index: idx }));
      const lows = slice.map((d, idx) => ({ price: d.low, index: idx }));

      const upperTrend = this.calculateTrend(highs);
      const lowerTrend = this.calculateTrend(lows);

      // Triangle Ascendant: résistance plate, support montant
      if (Math.abs(upperTrend.slope) < 0.001 && lowerTrend.slope > 0.002) {
        patterns.push({
          ticker,
          pattern_type: 'continuation',
          pattern_name: 'Ascending Triangle',
          start_date: data[i - window].date,
          end_date: data[i].date,
          confidence: 0.75,
          signal: 'buy',
          target_price: upperTrend.value + (upperTrend.value - lowerTrend.value),
          stop_loss: lowerTrend.value,
          details: JSON.stringify({ resistance: upperTrend.value, support_slope: lowerTrend.slope })
        });
      }

      // Triangle Descendant: support plat, résistance descendante
      if (Math.abs(lowerTrend.slope) < 0.001 && upperTrend.slope < -0.002) {
        patterns.push({
          ticker,
          pattern_type: 'continuation',
          pattern_name: 'Descending Triangle',
          start_date: data[i - window].date,
          end_date: data[i].date,
          confidence: 0.75,
          signal: 'sell',
          target_price: lowerTrend.value - (upperTrend.value - lowerTrend.value),
          stop_loss: upperTrend.value,
          details: JSON.stringify({ support: lowerTrend.value, resistance_slope: upperTrend.slope })
        });
      }

      // Triangle Symétrique: convergence des deux côtés
      if (upperTrend.slope < -0.001 && lowerTrend.slope > 0.001) {
        patterns.push({
          ticker,
          pattern_type: 'continuation',
          pattern_name: 'Symmetrical Triangle',
          start_date: data[i - window].date,
          end_date: data[i].date,
          confidence: 0.70,
          signal: 'watch',
          target_price: null,
          stop_loss: null,
          details: JSON.stringify({ upper_slope: upperTrend.slope, lower_slope: lowerTrend.slope })
        });
      }
    }

    return patterns;
  }

  /**
   * PATTERN 6: Flags (Bullish/Bearish)
   * Consolidation après mouvement fort
   */
  detectFlags(data, ticker) {
    const patterns = [];
    const window = 15;

    for (let i = window + 10; i < data.length - 5; i++) {
      const priorMove = data.slice(i - window - 10, i - window);
      const flag = data.slice(i - window, i);

      // Vérifier mouvement fort avant le flag
      const priorChange = (priorMove[priorMove.length - 1].close - priorMove[0].close) / priorMove[0].close;

      if (Math.abs(priorChange) > 0.10) { // Mouvement > 10%
        const flagTrend = this.calculateTrend(flag.map((d, idx) => ({ price: d.close, index: idx })));

        // Bullish Flag: mouvement haussier + consolidation légèrement baissière
        if (priorChange > 0 && flagTrend.slope < 0 && flagTrend.slope > -0.002) {
          patterns.push({
            ticker,
            pattern_type: 'continuation',
            pattern_name: 'Bullish Flag',
            start_date: data[i - window].date,
            end_date: data[i].date,
            confidence: 0.80,
            signal: 'buy',
            target_price: data[i].close * (1 + priorChange),
            stop_loss: Math.min(...flag.map(d => d.low)),
            details: JSON.stringify({ prior_move: priorChange * 100, flag_slope: flagTrend.slope })
          });
        }

        // Bearish Flag: mouvement baissier + consolidation légèrement haussière
        if (priorChange < 0 && flagTrend.slope > 0 && flagTrend.slope < 0.002) {
          patterns.push({
            ticker,
            pattern_type: 'continuation',
            pattern_name: 'Bearish Flag',
            start_date: data[i - window].date,
            end_date: data[i].date,
            confidence: 0.80,
            signal: 'sell',
            target_price: data[i].close * (1 + priorChange),
            stop_loss: Math.max(...flag.map(d => d.high)),
            details: JSON.stringify({ prior_move: priorChange * 100, flag_slope: flagTrend.slope })
          });
        }
      }
    }

    return patterns;
  }

  /**
   * PATTERN 7: Wedges (Rising/Falling)
   */
  detectWedges(data, ticker) {
    const patterns = [];
    const window = 25;

    for (let i = window; i < data.length - 5; i++) {
      const slice = data.slice(i - window, i);

      const highs = slice.map((d, idx) => ({ price: d.high, index: idx }));
      const lows = slice.map((d, idx) => ({ price: d.low, index: idx }));

      const upperTrend = this.calculateTrend(highs);
      const lowerTrend = this.calculateTrend(lows);

      // Rising Wedge: les deux trendlines montent mais convergent (baissier)
      if (upperTrend.slope > 0 && lowerTrend.slope > 0 && lowerTrend.slope > upperTrend.slope) {
        patterns.push({
          ticker,
          pattern_type: 'reversal',
          pattern_name: 'Rising Wedge',
          start_date: data[i - window].date,
          end_date: data[i].date,
          confidence: 0.75,
          signal: 'sell',
          target_price: data[i].close * 0.95,
          stop_loss: upperTrend.value,
          details: JSON.stringify({ upper_slope: upperTrend.slope, lower_slope: lowerTrend.slope })
        });
      }

      // Falling Wedge: les deux trendlines descendent mais convergent (haussier)
      if (upperTrend.slope < 0 && lowerTrend.slope < 0 && upperTrend.slope < lowerTrend.slope) {
        patterns.push({
          ticker,
          pattern_type: 'reversal',
          pattern_name: 'Falling Wedge',
          start_date: data[i - window].date,
          end_date: data[i].date,
          confidence: 0.75,
          signal: 'buy',
          target_price: data[i].close * 1.05,
          stop_loss: lowerTrend.value,
          details: JSON.stringify({ upper_slope: upperTrend.slope, lower_slope: lowerTrend.slope })
        });
      }
    }

    return patterns;
  }

  /**
   * PATTERN 8: Cup and Handle
   * Pattern haussier classique
   */
  detectCupAndHandle(data, ticker) {
    const patterns = [];
    const window = 50;

    for (let i = window; i < data.length - 10; i++) {
      const slice = data.slice(i - window, i);

      // Chercher forme de "U"
      const firstThird = slice.slice(0, window / 3);
      const middle = slice.slice(window / 3, (2 * window) / 3);
      const lastThird = slice.slice((2 * window) / 3);

      const startPrice = firstThird[0].close;
      const bottomPrice = Math.min(...middle.map(d => d.low));
      const endPrice = lastThird[lastThird.length - 1].close;

      const isCup = Math.abs(startPrice - endPrice) / startPrice < 0.05 && // Retour proche du début
                    (startPrice - bottomPrice) / startPrice > 0.10; // Profondeur > 10%

      if (isCup) {
        // Chercher le "handle" (petite consolidation)
        const handle = data.slice(i, i + 10);
        if (handle.length === 10) {
          const handleDrop = (endPrice - Math.min(...handle.map(d => d.low))) / endPrice;

          if (handleDrop < 0.10 && handleDrop > 0.03) { // Handle entre 3-10%
            patterns.push({
              ticker,
              pattern_type: 'continuation',
              pattern_name: 'Cup and Handle',
              start_date: data[i - window].date,
              end_date: data[i + 10].date,
              confidence: 0.85,
              signal: 'buy',
              target_price: endPrice + (endPrice - bottomPrice),
              stop_loss: bottomPrice,
              details: JSON.stringify({ cup_depth: (startPrice - bottomPrice) / startPrice, handle_drop: handleDrop })
            });
          }
        }
      }
    }

    return patterns;
  }

  /**
   * PATTERN 9-12: Candlestick Patterns (Patterns de chandeliers)
   */
  detectCandlestickPatterns(data, ticker) {
    const patterns = [];

    for (let i = 2; i < data.length; i++) {
      const candle = data[i];
      const prev = data[i - 1];
      const prev2 = data[i - 2];

      const body = Math.abs(candle.close - candle.open);
      const range = candle.high - candle.low;
      const upperShadow = candle.high - Math.max(candle.open, candle.close);
      const lowerShadow = Math.min(candle.open, candle.close) - candle.low;

      // Doji: corps très petit
      if (body / range < 0.1) {
        patterns.push({
          ticker,
          pattern_type: 'reversal',
          pattern_name: 'Doji',
          start_date: candle.date,
          end_date: candle.date,
          confidence: 0.60,
          signal: 'watch',
          target_price: null,
          stop_loss: null,
          details: JSON.stringify({ body_ratio: body / range })
        });
      }

      // Hammer: ombre inférieure longue, petit corps en haut
      if (lowerShadow > body * 2 && upperShadow < body * 0.3 && candle.close < prev.close) {
        patterns.push({
          ticker,
          pattern_type: 'reversal',
          pattern_name: 'Hammer',
          start_date: candle.date,
          end_date: candle.date,
          confidence: 0.70,
          signal: 'buy',
          target_price: candle.close * 1.05,
          stop_loss: candle.low,
          details: JSON.stringify({ lower_shadow: lowerShadow, body })
        });
      }

      // Hanging Man: même forme que Hammer mais en haut de tendance
      if (lowerShadow > body * 2 && upperShadow < body * 0.3 && candle.close > prev.close) {
        patterns.push({
          ticker,
          pattern_type: 'reversal',
          pattern_name: 'Hanging Man',
          start_date: candle.date,
          end_date: candle.date,
          confidence: 0.70,
          signal: 'sell',
          target_price: candle.close * 0.95,
          stop_loss: candle.high,
          details: JSON.stringify({ lower_shadow: lowerShadow, body })
        });
      }

      // Engulfing Bullish: bougie haussière qui englobe la précédente baissière
      const prevBody = Math.abs(prev.close - prev.open);
      const prevBearish = prev.close < prev.open;
      const candleBullish = candle.close > candle.open;

      if (prevBearish && candleBullish && candle.open < prev.close && candle.close > prev.open) {
        patterns.push({
          ticker,
          pattern_type: 'reversal',
          pattern_name: 'Bullish Engulfing',
          start_date: prev.date,
          end_date: candle.date,
          confidence: 0.80,
          signal: 'buy',
          target_price: candle.close * 1.05,
          stop_loss: Math.min(prev.low, candle.low),
          details: JSON.stringify({ prev_body: prevBody, candle_body: body })
        });
      }

      // Engulfing Bearish
      const prevBullish = prev.close > prev.open;
      const candleBearish = candle.close < candle.open;

      if (prevBullish && candleBearish && candle.open > prev.close && candle.close < prev.open) {
        patterns.push({
          ticker,
          pattern_type: 'reversal',
          pattern_name: 'Bearish Engulfing',
          start_date: prev.date,
          end_date: candle.date,
          confidence: 0.80,
          signal: 'sell',
          target_price: candle.close * 0.95,
          stop_loss: Math.max(prev.high, candle.high),
          details: JSON.stringify({ prev_body: prevBody, candle_body: body })
        });
      }

      // Morning Star: pattern 3 bougies haussier
      if (i >= 2) {
        const prev2Bearish = prev2.close < prev2.open;
        const prevSmall = Math.abs(prev.close - prev.open) < (prev2.close - prev2.open) * 0.3;
        const candleBullish = candle.close > candle.open;
        const gapsDown = prev.open < prev2.close && prev.close < prev2.close;
        const closesAbove = candle.close > (prev2.open + prev2.close) / 2;

        if (prev2Bearish && prevSmall && candleBullish && gapsDown && closesAbove) {
          patterns.push({
            ticker,
            pattern_type: 'reversal',
            pattern_name: 'Morning Star',
            start_date: prev2.date,
            end_date: candle.date,
            confidence: 0.85,
            signal: 'buy',
            target_price: candle.close * 1.08,
            stop_loss: Math.min(prev2.low, prev.low, candle.low),
            details: JSON.stringify({ pattern: '3-candle reversal' })
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Détecte les niveaux de support et résistance
   */
  detectSupportResistance(ticker, days = 100, minTouches = 2) {
    const data = this.getHistoricalData(ticker, days);
    const levels = [];

    // Regrouper les prix par clusters
    const allPrices = [...data.map(d => d.high), ...data.map(d => d.low)];
    const clusters = this.clusterPrices(allPrices, 0.02); // 2% de tolérance

    for (const cluster of clusters) {
      if (cluster.count >= minTouches) {
        const touches = this.countTouches(data, cluster.price, 0.02);

        if (touches.length >= minTouches) {
          const isResistance = touches.filter(t => t.type === 'high').length > touches.length / 2;

          levels.push({
            ticker,
            level_type: isResistance ? 'resistance' : 'support',
            price: cluster.price,
            strength: Math.min(touches.length / 10, 1.0), // 0-1
            touches: touches.length,
            first_touch_date: touches[0].date,
            last_touch_date: touches[touches.length - 1].date
          });
        }
      }
    }

    // Sauvegarder les niveaux
    levels.forEach(level => this.saveSupportResistance(level));

    return levels.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Fonctions utilitaires
   */
  findPeaks(data) {
    const peaks = [];
    for (let i = 2; i < data.length - 2; i++) {
      if (data[i].high > data[i - 1].high &&
          data[i].high > data[i - 2].high &&
          data[i].high > data[i + 1].high &&
          data[i].high > data[i + 2].high) {
        const valley = Math.min(data[i - 2].low, data[i - 1].low, data[i + 1].low, data[i + 2].low);
        peaks.push({ index: i, price: data[i].high, valley });
      }
    }
    return peaks;
  }

  findValleys(data) {
    const valleys = [];
    for (let i = 2; i < data.length - 2; i++) {
      if (data[i].low < data[i - 1].low &&
          data[i].low < data[i - 2].low &&
          data[i].low < data[i + 1].low &&
          data[i].low < data[i + 2].low) {
        const peak = Math.max(data[i - 2].high, data[i - 1].high, data[i + 1].high, data[i + 2].high);
        valleys.push({ index: i, price: data[i].low, peak });
      }
    }
    return valleys;
  }

  calculateTrend(points) {
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.index, 0);
    const sumY = points.reduce((sum, p) => sum + p.price, 0);
    const sumXY = points.reduce((sum, p) => sum + p.index * p.price, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.index * p.index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const value = slope * (n - 1) + intercept;

    return { slope, intercept, value };
  }

  clusterPrices(prices, tolerance) {
    const sorted = [...prices].sort((a, b) => a - b);
    const clusters = [];

    let currentCluster = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      if ((sorted[i] - currentCluster[0]) / currentCluster[0] < tolerance) {
        currentCluster.push(sorted[i]);
      } else {
        clusters.push({
          price: currentCluster.reduce((sum, p) => sum + p, 0) / currentCluster.length,
          count: currentCluster.length
        });
        currentCluster = [sorted[i]];
      }
    }

    if (currentCluster.length > 0) {
      clusters.push({
        price: currentCluster.reduce((sum, p) => sum + p, 0) / currentCluster.length,
        count: currentCluster.length
      });
    }

    return clusters;
  }

  countTouches(data, price, tolerance) {
    const touches = [];

    for (const d of data) {
      if (Math.abs(d.high - price) / price < tolerance) {
        touches.push({ date: d.date, type: 'high', price: d.high });
      } else if (Math.abs(d.low - price) / price < tolerance) {
        touches.push({ date: d.date, type: 'low', price: d.low });
      }
    }

    return touches;
  }

  calculateConfidence(conditions) {
    const trueCount = conditions.filter(c => c).length;
    return Math.min(trueCount / conditions.length, 1.0);
  }

  /**
   * Sauvegarde un pattern détecté
   */
  savePattern(pattern) {
    const stmt = this.db.prepare(`
      INSERT INTO detected_patterns (
        ticker, pattern_type, pattern_name, start_date, end_date,
        confidence, signal, target_price, stop_loss, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      pattern.ticker,
      pattern.pattern_type,
      pattern.pattern_name,
      pattern.start_date,
      pattern.end_date,
      pattern.confidence,
      pattern.signal,
      pattern.target_price,
      pattern.stop_loss,
      pattern.details
    );
  }

  /**
   * Sauvegarde un niveau de support/résistance
   */
  saveSupportResistance(level) {
    const stmt = this.db.prepare(`
      INSERT INTO support_resistance (
        ticker, level_type, price, strength, touches,
        first_touch_date, last_touch_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      level.ticker,
      level.level_type,
      level.price,
      level.strength,
      level.touches,
      level.first_touch_date,
      level.last_touch_date
    );
  }

  /**
   * Récupère les patterns pour un ticker
   */
  getPatterns(ticker, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT * FROM detected_patterns
      WHERE ticker = ? AND status = 'active'
      ORDER BY created_at DESC, confidence DESC
      LIMIT ?
    `);

    return stmt.all(ticker, limit);
  }

  /**
   * Récupère les niveaux de support/résistance
   */
  getSupportResistance(ticker) {
    const stmt = this.db.prepare(`
      SELECT * FROM support_resistance
      WHERE ticker = ? AND status = 'active'
      ORDER BY strength DESC
    `);

    return stmt.all(ticker);
  }
}

module.exports = PatternRecognitionService;
