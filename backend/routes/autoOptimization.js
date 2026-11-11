const express = require('express');

/**
 * Routes API pour Auto-Optimization - Phase 4.3
 */
function createAutoOptimizationRouter(db, requireAuth, autoOptService) {
  const router = express.Router();

  router.get('/info', (req, res) => {
    res.json({
      success: true,
      version: '4.3.0',
      name: 'PENDO Auto-Optimization',
      description: 'Optimisation automatique de stratégies de trading',
      features: [
        'Grid Search Optimization',
        'Genetic Algorithm Optimization',
        'Adaptive Strategy',
        'Market Regime Detection',
        'Multi-objective Optimization'
      ]
    });
  });

  router.post('/grid-search', requireAuth, async (req, res) => {
    try {
      const result = await autoOptService.gridSearchOptimization(req.body);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/genetic', requireAuth, async (req, res) => {
    try {
      const result = await autoOptService.geneticOptimization(req.body);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/adaptive', requireAuth, async (req, res) => {
    try {
      const result = await autoOptService.adaptiveStrategy(req.body);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/optimizations/:ticker', requireAuth, (req, res) => {
    try {
      const { ticker } = req.params;
      const optimizations = autoOptService.getOptimizations(ticker, 10);
      res.json({ success: true, ticker, count: optimizations.length, optimizations });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = createAutoOptimizationRouter;
