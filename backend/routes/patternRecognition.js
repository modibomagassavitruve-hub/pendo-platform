const express = require('express');

/**
 * Routes API pour Pattern Recognition - Phase 3.2
 *
 * Endpoints:
 * 1. GET    /api/patterns/info - Informations sur l'API
 * 2. POST   /api/patterns/detect/:ticker - Détecter patterns pour un ticker
 * 3. GET    /api/patterns/:ticker - Récupérer patterns d'un ticker
 * 4. GET    /api/patterns/support-resistance/:ticker - Niveaux S/R
 * 5. GET    /api/patterns/all - Liste tous les patterns récents
 * 6. GET    /api/patterns/types - Liste des types de patterns
 */

function createPatternRecognitionRouter(db, requireAuth, patternService) {
  const router = express.Router();

  /**
   * GET /api/patterns/info
   * Informations sur l'API Pattern Recognition
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      version: '3.2.0',
      name: 'PENDO Pattern Recognition',
      description: 'Détection automatique de patterns graphiques et chandeliers',
      patterns: {
        chartPatterns: [
          'Head and Shoulders',
          'Inverse Head and Shoulders',
          'Double Top',
          'Double Bottom',
          'Ascending Triangle',
          'Descending Triangle',
          'Symmetrical Triangle',
          'Bullish Flag',
          'Bearish Flag',
          'Rising Wedge',
          'Falling Wedge',
          'Cup and Handle'
        ],
        candlestickPatterns: [
          'Doji',
          'Hammer',
          'Hanging Man',
          'Bullish Engulfing',
          'Bearish Engulfing',
          'Morning Star',
          'Evening Star'
        ]
      },
      features: [
        'Détection automatique de 19 patterns',
        'Niveaux de support/résistance',
        'Signaux buy/sell/watch',
        'Objectifs de prix calculés',
        'Niveaux de stop-loss',
        'Score de confiance'
      ]
    });
  });

  /**
   * GET /api/patterns/types
   * Liste des types de patterns disponibles
   */
  router.get('/types', (req, res) => {
    res.json({
      success: true,
      types: {
        reversal: {
          name: 'Patterns de retournement',
          patterns: [
            'Head and Shoulders',
            'Inverse Head and Shoulders',
            'Double Top',
            'Double Bottom',
            'Rising Wedge',
            'Falling Wedge',
            'Doji',
            'Hammer',
            'Hanging Man',
            'Bullish Engulfing',
            'Bearish Engulfing',
            'Morning Star'
          ],
          description: 'Indiquent un potentiel changement de tendance'
        },
        continuation: {
          name: 'Patterns de continuation',
          patterns: [
            'Ascending Triangle',
            'Descending Triangle',
            'Symmetrical Triangle',
            'Bullish Flag',
            'Bearish Flag',
            'Cup and Handle'
          ],
          description: 'Suggèrent que la tendance actuelle va continuer'
        }
      }
    });
  });

  /**
   * POST /api/patterns/detect/:ticker
   * Détecte tous les patterns pour un ticker
   *
   * Query params:
   * - days (défaut: 100) - Nombre de jours de données à analyser
   */
  router.post('/detect/:ticker', async (req, res) => {
    try {
      const { ticker } = req.params;
      const days = parseInt(req.query.days) || 100;

      console.log(`🔍 Détection patterns pour ${ticker} (${days} jours)...`);

      const result = await patternService.detectAllPatterns(ticker, days);

      res.json({
        success: true,
        ticker,
        daysAnalyzed: days,
        totalPatterns: result.totalPatterns,
        patterns: result.patterns,
        summary: {
          reversal: result.patterns.filter(p => p.pattern_type === 'reversal').length,
          continuation: result.patterns.filter(p => p.pattern_type === 'continuation').length,
          buySignals: result.patterns.filter(p => p.signal === 'buy').length,
          sellSignals: result.patterns.filter(p => p.signal === 'sell').length,
          watchSignals: result.patterns.filter(p => p.signal === 'watch').length
        }
      });
    } catch (error) {
      console.error('Error detecting patterns:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la détection des patterns',
        error: error.message
      });
    }
  });

  /**
   * GET /api/patterns/:ticker
   * Récupère les patterns détectés pour un ticker
   *
   * Query params:
   * - limit (défaut: 50)
   */
  router.get('/:ticker', (req, res) => {
    try {
      const { ticker } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const patterns = patternService.getPatterns(ticker, limit);

      res.json({
        success: true,
        ticker,
        count: patterns.length,
        patterns: patterns.map(p => ({
          ...p,
          details: p.details ? JSON.parse(p.details) : null
        }))
      });
    } catch (error) {
      console.error('Error fetching patterns:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des patterns',
        error: error.message
      });
    }
  });

  /**
   * GET /api/patterns/support-resistance/:ticker
   * Récupère les niveaux de support et résistance
   *
   * Query params:
   * - days (défaut: 100)
   * - minTouches (défaut: 2)
   */
  router.get('/support-resistance/:ticker', (req, res) => {
    try {
      const { ticker } = req.params;
      const days = parseInt(req.query.days) || 100;
      const minTouches = parseInt(req.query.minTouches) || 2;

      const levels = patternService.detectSupportResistance(ticker, days, minTouches);

      const supports = levels.filter(l => l.level_type === 'support');
      const resistances = levels.filter(l => l.level_type === 'resistance');

      res.json({
        success: true,
        ticker,
        daysAnalyzed: days,
        totalLevels: levels.length,
        supports: {
          count: supports.length,
          levels: supports
        },
        resistances: {
          count: resistances.length,
          levels: resistances
        }
      });
    } catch (error) {
      console.error('Error detecting support/resistance:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la détection des niveaux S/R',
        error: error.message
      });
    }
  });

  /**
   * GET /api/patterns/all
   * Liste tous les patterns récents (tous tickers)
   *
   * Query params:
   * - limit (défaut: 100)
   * - signal (buy/sell/watch) - Filtrer par signal
   */
  router.get('/all', (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const signal = req.query.signal;

      let query = `
        SELECT * FROM detected_patterns
        WHERE status = 'active'
      `;

      const params = [];

      if (signal && ['buy', 'sell', 'watch'].includes(signal)) {
        query += ` AND signal = ?`;
        params.push(signal);
      }

      query += ` ORDER BY created_at DESC, confidence DESC LIMIT ?`;
      params.push(limit);

      const patterns = db.prepare(query).all(...params);

      res.json({
        success: true,
        count: patterns.length,
        filters: { signal: signal || 'all' },
        patterns: patterns.map(p => ({
          ...p,
          details: p.details ? JSON.parse(p.details) : null
        }))
      });
    } catch (error) {
      console.error('Error fetching all patterns:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des patterns',
        error: error.message
      });
    }
  });

  return router;
}

module.exports = createPatternRecognitionRouter;
