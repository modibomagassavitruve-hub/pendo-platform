const express = require('express');

/**
 * Routes API pour Portfolio Optimization - Phase 3.4
 */
function createPortfolioOptimizationRouter(db, requireAuth, portfolioService) {
  const router = express.Router();

  /**
   * GET /api/portfolio-opt/info
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      version: '3.4.0',
      name: 'PENDO Portfolio Optimization',
      methods: [
        'Max Sharpe Ratio',
        'Min Variance',
        'Equal Weight',
        'Risk Parity'
      ],
      features: [
        'Modern Portfolio Theory',
        'Efficient Frontier',
        'Correlation Matrix',
        'Value at Risk (VaR)',
        'Rebalancing'
      ]
    });
  });

  /**
   * POST /api/portfolio-opt/optimize
   * Optimise un portefeuille
   */
  router.post('/optimize', requireAuth, (req, res) => {
    try {
      const { tickers, method = 'max_sharpe', riskFreeRate = 0 } = req.body;

      if (!tickers || !Array.isArray(tickers) || tickers.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Minimum 2 tickers requis'
        });
      }

      let result;

      switch (method) {
        case 'max_sharpe':
          result = portfolioService.optimizeMaxSharpe(tickers, riskFreeRate);
          break;
        case 'min_variance':
          result = portfolioService.optimizeMinVariance(tickers);
          break;
        case 'equal_weight':
          result = portfolioService.equalWeightPortfolio(tickers);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: `Méthode inconnue: ${method}`
          });
      }

      res.json({
        success: true,
        tickers,
        method,
        optimization: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * POST /api/portfolio-opt/correlation
   * Calcule la matrice de corrélation
   */
  router.post('/correlation', (req, res) => {
    try {
      const { tickers, days = 252 } = req.body;

      if (!tickers || !Array.isArray(tickers)) {
        return res.status(400).json({
          success: false,
          message: 'Tickers requis'
        });
      }

      const matrix = portfolioService.calculateCorrelationMatrix(tickers, days);

      res.json({
        success: true,
        tickers,
        days,
        correlation_matrix: matrix
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * POST /api/portfolio-opt/var
   * Calcule Value at Risk
   */
  router.post('/var', (req, res) => {
    try {
      const { tickers, weights, confidence = 0.95, days = 1 } = req.body;

      const var_result = portfolioService.calculateVaR(tickers, weights, confidence, days);

      res.json({
        success: true,
        var: var_result
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

module.exports = createPortfolioOptimizationRouter;
