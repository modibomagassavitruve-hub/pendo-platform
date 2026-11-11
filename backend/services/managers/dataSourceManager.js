/**
 * Data Source Manager
 *
 * Orchestration des sources de données avec stratégie de fallback intelligent
 * Priorité: Yahoo Finance → AFX Kwayisi → Alpha Vantage
 *
 * @module managers/dataSourceManager
 */

const yahooFinance = require('../sources/yahooFinance');
const afxKwayisi = require('../sources/afxKwayisi');
const alphaVantage = require('../sources/alphaVantage');
const casablanca = require('../sources/casablanca');

// Configuration des sources par ordre de priorité
const SOURCES = [
  { name: 'yahoo', module: yahooFinance, priority: 1, enabled: true },
  { name: 'afx', module: afxKwayisi, priority: 2, enabled: true },
  { name: 'casablanca', module: casablanca, priority: 2, enabled: true },
  { name: 'alpha', module: alphaVantage, priority: 3, enabled: true }
];

// Tous les marchés supportés
const ALL_MARKETS = ['jse', 'nse_ng', 'egx', 'brvm', 'nse_ke', 'masi'];

// Statistiques de santé des sources
const sourceHealth = {
  yahoo: { successCount: 0, failCount: 0, lastSuccess: null, lastFail: null, avgResponseTime: 0 },
  afx: { successCount: 0, failCount: 0, lastSuccess: null, lastFail: null, avgResponseTime: 0 },
  casablanca: { successCount: 0, failCount: 0, lastSuccess: null, lastFail: null, avgResponseTime: 0 },
  alpha: { successCount: 0, failCount: 0, lastSuccess: null, lastFail: null, avgResponseTime: 0 }
};

// Données de fallback statiques (dernier recours)
const FALLBACK_DATA = {
  jse: { id: 'jse', name: 'JSE All Share', country: 'Afrique du Sud', value: '78,243.50', rawValue: 78243.50, change: '+0.00%', changePercent: 0, positive: true, volume: 'N/A', source: 'Fallback' },
  nse_ng: { id: 'nse_ng', name: 'NGX All Share', country: 'Nigeria', value: '98,456.78', rawValue: 98456.78, change: '+0.00%', changePercent: 0, positive: true, volume: 'N/A', source: 'Fallback' },
  egx: { id: 'egx', name: 'EGX 30', country: 'Égypte', value: '28,234.15', rawValue: 28234.15, change: '+0.00%', changePercent: 0, positive: true, volume: 'N/A', source: 'Fallback' },
  brvm: { id: 'brvm', name: 'BRVM Composite', country: 'UEMOA', value: '234.56', rawValue: 234.56, change: '+0.00%', changePercent: 0, positive: true, volume: 'N/A', source: 'Fallback' },
  nse_ke: { id: 'nse_ke', name: 'NSE 20', country: 'Kenya', value: '1,678.90', rawValue: 1678.90, change: '+0.00%', changePercent: 0, positive: true, volume: 'N/A', source: 'Fallback' },
  masi: { id: 'masi', name: 'MASI', country: 'Maroc', value: '12,456.78', rawValue: 12456.78, change: '+0.00%', changePercent: 0, positive: true, volume: 'N/A', source: 'Fallback' }
};

/**
 * Met à jour les statistiques de santé d'une source
 * @param {string} sourceName - Nom de la source
 * @param {boolean} success - Si la requête a réussi
 * @param {number} responseTime - Temps de réponse en ms
 */
function updateSourceHealth(sourceName, success, responseTime = 0) {
  const health = sourceHealth[sourceName];
  if (!health) return;

  if (success) {
    health.successCount++;
    health.lastSuccess = new Date().toISOString();
    // Moyenne mobile du temps de réponse
    health.avgResponseTime = health.avgResponseTime === 0
      ? responseTime
      : (health.avgResponseTime * 0.7 + responseTime * 0.3);
  } else {
    health.failCount++;
    health.lastFail = new Date().toISOString();
  }
}

/**
 * Calcule le score de fiabilité d'une source
 * @param {string} sourceName - Nom de la source
 * @returns {number} Score entre 0 et 1
 */
function getSourceReliability(sourceName) {
  const health = sourceHealth[sourceName];
  if (!health) return 0;

  const total = health.successCount + health.failCount;
  if (total === 0) return 0.5; // Pas encore de données

  return health.successCount / total;
}

