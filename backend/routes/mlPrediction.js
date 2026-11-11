const express = require('express');

/**
 * Routes API pour ML Price Prediction - Phase 4.1
 *
 * Endpoints:
 * 1. GET    /api/ml/info - Informations sur l'API ML
 * 2. POST   /api/ml/predict/:ticker - Prédire prix futur
 * 3. GET    /api/ml/predictions/:ticker - Récupérer prédictions
 * 4. GET    /api/ml/models/:ticker - Récupérer modèles entraînés
 * 5. POST   /api/ml/evaluate/:ticker - Évaluer précision des prédictions
 * 6. POST   /api/ml/batch-predict - Prédictions pour plusieurs tickers
 */

function createMLPredictionRouter(db, requireAuth, mlService) {
  const router = express.Router();

  /**
   * GET /api/ml/info
   * Informations sur l'API ML
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      version: '4.1.0',
      name: 'PENDO ML Price Prediction',
      description: 'Prédictions de prix avec Machine Learning',
      models: [
        'Linear Regression',
        'Polynomial Regression (degree 2)',
        'Moving Average Ensemble'
      ],
      horizons: [
        { value: '1day', description: 'Court terme (1 jour)' },
        { value: '5days', description: 'Court terme (1 semaine)' },
        { value: '10days', description: 'Moyen terme (2 semaines)' },
        { value: '20days', description: 'Moyen terme (1 mois)' },
        { value: '3months', description: 'Long terme (3 mois)' },
        { value: '6months', description: 'Long terme (6 mois)' }
      ],
      features: [
        'Prédictions multi-horizons',
        'Intervalle de confiance (95%)',
        'Ensemble de 3 modèles',
        'Recommandations automatiques',
        'Évaluation de précision',
        'Feature engineering (RSI, volatilité, momentum)'
      ],
      metrics: [
        'R² (coefficient de détermination)',
        'RMSE (Root Mean Squared Error)',
        'Accuracy Error (%)',
        'Within Confidence Interval (%)'
      ]
    });
  });

  /**
   * POST /api/ml/predict/:ticker
   * Prédire le prix futur d'un ticker
   *
   * Body:
   * - horizons (optionnel): Array de horizons ['1day', '5days', '20days']
   */
  router.post('/predict/:ticker', requireAuth, async (req, res) => {
    try {
      const { ticker } = req.params;
      const { horizons } = req.body;

      const defaultHorizons = ['1day', '5days', '20days'];
      const predictionHorizons = horizons || defaultHorizons;

      console.log(`🤖 ML Prediction: ${ticker} (horizons: ${predictionHorizons.join(', ')})`);

      const result = await mlService.predictPrice(ticker, predictionHorizons);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error in ML prediction:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la prédiction ML',
        error: error.message
      });
    }
  });

  /**
   * GET /api/ml/predictions/:ticker
   * Récupérer les prédictions d'un ticker
   *
   * Query params:
   * - limit (défaut: 50)
   */
  router.get('/predictions/:ticker', requireAuth, (req, res) => {
    try {
      const { ticker } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const predictions = mlService.getPredictions(ticker, limit);

      res.json({
        success: true,
        ticker,
        count: predictions.length,
        predictions: predictions.map(p => ({
          ...p,
          features: p.features ? JSON.parse(p.features) : null
        }))
      });
    } catch (error) {
      console.error('Error fetching predictions:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des prédictions',
        error: error.message
      });
    }
  });

  /**
   * GET /api/ml/models/:ticker
   * Récupérer les modèles entraînés pour un ticker
   */
  router.get('/models/:ticker', requireAuth, (req, res) => {
    try {
      const { ticker } = req.params;

      const models = mlService.getModels(ticker);

      res.json({
        success: true,
        ticker,
        count: models.length,
        models: models.map(m => ({
          ...m,
          hyperparameters: m.hyperparameters ? JSON.parse(m.hyperparameters) : null,
          features_used: m.features_used ? JSON.parse(m.features_used) : null
        }))
      });
    } catch (error) {
      console.error('Error fetching models:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des modèles',
        error: error.message
      });
    }
  });

  /**
   * POST /api/ml/evaluate/:ticker
   * Évaluer la précision des prédictions passées
   */
  router.post('/evaluate/:ticker', requireAuth, (req, res) => {
    try {
      const { ticker } = req.params;

      console.log(`📊 Évaluation des prédictions pour ${ticker}...`);

      const evaluation = mlService.evaluatePredictions(ticker);

      res.json({
        success: true,
        ...evaluation
      });
    } catch (error) {
      console.error('Error evaluating predictions:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'évaluation des prédictions',
        error: error.message
      });
    }
  });

  /**
   * POST /api/ml/batch-predict
   * Prédictions pour plusieurs tickers
   *
   * Body:
   * - tickers: Array de tickers ['AGL', 'NPN', 'MTN']
   * - horizons (optionnel): Array de horizons
   */
  router.post('/batch-predict', requireAuth, async (req, res) => {
    try {
      const { tickers, horizons } = req.body;

      if (!tickers || !Array.isArray(tickers)) {
        return res.status(400).json({
          success: false,
          message: 'Paramètre "tickers" requis (Array)'
        });
      }

      if (tickers.length > 10) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 10 tickers par requête'
        });
      }

      console.log(`🤖 Batch ML Prediction pour ${tickers.length} tickers...`);

      const defaultHorizons = ['1day', '5days', '20days'];
      const predictionHorizons = horizons || defaultHorizons;

      const results = [];
      const errors = [];

      for (const ticker of tickers) {
        try {
          const result = await mlService.predictPrice(ticker, predictionHorizons);
          results.push(result);
        } catch (error) {
          errors.push({
            ticker,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        total_requested: tickers.length,
        successful: results.length,
        failed: errors.length,
        predictions: results,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error in batch prediction:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors des prédictions batch',
        error: error.message
      });
    }
  });

  /**
   * GET /api/ml/summary/:ticker
   * Résumé complet: prédiction + évaluation + modèles
   */
  router.get('/summary/:ticker', requireAuth, async (req, res) => {
    try {
      const { ticker } = req.params;

      // Récupérer dernière prédiction
      const predictions = mlService.getPredictions(ticker, 1);
      const latestPrediction = predictions.length > 0 ? predictions[0] : null;

      // Récupérer modèles
      const models = mlService.getModels(ticker);

      // Évaluation
      const evaluation = mlService.evaluatePredictions(ticker);

      res.json({
        success: true,
        ticker,
        latest_prediction: latestPrediction ? {
          ...latestPrediction,
          features: latestPrediction.features ? JSON.parse(latestPrediction.features) : null
        } : null,
        model_count: models.length,
        best_model: models.length > 0 ? {
          type: models[0].model_type,
          validation_r2: models[0].validation_r2,
          validation_rmse: models[0].validation_rmse,
          trained_at: models[0].trained_at
        } : null,
        accuracy: {
          evaluated_predictions: evaluation.total_evaluated,
          avg_error_pct: evaluation.avg_error_pct,
          within_ci_pct: evaluation.within_confidence_interval_pct
        }
      });
    } catch (error) {
      console.error('Error fetching ML summary:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du résumé ML',
        error: error.message
      });
    }
  });

  return router;
}

module.exports = createMLPredictionRouter;
