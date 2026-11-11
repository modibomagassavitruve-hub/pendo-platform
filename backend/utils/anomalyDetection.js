/**
 * Détection d'anomalies sur les mouvements de marché.
 *
 * Problème résolu : le classement "top mouvements du jour" existant est un
 * simple ORDER BY change_percent — il ne dit pas si un mouvement est
 * statistiquement normal pour ce titre ou un vrai signal d'alerte. Ce module
 * calcule, pour chaque titre, un z-score de sa dernière variation par rapport
 * à sa propre distribution historique (mean/std sur ses variations passées),
 * ce qui permet de distinguer "ce titre bouge toujours beaucoup" de "ce titre
 * vient de faire un mouvement inhabituel".
 */

const { mean, standardDeviation } = require('simple-statistics');

/**
 * @param {Array<Object>} rows - lignes SQL déjà triées par stock_id puis
 *   timestamp DESC (une ligne = un relevé de prix), avec au moins
 *   { stock_id, ticker, name, exchange_id, price, change_percent, volume, timestamp }
 * @param {Object} options
 * @param {number} [options.minHistory=5] - nb minimum de points historiques
 *   requis pour calculer un z-score fiable ; en dessous, l'anomalie n'est pas évaluée
 * @param {number} [options.threshold=2.5] - seuil de |z-score| à partir duquel
 *   un mouvement est considéré comme anormal
 * @returns {Array<Object>} un résultat par titre, trié par |z-score| décroissant
 */
function computeZScoreAnomalies(rows, { minHistory = 5, threshold = 2.5 } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Regrouper par stock_id (les lignes arrivent déjà triées stock_id, timestamp DESC)
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.stock_id)) groups.set(row.stock_id, []);
    groups.get(row.stock_id).push(row);
  }

  const results = [];

  for (const group of groups.values()) {
    const [latest, ...historyRows] = group;

    if (latest.change_percent === null || latest.change_percent === undefined ||
        !isFinite(latest.change_percent)) {
      continue;
    }

    const historyValues = historyRows
      .map((r) => r.change_percent)
      .filter((v) => v !== null && v !== undefined && isFinite(v));

    let zScore = null;
    let anomaly = false;
    let severity = 'normal';
    let reason = null;

    if (historyValues.length < minHistory) {
      reason = 'insufficient_history';
    } else {
      const historicalMean = mean(historyValues);
      const historicalStd = standardDeviation(historyValues);

      // Epsilon plutôt qu'une égalité stricte à 0 : un écart-type quasi nul
      // (valeurs historiques quasi identiques, résidu d'arrondi flottant)
      // ferait exploser le z-score par une division par un nombre minuscule.
      if (historicalStd < 1e-6) {
        reason = 'no_variance';
      } else {
        zScore = (latest.change_percent - historicalMean) / historicalStd;
        anomaly = Math.abs(zScore) >= threshold;

        if (Math.abs(zScore) >= 4) severity = 'critical';
        else if (Math.abs(zScore) >= 3) severity = 'high';
        else if (Math.abs(zScore) >= threshold) severity = 'medium';
      }
    }

    results.push({
      stock_id: latest.stock_id,
      ticker: latest.ticker,
      name: latest.name,
      exchange_id: latest.exchange_id,
      price: latest.price,
      change_percent: latest.change_percent,
      volume: latest.volume,
      timestamp: latest.timestamp,
      z_score: zScore !== null ? Math.round(zScore * 100) / 100 : null,
      historical_points: historyValues.length,
      anomaly,
      severity,
      reason
    });
  }

  return results.sort((a, b) => {
    const za = a.z_score !== null ? Math.abs(a.z_score) : -1;
    const zb = b.z_score !== null ? Math.abs(b.z_score) : -1;
    return zb - za;
  });
}

module.exports = { computeZScoreAnomalies };
