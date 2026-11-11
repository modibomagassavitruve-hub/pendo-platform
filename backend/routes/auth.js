/**
 * Routes API pour l'authentification
 */
const express = require('express');
const AuthService = require('../services/authService');
const { validateAuth } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

module.exports = function(db) {
  const router = express.Router();
  const authService = new AuthService(db);

  /**
   * POST /api/auth/register
   * Inscription d'un nouvel utilisateur
   */
  router.post('/register', registerLimiter, validateAuth, asyncHandler(async (req, res) => {
    const { email, password, first_name, last_name, phone, country } = req.body;

    // Validation basique
    if (!first_name || !last_name) {
      throw new AppError('Prénom et nom sont requis', 400);
    }

    const result = await authService.register({
      email,
      password,
      first_name,
      last_name,
      phone,
      country
    });

    res.status(201).json({
      success: true,
      data: result
    });
  }));

  /**
   * POST /api/auth/login
   * Connexion utilisateur
   */
  router.post('/login', authLimiter, validateAuth, asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    try {
      const result = await authService.login(email, password, ipAddress, userAgent);

      logger.authSuccess(result.user.id, email, { ipAddress, userAgent });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.authFailure(email, error.message, { ipAddress, userAgent });
      throw error;
    }
  }));

  /**
   * POST /api/auth/logout
   * Déconnexion
   */
  router.post('/logout', (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token manquant'
        });
      }

      const result = authService.logout(token);

      logger.info('User logged out', { userId: result.userId || 'unknown' });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Erreur logout', { error: error.message, stack: error.stack });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/auth/refresh
   * Rafraîchir le token d'accès
   */
  router.post('/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token manquant'
        });
      }

      const result = await authService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Erreur refresh token:', error);
      res.status(401).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/auth/me
   * Obtenir le profil de l'utilisateur connecté
   */
  router.get('/me', requireAuth, (req, res) => {
    try {
      const profile = authService.getUserProfile(req.user.id);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Erreur get profile:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * PUT /api/auth/profile
   * Mettre à jour le profil
   */
  router.put('/profile', requireAuth, (req, res) => {
    try {
      const updates = req.body;
      const profile = authService.updateProfile(req.user.id, updates);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Erreur update profile:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * PUT /api/auth/password
   * Changer le mot de passe
   */
  router.put('/password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Mot de passe actuel et nouveau mot de passe requis'
        });
      }

      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Erreur change password:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * PUT /api/auth/preferences
   * Mettre à jour les préférences
   */
  router.put('/preferences', requireAuth, (req, res) => {
    try {
      const preferences = req.body;
      const result = authService.updatePreferences(req.user.id, preferences);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Erreur update preferences:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/auth/activity
   * Obtenir l'historique d'activité
   */
  router.get('/activity', requireAuth, (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const activity = authService.getActivityLog(req.user.id, limit);

      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      console.error('Erreur get activity:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Middleware d'authentification
   */
  function requireAuth(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.securityEvent('Auth attempt without token', {
          ip: req.ip,
          url: req.url,
          method: req.method
        });
        return res.status(401).json({
          success: false,
          error: 'Token d\'authentification manquant'
        });
      }

      const verification = authService.verifyToken(token);

      if (!verification.valid) {
        logger.securityEvent('Invalid or expired token', {
          ip: req.ip,
          url: req.url,
          method: req.method
        });
        return res.status(401).json({
          success: false,
          error: 'Token invalide ou expiré'
        });
      }

      req.user = verification.user;
      next();
    } catch (error) {
      logger.error('Authentication failed', {
        error: error.message,
        ip: req.ip,
        url: req.url
      });
      res.status(401).json({
        success: false,
        error: 'Authentification échouée'
      });
    }
  }

  // Exporter le middleware pour utilisation dans d'autres routes
  router.requireAuth = requireAuth;

  return router;
};
