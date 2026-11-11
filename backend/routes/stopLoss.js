const express = require('express');
const router = express.Router();

/**
 * Create Stop Loss/Take Profit routes
 * @param {Object} db - Database instance
 * @param {Function} requireAuth - Authentication middleware
 * @param {Object} stopLossService - Stop Loss Service instance
 */
function createStopLossRouter(db, requireAuth, stopLossService) {
  /**
   * @route   POST /api/stop-loss/create
   * @desc    Create a Stop Loss order
   * @access  Private
   */
  router.post('/create', requireAuth, (req, res) => {
    try {
      const { portfolioId, ticker, quantity, stopPrice, entryPrice } = req.body;
      const userId = req.user.userId;

      if (!ticker || !quantity || !stopPrice) {
        return res.status(400).json({
          success: false,
          message: 'ticker, quantity, and stopPrice are required'
        });
      }

      const result = stopLossService.createStopLoss(
        userId,
        portfolioId || 1, // Default portfolio
        ticker.toUpperCase(),
        parseFloat(quantity),
        parseFloat(stopPrice),
        entryPrice ? parseFloat(entryPrice) : null
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating stop loss',
        error: error.message
      });
    }
  });

  /**
   * @route   POST /api/stop-loss/take-profit
   * @desc    Create a Take Profit order
   * @access  Private
   */
  router.post('/take-profit', requireAuth, (req, res) => {
    try {
      const { portfolioId, ticker, quantity, profitPrice, entryPrice } = req.body;
      const userId = req.user.userId;

      if (!ticker || !quantity || !profitPrice) {
        return res.status(400).json({
          success: false,
          message: 'ticker, quantity, and profitPrice are required'
        });
      }

      const result = stopLossService.createTakeProfit(
        userId,
        portfolioId || 1,
        ticker.toUpperCase(),
        parseFloat(quantity),
        parseFloat(profitPrice),
        entryPrice ? parseFloat(entryPrice) : null
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating take profit',
        error: error.message
      });
    }
  });

  /**
   * @route   POST /api/stop-loss/bracket
   * @desc    Create bracket order (both SL and TP)
   * @access  Private
   */
  router.post('/bracket', requireAuth, (req, res) => {
    try {
      const {
        portfolioId,
        ticker,
        quantity,
        entryPrice,
        stopLossPercent,
        takeProfitPercent
      } = req.body;
      const userId = req.user.userId;

      if (!ticker || !quantity || !entryPrice || !stopLossPercent || !takeProfitPercent) {
        return res.status(400).json({
          success: false,
          message: 'All parameters required: ticker, quantity, entryPrice, stopLossPercent, takeProfitPercent'
        });
      }

      const result = stopLossService.createBracketOrder(
        userId,
        portfolioId || 1,
        ticker.toUpperCase(),
        parseFloat(quantity),
        parseFloat(entryPrice),
        parseFloat(stopLossPercent),
        parseFloat(takeProfitPercent)
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating bracket order',
        error: error.message
      });
    }
  });

  /**
   * @route   GET /api/stop-loss/orders
   * @desc    Get all orders for authenticated user
   * @access  Private
   */
  router.get('/orders', requireAuth, (req, res) => {
    try {
      const userId = req.user.userId;
      const { portfolioId, status } = req.query;

      const orders = stopLossService.getOrders(
        userId,
        portfolioId ? parseInt(portfolioId) : null,
        status || null
      );

      res.json({
        success: true,
        count: orders.length,
        data: orders
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching orders',
        error: error.message
      });
    }
  });

  /**
   * @route   GET /api/stop-loss/executions
   * @desc    Get execution history
   * @access  Private
   */
  router.get('/executions', requireAuth, (req, res) => {
    try {
      const userId = req.user.userId;
      const limit = parseInt(req.query.limit) || 50;

      const executions = stopLossService.getExecutions(userId, limit);

      res.json({
        success: true,
        count: executions.length,
        data: executions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching executions',
        error: error.message
      });
    }
  });

  /**
   * @route   GET /api/stop-loss/stats
   * @desc    Get SL/TP statistics for user
   * @access  Private
   */
  router.get('/stats', requireAuth, (req, res) => {
    try {
      const userId = req.user.userId;
      const stats = stopLossService.getStats(userId);

      if (stats) {
        res.json({
          success: true,
          data: stats
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error fetching stats'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching stats',
        error: error.message
      });
    }
  });

  /**
   * @route   DELETE /api/stop-loss/orders/:id
   * @desc    Cancel an order
   * @access  Private
   */
  router.delete('/orders/:id', requireAuth, (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const result = stopLossService.cancelOrder(orderId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error cancelling order',
        error: error.message
      });
    }
  });

  /**
   * @route   POST /api/stop-loss/check
   * @desc    Manually trigger order check (admin/testing)
   * @access  Private
   */
  router.post('/check', requireAuth, (req, res) => {
    try {
      const result = stopLossService.checkOrders();
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error checking orders',
        error: error.message
      });
    }
  });

  return router;
}

module.exports = createStopLossRouter;
