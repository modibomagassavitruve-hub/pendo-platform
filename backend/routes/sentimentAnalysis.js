const express = require('express');

/**
 * Routes API pour Sentiment Analysis - Phase 4.2
 *
 * Endpoints:
 * 1. GET    /api/sentiment/info - Informations sur l'API
 * 2. POST   /api/sentiment/analyze - Analyser un texte
 * 3. POST   /api/sentiment/batch - Analyser plusieurs textes
 * 4. GET    /api/sentiment/:ticker - Récupérer analyses d'un ticker
 * 5. GET    /api/sentiment/aggregate/:ticker - Sentiment agrégé
 * 6. GET    /api/sentiment/market - Sentiment global du marché
 */

function createSentimentAnalysisRouter(db, requireAuth, sentimentService) {
  const router = express.Router();

  /**
   * GET /api/sentiment/info
   * Informations sur l'API Sentiment Analysis
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      version: '4.2.0',
      name: 'PENDO Sentiment Analysis',
      description: 'Analyse de sentiment pour textes financiers',
      features: [
        'Analyse de sentiment (-1 à +1)',
        'Détection de mots-clés financiers',
        'Score de confiance',
        'Tracking historique',
        'Agrégation par période',
        'Analyse batch'
      ],
      supported_languages: [
        'Français',
        'Anglais'
      ],
      sentiment_labels: [
        { value: 'positive', range: '> 0.1', interpretation: 'Signal haussier' },
        { value: 'neutral', range: '-0.1 à 0.1', interpretation: 'Pas de signal clair' },
        { value: 'negative', range: '< -0.1', interpretation: 'Signal baissier' }
      ],
      aggregation_periods: [
        'daily',
        'weekly',
        'monthly'
      ]
    });
  });

  /**
   * POST /api/sentiment/analyze
   * Analyser le sentiment d'un texte
   *
   * Body:
   * - text (requis): Texte à analyser
   * - ticker (optionnel): Ticker associé
   * - source (optionnel): Source du texte
   * - source_url (optionnel): URL de la source
   */
  router.post('/analyze', requireAuth, (req, res) => {
    try {
      const { text, ticker, source, source_url } = req.body;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Paramètre "text" requis'
        });
      }

      if (text.length > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Texte trop long (maximum 10,000 caractères)'
        });
      }

      console.log(`💬 Analyse de sentiment: ${text.substring(0, 50)}...`);

      const result = sentimentService.analyzeSentiment(
        text,
        ticker || null,
        source || 'api',
        source_url || null
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error in sentiment analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'analyse de sentiment',
        error: error.message
      });
    }
  });

  /**
   * POST /api/sentiment/batch
   * Analyser plusieurs textes
   *
   * Body:
   * - texts (requis): Array de textes
   * - ticker (optionnel): Ticker associé
   * - source (optionnel): Source
   */
  router.post('/batch', requireAuth, (req, res) => {
    try {
      const { texts, ticker, source } = req.body;

      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Paramètre "texts" requis (Array)'
        });
      }

      if (texts.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 100 textes par requête'
        });
      }

      console.log(`💬 Analyse batch: ${texts.length} textes...`);

      const result = sentimentService.analyzeBatch(
        texts,
        ticker || null,
        source || 'api_batch'
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error in batch sentiment analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'analyse batch',
        error: error.message
      });
    }
  });

  /**
   * GET /api/sentiment/:ticker
   * Récupérer les analyses de sentiment pour un ticker
   *
   * Query params:
   * - limit (défaut: 50)
   */
  router.get('/:ticker', requireAuth, (req, res) => {
    try {
      const { ticker } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const analyses = sentimentService.getAnalyses(ticker, limit);

      res.json({
        success: true,
        ticker,
        count: analyses.length,
        analyses: analyses.map(a => ({
          ...a,
          keywords: a.keywords ? JSON.parse(a.keywords) : [],
          entity_mentions: a.entity_mentions ? JSON.parse(a.entity_mentions) : []
        }))
      });
    } catch (error) {
      console.error('Error fetching sentiment analyses:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des analyses',
        error: error.message
      });
    }
  });

  /**
   * GET /api/sentiment/aggregate/:ticker
   * Récupérer le sentiment agrégé pour un ticker
   *
   * Query params:
   * - period (défaut: daily) - daily, weekly, monthly
   */
  router.get('/aggregate/:ticker', requireAuth, (req, res) => {
    try {
      const { ticker } = req.params;
      const period = req.query.period || 'daily';

      if (!['daily', 'weekly', 'monthly'].includes(period)) {
        return res.status(400).json({
          success: false,
          message: 'Période invalide (daily, weekly, monthly)'
        });
      }

      const aggregate = sentimentService.getAggregate(ticker, period);

      if (!aggregate) {
        return res.json({
          success: true,
          ticker,
          period,
          message: 'Aucune donnée de sentiment pour cette période'
        });
      }

      res.json({
        success: true,
        ticker,
        period,
        aggregate: {
          ...aggregate,
          sentiment_label: aggregate.avg_sentiment > 0.1 ? 'positive' : aggregate.avg_sentiment < -0.1 ? 'negative' : 'neutral',
          recommendation: aggregate.avg_sentiment > 0.2 ? 'BUY' : aggregate.avg_sentiment < -0.2 ? 'SELL' : 'HOLD'
        }
      });
    } catch (error) {
      console.error('Error fetching sentiment aggregate:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'agrégat',
        error: error.message
      });
    }
  });

  /**
   * GET /api/sentiment/market
   * Récupérer le sentiment global du marché
   *
   * Query params:
   * - limit (défaut: 10)
   */
  router.get('/market', requireAuth, (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const marketSentiment = sentimentService.getMarketSentiment(limit);

      // Calculer sentiment global
      const globalSentiment = marketSentiment.length > 0
        ? marketSentiment.reduce((sum, m) => sum + m.avg_sentiment, 0) / marketSentiment.length
        : 0;

      res.json({
        success: true,
        global_sentiment: globalSentiment,
        global_label: globalSentiment > 0.1 ? 'positive' : globalSentiment < -0.1 ? 'negative' : 'neutral',
        market_mood: globalSentiment > 0.3 ? 'Très optimiste' :
                     globalSentiment > 0.1 ? 'Optimiste' :
                     globalSentiment < -0.3 ? 'Très pessimiste' :
                     globalSentiment < -0.1 ? 'Pessimiste' : 'Neutre',
        top_sentiments: marketSentiment.map(m => ({
          ...m,
          sentiment_label: m.avg_sentiment > 0.1 ? 'positive' : m.avg_sentiment < -0.1 ? 'negative' : 'neutral'
        }))
      });
    } catch (error) {
      console.error('Error fetching market sentiment:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du sentiment marché',
        error: error.message
      });
    }
  });

  return router;
}

module.exports = createSentimentAnalysisRouter;
