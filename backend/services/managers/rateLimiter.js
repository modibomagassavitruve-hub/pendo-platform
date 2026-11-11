/**
 * Rate Limiter Intelligent
 *
 * Gestion du rate limiting avec:
 * - Limite par source de données
 * - Backoff exponentiel en cas d'erreur
 * - Circuit breaker pour protéger les sources
 * - Métriques de performance
 *
 * @module managers/rateLimiter
 */

// Configuration par source
const SOURCE_LIMITS = {
  yahoo: {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    minDelay: 500,           // Délai minimum entre requêtes (ms)
    maxDelay: 30000,         // Délai maximum après erreurs (ms)
    circuitBreakerThreshold: 5,  // Erreurs consécutives avant ouverture
    circuitBreakerTimeout: 60000 // Temps avant réessai (ms)
  },
  afx: {
    requestsPerMinute: 6,
    requestsPerHour: 100,
    minDelay: 2000,
    maxDelay: 60000,
    circuitBreakerThreshold: 3,
    circuitBreakerTimeout: 120000
  },
  alpha: {
    requestsPerMinute: 5,
    requestsPerHour: 25,      // Limite gratuite journalière
    minDelay: 12000,
    maxDelay: 60000,
    circuitBreakerThreshold: 2,
    circuitBreakerTimeout: 300000
  }
};

// État du rate limiter par source
const sourceState = {};

/**
 * Initialise l'état d'une source
 * @param {string} sourceName - Nom de la source
 */
function initSourceState(sourceName) {
  if (!sourceState[sourceName]) {
    sourceState[sourceName] = {
      requestsThisMinute: 0,
      requestsThisHour: 0,
      minuteStartTime: Date.now(),
      hourStartTime: Date.now(),
      lastRequestTime: 0,
      consecutiveErrors: 0,
      currentDelay: SOURCE_LIMITS[sourceName]?.minDelay || 1000,
      circuitOpen: false,
      circuitOpenTime: 0,
      totalRequests: 0,
      totalErrors: 0
    };
  }
  return sourceState[sourceName];
}

/**
 * Réinitialise les compteurs si nécessaire
 * @param {string} sourceName - Nom de la source
 */
function resetCountersIfNeeded(sourceName) {
  const state = initSourceState(sourceName);
  const now = Date.now();

  // Réinitialiser le compteur par minute
  if (now - state.minuteStartTime >= 60000) {
    state.requestsThisMinute = 0;
    state.minuteStartTime = now;
  }

  // Réinitialiser le compteur par heure
  if (now - state.hourStartTime >= 3600000) {
    state.requestsThisHour = 0;
    state.hourStartTime = now;
  }
}

/**
 * Vérifie si le circuit breaker est ouvert
 * @param {string} sourceName - Nom de la source
 * @returns {boolean}
 */
function isCircuitOpen(sourceName) {
  const state = initSourceState(sourceName);
  const config = SOURCE_LIMITS[sourceName];

  if (!config) return false;

  if (state.circuitOpen) {
    // Vérifier si le timeout est passé
    if (Date.now() - state.circuitOpenTime >= config.circuitBreakerTimeout) {
      // Fermer le circuit pour réessayer
      state.circuitOpen = false;
      state.consecutiveErrors = 0;
      console.log(`[RateLimiter] 🔌 Circuit fermé pour ${sourceName}`);
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Vérifie si une requête peut être effectuée
 * @param {string} sourceName - Nom de la source
 * @returns {{ allowed: boolean, waitTime: number, reason: string }}
 */
function canMakeRequest(sourceName) {
  const state = initSourceState(sourceName);
  const config = SOURCE_LIMITS[sourceName];

  if (!config) {
    return { allowed: true, waitTime: 0, reason: 'unknown_source' };
  }

  resetCountersIfNeeded(sourceName);

  // Vérifier le circuit breaker
  if (isCircuitOpen(sourceName)) {
    const remainingTime = config.circuitBreakerTimeout - (Date.now() - state.circuitOpenTime);
    return {
      allowed: false,
      waitTime: remainingTime,
      reason: 'circuit_open'
    };
  }

  // Vérifier la limite par minute
  if (state.requestsThisMinute >= config.requestsPerMinute) {
    const remainingTime = 60000 - (Date.now() - state.minuteStartTime);
    return {
      allowed: false,
      waitTime: remainingTime,
      reason: 'minute_limit'
    };
  }

  // Vérifier la limite par heure
  if (state.requestsThisHour >= config.requestsPerHour) {
    const remainingTime = 3600000 - (Date.now() - state.hourStartTime);
    return {
      allowed: false,
      waitTime: remainingTime,
      reason: 'hour_limit'
    };
  }

  // Vérifier le délai minimum entre requêtes
  const timeSinceLastRequest = Date.now() - state.lastRequestTime;
  if (timeSinceLastRequest < state.currentDelay) {
    return {
      allowed: false,
      waitTime: state.currentDelay - timeSinceLastRequest,
      reason: 'min_delay'
    };
  }

  return { allowed: true, waitTime: 0, reason: 'ok' };
}

/**
 * Attend que la requête soit autorisée
 * @param {string} sourceName - Nom de la source
 * @returns {Promise<boolean>} True si autorisé, false si timeout
 */
async function waitForPermission(sourceName, maxWait = 60000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const { allowed, waitTime, reason } = canMakeRequest(sourceName);

    if (allowed) {
      return true;
    }

    if (reason === 'circuit_open') {
      console.log(`[RateLimiter] 🚫 ${sourceName}: Circuit ouvert`);
      return false;
    }

    if (waitTime > maxWait - (Date.now() - startTime)) {
      console.log(`[RateLimiter] ⏱️ ${sourceName}: Attente trop longue (${waitTime}ms)`);
      return false;
    }

    console.log(`[RateLimiter] ⏳ ${sourceName}: Attente ${waitTime}ms (${reason})`);
    await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 5000)));
  }

  return false;
}

