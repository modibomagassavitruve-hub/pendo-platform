/**
 * Service de backup automatique pour PENDO
 * Sauvegarde régulière de la base de données SQLite
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('../utils/logger');

class BackupService {
  constructor(dbPath, backupDir = null) {
    this.dbPath = dbPath;
    this.backupDir = backupDir || path.join(path.dirname(dbPath), '../backups');
    this.ensureBackupDir();
  }

  /**
   * Créer le répertoire de backup s'il n'existe pas
   */
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info('Backup directory created', { path: this.backupDir });
    }
  }

  /**
   * Créer un backup de la base de données
   */
  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `pendo-backup-${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Vérifier que la base de données source existe
      if (!fs.existsSync(this.dbPath)) {
        throw new Error(`Database file not found: ${this.dbPath}`);
      }

      // Copier la base de données
      fs.copyFileSync(this.dbPath, backupPath);

      // Compresser le backup
      const gzipPath = `${backupPath}.gz`;
      execSync(`gzip -f "${backupPath}"`, { stdio: 'pipe' });

      const stats = fs.statSync(gzipPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      logger.info('Backup created successfully', {
        file: path.basename(gzipPath),
        size: `${sizeInMB} MB`,
        path: gzipPath
      });

      return {
        success: true,
        file: path.basename(gzipPath),
        path: gzipPath,
        size: sizeInMB,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Backup creation failed', {
        error: error.message,
        stack: error.stack,
        dbPath: this.dbPath
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Lister tous les backups
   */
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('pendo-backup-') && file.endsWith('.db.gz'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
            created: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));

      return files;
    } catch (error) {
      logger.error('Failed to list backups', {
        error: error.message,
        backupDir: this.backupDir
      });
      return [];
    }
  }

  /**
   * Supprimer un backup spécifique
   */
  deleteBackup(fileName) {
    try {
      const backupPath = path.join(this.backupDir, fileName);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${fileName}`);
      }

      fs.unlinkSync(backupPath);

      logger.info('Backup deleted', { file: fileName });

      return {
        success: true,
        message: `Backup ${fileName} deleted`
      };
    } catch (error) {
      logger.error('Failed to delete backup', {
        error: error.message,
        file: fileName
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Nettoyer les vieux backups (garder seulement les N derniers)
   */
  cleanOldBackups(keepCount = 10) {
    try {
      const backups = this.listBackups();

      if (backups.length <= keepCount) {
        logger.info('No old backups to clean', {
          total: backups.length,
          keepCount
        });
        return {
          success: true,
          deleted: 0,
          kept: backups.length
        };
      }

      const toDelete = backups.slice(keepCount);
      let deletedCount = 0;

      toDelete.forEach(backup => {
        try {
          fs.unlinkSync(backup.path);
          deletedCount++;
        } catch (err) {
          logger.error('Failed to delete old backup', {
            error: err.message,
            file: backup.name
          });
        }
      });

      logger.info('Old backups cleaned', {
        deleted: deletedCount,
        kept: backups.length - deletedCount
      });

      return {
        success: true,
        deleted: deletedCount,
        kept: backups.length - deletedCount
      };
    } catch (error) {
      logger.error('Failed to clean old backups', {
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Restaurer un backup
   */
  restoreBackup(fileName) {
    try {
      const backupPath = path.join(this.backupDir, fileName);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${fileName}`);
      }

      // Créer un backup de sécurité de la base actuelle
      const safetyBackup = `${this.dbPath}.before-restore-${Date.now()}`;
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, safetyBackup);
      }

      // Décompresser le backup
      const decompressedPath = backupPath.replace('.gz', '');
      execSync(`gunzip -c "${backupPath}" > "${decompressedPath}"`, { stdio: 'pipe' });

      // Remplacer la base actuelle
      fs.copyFileSync(decompressedPath, this.dbPath);

      // Supprimer le fichier décompressé temporaire
      fs.unlinkSync(decompressedPath);

      logger.info('Backup restored successfully', {
        file: fileName,
        safetyBackup: path.basename(safetyBackup)
      });

      return {
        success: true,
        message: 'Backup restored successfully',
        safetyBackup: path.basename(safetyBackup)
      };
    } catch (error) {
      logger.error('Backup restoration failed', {
        error: error.message,
        stack: error.stack,
        file: fileName
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Démarrer les backups automatiques (quotidiens à 2h00)
   */
  startAutoBackup(hour = 2, minute = 0, keepCount = 10) {
    const cron = require('node-cron');

    // Créer un backup immédiatement au démarrage
    this.createBackup();
    this.cleanOldBackups(keepCount);

    // Planifier les backups quotidiens
    const schedule = `${minute} ${hour} * * *`;

    this.cronJob = cron.schedule(schedule, () => {
      logger.info('Starting scheduled backup');
      this.createBackup();
      this.cleanOldBackups(keepCount);
    }, {
      timezone: 'UTC'
    });

    logger.info('Auto-backup scheduled', {
      schedule: `Daily at ${hour}:${minute.toString().padStart(2, '0')} UTC`,
      keepCount: `${keepCount} backups`
    });

    return this.cronJob;
  }

  /**
   * Arrêter les backups automatiques
   */
  stopAutoBackup() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Auto-backup stopped');
    }
  }
}

module.exports = BackupService;