/**
 * Récupère les données d'un marché depuis une source spécifique
 * @param {Object} source - Configuration de la source
 * @param {string} marketId - Identifiant du marché
 * @returns {Promise<Object|null>}
 */
async function fetchFromSource(source, marketId) {
  const startTime = Date.now();

  try {
    const data = await source.module.fetchMarket(marketId);
    const responseTime = Date.now() - startTime;

    if (data) {
      updateSourceHealth(source.name, true, responseTime);
      return data;
    } else {
      updateSourceHealth(source.name, false);
      return null;
    }
  } catch (error) {
    updateSourceHealth(source.name, false);
    console.log(`[DSM] ❌ ${source.name}/${marketId}: ${error.message}`);
    return null;
  }
}

/**
 * Récupère les données d'un marché avec stratégie de fallback
 * @param {string} marketId - Identifiant du marché
 * @returns {Promise<Object>} Données du marché (toujours retourne quelque chose)
 */
async function fetchMarket(marketId) {
  console.log(`[DSM] 🔍 Récupération ${marketId}...`);

  // Trier les sources par priorité et fiabilité
  const sortedSources = SOURCES
    .filter(s => s.enabled)
    .sort((a, b) => {
      const reliabilityA = getSourceReliability(a.name);
      const reliabilityB = getSourceReliability(b.name);
      // Combiner priorité et fiabilité
      const scoreA = a.priority - (reliabilityA * 0.5);
      const scoreB = b.priority - (reliabilityB * 0.5);
      return scoreA - scoreB;
    });

  // Essayer chaque source dans l'ordre
  for (const source of sortedSources) {
    const data = await fetchFromSource(source, marketId);
    if (data) {
      console.log(`[DSM] ✅ ${marketId} via ${source.name}`);
      return data;
    }
  }

  // Fallback ultime: données statiques
  console.log(`[DSM] ⚠️ ${marketId}: Utilisation du fallback statique`);
  return {
    ...FALLBACK_DATA[marketId],
    timestamp: new Date().toISOString()
  };
}

/**
 * Récupère les données de tous les marchés
 * Stratégie: Essayer de récupérer chaque marché depuis la meilleure source disponible
 * @returns {Promise<Object[]>}
 */
async function fetchAllMarkets() {
  console.log(`[DSM] 🔄 Récupération de tous les marchés...`);
  const startTime = Date.now();

  const results = new Map();

  // Stratégie 1: Essayer Yahoo Finance en parallèle (rapide)
  console.log(`[DSM] 📡 Phase 1: Yahoo Finance...`);
  try {
    const yahooData = await yahooFinance.fetchAllMarkets();
    yahooData.forEach(data => {
      results.set(data.id, data);
    });
    console.log(`[DSM] ✅ Yahoo: ${yahooData.length} marchés`);
  } catch (error) {
    console.log(`[DSM] ⚠️ Yahoo: ${error.message}`);
  }

  // Stratégie 2: Compléter avec AFX Kwayisi pour les marchés manquants
  const missingMarkets = ALL_MARKETS.filter(id => !results.has(id));
  if (missingMarkets.length > 0) {
    console.log(`[DSM] 📡 Phase 2: AFX Kwayisi pour ${missingMarkets.join(', ')}...`);
    try {
      const afxData = await afxKwayisi.fetchAllMarkets();
      afxData.forEach(data => {
        if (!results.has(data.id)) {
          results.set(data.id, data);
        }
      });
      console.log(`[DSM] ✅ AFX: ${afxData.length} marchés`);
    } catch (error) {
      console.log(`[DSM] ⚠️ AFX: ${error.message}`);
    }
  }

  // Stratégie 3: Source Casablanca pour le MASI
  if (!results.has('masi')) {
    console.log(`[DSM] 📡 Phase 3: Casablanca pour MASI...`);
    try {
      const masiData = await casablanca.fetchMarket();
      if (masiData) {
        results.set('masi', masiData);
        console.log(`[DSM] ✅ Casablanca: MASI`);
      }
    } catch (error) {
      console.log(`[DSM] ⚠️ Casablanca: ${error.message}`);
    }
  }

  // Stratégie 4: Alpha Vantage en dernier recours (économiser les requêtes)
  const stillMissing = ALL_MARKETS.filter(id => !results.has(id));
  if (stillMissing.length > 0 && alphaVantage.canMakeRequest()) {
    console.log(`[DSM] 📡 Phase 4: Alpha Vantage pour ${stillMissing.join(', ')}...`);
    for (const marketId of stillMissing) {
      if (!alphaVantage.canMakeRequest()) break;

      const supportedByAlpha = alphaVantage.getSupportedMarkets();
      if (supportedByAlpha.includes(marketId)) {
        try {
          const data = await alphaVantage.fetchMarket(marketId);
          if (data) {
            results.set(data.id, data);
          }
        } catch (error) {
          console.log(`[DSM] ⚠️ Alpha ${marketId}: ${error.message}`);
        }
      }
    }
  }

  // Stratégie 5: Fallback statique pour les marchés toujours manquants
  const finalMissing = ALL_MARKETS.filter(id => !results.has(id));
  if (finalMissing.length > 0) {
    console.log(`[DSM] ⚠️ Fallback statique pour: ${finalMissing.join(', ')}`);
    finalMissing.forEach(marketId => {
      results.set(marketId, {
        ...FALLBACK_DATA[marketId],
        timestamp: new Date().toISOString()
      });
    });
  }

  const elapsed = Date.now() - startTime;
  const finalResults = Array.from(results.values());

  console.log(`[DSM] 📊 Terminé: ${finalResults.length}/${ALL_MARKETS.length} marchés en ${elapsed}ms`);

  // Résumé des sources utilisées
  const sourceSummary = {};
  finalResults.forEach(r => {
    sourceSummary[r.source] = (sourceSummary[r.source] || 0) + 1;
  });
  console.log(`[DSM] 📈 Sources:`, sourceSummary);

  return finalResults;
}

