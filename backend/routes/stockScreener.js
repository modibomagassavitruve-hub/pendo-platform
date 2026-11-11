const express = require('express');
const router = express.Router();

/**
 * Crée le routeur pour le screener d'actions
 *
 * @param {Object} db - Instance de la base de données
 * @param {Function} requireAuth - Middleware d'authentification
 * @param {Object} screenerService - Instance du service
 */
function createStockScreenerRouter(db, requireAuth, screenerService) {
  /**
   * POST /api/screener/scan
   * Exécute un scan avec filtres personnalisés
   *
   * Body: Objet de filtres
   */
  router.post('/scan', async (req, res) => {
    try {
      const filters = req.body;

      const results = await screenerService.executeScan(filters);

      res.json({
        success: true,
        count: results.length,
        filters,
        results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors du scan',
        error: error.message
      });
    }
  });

  /**
   * GET /api/screener/presets
   * Récupère les scans prédéfinis
   */
  router.get('/presets', (req, res) => {
    try {
      const presets = screenerService.getPresetScans();

      res.json({
        success: true,
        presets
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des presets',
        error: error.message
      });
    }
  });

  /**
   * POST /api/screener/presets/:presetName
   * Exécute un scan prédéfini
   */
  router.post('/presets/:presetName', async (req, res) => {
    try {
      const { presetName } = req.params;
      const presets = screenerService.getPresetScans();

      const preset = presets[presetName];

      if (!preset) {
        return res.status(404).json({
          success: false,
          message: `Preset '${presetName}' non trouvé`
        });
      }

      const results = await screenerService.executeScan(preset.filters);

      res.json({
        success: true,
        preset: {
          name: preset.name,
          description: preset.description
        },
        count: results.length,
        results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'exécution du preset',
        error: error.message
      });
    }
  });

  /**
   * POST /api/screener/save
   * Sauvegarde un scan personnalisé
   *
   * Body:
   * - name: Nom du scan
   * - description: Description
   * - filters: Objet de filtres
   * - isPublic: Rendre public (optionnel)
   */
  router.post('/save', requireAuth, (req, res) => {
    try {
      const { name, description, filters, isPublic } = req.body;
      const userId = req.user.userId;

      if (!name || !filters) {
        return res.status(400).json({
          success: false,
          message: 'Le nom et les filtres sont requis'
        });
      }

      const result = screenerService.saveScan(
        userId,
        name,
        description,
        filters,
        isPublic
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la sauvegarde',
        error: error.message
      });
    }
  });

  /**
   * GET /api/screener/saved
   * Récupère les scans sauvegardés de l'utilisateur
   */
  router.get('/saved', requireAuth, (req, res) => {
    try {
      const userId = req.user.userId;
      const { includePublic = 'true' } = req.query;

      const scans = screenerService.getSavedScans(
        userId,
        includePublic === 'true'
      );

      res.json({
        success: true,
        count: scans.length,
        scans
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des scans',
        error: error.message
      });
    }
  });

  /**
   * DELETE /api/screener/saved/:scanId
   * Supprime un scan sauvegardé
   */
  router.delete('/saved/:scanId', requireAuth, (req, res) => {
    try {
      const { scanId } = req.params;
      const userId = req.user.userId;

      const result = screenerService.deleteScan(parseInt(scanId), userId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression',
        error: error.message
      });
    }
  });

  /**
   * POST /api/screener/alerts
   * Crée une alerte personnalisée
   *
   * Body:
   * - ticker: Symbole de l'action
   * - alertType: price, rsi, volume, pattern
   * - condition: above, below, equals
   * - targetValue: Valeur cible
   * - message: Message personnalisé (optionnel)
   */
  router.post('/alerts', requireAuth, (req, res) => {
    try {
      const { ticker, alertType, condition, targetValue, message } = req.body;
      const userId = req.user.userId;

      if (!ticker || !alertType || !condition || targetValue === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Tous les champs obligatoires doivent être remplis'
        });
      }

      const result = screenerService.createAlert(
        userId,
        ticker.toUpperCase(),
        alertType,
        condition,
        parseFloat(targetValue),
        message
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de l\'alerte',
        error: error.message
      });
    }
  });

  /**
   * GET /api/screener/alerts
   * Récupère les alertes de l'utilisateur
   *
   * Query:
   * - status: active, triggered, cancelled (défaut: active)
   */
  router.get('/alerts', requireAuth, (req, res) => {
    try {
      const userId = req.user.userId;
      const { status = 'active' } = req.query;

      const alerts = screenerService.getUserAlerts(userId, status);

      res.json({
        success: true,
        count: alerts.length,
        alerts
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des alertes',
        error: error.message
      });
    }
  });

  /**
   * DELETE /api/screener/alerts/:alertId
   * Annule une alerte
   */
  router.delete('/alerts/:alertId', requireAuth, (req, res) => {
    try {
      const { alertId } = req.params;
      const userId = req.user.userId;

      const result = screenerService.cancelAlert(parseInt(alertId), userId);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'annulation de l\'alerte',
        error: error.message
      });
    }
  });

  /**
   * POST /api/screener/alerts/check
   * Force la vérification des alertes (admin ou cron)
   */
  router.post('/alerts/check', requireAuth, async (req, res) => {
    try {
      const triggered = await screenerService.checkAlerts();

      res.json({
        success: true,
        count: triggered.length,
        triggered
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification des alertes',
        error: error.message
      });
    }
  });

  /**
   * GET /api/screener/info
   * Documentation de l'API screener
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      service: 'Stock Screener Service',
      version: '1.0.0',
      description: 'Service de screening d\'actions avec filtres techniques et fondamentaux',
      endpoints: [
        {
          method: 'POST',
          path: '/api/screener/scan',
          description: 'Exécuter un scan personnalisé',
          auth: false,
          body: {
            priceMin: 'number',
            priceMax: 'number',
            volumeMin: 'number',
            changePercentMin: 'number',
            changePercentMax: 'number',
            rsiMin: 'number',
            rsiMax: 'number',
            rsiOversold: 'boolean',
            rsiOverbought: 'boolean',
            macdSignal: 'bullish|bearish',
            aboveSMA20: 'boolean',
            aboveSMA50: 'boolean',
            aboveSMA200: 'boolean',
            goldenCross: 'boolean',
            deathCross: 'boolean',
            atrMin: 'number',
            atrMax: 'number',
            stochasticOversold: 'boolean',
            stochasticOverbought: 'boolean',
            exchange: 'string',
            sector: 'string',
            limit: 'number (default: 50)'
          }
        },
        {
          method: 'GET',
          path: '/api/screener/presets',
          description: 'Liste des scans prédéfinis',
          auth: false
        },
        {
          method: 'POST',
          path: '/api/screener/presets/:presetName',
          description: 'Exécuter un scan prédéfini',
          auth: false
        },
        {
          method: 'POST',
          path: '/api/screener/save',
          description: 'Sauvegarder un scan personnalisé',
          auth: true
        },
        {
          method: 'GET',
          path: '/api/screener/saved',
          description: 'Récupérer les scans sauvegardés',
          auth: true
        },
        {
          method: 'DELETE',
          path: '/api/screener/saved/:scanId',
          description: 'Supprimer un scan sauvegardé',
          auth: true
        },
        {
          method: 'POST',
          path: '/api/screener/alerts',
          description: 'Créer une alerte',
          auth: true
        },
        {
          method: 'GET',
          path: '/api/screener/alerts',
          description: 'Récupérer les alertes',
          auth: true
        },
        {
          method: 'DELETE',
          path: '/api/screener/alerts/:alertId',
          description: 'Annuler une alerte',
          auth: true
        },
        {
          method: 'POST',
          path: '/api/screener/alerts/check',
          description: 'Vérifier les alertes',
          auth: true
        }
      ],
      presets: [
        'momentum',
        'oversold',
        'goldenCross',
        'highVolatility',
        'breakout',
        'valueStocks'
      ],
      alertTypes: ['price', 'rsi', 'volume', 'pattern'],
      conditions: ['above', 'below', 'equals']
    });
  });

  return router;
}

module.exports = createStockScreenerRouter;