/**
 * Enregistre le début d'une requête
 * @param {string} sourceName - Nom de la source
 */
function recordRequestStart(sourceName) {
  const state = initSourceState(sourceName);

  resetCountersIfNeeded(sourceName);

  state.requestsThisMinute++;
  state.requestsThisHour++;
  state.lastRequestTime = Date.now();
  state.totalRequests++;
}

/**
 * Enregistre le succès d'une requête
 * @param {string} sourceName - Nom de la source
 */
function recordSuccess(sourceName) {
  const state = initSourceState(sourceName);
  const config = SOURCE_LIMITS[sourceName];

  // Réinitialiser les erreurs consécutives
  state.consecutiveErrors = 0;

  // Réduire le délai progressivement
  if (config && state.currentDelay > config.minDelay) {
    state.currentDelay = Math.max(
      config.minDelay,
      state.currentDelay * 0.9
    );
  }
}

/**
 * Enregistre l'échec d'une requête
 * @param {string} sourceName - Nom de la source
 * @param {string} errorType - Type d'erreur (timeout, http_error, parse_error)
 */
function recordError(sourceName, errorType = 'unknown') {
  const state = initSourceState(sourceName);
  const config = SOURCE_LIMITS[sourceName];

  state.consecutiveErrors++;
  state.totalErrors++;

  if (config) {
    // Backoff exponentiel
    state.currentDelay = Math.min(
      config.maxDelay,
      state.currentDelay * 2
    );

    // Ouvrir le circuit si trop d'erreurs
    if (state.consecutiveErrors >= config.circuitBreakerThreshold) {
      state.circuitOpen = true;
      state.circuitOpenTime = Date.now();
      console.log(`[RateLimiter] ⚠️ Circuit ouvert pour ${sourceName} (${state.consecutiveErrors} erreurs)`);
    }
  }

  console.log(`[RateLimiter] ❌ ${sourceName}: Erreur #${state.consecutiveErrors} (${errorType}), délai: ${state.currentDelay}ms`);
}

/**
 * Enregistre une erreur 429 (Too Many Requests)
 * @param {string} sourceName - Nom de la source
 * @param {number} retryAfter - Temps d'attente suggéré (secondes)
 */
function recordRateLimitHit(sourceName, retryAfter = null) {
  const state = initSourceState(sourceName);
  const config = SOURCE_LIMITS[sourceName];

  state.consecutiveErrors++;

  if (retryAfter) {
    state.currentDelay = retryAfter * 1000;
  } else if (config) {
    state.currentDelay = Math.min(config.maxDelay, state.currentDelay * 3);
  }

  console.log(`[RateLimiter] 🚫 ${sourceName}: Rate limit atteint, délai: ${state.currentDelay}ms`);
}

/**
 * Retourne les statistiques d'une source
 * @param {string} sourceName - Nom de la source
 * @returns {Object}
 */
function getSourceStats(sourceName) {
  const state = initSourceState(sourceName);
  const config = SOURCE_LIMITS[sourceName];

  resetCountersIfNeeded(sourceName);

  return {
    requestsThisMinute: state.requestsThisMinute,
    requestsThisHour: state.requestsThisHour,
    limitPerMinute: config?.requestsPerMinute || 'N/A',
    limitPerHour: config?.requestsPerHour || 'N/A',
    currentDelay: state.currentDelay,
    consecutiveErrors: state.consecutiveErrors,
    circuitOpen: state.circuitOpen,
    totalRequests: state.totalRequests,
    totalErrors: state.totalErrors,
    errorRate: state.totalRequests > 0
      ? ((state.totalErrors / state.totalRequests) * 100).toFixed(2) + '%'
      : '0%'
  };
}

/**
 * Retourne les statistiques de toutes les sources
 * @returns {Object}
 */
function getAllStats() {
  const stats = {};

  for (const sourceName of Object.keys(SOURCE_LIMITS)) {
    stats[sourceName] = getSourceStats(sourceName);
  }

  return stats;
}

/**
 * Réinitialise l'état d'une source
 * @param {string} sourceName - Nom de la source
 */
function resetSource(sourceName) {
  delete sourceState[sourceName];
  initSourceState(sourceName);
  console.log(`[RateLimiter] 🔄 ${sourceName} réinitialisé`);
}

/**
 * Réinitialise toutes les sources
 */
function resetAll() {
  for (const sourceName of Object.keys(sourceState)) {
    delete sourceState[sourceName];
  }
  console.log(`[RateLimiter] 🔄 Toutes les sources réinitialisées`);
}

/**
 * Décorateur pour wrapper une fonction avec rate limiting
 * @param {string} sourceName - Nom de la source
 * @param {Function} fn - Fonction à wrapper
 * @returns {Function}
 */
function withRateLimit(sourceName, fn) {
  return async (...args) => {
    const canProceed = await waitForPermission(sourceName);

    if (!canProceed) {
      throw new Error(`Rate limit: ${sourceName} non disponible`);
    }

    recordRequestStart(sourceName);

    try {
      const result = await fn(...args);
      recordSuccess(sourceName);
      return result;
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        recordRateLimitHit(sourceName, retryAfter ? parseInt(retryAfter) : null);
      } else {
        recordError(sourceName, error.code || 'unknown');
      }
      throw error;
    }
  };
}

module.exports = {
  canMakeRequest,
  waitForPermission,
  recordRequestStart,
  recordSuccess,
  recordError,
  recordRateLimitHit,
  getSourceStats,
  getAllStats,
  resetSource,
  resetAll,
  withRateLimit,
  isCircuitOpen,
  SOURCE_LIMITS
};