/**
 * Récupère l'état de santé de toutes les sources
 * @returns {Object}
 */
function getSourcesHealth() {
  const health = {};

  SOURCES.forEach(source => {
    const stats = sourceHealth[source.name];
    health[source.name] = {
      enabled: source.enabled,
      priority: source.priority,
      ...stats,
      reliability: getSourceReliability(source.name),
      supportedMarkets: source.module.getSupportedMarkets?.() || source.module.getMetadata?.().markets || []
    };
  });

  return health;
}

/**
 * Vérifie la disponibilité de toutes les sources
 * @returns {Promise<Object>}
 */
async function checkSourcesAvailability() {
  const availability = {};

  const checks = SOURCES.map(async source => {
    try {
      const isAvailable = await source.module.isAvailable();
      availability[source.name] = {
        available: isAvailable,
        checkedAt: new Date().toISOString()
      };
    } catch {
      availability[source.name] = {
        available: false,
        checkedAt: new Date().toISOString()
      };
    }
  });

  await Promise.all(checks);
  return availability;
}

/**
 * Active ou désactive une source
 * @param {string} sourceName - Nom de la source
 * @param {boolean} enabled - État souhaité
 */
function setSourceEnabled(sourceName, enabled) {
  const source = SOURCES.find(s => s.name === sourceName);
  if (source) {
    source.enabled = enabled;
    console.log(`[DSM] ${enabled ? '✅' : '❌'} Source ${sourceName} ${enabled ? 'activée' : 'désactivée'}`);
  }
}

/**
 * Retourne les métadonnées du manager
 * @returns {Object}
 */
function getMetadata() {
  return {
    sources: SOURCES.map(s => ({
      name: s.name,
      priority: s.priority,
      enabled: s.enabled,
      metadata: s.module.getMetadata()
    })),
    allMarkets: ALL_MARKETS,
    fallbackAvailable: true
  };
}

/**
 * Initialise le manager avec les clés API
 * @param {Object} config - Configuration
 */
function initialize(config = {}) {
  if (config.alphaVantageApiKey) {
    alphaVantage.setApiKey(config.alphaVantageApiKey);
    console.log(`[DSM] 🔑 Alpha Vantage API key configurée`);
  }

  console.log(`[DSM] ✅ DataSourceManager initialisé`);
  console.log(`[DSM] 📊 Sources actives: ${SOURCES.filter(s => s.enabled).map(s => s.name).join(', ')}`);
  console.log(`[DSM] 🌍 Marchés supportés: ${ALL_MARKETS.join(', ')}`);
}

module.exports = {
  fetchMarket,
  fetchAllMarkets,
  getSourcesHealth,
  checkSourcesAvailability,
  setSourceEnabled,
  getMetadata,
  initialize,
  ALL_MARKETS
};
