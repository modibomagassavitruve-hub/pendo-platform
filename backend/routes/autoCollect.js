/**
 * Routes API pour la collecte automatique
 * Permet de déclencher manuellement la collecte de données
 */

const express = require('express');
const router = express.Router();

const ComprehensiveAfricaNewsCollector = require('../services/comprehensiveAfricaNewsCollector');
const ComprehensiveAfricaOpportunitiesCollector = require('../services/comprehensiveAfricaOpportunitiesCollector');

/**
 * POST /api/auto-collect/news
 * Déclencher la collecte complète des actualités africaines
 */
router.post('/news', async (req, res) => {
  try {
    console.log('🚀 Démarrage collecte manuelle actualités...');

    const collector = new ComprehensiveAfricaNewsCollector();
    const stats = await collector.collectAllAfricanNews();

    res.json({
      success: true,
      message: 'Collecte actualités terminée',
      data: {
        totalCollected: stats.totalCollected,
        exchangesCovered: Object.keys(stats.byExchange).length,
        countriesCovered: Object.keys(stats.byCountry).length,
        errors: stats.errors.length,
        details: stats
      }
    });
  } catch (error) {
    console.error('Erreur collecte actualités:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la collecte des actualités',
      message: error.message
    });
  }
});

/**
 * POST /api/auto-collect/opportunities
 * Déclencher la génération complète des opportunités africaines
 */
router.post('/opportunities', async (req, res) => {
  try {
    console.log('🚀 Démarrage génération manuelle opportunités...');

    const collector = new ComprehensiveAfricaOpportunitiesCollector();
    const stats = await collector.collectAllAfricanOpportunities();

    res.json({
      success: true,
      message: 'Génération opportunités terminée',
      data: {
        totalGenerated: stats.totalGenerated,
        countriesCovered: Object.keys(stats.byCountry).length,
        sectorsCovered: Object.keys(stats.bySector).length,
        details: stats
      }
    });
  } catch (error) {
    console.error('Erreur génération opportunités:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération des opportunités',
      message: error.message
    });
  }
});

/**
 * POST /api/auto-collect/all
 * Déclencher la collecte complète (actualités + opportunités)
 */
router.post('/all', async (req, res) => {
  try {
    console.log('🚀 Démarrage collecte complète...');

    // Collecte actualités
    const newsCollector = new ComprehensiveAfricaNewsCollector();
    const newsStats = await newsCollector.collectAllAfricanNews();

    // Génération opportunités
    const oppsCollector = new ComprehensiveAfricaOpportunitiesCollector();
    const oppsStats = await oppsCollector.collectAllAfricanOpportunities();

    res.json({
      success: true,
      message: 'Collecte complète terminée',
      data: {
        news: {
          totalCollected: newsStats.totalCollected,
          exchangesCovered: Object.keys(newsStats.byExchange).length,
          countriesCovered: Object.keys(newsStats.byCountry).length,
          errors: newsStats.errors.length
        },
        opportunities: {
          totalGenerated: oppsStats.totalGenerated,
          countriesCovered: Object.keys(oppsStats.byCountry).length,
          sectorsCovered: Object.keys(oppsStats.bySector).length
        }
      }
    });
  } catch (error) {
    console.error('Erreur collecte complète:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la collecte complète',
      message: error.message
    });
  }
});

/**
 * GET /api/auto-collect/status
 * Obtenir le statut de la dernière collecte
 */
router.get('/status', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const logFile = path.join(__dirname, '..', 'logs', 'daily-collection.log');

  try {
    if (fs.existsSync(logFile)) {
      const logs = fs.readFileSync(logFile, 'utf8')
        .trim()
        .split('\n')
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line))
        .slice(-10); // 10 dernières exécutions

      res.json({
        success: true,
        data: {
          lastExecution: logs[logs.length - 1],
          recentExecutions: logs
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          message: 'Aucune collecte n\'a encore été exécutée'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erreur lecture logs',
      message: error.message
    });
  }
});

module.exports = router;
