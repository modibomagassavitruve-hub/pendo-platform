/**
 * Routes API pour la gestion des backups
 */
const express = require('express');
const logger = require('../utils/logger');

module.exports = function(backupService, requireAuth) {
  const router = express.Router();

  /**
   * GET /api/backup/list
   * Lister tous les backups disponibles
   */
  router.get('/list', requireAuth, (req, res) => {
    try {
      const backups = backupService.listBackups();

      res.json({
        success: true,
        count: backups.length,
        data: backups
      });
    } catch (error) {
      logger.error('Failed to list backups', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/backup/create
   * Créer un backup manuel
   */
  router.post('/create', requireAuth, (req, res) => {
    try {
      const result = backupService.createBackup();

      if (result.success) {
        res.json({
          success: true,
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logger.error('Failed to create backup', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * DELETE /api/backup/:fileName
   * Supprimer un backup spécifique
   */
  router.delete('/:fileName', requireAuth, (req, res) => {
    try {
      const { fileName } = req.params;

      // Vérifier que le nom du fichier est valide
      if (!fileName.startsWith('pendo-backup-') || !fileName.endsWith('.db.gz')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid backup file name'
        });
      }

      const result = backupService.deleteBackup(fileName);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      logger.error('Failed to delete backup', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/backup/clean
   * Nettoyer les vieux backups
   */
  router.post('/clean', requireAuth, (req, res) => {
    try {
      const { keepCount = 10 } = req.body;

      const result = backupService.cleanOldBackups(parseInt(keepCount));

      res.json(result);
    } catch (error) {
      logger.error('Failed to clean old backups', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/backup/restore/:fileName
   * Restaurer un backup (ADMIN ONLY - très dangereux!)
   */
  router.post('/restore/:fileName', requireAuth, (req, res) => {
    try {
      const { fileName } = req.params;

      // Vérifier que l'utilisateur est admin
      if (req.user.role !== 'admin') {
        logger.securityEvent('Unauthorized restore attempt', {
          userId: req.user.id,
          email: req.user.email,
          file: fileName
        });

        return res.status(403).json({
          success: false,
          error: 'Accès refusé - Admin uniquement'
        });
      }

      // Vérifier que le nom du fichier est valide
      if (!fileName.startsWith('pendo-backup-') || !fileName.endsWith('.db.gz')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid backup file name'
        });
      }

      const result = backupService.restoreBackup(fileName);

      if (result.success) {
        logger.securityEvent('Database restored from backup', {
          userId: req.user.id,
          email: req.user.email,
          file: fileName,
          safetyBackup: result.safetyBackup
        });

        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      logger.error('Failed to restore backup', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};
