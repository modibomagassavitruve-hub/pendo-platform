/**
 * PENDO - Routes API Client Money Segregation & Settlement
 */

const express = require('express');
const router = express.Router();

function createClientMoneyRouter(db, requireAuth, clientMoneyService) {
  /**
   * POST /api/client-money/account/create
   * Créer un compte ségrégé pour un utilisateur
   */
  router.post('/account/create', requireAuth, (req, res) => {
    try {
      const userId = req.user.userId;
      const { accountType = 'client_cash' } = req.body;

      if (!['client_cash', 'client_securities'].includes(accountType)) {
        return res.status(400).json({
          success: false,
          error: 'Type de compte invalide. Attendu: client_cash ou client_securities'
        });
      }

      const accountId = clientMoneyService.createClientAccount(userId, accountType);

      res.json({
        success: true,
        message: 'Compte ségrégé créé avec succès',
        accountId,
        accountType
      });
    } catch (error) {
      console.error('Erreur création compte:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/client-money/deposit
   * Déposer des fonds
   */
  router.post('/deposit', requireAuth, (req, res) => {
    try {
      const userId = req.user.userId;
      const { amount, reference, description } = req.body;

      if (!amount || !reference) {
        return res.status(400).json({
          success: false,
          error: 'amount et reference requis'
        });
      }

      const result = clientMoneyService.depositFunds(
        userId,
        parseFloat(amount),
        reference,
        description
      );

      res.json({
        success: true,
        message: 'Dépôt enregistré - En attente de confirmation',
        deposit: result
      });
    } catch (error) {
      console.error('Erreur dépôt:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/client-money/deposit/confirm
   * Confirmer un dépôt (admin/finance uniquement)
   */
  router.post('/deposit/confirm', requireAuth, (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'finance') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux administrateurs financiers'
        });
      }

      const { movementId } = req.body;

      if (!movementId) {
        return res.status(400).json({
          success: false,
          error: 'movementId requis'
        });
      }

      const result = clientMoneyService.confirmDeposit(movementId);

      res.json({
        success: true,
        message: 'Dépôt confirmé et crédité',
        confirmation: result
      });
    } catch (error) {
      console.error('Erreur confirmation dépôt:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/client-money/withdrawal
   * Demander un retrait
   */
  router.post('/withdrawal', requireAuth, (req, res) => {
    try {
      const userId = req.user.userId;
      const { amount, reference, description } = req.body;

      if (!amount || !reference) {
        return res.status(400).json({
          success: false,
          error: 'amount et reference requis'
        });
      }

      const result = clientMoneyService.withdrawFunds(
        userId,
        parseFloat(amount),
        reference,
        description
      );

      res.json({
        success: true,
        message: 'Demande de retrait enregistrée',
        withdrawal: result
      });
    } catch (error) {
      console.error('Erreur retrait:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/client-money/withdrawal/confirm
   * Confirmer un retrait (admin/finance uniquement)
   */
  router.post('/withdrawal/confirm', requireAuth, (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'finance') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux administrateurs financiers'
        });
      }

      const { movementId } = req.body;

      if (!movementId) {
        return res.status(400).json({
          success: false,
          error: 'movementId requis'
        });
      }

      const result = clientMoneyService.confirmWithdrawal(movementId);

      res.json({
        success: true,
        message: 'Retrait confirmé et débité',
        confirmation: result
      });
    } catch (error) {
      console.error('Erreur confirmation retrait:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/client-money/balance/:userId
   * Obtenir balance d'un utilisateur
   */
  router.get('/balance/:userId', requireAuth, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Vérifier accès
      if (req.user.userId !== userId && req.user.role !== 'admin' && req.user.role !== 'finance') {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé'
        });
      }

      const balance = clientMoneyService.getClientBalance(userId);

      res.json({
        success: true,
        balance
      });
    } catch (error) {
      console.error('Erreur récupération balance:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/client-money/movements/:userId
   * Historique des mouvements de fonds
   */
  router.get('/movements/:userId', requireAuth, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { limit = 50 } = req.query;

      // Vérifier accès
      if (req.user.userId !== userId && req.user.role !== 'admin' && req.user.role !== 'finance') {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé'
        });
      }

      const movements = clientMoneyService.getMovementsHistory(userId, parseInt(limit));

      res.json({
        success: true,
        count: movements.length,
        movements
      });
    } catch (error) {
      console.error('Erreur récupération mouvements:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/client-money/settlements/:userId
   * Settlements en attente pour un utilisateur
   */
  router.get('/settlements/:userId', requireAuth, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Vérifier accès
      if (req.user.userId !== userId && req.user.role !== 'admin' && req.user.role !== 'finance') {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé'
        });
      }

      const settlements = clientMoneyService.getPendingSettlements(userId);

      res.json({
        success: true,
        count: settlements.length,
        settlements
      });
    } catch (error) {
      console.error('Erreur récupération settlements:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/client-money/settlements/process
   * Traiter les settlements T+3 (admin/cron job)
   */
  router.post('/settlements/process', requireAuth, (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'finance') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux administrateurs'
        });
      }

      const results = clientMoneyService.processSettlements();

      res.json({
        success: true,
        message: `${results.processed} settlements traités avec succès`,
        results
      });
    } catch (error) {
      console.error('Erreur traitement settlements:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/client-money/reconciliation/daily
   * Réconciliation quotidienne (admin/finance)
   */
  router.post('/reconciliation/daily', requireAuth, (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'finance') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux administrateurs financiers'
        });
      }

      const { date } = req.body;

      const result = clientMoneyService.dailyReconciliation(date);

      res.json({
        success: true,
        message: result.message,
        reconciliation: result
      });
    } catch (error) {
      console.error('Erreur réconciliation:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/client-money/reconciliation/history
   * Historique des réconciliations (admin/finance)
   */
  router.get('/reconciliation/history', requireAuth, (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'finance') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux administrateurs'
        });
      }

      const { limit = 30 } = req.query;

      const reconciliations = db.prepare(`
        SELECT * FROM daily_reconciliation
        ORDER BY reconciliation_date DESC
        LIMIT ?
      `).all(parseInt(limit));

      res.json({
        success: true,
        count: reconciliations.length,
        reconciliations
      });
    } catch (error) {
      console.error('Erreur récupération historique reconciliation:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/client-money/corporate-action/announce
   * Annoncer une corporate action (admin uniquement)
   */
  router.post('/corporate-action/announce', requireAuth, (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux administrateurs'
        });
      }

      const {
        stockSymbol,
        actionType,
        announcementDate,
        exDate,
        recordDate,
        paymentDate,
        details
      } = req.body;

      if (!stockSymbol || !actionType || !exDate || !recordDate) {
        return res.status(400).json({
          success: false,
          error: 'stockSymbol, actionType, exDate et recordDate requis'
        });
      }

      const result = clientMoneyService.announceCorporateAction(
        stockSymbol,
        actionType,
        announcementDate,
        exDate,
        recordDate,
        paymentDate,
        details
      );

      res.json({
        success: true,
        message: 'Corporate action annoncée avec succès',
        corporateAction: result
      });
    } catch (error) {
      console.error('Erreur annonce corporate action:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/client-money/corporate-action/process-dividend
   * Traiter un paiement de dividende (admin uniquement)
   */
  router.post('/corporate-action/process-dividend', requireAuth, (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux administrateurs'
        });
      }

      const { corporateActionId } = req.body;

      if (!corporateActionId) {
        return res.status(400).json({
          success: false,
          error: 'corporateActionId requis'
        });
      }

      const result = clientMoneyService.processDividend(corporateActionId);

      res.json({
        success: true,
        message: `Dividende traité pour ${result.processed} utilisateurs`,
        summary: {
          usersProcessed: result.processed,
          totalGross: result.totalGross,
          totalNet: result.totalNet,
          totalTax: result.totalTax
        }
      });
    } catch (error) {
      console.error('Erreur traitement dividende:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/client-money/corporate-action/process-split
   * Traiter un stock split (admin uniquement)
   */
  router.post('/corporate-action/process-split', requireAuth, (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux administrateurs'
        });
      }

      const { corporateActionId } = req.body;

      if (!corporateActionId) {
        return res.status(400).json({
          success: false,
          error: 'corporateActionId requis'
        });
      }

      const result = clientMoneyService.processStockSplit(corporateActionId);

      res.json({
        success: true,
        message: `Stock split traité pour ${result.processed} utilisateurs`,
        summary: {
          usersProcessed: result.processed,
          totalSharesBefore: result.totalSharesBefore,
          totalSharesAfter: result.totalSharesAfter
        }
      });
    } catch (error) {
      console.error('Erreur traitement stock split:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/client-money/corporate-actions
   * Liste des corporate actions (tous ou par symbol)
   */
  router.get('/corporate-actions', requireAuth, (req, res) => {
    try {
      const { stockSymbol, status, limit = 50 } = req.query;

      let query = `SELECT * FROM corporate_actions WHERE 1=1`;
      const params = [];

      if (stockSymbol) {
        query += ` AND stock_symbol = ?`;
        params.push(stockSymbol);
      }

      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }

      query += ` ORDER BY announcement_date DESC LIMIT ?`;
      params.push(parseInt(limit));

      const corporateActions = db.prepare(query).all(...params);

      res.json({
        success: true,
        count: corporateActions.length,
        corporateActions: corporateActions.map(ca => ({
          ...ca,
          details: ca.details ? JSON.parse(ca.details) : null
        }))
      });
    } catch (error) {
      console.error('Erreur récupération corporate actions:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/client-money/dividends/:userId
   * Historique des dividendes reçus par un utilisateur
   */
  router.get('/dividends/:userId', requireAuth, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Vérifier accès
      if (req.user.userId !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé'
        });
      }

      const { limit = 50 } = req.query;

      const dividends = db.prepare(`
        SELECT
          dp.*,
          ca.action_type,
          ca.announcement_date,
          ca.ex_date
        FROM dividend_payments dp
        JOIN corporate_actions ca ON dp.corporate_action_id = ca.id
        WHERE dp.user_id = ?
        ORDER BY dp.created_at DESC
        LIMIT ?
      `).all(userId, parseInt(limit));

      res.json({
        success: true,
        count: dividends.length,
        dividends
      });
    } catch (error) {
      console.error('Erreur récupération dividendes:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/client-money/info
   * Informations sur le système de ségrégation
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      info: {
        name: 'PENDO Client Money Segregation & Settlement',
        version: '1.0.0',
        description: 'Système de ségrégation des fonds clients conforme CREPMF',
        features: [
          'Séparation comptes clients / PENDO',
          'Settlement tracking T+3 BRVM',
          'Réconciliation quotidienne automatisée',
          'Corporate actions automation (dividendes, splits)',
          'Audit trail complet'
        ],
        accountTypes: {
          client_cash: 'Compte cash ségrégé client',
          client_securities: 'Compte titres client',
          pendo_operational: 'Compte opérationnel PENDO'
        },
        settlementCycle: 'T+3 (BRVM standard)',
        corporateActions: {
          dividend: 'Paiement de dividendes',
          split: 'Division d\'actions (ex: 2:1)',
          reverse_split: 'Regroupement d\'actions',
          bonus_shares: 'Attribution gratuite',
          rights_issue: 'Augmentation de capital'
        },
        compliance: [
          'CREPMF segregation requirements',
          'Daily reconciliation',
          'Client asset protection',
          'Regulatory reporting'
        ]
      }
    });
  });

  return router;
}

module.exports = createClientMoneyRouter;
