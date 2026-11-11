const express = require('express');
const router = express.Router();

/**
 * Create Advanced Orders routes
 * @param {Object} db - Database instance
 * @param {Function} requireAuth - Authentication middleware
 * @param {Object} orderService - Order Management Service instance
 */
function createAdvancedOrdersRouter(db, requireAuth, orderService) {
  /**
   * @route   POST /api/orders/limit
   * @desc    Create a Limit Order
   * @access  Private
   */
  router.post('/limit', requireAuth, (req, res) => {
    try {
      const { portfolioId, ticker, side, quantity, limitPrice, timeInForce } = req.body;
      const userId = req.user.userId;

      if (!ticker || !side || !quantity || !limitPrice) {
        return res.status(400).json({
          success: false,
          message: 'ticker, side, quantity, and limitPrice are required'
        });
      }

      if (!['buy', 'sell'].includes(side)) {
        return res.status(400).json({
          success: false,
          message: 'side must be either "buy" or "sell"'
        });
      }

      const result = orderService.createLimitOrder(
        userId,
        portfolioId || 1,
        ticker.toUpperCase(),
        side,
        parseFloat(quantity),
        parseFloat(limitPrice),
        timeInForce || 'GTC'
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating limit order',
        error: error.message
      });
    }
  });

  /**
   * @route   POST /api/orders/stop
   * @desc    Create a Stop Order (Stop Market)
   * @access  Private
   */
  router.post('/stop', requireAuth, (req, res) => {
    try {
      const { portfolioId, ticker, side, quantity, stopPrice, timeInForce } = req.body;
      const userId = req.user.userId;

      if (!ticker || !side || !quantity || !stopPrice) {
        return res.status(400).json({
          success: false,
          message: 'ticker, side, quantity, and stopPrice are required'
        });
      }

      const result = orderService.createStopOrder(
        userId,
        portfolioId || 1,
        ticker.toUpperCase(),
        side,
        parseFloat(quantity),
        parseFloat(stopPrice),
        timeInForce || 'GTC'
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating stop order',
        error: error.message
      });
    }
  });

  /**
   * @route   POST /api/orders/stop-limit
   * @desc    Create a Stop-Limit Order
   * @access  Private
   */
  router.post('/stop-limit', requireAuth, (req, res) => {
    try {
      const { portfolioId, ticker, side, quantity, stopPrice, limitPrice, timeInForce } = req.body;
      const userId = req.user.userId;

      if (!ticker || !side || !quantity || !stopPrice || !limitPrice) {
        return res.status(400).json({
          success: false,
          message: 'ticker, side, quantity, stopPrice, and limitPrice are required'
        });
      }

      const result = orderService.createStopLimitOrder(
        userId,
        portfolioId || 1,
        ticker.toUpperCase(),
        side,
        parseFloat(quantity),
        parseFloat(stopPrice),
        parseFloat(limitPrice),
        timeInForce || 'GTC'
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating stop-limit order',
        error: error.message
      });
    }
  });

  /**
   * @route   POST /api/orders/trailing-stop
   * @desc    Create a Trailing Stop Order
   * @access  Private
   */
  router.post('/trailing-stop', requireAuth, (req, res) => {
    try {
      const { portfolioId, ticker, side, quantity, trailingAmount, trailingPercent, timeInForce } = req.body;
      const userId = req.user.userId;

      if (!ticker || !side || !quantity || (!trailingAmount && !trailingPercent)) {
        return res.status(400).json({
          success: false,
          message: 'ticker, side, quantity, and either trailingAmount or trailingPercent are required'
        });
      }

      const result = orderService.createTrailingStopOrder(
        userId,
        portfolioId || 1,
        ticker.toUpperCase(),
        side,
        parseFloat(quantity),
        trailingAmount ? parseFloat(trailingAmount) : null,
        trailingPercent ? parseFloat(trailingPercent) : null,
        timeInForce || 'GTC'
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating trailing stop order',
        error: error.message
      });
    }
  });

  /**
   * @route   GET /api/orders
   * @desc    Get all orders for authenticated user
   * @access  Private
   */
  router.get('/', requireAuth, (req, res) => {
    try {
      const userId = req.user.userId;
      const { portfolioId, status, orderType } = req.query;

      const orders = orderService.getOrders(
        userId,
        portfolioId ? parseInt(portfolioId) : null,
        status || null,
        orderType || null
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
   * @route   GET /api/orders/:id
   * @desc    Get specific order details
   * @access  Private
   */
  router.get('/:id', requireAuth, (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const userId = req.user.userId;

      const orders = orderService.getOrders(userId);
      const order = orders.find(o => o.id === orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Get executions for this order
      const executions = orderService.getExecutions(orderId);

      res.json({
        success: true,
        data: {
          ...order,
          executions
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching order',
        error: error.message
      });
    }
  });

  /**
   * @route   DELETE /api/orders/:id
   * @desc    Cancel an order
   * @access  Private
   */
  router.delete('/:id', requireAuth, (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { reason } = req.body;

      const result = orderService.cancelOrder(orderId, reason || 'User cancelled');

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
   * @route   GET /api/orders/stats
   * @desc    Get order statistics for user
   * @access  Private
   */
  router.get('/user/stats', requireAuth, (req, res) => {
    try {
      const userId = req.user.userId;
      const stats = orderService.getStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching stats',
        error: error.message
      });
    }
  });

  /**
   * @route   POST /api/orders/check
   * @desc    Manually trigger order check (admin/testing)
   * @access  Private
   */
  router.post('/check', requireAuth, (req, res) => {
    try {
      const result = orderService.checkOrders();
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

  /**
   * @route   GET /api/orders/types
   * @desc    Get list of available order types and their descriptions
   * @access  Public
   */
  router.get('/info/types', (req, res) => {
    res.json({
      success: true,
      orderTypes: [
        {
          type: 'limit',
          name: 'Limit Order',
          description: 'Buy or sell at a specific price or better',
          useCases: ['Want to buy at a specific price', 'Want to sell at a specific price', 'Control exact execution price'],
          parameters: {
            ticker: 'Stock symbol',
            side: 'buy or sell',
            quantity: 'Number of shares',
            limitPrice: 'Maximum buy price or minimum sell price',
            timeInForce: 'GTC (Good Till Cancelled), DAY, IOC, FOK'
          },
          example: {
            ticker: 'SNTS',
            side: 'buy',
            quantity: 100,
            limitPrice: 48000,
            timeInForce: 'GTC'
          }
        },
        {
          type: 'stop',
          name: 'Stop Order (Stop Market)',
          description: 'Becomes market order when stop price is reached',
          useCases: ['Stop loss protection', 'Break out trading', 'Limit losses on existing positions'],
          parameters: {
            ticker: 'Stock symbol',
            side: 'buy or sell',
            quantity: 'Number of shares',
            stopPrice: 'Price that triggers the order',
            timeInForce: 'GTC, DAY, IOC, FOK'
          },
          example: {
            ticker: 'SNTS',
            side: 'sell',
            quantity: 100,
            stopPrice: 47000
          }
        },
        {
          type: 'stop_limit',
          name: 'Stop-Limit Order',
          description: 'Becomes limit order when stop price is reached',
          useCases: ['Stop loss with price control', 'Avoid slippage on stop orders', 'More control than stop market'],
          parameters: {
            ticker: 'Stock symbol',
            side: 'buy or sell',
            quantity: 'Number of shares',
            stopPrice: 'Price that triggers the order',
            limitPrice: 'Limit price after trigger',
            timeInForce: 'GTC, DAY, IOC, FOK'
          },
          example: {
            ticker: 'SNTS',
            side: 'sell',
            quantity: 100,
            stopPrice: 47000,
            limitPrice: 46500
          }
        },
        {
          type: 'trailing_stop',
          name: 'Trailing Stop Order',
          description: 'Stop price trails the market price by a fixed amount or percentage',
          useCases: ['Lock in profits while allowing upside', 'Automatic stop loss adjustment', 'Trend following'],
          parameters: {
            ticker: 'Stock symbol',
            side: 'buy or sell',
            quantity: 'Number of shares',
            trailingAmount: 'Fixed amount to trail (or use trailingPercent)',
            trailingPercent: 'Percentage to trail (or use trailingAmount)',
            timeInForce: 'GTC, DAY, IOC, FOK'
          },
          example: {
            ticker: 'SNTS',
            side: 'sell',
            quantity: 100,
            trailingPercent: 5
          }
        }
      ],
      timeInForce: {
        GTC: 'Good Till Cancelled - Order stays active until filled or cancelled',
        DAY: 'Day Order - Order expires at end of trading day',
        IOC: 'Immediate or Cancel - Execute immediately or cancel',
        FOK: 'Fill or Kill - Execute completely immediately or cancel'
      }
    });
  });

  return router;
}

module.exports = createAdvancedOrdersRouter;
