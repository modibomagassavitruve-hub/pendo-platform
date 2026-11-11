/**
 * PENDO - Routes API Broker Simulator
 */

const express = require('express');
const router = express.Router();

function createBrokerRouter(db, requireAuth, brokerService) {
  /**
   * POST /api/broker/account/create
   * Créer un compte broker pour un utilisateur
   */
  router.post('/account/create', requireAuth, (req, res) => {
    try {
      const userId = req.user.userId;

      const result = brokerService.createBrokerAccount(userId);

      res.json({
        success: true,
        message: result.status === 'created'
          ? 'Compte broker créé avec succès'
          : 'Compte broker existant',
        account: result
      });
    } catch (error) {
      console.error('Erreur création compte broker:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/broker/trade/execute
   * Exécuter un trade via le broker
   */
  router.post('/trade/execute', requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const {
        stockSymbol,
        tradeType, // 'buy' or 'sell'
        orderType = 'market',
        quantity,
        requestedPrice,
        orderId
      } = req.body;

      if (!stockSymbol || !tradeType || !quantity) {
        return res.status(400).json({
          success: false,
          error: 'stockSymbol, tradeType et quantity requis'
        });
      }

      if (!['buy', 'sell'].includes(tradeType)) {
        return res.status(400).json({
          success: false,
          error: 'tradeType doit être "buy" ou "sell"'
        });
      }

      const result = await brokerService.executeTrade(userId, {
        stockSymbol,
        tradeType,
        orderType,
        quantity: parseFloat(quantity),
        requestedPrice: requestedPrice ? parseFloat(requestedPrice) : null,
        orderId
      });

      if (result.status === 'rejected') {
        return res.status(400).json({
          success: false,
          error: result.reason,
          execution: result
        });
      }

      res.json({
        success: true,
        message: `Trade ${tradeType} exécuté avec succès`,
        execution: result
      });
    } catch (error) {
      console.error('Erreur exécution trade:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/broker/market/price/:symbol
   * Obtenir prix marché actuel
   */
  router.get('/market/price/:symbol', requireAuth, (req, res) => {
    try {
      const { symbol } = req.params;

      const marketData = brokerService.getMarketPrice(symbol);

      res.json({
        success: true,
        marketData
      });
    } catch (error) {
      console.error('Erreur récupération prix marché:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/broker/market/status
   * Vérifier si marché est ouvert
   */
  router.get('/market/status', (req, res) => {
    try {
      const isOpen = brokerService.isMarketOpen();

      res.json({
        success: true,
        marketStatus: {
          isOpen,
          exchange: 'BRVM',
          timezone: 'UTC',
          tradingHours: '08:00-16:30 UTC (09:00-17:30 GMT+1)',
          message: isOpen
            ? 'Market is open for trading'
            : 'Market is closed'
        }
      });
    } catch (error) {
      console.error('Erreur vérification statut marché:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/broker/custody/positions/:userId
   * Obtenir positions en custody
   */
  router.get('/custody/positions/:userId', requireAuth, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Vérifier accès
      if (req.user.userId !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé'
        });
      }

      const positions = brokerService.getCustodyPositions(userId);

      // Calculer totaux
      const totalCost = positions.reduce((sum, p) => sum + p.total_cost, 0);
      const currentValue = positions.reduce((sum, p) => sum + p.current_value, 0);
      const totalPnL = currentValue - totalCost;
      const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost * 100) : 0;

      res.json({
        success: true,
        custody: {
          custodian: 'PENDO Broker Simulator',
          positionsCount: positions.length,
          totalCost,
          currentValue,
          totalPnL,
          totalPnLPct,
          positions
        }
      });
    } catch (error) {
      console.error('Erreur récupération custody positions:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/broker/executions/:userId
   * Historique des exécutions
   */
  router.get('/executions/:userId', requireAuth, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { limit = 50 } = req.query;

      // Vérifier accès
      if (req.user.userId !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé'
        });
      }

      const executions = brokerService.getExecutionHistory(userId, parseInt(limit));

      // Calculer stats
      const executed = executions.filter(e => e.execution_status === 'executed');
      const rejected = executions.filter(e => e.execution_status === 'rejected');
      const totalVolume = executed.reduce((sum, e) => sum + e.total_amount, 0);
      const totalCommissions = executed.reduce((sum, e) => sum + e.commission, 0);

      res.json({
        success: true,
        executionHistory: {
          totalExecutions: executions.length,
          executedCount: executed.length,
          rejectedCount: rejected.length,
          totalVolume,
          totalCommissions,
          executions
        }
      });
    } catch (error) {
      console.error('Erreur récupération execution history:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/broker/stats
   * Statistiques broker globales (admin uniquement)
   */
  router.get('/stats', requireAuth, (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux administrateurs'
        });
      }

      const stats = brokerService.getBrokerStats();

      res.json({
        success: true,
        brokerStats: {
          brokerName: 'PENDO Broker Simulator',
          brokerCode: 'PBS001',
          ...stats,
          successRate: stats.totalExecutions > 0
            ? ((stats.totalExecutions / (stats.totalExecutions + stats.totalRejections)) * 100).toFixed(2) + '%'
            : 'N/A'
        }
      });
    } catch (error) {
      console.error('Erreur récupération broker stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/broker/info
   * Informations sur le broker simulator
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      info: {
        name: 'PENDO Broker Simulator',
        version: '1.0.0',
        brokerCode: 'PBS001',
        description: 'Simulates a real broker (SGI Afrique, Attijari, EDC) for testing and demos',
        features: [
          'Trade execution (market, limit, stop orders)',
          'Realistic slippage simulation',
          'Commission calculation',
          'Trade rejections (market closed, insufficient liquidity, etc.)',
          'Settlement T+3 BRVM',
          'Broker confirmations',
          'Custody management',
          'Market hours enforcement (Mon-Fri 08:00-16:30 UTC)'
        ],
        configuration: {
          commissionRate: '0.1% (min 5,000 FCFA)',
          slippage: '0.05% average',
          settlementCycle: 'T+3 (BRVM standard)',
          marketHours: '08:00-16:30 UTC (09:00-17:30 GMT+1)',
          exchange: 'BRVM',
          maxOrderSize: '10,000,000 FCFA',
          rejectionRate: '2% (random simulation)'
        },
        note: 'This is a SIMULATOR. For production, integrate with real brokers: SGI Afrique, Attijari Intermédiation, or EDC Investment.'
      }
    });
  });

  return router;
}

module.exports = createBrokerRouter;
