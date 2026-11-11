const express = require('express');
const router = express.Router();

/**
 * Crée le routeur pour les données historiques
 *
 * @param {Object} db - Instance de la base de données
 * @param {Function} requireAuth - Middleware d'authentification
 * @param {Object} historicalDataService - Instance du service
 */
function createHistoricalDataRouter(db, requireAuth, historicalDataService) {
  /**
   * GET /api/historical/stats
   * Récupère les statistiques globales de données
   */
  router.get('/stats', (req, res) => {
    try {
      const stats = historicalDataService.getGlobalStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  });

  /**
   * GET /api/historical/stats/:ticker
   * Récupère les statistiques pour un ticker spécifique
   */
  router.get('/stats/:ticker', (req, res) => {
    try {
      const { ticker } = req.params;
      const stats = historicalDataService.getDataStats(ticker.toUpperCase());

      if (!stats) {
        return res.status(404).json({
          success: false,
          message: `Aucune donnée trouvée pour ${ticker}`
        });
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  });

  /**
   * GET /api/historical/data/:ticker
   * Récupère les données OHLCV pour un ticker
   *
   * Query params:
   * - startDate: Date de début (YYYY-MM-DD)
   * - endDate: Date de fin (YYYY-MM-DD)
   * - limit: Nombre max d'enregistrements
   */
  router.get('/data/:ticker', (req, res) => {
    try {
      const { ticker } = req.params;
      const { startDate, endDate, limit } = req.query;

      const data = historicalDataService.getOHLCVData(
        ticker.toUpperCase(),
        startDate || null,
        endDate || null,
        limit ? parseInt(limit) : null
      );

      res.json({
        success: true,
        ticker: ticker.toUpperCase(),
        count: data.length,
        data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des données',
        error: error.message
      });
    }
  });

  /**
   * POST /api/historical/fetch/:ticker
   * Collecte les données historiques pour un ticker
   *
   * Body:
   * - years: Nombre d'années à récupérer (défaut: 5)
   *
   * Requiert authentification (admin uniquement)
   */
  router.post('/fetch/:ticker', requireAuth, async (req, res) => {
    try {
      const { ticker } = req.params;
      const { years = 5 } = req.body;

      // Vérifier si l'utilisateur est admin (optionnel)
      // if (req.user.role !== 'admin') {
      //   return res.status(403).json({ success: false, message: 'Admin access required' });
      // }

      const result = await historicalDataService.fetchHistoricalData(
        ticker.toUpperCase(),
        parseInt(years)
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la collecte des données',
        error: error.message
      });
    }
  });

  /**
   * POST /api/historical/fetch-batch
   * Collecte les données pour plusieurs tickers
   *
   * Body:
   * - tickers: Array de tickers PENDO
   * - years: Nombre d'années (défaut: 5)
   * - delayMs: Délai entre chaque requête (défaut: 2000ms)
   */
  router.post('/fetch-batch', requireAuth, async (req, res) => {
    try {
      const { tickers, years = 5, delayMs = 2000 } = req.body;

      if (!Array.isArray(tickers) || tickers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Le champ "tickers" doit être un tableau non vide'
        });
      }

      // Convertir en majuscules
      const upperTickers = tickers.map(t => t.toUpperCase());

      const results = await historicalDataService.fetchMultipleTickers(
        upperTickers,
        parseInt(years),
        parseInt(delayMs)
      );

      const summary = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        totalRecords: results.reduce((sum, r) => sum + r.recordsFetched, 0)
      };

      res.json({
        success: true,
        summary,
        results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la collecte batch',
        error: error.message
      });
    }
  });

  /**
   * POST /api/historical/update/:ticker
   * Met à jour les données pour un ticker (uniquement nouvelles données)
   */
  router.post('/update/:ticker', requireAuth, async (req, res) => {
    try {
      const { ticker } = req.params;

      const result = await historicalDataService.updateData(ticker.toUpperCase());

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour',
        error: error.message
      });
    }
  });

  /**
   * GET /api/historical/mappings
   * Liste tous les mappings de tickers
   */
  router.get('/mappings', (req, res) => {
    try {
      const mappings = historicalDataService.getAllMappings();

      res.json({
        success: true,
        count: mappings.length,
        data: mappings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des mappings',
        error: error.message
      });
    }
  });

  /**
   * POST /api/historical/mappings
   * Ajoute un nouveau mapping de ticker
   *
   * Body:
   * - pendoTicker: Ticker dans PENDO
   * - yahooTicker: Ticker Yahoo Finance
   * - exchange: Nom de la bourse
   * - country: Code pays (2 lettres)
   */
  router.post('/mappings', requireAuth, (req, res) => {
    try {
      const { pendoTicker, yahooTicker, exchange, country } = req.body;

      if (!pendoTicker || !yahooTicker || !exchange || !country) {
        return res.status(400).json({
          success: false,
          message: 'Tous les champs sont requis: pendoTicker, yahooTicker, exchange, country'
        });
      }

      const result = historicalDataService.addTickerMapping(
        pendoTicker.toUpperCase(),
        yahooTicker,
        exchange,
        country
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'ajout du mapping',
        error: error.message
      });
    }
  });

  /**
   * GET /api/historical/fetch-history
   * Récupère l'historique des collectes de données
   *
   * Query params:
   * - ticker: Filtrer par ticker (optionnel)
   * - limit: Nombre max de résultats (défaut: 50)
   */
  router.get('/fetch-history', (req, res) => {
    try {
      const { ticker, limit = 50 } = req.query;

      const history = historicalDataService.getFetchHistory(
        ticker ? ticker.toUpperCase() : null,
        parseInt(limit)
      );

      res.json({
        success: true,
        count: history.length,
        data: history
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'historique',
        error: error.message
      });
    }
  });

  /**
   * GET /api/historical/info
   * Documentation de l'API de données historiques
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      service: 'Historical Data Service',
      version: '1.0.0',
      description: 'Service de collecte et gestion de données historiques (5+ ans)',
      endpoints: [
        {
          method: 'GET',
          path: '/api/historical/stats',
          description: 'Statistiques globales',
          auth: false
        },
        {
          method: 'GET',
          path: '/api/historical/stats/:ticker',
          description: 'Statistiques pour un ticker',
          auth: false
        },
        {
          method: 'GET',
          path: '/api/historical/data/:ticker',
          description: 'Données OHLCV (query: startDate, endDate, limit)',
          auth: false
        },
        {
          method: 'POST',
          path: '/api/historical/fetch/:ticker',
          description: 'Collecter données pour un ticker (body: years)',
          auth: true
        },
        {
          method: 'POST',
          path: '/api/historical/fetch-batch',
          description: 'Collecter données pour plusieurs tickers (body: tickers[], years, delayMs)',
          auth: true
        },
        {
          method: 'POST',
          path: '/api/historical/update/:ticker',
          description: 'Mettre à jour les données (nouvelles uniquement)',
          auth: true
        },
        {
          method: 'GET',
          path: '/api/historical/mappings',
          description: 'Liste des mappings ticker PENDO → Yahoo',
          auth: false
        },
        {
          method: 'POST',
          path: '/api/historical/mappings',
          description: 'Ajouter un mapping (body: pendoTicker, yahooTicker, exchange, country)',
          auth: true
        },
        {
          method: 'GET',
          path: '/api/historical/fetch-history',
          description: 'Historique des collectes (query: ticker, limit)',
          auth: false
        }
      ],
      sources: ['Yahoo Finance'],
      supportedMarkets: [
        'Nigeria (NSE)',
        'South Africa (JSE)',
        'Kenya (NSE)',
        'Egypt (EGX)',
        'Morocco (CSE)',
        'All international markets supported by Yahoo Finance'
      ]
    });
  });

  return router;
}

module.exports = createHistoricalDataRouter;
