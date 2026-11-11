/**
 * Middleware de rate limiting pour protéger l'API contre les abus
 */
const rateLimit = require('express-rate-limit');

// Limiter général pour toutes les routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite de 100 requêtes par fenêtre
  message: {
    success: false,
    error: 'Trop de requêtes, veuillez réessayer dans 15 minutes'
  },
  standardHeaders: true, // Retourne les info de rate limit dans `RateLimit-*` headers
  legacyHeaders: false, // Désactive les `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Limiter strict pour l'authentification (éviter brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 tentatives de connexion
  message: {
    success: false,
    error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes'
  },
  skipSuccessfulRequests: true, // Ne compte que les échecs
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Trop de tentatives de connexion échouées. Compte temporairement bloqué.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Limiter pour l'inscription (éviter spam)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // Maximum 3 inscriptions par heure
  message: {
    success: false,
    error: 'Trop d\'inscriptions. Veuillez réessayer dans 1 heure'
  }
});

// Limiter pour les endpoints de création (transactions, alertes, etc.)
const createLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Maximum 10 créations par minute
  message: {
    success: false,
    error: 'Trop de créations. Veuillez ralentir.'
  }
});

// Limiter pour les endpoints de scraping/refresh (coûteux)
const scrapeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 2, // Maximum 2 requêtes de scraping toutes les 5 minutes
  message: {
    success: false,
    error: 'Limite de rafraîchissement atteinte. Veuillez attendre 5 minutes.'
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Les données sont actualisées automatiquement. Veuillez patienter avant de forcer une nouvelle mise à jour.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Limiter pour les exports (PDF, Excel)
const exportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Maximum 10 exports toutes les 5 minutes
  message: {
    success: false,
    error: 'Trop d\'exports. Veuillez attendre quelques minutes.'
  }
});

// Limiter souple pour les requêtes de lecture
const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requêtes par minute (1 par seconde en moyenne)
  message: {
    success: false,
    error: 'Trop de requêtes. Veuillez ralentir.'
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  registerLimiter,
  createLimiter,
  scrapeLimiter,
  exportLimiter,
  readLimiter
};
