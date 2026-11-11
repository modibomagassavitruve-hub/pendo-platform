const Database = require('better-sqlite3');
const path = require('path');
const math = require('mathjs');
const stats = require('simple-statistics');
const { PolynomialRegression } = require('ml-regression-polynomial');
const { SimpleLinearRegression: SLR } = require('ml-regression-simple-linear');

/**
 * Machine Learning Price Prediction Service - Phase 4.1
 *
 * Fonctionnalités:
 * - Prédictions de prix (court, moyen, long terme)
 * - Modèles: Linear Regression, Polynomial Regression, Moving Average
 * - Intervalle de confiance
 * - Accuracy tracking
 * - Feature engineering (RSI, MACD, Volume trends)
 */
class MLPredictionService {
  constructor(dbPath = null) {
    const defaultPath = path.join(__dirname, '..', 'data', 'pendo.db');
    this.db = new Database(dbPath || defaultPath);
    this.initDatabase();
  }

  /**
   * Initialise les tables de la base de données
   */
  initDatabase() {
    // Table des prédictions
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ml_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        prediction_date DATE NOT NULL,
        horizon TEXT NOT NULL,
        predicted_price REAL NOT NULL,
        confidence_lower REAL,
        confidence_upper REAL,
        confidence_level REAL DEFAULT 0.95,
        model_type TEXT NOT NULL,
        features TEXT,
        actual_price REAL,
        accuracy_error REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des modèles entraînés
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ml_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        model_type TEXT NOT NULL,
        hyperparameters TEXT,
        training_data_size INTEGER,
        training_r2 REAL,
        training_rmse REAL,
        validation_r2 REAL,
        validation_rmse REAL,
        features_used TEXT,
        trained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
    `);

    // Table de l'historique des prédictions
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prediction_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prediction_id INTEGER,
        check_date DATE NOT NULL,
        actual_price REAL NOT NULL,
        predicted_price REAL NOT NULL,
        error_pct REAL,
        FOREIGN KEY (prediction_id) REFERENCES ml_predictions(id)
      )
    `);

    // Index
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_predictions_ticker ON ml_predictions(ticker);
      CREATE INDEX IF NOT EXISTS idx_predictions_date ON ml_predictions(prediction_date);
      CREATE INDEX IF NOT EXISTS idx_models_ticker ON ml_models(ticker);
    `);
  }

  /**
   * Prépare les données pour le ML
   */
  prepareData(ticker, days = 252) {
    // Récupérer market_id depuis stocks
    const stock = this.db.prepare(`
      SELECT id FROM stocks WHERE symbol = ?
    `).get(ticker);

    if (!stock) {
      throw new Error(`Ticker ${ticker} introuvable`);
    }

    const marketId = stock.id;

    // Récupérer les données historiques
    const data = this.db.prepare(`
      SELECT
        datetime(timestamp, 'unixepoch') as date,
        close,
        high,
        low,
        open,
        volume
      FROM market_history_data
      WHERE market_id = ?
        AND close IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(marketId, days);

    if (data.length < 30) {
      throw new Error(`Pas assez de données pour ${ticker} (minimum 30 jours, ${data.length} disponibles)`);
    }

