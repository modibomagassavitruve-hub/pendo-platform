/**
 * Scoring des opportunités d'investissement.
 *
 * Problème résolu : la liste d'opportunités n'était triable que par date,
 * rendement affiché ou montant d'investissement — aucune mesure combinée de
 * "qualité"/pertinence de l'opportunité. Ce module calcule un score composite
 * 0-100 à partir des champs déjà présents en base (pas de nouvelle donnée à
 * collecter), pondérant rendement, risque, fraîcheur, complétude/vérification
 * et traction utilisateur (vues/sauvegardes).
 *
 * Le score est calculé à la volée (pas stocké en base) : il reste cohérent
 * même si les compteurs de vues/sauvegardes évoluent entre deux requêtes.
 */

const RISK_FACTOR = {
  low: 1,
  faible: 1,
  medium: 2,
  moyen: 2,
  moderate: 2,
  high: 3.2,
  eleve: 3.2,
  élevé: 3.2,
  'very high': 4.5,
  'très élevé': 4.5
};

function clamp01(value) {
  if (!isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return null;
  return (Date.now() - d) / 86400000;
}

/**
 * Calcule le score composite d'une opportunité d'investissement.
 * @param {Object} opp - ligne investment_opportunities (+ tags éventuels)
 * @returns {{ score: number, label: string, breakdown: Object }}
 */
function computeOpportunityScore(opp) {
  const expectedReturn = Number(opp.expected_return_max ?? opp.expected_return_min ?? 0) || 0;
  const riskKey = (opp.risk_level || '').toString().trim().toLowerCase();
  const riskFactor = RISK_FACTOR[riskKey] || 2; // risque "moyen" par défaut si inconnu

  // 1) Potentiel de rendement (30 pts) — plafonné à 50% de retour attendu
  const returnScore = clamp01(expectedReturn / 50) * 30;

  // 2) Rendement ajusté du risque (20 pts) — récompense un bon ratio retour/risque
  const riskAdjusted = expectedReturn / riskFactor;
  const riskAdjustedScore = clamp01(riskAdjusted / 25) * 20;

  // 3) Fraîcheur (15 pts) — décroît linéairement sur 90 jours
  const age = daysSince(opp.published_at);
  const freshnessScore = age === null ? 7.5 : clamp01(1 - age / 90) * 15;

  // 4) Complétude & vérification (15 pts)
  let completeness = 0;
  if (opp.is_verified) completeness += 7;
  if (opp.image_url || opp.logo_url) completeness += 3;
  if ((opp.description || '').length > 100) completeness += 3;
  if (opp.market_size_usd) completeness += 2;
  const completenessScore = Math.min(completeness, 15);

  // 5) Traction utilisateur (10 pts) — échelle logarithmique pour éviter
  // qu'un seul gros pic de vues n'écrase les autres facteurs
  const engagement = (opp.views || 0) + (opp.saves || 0) * 3;
  const engagementScore = clamp01(Math.log10(1 + engagement) / Math.log10(500)) * 10;

  // 6) Taille de marché (10 pts) — échelle logarithmique, plafond 1 Md USD
  const marketSize = Number(opp.market_size_usd || 0);
  const marketSizeScore = clamp01(Math.log10(1 + marketSize) / Math.log10(1e9)) * 10;

  const total = returnScore + riskAdjustedScore + freshnessScore +
    completenessScore + engagementScore + marketSizeScore;

  const score = Math.round(total * 10) / 10;

  let label;
  if (score >= 75) label = 'Excellente opportunité';
  else if (score >= 55) label = 'Bonne opportunité';
  else if (score >= 35) label = 'Opportunité modérée';
  else label = 'À examiner';

  return {
    score,
    label,
    breakdown: {
      return: Math.round(returnScore * 10) / 10,
      risk_adjusted: Math.round(riskAdjustedScore * 10) / 10,
      freshness: Math.round(freshnessScore * 10) / 10,
      completeness: Math.round(completenessScore * 10) / 10,
      engagement: Math.round(engagementScore * 10) / 10,
      market_size: Math.round(marketSizeScore * 10) / 10
    }
  };
}

/**
 * Enrichit une liste d'opportunités avec leur score (relevance_score,
 * relevance_label) sans muter les objets d'origine.
 */
function scoreOpportunities(opportunities) {
  return (opportunities || []).map((opp) => {
    const { score, label, breakdown } = computeOpportunityScore(opp);
    return {
      ...opp,
      relevance_score: score,
      relevance_label: label,
      relevance_breakdown: breakdown
    };
  });
}

module.exports = { computeOpportunityScore, scoreOpportunities };
