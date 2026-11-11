const express = require('express');

/**
 * Routes API pour Backtesting - Phase 3.1
 *
 * Endpoints:
 * 1. POST   /api/backtest/run - Exécuter un backtest
 * 2. GET    /api/backtest/:id - Récupérer un backtest
 * 3. GET    /api/backtest/user/list - Liste des backtests utilisateur
 * 4. DELETE /api/backtest/:id - Supprimer un backtest
 * 5. GET    /api/backtest/strategies - Liste des stratégies disponibles
 * 6. GET    /api/backtest/:id/trades - Trades d'un backtest
 * 7. GET    /api/backtest/:id/equity - Courbe d'équité
 * 8. GET    /api/backtest/:id/metrics - Métriques de performance
 * 9. GET    /api/backtest/info - Informations sur l'API
 */

function createBacktestingRouter(db, requireAuth, backtestingService) {
  const router = express.Router();

  /**
   * GET /api/backtest/info
   * Informations sur l'API backtesting
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      version: '3.1.0',
      name: 'PENDO Backtesting Engine',
      description: 'Teste des stratégies de trading sur données historiques',
      endpoints: [
        'POST /api/backtest/run - Exécuter un backtest',
        'GET /api/backtest/:id - Récupérer un backtest',
        'GET /api/backtest/user/list - Liste des backtests utilisateur',
        'DELETE /api/backtest/:id - Supprimer un backtest',
        'GET /api/backtest/strategies - Liste des stratégies disponibles',
        'GET /api/backtest/:id/trades - Trades d\'un backtest',
        'GET /api/backtest/:id/equity - Courbe d\'équité',
        'GET /api/backtest/:id/metrics - Métriques de performance',
        'GET /api/backtest/info - Informations sur l\'API'
      ],
      strategies: 8,
      features: [
        '8 stratégies prédéfinies',
        'Métriques avancées (Sharpe, drawdown, etc.)',
        'Support stop-loss et take-profit',
        'Frais de transaction configurables',
        'Courbe d\'équité détaillée',
        'Comparaison avec buy-and-hold'
      ]
    });
  });

  /**
   * GET /api/backtest/strategies
   * Liste des stratégies disponibles
   */
  router.get('/strategies', (req, res) => {
    try {
      const strategies = backtestingService.getAvailableStrategies();

      res.json({
        success: true,
        count: Object.keys(strategies).length,
        strategies
      });
    } catch (error) {
      console.error('Error fetching strategies:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des stratégies',
        error: error.message
      });
    }
  });

  /**
   * POST /api/backtest/run
   * Exécute un nouveau backtest
   *
   * Body:
   * - name: Nom du backtest
   * - description: Description (optionnel)
   * - ticker: Ticker à tester
   * - strategyType: Type de stratégie
   * - strategyParams: Paramètres de la stratégie (optionnel)
   * - startDate: Date de début (YYYY-MM-DD)
   * - endDate: Date de fin (YYYY-MM-DD)
   * - initialCapital: Capital initial (défaut: 100000)
   * - commissionRate: Taux de commission (défaut: 0.001)
   * - stopLoss: Stop-loss en % (optionnel)
   * - takeProfit: Take-profit en % (optionnel)
   * - positionSize: Taille de position 0-1 (défaut: 1.0)
   */
  router.post('/run', requireAuth, async (req, res) => {
    try {
      const {
        name,
        description,
        ticker,
        strategyType,
        strategyParams,
        startDate,
        endDate,
        initialCapital,
        commissionRate,
        stopLoss,
        takeProfit,
        positionSize
      } = req.body;

      // Validation
      if (!name || !ticker || !strategyType || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Champs requis: name, ticker, strategyType, startDate, endDate'
        });
      }

      // Vérifier que la stratégie existe
      const strategies = backtestingService.getAvailableStrategies();
      if (!strategies[strategyType]) {
        return res.status(400).json({
          success: false,
          message: `Stratégie inconnue: ${strategyType}`,
          availableStrategies: Object.keys(strategies)
        });
      }

      console.log(`🚀 Démarrage backtest: ${name} (${ticker}, ${strategyType})`);

      // Exécuter le backtest
      const result = await backtestingService.runBacktest({
        userId: req.user.userId,
        name,
        description,
        ticker,
        strategyType,
        strategyParams: strategyParams || {},
        startDate,
        endDate,
        initialCapital: initialCapital || 100000,
        commissionRate: commissionRate || 0.001,
        stopLoss,
        takeProfit,
        positionSize: positionSize || 1.0
      });

      res.json({
        success: true,
        message: 'Backtest exécuté avec succès',
        backtestId: result.backtestId,
        summary: {
          ticker: result.ticker,
          strategy: result.strategyType,
          totalTrades: result.metrics.totalTrades,
          totalReturnPct: result.metrics.totalReturnPct,
          winRate: result.metrics.winRate,
          sharpeRatio: result.metrics.sharpeRatio,
          maxDrawdownPct: result.metrics.maxDrawdownPct
        },
        metrics: result.metrics
      });
    } catch (error) {
      console.error('Error running backtest:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'exécution du backtest',
        error: error.message
      });
    }
  });

  /**
   * GET /api/backtest/:id
   * Récupère un backtest par ID avec tous les détails
   */
  router.get('/:id', requireAuth, (req, res) => {
    try {
      const { id } = req.params;
      const includeDetails = req.query.details === 'true';

      const backtest = backtestingService.getBacktest(parseInt(id), includeDetails);

      if (!backtest) {
        return res.status(404).json({
          success: false,
          message: 'Backtest non trouvé'
        });
      }

      // Vérifier que l'utilisateur a accès
      if (backtest.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à ce backtest'
        });
      }

      res.json({
        success: true,
        backtest
      });
    } catch (error) {
      console.error('Error fetching backtest:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du backtest',
        error: error.message
      });
    }
  });

  /**
   * GET /api/backtest/user/list
   * Liste des backtests pour l'utilisateur connecté
   */
  router.get('/user/list', requireAuth, (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;

      const backtests = backtestingService.getUserBacktests(req.user.userId, limit);

      res.json({
        success: true,
        count: backtests.length,
        backtests
      });
    } catch (error) {
      console.error('Error fetching user backtests:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des backtests',
        error: error.message
      });
    }
  });

  /**
   * DELETE /api/backtest/:id
   * Supprime un backtest
   */
  router.delete('/:id', requireAuth, (req, res) => {
    try {
      const { id } = req.params;

      // Vérifier que le backtest existe et appartient à l'utilisateur
      const backtest = backtestingService.getBacktest(parseInt(id));

      if (!backtest) {
        return res.status(404).json({
          success: false,
          message: 'Backtest non trouvé'
        });
      }

      if (backtest.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à ce backtest'
        });
      }

      const deleted = backtestingService.deleteBacktest(parseInt(id));

      if (deleted) {
        res.json({
          success: true,
          message: 'Backtest supprimé avec succès'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erreur lors de la suppression du backtest'
        });
      }
    } catch (error) {
      console.error('Error deleting backtest:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du backtest',
        error: error.message
      });
    }
  });

  /**
   * GET /api/backtest/:id/trades
   * Récupère tous les trades d'un backtest
   */
  router.get('/:id/trades', requireAuth, (req, res) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;

      // Vérifier accès
      const backtest = backtestingService.getBacktest(parseInt(id));
      if (!backtest) {
        return res.status(404).json({
          success: false,
          message: 'Backtest non trouvé'
        });
      }

      if (backtest.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }

      // Récupérer les trades
      const trades = db.prepare(`
        SELECT * FROM backtest_trades
        WHERE backtest_id = ?
        ORDER BY entry_date ASC
        LIMIT ? OFFSET ?
      `).all(id, limit, offset);

      const totalTrades = db.prepare(`
        SELECT COUNT(*) as count FROM backtest_trades WHERE backtest_id = ?
      `).get(id).count;

      res.json({
        success: true,
        backtestId: parseInt(id),
        count: trades.length,
        total: totalTrades,
        offset,
        trades
      });
    } catch (error) {
      console.error('Error fetching trades:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des trades',
        error: error.message
      });
    }
  });

  /**
   * GET /api/backtest/:id/equity
   * Récupère la courbe d'équité d'un backtest
   */
  router.get('/:id/equity', requireAuth, (req, res) => {
    try {
      const { id } = req.params;

      // Vérifier accès
      const backtest = backtestingService.getBacktest(parseInt(id));
      if (!backtest) {
        return res.status(404).json({
          success: false,
          message: 'Backtest non trouvé'
        });
      }

      if (backtest.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }

      // Récupérer la courbe d'équité
      const equityCurve = db.prepare(`
        SELECT * FROM backtest_equity_curve
        WHERE backtest_id = ?
        ORDER BY date ASC
      `).all(id);

      res.json({
        success: true,
        backtestId: parseInt(id),
        count: equityCurve.length,
        equityCurve
      });
    } catch (error) {
      console.error('Error fetching equity curve:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la courbe d\'équité',
        error: error.message
      });
    }
  });

  /**
   * GET /api/backtest/:id/metrics
   * Récupère uniquement les métriques de performance
   */
  router.get('/:id/metrics', requireAuth, (req, res) => {
    try {
      const { id } = req.params;

      // Vérifier accès
      const backtest = backtestingService.getBacktest(parseInt(id));
      if (!backtest) {
        return res.status(404).json({
          success: false,
          message: 'Backtest non trouvé'
        });
      }

      if (backtest.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }

      // Récupérer les métriques
      const metrics = db.prepare(`
        SELECT * FROM backtest_results WHERE backtest_id = ?
      `).get(id);

      if (!metrics) {
        return res.status(404).json({
          success: false,
          message: 'Métriques non disponibles pour ce backtest'
        });
      }

      res.json({
        success: true,
        backtestId: parseInt(id),
        metrics
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des métriques',
        error: error.message
      });
    }
  });

  return router;
}

module.exports = createBacktestingRouter;
