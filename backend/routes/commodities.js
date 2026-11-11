/**
 * PENDO - Routes API Commodities Trading
 */

const express = require('express');
const router = express.Router();

function createCommoditiesRouter(db, requireAuth, commoditiesService) {
  /**
   * GET /api/commodities
   * Obtenir liste de toutes les commodities disponibles
   */
  router.get('/', (req, res) => {
    try {
      const commodities = commoditiesService.getCommodityPrices();

      res.json({
        success: true,
        count: commodities.length,
        commodities
      });
    } catch (error) {
      console.error('Erreur récupération commodities:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/commodities/:symbol
   * Obtenir détails + historique prix d'une commodity
   */
  router.get('/:symbol', (req, res) => {
    try {
      const { symbol } = req.params;
      const { limit = 30 } = req.query; // 30 derniers jours par défaut

      const data = commoditiesService.getCommodityPrices(symbol, parseInt(limit));

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Commodity introuvable'
        });
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Erreur récupération commodity:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/commodities/buy
   * Acheter une commodity
   */
  router.post('/buy', requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const { symbol, quantity, positionType = 'spot' } = req.body;

      if (!symbol || !quantity) {
        return res.status(400).json({
          success: false,
          error: 'Symbol et quantity requis'
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantity doit être > 0'
        });
      }

      const result = await commoditiesService.buyCommodity(
        userId,
        symbol,
        parseFloat(quantity),
        positionType
      );

      res.json({
        success: true,
        message: `${result.commodity} acheté avec succès`,
        transaction: result
      });
    } catch (error) {
      console.error('Erreur achat commodity:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/commodities/sell
   * Vendre une commodity
   */
  router.post('/sell', requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const { symbol, quantity, positionType = 'spot' } = req.body;

      if (!symbol || !quantity) {
        return res.status(400).json({
          success: false,
          error: 'Symbol et quantity requis'
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantity doit être > 0'
        });
      }

      const result = await commoditiesService.sellCommodity(
        userId,
        symbol,
        parseFloat(quantity),
        positionType
      );

      res.json({
        success: true,
        message: `${result.commodity} vendu avec succès`,
        transaction: result
      });
    } catch (error) {
      console.error('Erreur vente commodity:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/commodities/portfolio/:userId
   * Obtenir portfolio commodities d'un utilisateur
   */
  router.get('/portfolio/:userId', requireAuth, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Vérifier que l'utilisateur demande son propre portfolio
      if (req.user.userId !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé'
        });
      }

      const portfolio = commoditiesService.getCommoditiesPortfolio(userId);

      res.json({
        success: true,
        portfolio
      });
    } catch (error) {
      console.error('Erreur récupération portfolio commodities:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/commodities/hedge/create
   * Créer position de hedging (pour producteurs)
   */
  router.post('/hedge/create', requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const {
        symbol,
        productionVolume,
        hedgeRatio = 1.0,
        harvestDate
      } = req.body;

      if (!symbol || !productionVolume || !harvestDate) {
        return res.status(400).json({
          success: false,
          error: 'Symbol, productionVolume et harvestDate requis'
        });
      }

      const result = await commoditiesService.createHedge(
        userId,
        symbol,
        parseFloat(productionVolume),
        parseFloat(hedgeRatio),
        harvestDate
      );

      res.json({
        success: true,
        message: 'Position de hedging créée avec succès',
        hedge: result
      });
    } catch (error) {
      console.error('Erreur création hedge:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/commodities/hedge/calculator
   * Calculateur stratégie hedging
   */
  router.post('/hedge/calculator', requireAuth, (req, res) => {
    try {
      const {
        productionVolume,
        currentPriceUSD,
        costOfProductionUSD,
        targetProfitMargin = 0.20
      } = req.body;

      if (!productionVolume || !currentPriceUSD || !costOfProductionUSD) {
        return res.status(400).json({
          success: false,
          error: 'productionVolume, currentPriceUSD et costOfProductionUSD requis'
        });
      }

      const strategy = commoditiesService.calculateHedgingStrategy(
        parseFloat(productionVolume),
        parseFloat(currentPriceUSD),
        parseFloat(costOfProductionUSD),
        parseFloat(targetProfitMargin)
      );

      res.json({
        success: true,
        strategy
      });
    } catch (error) {
      console.error('Erreur calculateur hedge:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/commodities/hedge/:userId
   * Obtenir positions de hedging d'un utilisateur
   */
  router.get('/hedge/:userId', requireAuth, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (req.user.userId !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé'
        });
      }

      const hedges = db.prepare(`
        SELECT
          hp.*,
          c.name,
          c.name_en,
          c.current_price_usd
        FROM hedging_positions hp
        JOIN commodities c ON hp.commodity_symbol = c.symbol
        WHERE hp.user_id = ?
        ORDER BY hp.created_at DESC
      `).all(userId);

      res.json({
        success: true,
        count: hedges.length,
        hedges
      });
    } catch (error) {
      console.error('Erreur récupération hedges:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/commodities/transactions/:userId
   * Historique transactions commodities
   */
  router.get('/transactions/:userId', requireAuth, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { limit = 50, type } = req.query;

      if (req.user.userId !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé'
        });
      }

      let query = `
        SELECT
          ct.*,
          c.name,
          c.name_en
        FROM commodity_transactions ct
        JOIN commodities c ON ct.commodity_symbol = c.symbol
        WHERE ct.user_id = ?
      `;
      const params = [userId];

      if (type) {
        query += ` AND ct.type = ?`;
        params.push(type);
      }

      query += ` ORDER BY ct.timestamp DESC LIMIT ?`;
      params.push(parseInt(limit));

      const transactions = db.prepare(query).all(...params);

      res.json({
        success: true,
        count: transactions.length,
        transactions
      });
    } catch (error) {
      console.error('Erreur récupération transactions:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/commodities/prices/update
   * Mettre à jour prix (ADMIN ou cron job)
   */
  router.post('/prices/update', requireAuth, (req, res) => {
    try {
      // TODO: Vérifier role admin
      const { prices } = req.body;

      if (!prices || typeof prices !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Format prices invalide. Attendu: { "XAU/USD": 2050, "CC": 2600, ... }'
        });
      }

      commoditiesService.updatePrices(prices);

      res.json({
        success: true,
        message: `${Object.keys(prices).length} prix mis à jour`,
        updated: Object.keys(prices)
      });
    } catch (error) {
      console.error('Erreur mise à jour prix:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/commodities/info
   * Informations sur l'API Commodities
   */
  router.get('/api/info', (req, res) => {
    res.json({
      success: true,
      info: {
        name: 'PENDO Commodities Trading API',
        version: '1.0.0',
        description: 'Trading de matières premières pour l\'Afrique',
        commodities: {
          precious_metals: ['Gold (XAU/USD)', 'Silver (XAG/USD)'],
          agriculture: ['Cocoa (CC)', 'Coffee Arabica (KC)', 'Coffee Robusta (RC)', 'Cotton (CT)'],
          energy: ['Crude Oil WTI (CL)', 'Crude Oil Brent (BZ)']
        },
        features: [
          'Spot trading',
          'Futures contracts',
          'Fractional ownership',
          'Hedging for producers',
          'Real-time prices',
          'Historical data',
          'Hedging calculator'
        ],
        africanFocus: {
          gold: '20% production mondiale',
          cocoa: '70% production mondiale',
          coffee: '12% production mondiale',
          cotton: '15% production mondiale',
          oil: '12% production mondiale'
        }
      }
    });
  });

  return router;
}

module.exports = createCommoditiesRouter;
