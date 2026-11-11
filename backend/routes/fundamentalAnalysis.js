const express = require('express');

/**
 * Routes API pour Fundamental Analysis - Phase 3.3
 */
function createFundamentalAnalysisRouter(db, requireAuth, fundamentalService) {
  const router = express.Router();

  /**
   * GET /api/fundamental/info
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      version: '3.3.0',
      name: 'PENDO Fundamental Analysis',
      ratios: {
        valorisation: ['P/E', 'P/B', 'P/S', 'PEG', 'EV/EBITDA'],
        rentabilite: ['ROE', 'ROA', 'ROIC', 'Margins'],
        liquidite: ['Current Ratio', 'Quick Ratio', 'Cash Ratio'],
        endettement: ['D/E', 'D/A', 'Interest Coverage'],
        croissance: ['Revenue Growth', 'EPS Growth', 'Book Value Growth']
      }
    });
  });

  /**
   * POST /api/fundamental/calculate/:ticker
   * Calcule les ratios pour un ticker
   */
  router.post('/calculate/:ticker', (req, res) => {
    try {
      const { ticker } = req.params;
      const { currentPrice } = req.body;

      const ratios = fundamentalService.calculateRatios(ticker, currentPrice);
      fundamentalService.saveRatios(ticker, ratios);

      res.json({
        success: true,
        ticker,
        ratios,
        score: ratios.fundamental_score,
        rating: fundamentalService.getRating(ratios.fundamental_score)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * GET /api/fundamental/:ticker
   * Récupère les ratios d'un ticker
   */
  router.get('/:ticker', (req, res) => {
    try {
      const { ticker } = req.params;
      const ratios = fundamentalService.getRatios(ticker);

      if (!ratios) {
        return res.status(404).json({
          success: false,
          message: `Aucun ratio disponible pour ${ticker}`
        });
      }

      res.json({
        success: true,
        ticker,
        ratios
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * POST /api/fundamental/screen
   * Screening par critères fondamentaux
   */
  router.post('/screen', (req, res) => {
    try {
      const criteria = req.body;
      const results = fundamentalService.screenByFundamentals(criteria);

      res.json({
        success: true,
        count: results.length,
        criteria,
        results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * GET /api/fundamental/compare/:ticker
   * Compare avec le marché
   */
  router.get('/compare/:ticker', (req, res) => {
    try {
      const { ticker } = req.params;
      const comparison = fundamentalService.compareToSector(ticker);

      res.json({
        success: true,
        comparison
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  return router;
}

module.exports = createFundamentalAnalysisRouter;
