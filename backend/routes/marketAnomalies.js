/**
 * Routes API pour la détection d'anomalies sur les mouvements de marché.
 *
 * Complète le classement brut "top mouvements du jour" (ORDER BY change_percent)
 * par une lecture statistique : est-ce que la variation actuelle d'un titre
 * est normale pour CE titre, ou s'écarte-t-elle fortement de son comportement
 * historique (z-score) ? Base pour une future fonctionnalité d'alertes
 * intelligentes ("ce mouvement est inhabituel pour ce titre").
 */
const express = require('express');
const { computeZScoreAnomalies } = require('../utils/anomalyDetection');

module.exports = function (db) {
  const router = express.Router();

  /**
   * GET /api/market-anomalies
   * Query params:
   *   - limit: nombre max de résultats (défaut 10)
   *   - threshold: seuil de |z-score| au-delà duquel un mouvement est anormal (défaut 2.5)
   *   - min_history: nb minimum de relevés historiques requis pour évaluer un titre (défaut 5)
   *   - all: si 'true', retourne tous les titres (avec leur z-score) et pas
   *     seulement ceux flaggés comme anomalies — utile pour une vue de debug/admin
   */
  router.get('/', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const threshold = parseFloat(req.query.threshold) || 2.5;
      const minHistory = parseInt(req.query.min_history) || 5;
      const returnAll = req.query.all === 'true';

      const rows = await db.all(`
        SELECT sp.stock_id, s.ticker, s.name, s.exchange_id,
               sp.price, sp.change_percent, sp.volume, sp.timestamp
        FROM stock_prices sp
        JOIN stocks s ON s.id = sp.stock_id
        ORDER BY sp.stock_id, sp.timestamp DESC
      `);

      let results = computeZScoreAnomalies(rows || [], { minHistory, threshold });

      if (!returnAll) {
        results = results.filter((r) => r.anomaly);
      }

      results = results.slice(0, limit);

      res.json({
        success: true,
        data: results,
        count: results.length,
        params: { threshold, min_history: minHistory, mode: returnAll ? 'all' : 'anomalies_only' }
      });
    } catch (error) {
      console.error('Erreur détection anomalies marché:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