    // Inverser pour avoir ordre chronologique
    return data.reverse();
  }

  /**
   * Feature Engineering
   * Calcule des features techniques pour le ML
   */
  calculateFeatures(data) {
    const features = [];

    for (let i = 20; i < data.length; i++) {
      const slice = data.slice(i - 20, i + 1);
      const closes = slice.map(d => d.close);
      const volumes = slice.map(d => d.volume);
      const highs = slice.map(d => d.high);
      const lows = slice.map(d => d.low);

      // Price features
      const currentPrice = closes[closes.length - 1];
      const sma5 = stats.mean(closes.slice(-5));
      const sma10 = stats.mean(closes.slice(-10));
      const sma20 = stats.mean(closes.slice(-20));

      // Volatility
      const returns = [];
      for (let j = 1; j < closes.length; j++) {
        returns.push((closes[j] - closes[j-1]) / closes[j-1]);
      }
      const volatility = stats.standardDeviation(returns);

      // Momentum
      const momentum5 = (closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6];
      const momentum10 = (closes[closes.length - 1] - closes[closes.length - 11]) / closes[closes.length - 11];

      // RSI (simplifié)
      const rsi = this.calculateRSI(closes, 14);

      // Volume trend
      const volumeTrend = (volumes[volumes.length - 1] - stats.mean(volumes)) / stats.mean(volumes);

      // High-Low spread
      const hlSpread = (highs[highs.length - 1] - lows[lows.length - 1]) / currentPrice;

      features.push({
        date: data[i].date,
        target: data[i].close,
        features: {
          price: currentPrice,
          sma5,
          sma10,
          sma20,
          sma5_ratio: currentPrice / sma5,
          sma10_ratio: currentPrice / sma10,
          sma20_ratio: currentPrice / sma20,
          volatility,
          momentum5,
          momentum10,
          rsi,
          volumeTrend,
          hlSpread
        }
      });
    }

    return features;
  }

  /**
   * Calcule RSI simplifié
   */
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;

    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const gains = changes.slice(-period).filter(c => c > 0);
    const losses = changes.slice(-period).filter(c => c < 0).map(c => Math.abs(c));

    const avgGain = gains.length > 0 ? stats.mean(gains) : 0;
    const avgLoss = losses.length > 0 ? stats.mean(losses) : 0;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Entraîne un modèle de régression linéaire
   */
  trainLinearModel(ticker, data) {
    const featureData = this.calculateFeatures(data);

    if (featureData.length < 30) {
      throw new Error('Pas assez de données pour entraînement');
    }

    // Split train/validation (80/20)
    const splitIndex = Math.floor(featureData.length * 0.8);
    const trainData = featureData.slice(0, splitIndex);
    const validData = featureData.slice(splitIndex);

    // Utiliser seulement le prix comme feature simple (time series)
    const X_train = trainData.map((d, idx) => idx);
    const y_train = trainData.map(d => d.target);

    const X_valid = validData.map((d, idx) => splitIndex + idx);
    const y_valid = validData.map(d => d.target);

    // Train Simple Linear Regression
    const slr = new SLR(X_train, y_train);

    // Calculer R² et RMSE
    const trainPredictions = X_train.map(x => slr.predict(x));
    const validPredictions = X_valid.map(x => slr.predict(x));

    const trainR2 = this.calculateR2(y_train, trainPredictions);
    const trainRMSE = this.calculateRMSE(y_train, trainPredictions);
    const validR2 = this.calculateR2(y_valid, validPredictions);
    const validRMSE = this.calculateRMSE(y_valid, validPredictions);

    // Sauvegarder le modèle
    const modelId = this.saveModel(ticker, 'linear_regression', {
      slope: slr.slope,
      intercept: slr.intercept
    }, trainData.length, trainR2, trainRMSE, validR2, validRMSE, ['time_index']);

    return {
      modelId,
      model: slr,
      metrics: {
        trainR2,
        trainRMSE,
        validR2,
        validRMSE
      },
      dataLength: featureData.length
    };
  }

  /**
   * Entraîne un modèle polynomial
   */
  trainPolynomialModel(ticker, data, degree = 2) {
    const featureData = this.calculateFeatures(data);

    if (featureData.length < 30) {
      throw new Error('Pas assez de données pour entraînement');
    }

    const splitIndex = Math.floor(featureData.length * 0.8);
    const trainData = featureData.slice(0, splitIndex);
    const validData = featureData.slice(splitIndex);

    const X_train = trainData.map((d, idx) => idx);
    const y_train = trainData.map(d => d.target);

    const X_valid = validData.map((d, idx) => splitIndex + idx);
    const y_valid = validData.map(d => d.target);

    // Train Polynomial Regression
    const poly = new PolynomialRegression(X_train, y_train, degree);

    const trainPredictions = X_train.map(x => poly.predict(x));
    const validPredictions = X_valid.map(x => poly.predict(x));

    const trainR2 = this.calculateR2(y_train, trainPredictions);
    const trainRMSE = this.calculateRMSE(y_train, trainPredictions);
    const validR2 = this.calculateR2(y_valid, validPredictions);
    const validRMSE = this.calculateRMSE(y_valid, validPredictions);

    const modelId = this.saveModel(ticker, 'polynomial_regression', {
      degree,
      coefficients: poly.coefficients
    }, trainData.length, trainR2, trainRMSE, validR2, validRMSE, ['time_index']);

    return {
      modelId,
      model: poly,
      metrics: {
        trainR2,
        trainRMSE,
        validR2,
        validRMSE
      },
      dataLength: featureData.length
    };
  }

  /**
   * Prédiction avec Moving Average Ensemble
   */
  predictWithMovingAverage(data, horizon = 5) {
    const closes = data.map(d => d.close);

    // Calcul de plusieurs MAs
    const ma5 = stats.mean(closes.slice(-5));
    const ma10 = stats.mean(closes.slice(-10));
    const ma20 = stats.mean(closes.slice(-20));

    // Tendance
    const trend = (closes[closes.length - 1] - closes[closes.length - 21]) / closes[closes.length - 21];
    const trendPerDay = trend / 20;

    // Prédiction = moyenne pondérée + tendance
    const basePrice = (ma5 * 0.5 + ma10 * 0.3 + ma20 * 0.2);
    const prediction = basePrice * (1 + trendPerDay * horizon);

    // Intervalle de confiance basé sur volatilité
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i-1]) / closes[i-1]);
    }
    const volatility = stats.standardDeviation(returns);
    const confidence_interval = prediction * volatility * Math.sqrt(horizon) * 1.96; // 95% CI

    return {
      prediction,
      confidence_lower: prediction - confidence_interval,
      confidence_upper: prediction + confidence_interval,
      volatility
    };
  }

  /**
   * Prédiction complète
   */
  async predictPrice(ticker, horizons = ['1day', '5days', '20days']) {
    console.log(`🤖 ML Prediction pour ${ticker}...`);

    // Récupérer données
    const data = this.prepareData(ticker, 252);

    // Entraîner modèles
    console.log('   Entraînement Linear Regression...');
    const linearModel = this.trainLinearModel(ticker, data);

    console.log('   Entraînement Polynomial Regression...');
    const polyModel = this.trainPolynomialModel(ticker, data, 2);

    const currentPrice = data[data.length - 1].close;
    const predictions = [];

    for (const horizon of horizons) {
      const days = this.horizonToDays(horizon);
      const futureIndex = data.length + days;

      // Prédiction Linear
      const linearPred = linearModel.model.predict(futureIndex);

      // Prédiction Polynomial
      const polyPred = polyModel.model.predict(futureIndex);

      // Prédiction Moving Average
      const maPred = this.predictWithMovingAverage(data, days);

      // Ensemble: moyenne des 3 modèles
      const ensemblePred = (linearPred * 0.3 + polyPred * 0.3 + maPred.prediction * 0.4);

      // Intervalle de confiance (utiliser celui du MA qui est le plus réaliste)
      const confidence_lower = maPred.confidence_lower;
      const confidence_upper = maPred.confidence_upper;

      // Calculer date de prédiction
      const lastDate = new Date(data[data.length - 1].date);
      lastDate.setDate(lastDate.getDate() + days);
      const predictionDate = lastDate.toISOString().split('T')[0];

      // Sauvegarder prédiction
      const predId = this.savePrediction(
        ticker,
        predictionDate,
        horizon,
        ensemblePred,
        confidence_lower,
        confidence_upper,
        'ensemble',
        JSON.stringify({
          linear: linearPred,
          polynomial: polyPred,
          moving_average: maPred.prediction
        })
      );

      predictions.push({
        id: predId,
        horizon,
        days,
        prediction_date: predictionDate,
        current_price: currentPrice,
        predicted_price: ensemblePred,
        change_pct: ((ensemblePred - currentPrice) / currentPrice) * 100,
        confidence_interval: {
          lower: confidence_lower,
          upper: confidence_upper,
          level: 0.95
        },
        models: {
          linear: linearPred,
          polynomial: polyPred,
          moving_average: maPred.prediction,
          ensemble: ensemblePred
        }
      });
    }

    return {
      ticker,
      current_price: currentPrice,
      prediction_date: new Date().toISOString().split('T')[0],
      predictions,
      models_performance: {
        linear: linearModel.metrics,
        polynomial: polyModel.metrics
      },
      recommendation: this.generateRecommendation(predictions)
    };
  }

  /**
   * Convertit horizon en jours
   */
  horizonToDays(horizon) {
    const map = {
      '1day': 1,
      '5days': 5,
      '10days': 10,
      '20days': 20,
      '1week': 7,
      '1month': 21,
      '3months': 63,
      '6months': 126
    };
    return map[horizon] || parseInt(horizon);
  }

  /**
   * Génère une recommandation basée sur les prédictions
   */
  generateRecommendation(predictions) {
    const shortTerm = predictions.find(p => p.days <= 5);
    const mediumTerm = predictions.find(p => p.days > 5 && p.days <= 21);
    const longTerm = predictions.find(p => p.days > 21);

    let signal = 'HOLD';
    let confidence = 'MEDIUM';
    let reasons = [];

    // Analyse court terme
    if (shortTerm && shortTerm.change_pct > 3) {
      signal = 'BUY';
      reasons.push(`Hausse prévue à court terme: +${shortTerm.change_pct.toFixed(2)}%`);
    } else if (shortTerm && shortTerm.change_pct < -3) {
      signal = 'SELL';
      reasons.push(`Baisse prévue à court terme: ${shortTerm.change_pct.toFixed(2)}%`);
    }

    // Analyse moyen terme
    if (mediumTerm && mediumTerm.change_pct > 5) {
      if (signal === 'BUY') confidence = 'HIGH';
      reasons.push(`Tendance haussière moyen terme: +${mediumTerm.change_pct.toFixed(2)}%`);
    } else if (mediumTerm && mediumTerm.change_pct < -5) {
      if (signal === 'SELL') confidence = 'HIGH';
      reasons.push(`Tendance baissière moyen terme: ${mediumTerm.change_pct.toFixed(2)}%`);
    }

    // Convergence des modèles
    const allModels = shortTerm ? shortTerm.models : {};
    const modelValues = Object.values(allModels).filter(v => typeof v === 'number');
    if (modelValues.length > 0) {
      const modelStd = stats.standardDeviation(modelValues);
      const modelMean = stats.mean(modelValues);
      const cv = modelStd / modelMean; // Coefficient of variation

      if (cv < 0.02) {
        confidence = 'HIGH';
        reasons.push('Forte convergence des modèles');
      } else if (cv > 0.05) {
        confidence = 'LOW';
        reasons.push('Divergence des modèles - incertitude élevée');
      }
    }

    return {
      signal,
      confidence,
      reasons,
      summary: `${signal} (Confiance: ${confidence})`
    };
  }

  /**
   * Calcule R² (coefficient de détermination)
   */
  calculateR2(actual, predicted) {
    const meanActual = stats.mean(actual);
    const ssTotal = actual.reduce((sum, y) => sum + Math.pow(y - meanActual, 2), 0);
    const ssResidual = actual.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0);
    return 1 - (ssResidual / ssTotal);
  }

  /**
   * Calcule RMSE (Root Mean Squared Error)
   */
  calculateRMSE(actual, predicted) {
    const mse = actual.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0) / actual.length;
    return Math.sqrt(mse);
  }

  /**
   * Sauvegarde un modèle
   */
  saveModel(ticker, modelType, hyperparameters, trainingSize, trainR2, trainRMSE, validR2, validRMSE, features) {
    const result = this.db.prepare(`
      INSERT INTO ml_models (
        ticker, model_type, hyperparameters, training_data_size,
        training_r2, training_rmse, validation_r2, validation_rmse, features_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ticker,
      modelType,
      JSON.stringify(hyperparameters),
      trainingSize,
      trainR2,
      trainRMSE,
      validR2,
      validRMSE,
      JSON.stringify(features)
    );

    return result.lastInsertRowid;
  }

  /**
   * Sauvegarde une prédiction
   */
  savePrediction(ticker, predictionDate, horizon, predictedPrice, confidenceLower, confidenceUpper, modelType, features) {
    const result = this.db.prepare(`
      INSERT INTO ml_predictions (
        ticker, prediction_date, horizon, predicted_price,
        confidence_lower, confidence_upper, model_type, features
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ticker,
      predictionDate,
      horizon,
      predictedPrice,
      confidenceLower,
      confidenceUpper,
      modelType,
      features
    );

    return result.lastInsertRowid;
  }

  /**
   * Récupère les prédictions d'un ticker
   */
  getPredictions(ticker, limit = 50) {
    return this.db.prepare(`
      SELECT * FROM ml_predictions
      WHERE ticker = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(ticker, limit);
  }

  /**
   * Évalue la précision des prédictions passées
   */
  evaluatePredictions(ticker) {
    const predictions = this.db.prepare(`
      SELECT * FROM ml_predictions
      WHERE ticker = ?
        AND prediction_date <= date('now')
        AND actual_price IS NULL
      ORDER BY prediction_date ASC
    `).all(ticker);

    const evaluations = [];

    for (const pred of predictions) {
      // Récupérer market_id
      const stock = this.db.prepare(`SELECT id FROM stocks WHERE symbol = ?`).get(ticker);
      if (!stock) continue;

      // Récupérer le prix réel à la date de prédiction
      const actualData = this.db.prepare(`
        SELECT close FROM market_history_data
        WHERE market_id = ?
          AND date(datetime(timestamp, 'unixepoch')) = ?
      `).get(stock.id, pred.prediction_date);

      if (actualData) {
        const actualPrice = actualData.close;
        const error = Math.abs(actualPrice - pred.predicted_price);
        const errorPct = (error / actualPrice) * 100;

        // Mettre à jour la prédiction
        this.db.prepare(`
          UPDATE ml_predictions
          SET actual_price = ?, accuracy_error = ?
          WHERE id = ?
        `).run(actualPrice, errorPct, pred.id);

        // Sauvegarder dans l'historique
        this.db.prepare(`
          INSERT INTO prediction_history (prediction_id, check_date, actual_price, predicted_price, error_pct)
          VALUES (?, date('now'), ?, ?, ?)
        `).run(pred.id, actualPrice, pred.predicted_price, errorPct);

        evaluations.push({
          prediction_id: pred.id,
          prediction_date: pred.prediction_date,
          predicted_price: pred.predicted_price,
          actual_price: actualPrice,
          error_pct: errorPct,
          within_confidence: actualPrice >= pred.confidence_lower && actualPrice <= pred.confidence_upper
        });
      }
    }

    // Calculer métriques globales
    if (evaluations.length > 0) {
      const avgError = stats.mean(evaluations.map(e => e.error_pct));
      const withinCI = evaluations.filter(e => e.within_confidence).length / evaluations.length * 100;

      return {
        ticker,
        total_evaluated: evaluations.length,
        avg_error_pct: avgError,
        within_confidence_interval_pct: withinCI,
        evaluations
      };
    }

    return {
      ticker,
      total_evaluated: 0,
      message: 'Aucune prédiction à évaluer'
    };
  }

  /**
   * Récupère les modèles d'un ticker
   */
  getModels(ticker) {
    return this.db.prepare(`
      SELECT * FROM ml_models
      WHERE ticker = ?
      ORDER BY trained_at DESC
    `).all(ticker);
  }
}

module.exports = MLPredictionService;
