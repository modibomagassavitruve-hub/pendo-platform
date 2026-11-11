/**
 * Tests pour le service de backup
 */
const Database = require('better-sqlite3');
const BackupService = require('../services/backupService');
const fs = require('fs');
const path = require('path');

describe('BackupService Tests', () => {
  let db;
  let backupService;
  const testDbPath = path.join(__dirname, 'test-backup.db');
  const testBackupDir = path.join(__dirname, 'test-backups');

  beforeEach(() => {
    // Créer une base de données de test
    db = new Database(testDbPath);

    // Créer une table de test
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value INTEGER
      )
    `);

    // Insérer des données de test
    const insert = db.prepare('INSERT INTO test_data (name, value) VALUES (?, ?)');
    insert.run('test1', 100);
    insert.run('test2', 200);

    db.close();

    // Créer le service de backup
    backupService = new BackupService(testDbPath, testBackupDir);
  });

  afterEach(() => {
    // Nettoyer les fichiers de test
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Supprimer le répertoire de backup et son contenu
    if (fs.existsSync(testBackupDir)) {
      const files = fs.readdirSync(testBackupDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testBackupDir, file));
      });
      fs.rmdirSync(testBackupDir);
    }

    // Arrêter les backups automatiques
    if (backupService.cronJob) {
      backupService.stopAutoBackup();
    }
  });

  describe('createBackup', () => {
    test('should create a backup successfully', () => {
      const result = backupService.createBackup();

      expect(result.success).toBe(true);
      expect(result.file).toContain('pendo-backup-');
      expect(result.file).toContain('.db.gz');
      expect(result.size).toBeDefined();
      expect(fs.existsSync(result.path)).toBe(true);
    });

    test('should fail if database does not exist', () => {
      // Supprimer la base de données
      fs.unlinkSync(testDbPath);

      const result = backupService.createBackup();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('listBackups', () => {
    test('should list all backups', () => {
      // Créer quelques backups
      backupService.createBackup();
      backupService.createBackup();

      const backups = backupService.listBackups();

      expect(backups.length).toBeGreaterThanOrEqual(2);
      expect(backups[0]).toHaveProperty('name');
      expect(backups[0]).toHaveProperty('path');
      expect(backups[0]).toHaveProperty('size');
      expect(backups[0]).toHaveProperty('created');
    });

    test('should return empty array if no backups exist', () => {
      const backups = backupService.listBackups();
      expect(backups).toEqual([]);
    });
  });

  describe('deleteBackup', () => {
    test('should delete a backup successfully', () => {
      const backup = backupService.createBackup();
      expect(backup.success).toBe(true);

      const result = backupService.deleteBackup(backup.file);

      expect(result.success).toBe(true);
      expect(fs.existsSync(backup.path)).toBe(false);
    });

    test('should fail if backup does not exist', () => {
      const result = backupService.deleteBackup('nonexistent-backup.db.gz');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('cleanOldBackups', () => {
    test('should keep only the specified number of backups', () => {
      // Créer 5 backups
      for (let i = 0; i < 5; i++) {
        backupService.createBackup();
      }

      // Garder seulement 3
      const result = backupService.cleanOldBackups(3);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(2);
      expect(result.kept).toBe(3);

      const backups = backupService.listBackups();
      expect(backups.length).toBe(3);
    });

    test('should not delete anything if count is below threshold', () => {
      backupService.createBackup();
      backupService.createBackup();

      const result = backupService.cleanOldBackups(5);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(0);
      expect(result.kept).toBe(2);
    });
  });

  describe('restoreBackup', () => {
    test('should restore a backup successfully', () => {
      // Créer un backup
      const backup = backupService.createBackup();
      expect(backup.success).toBe(true);

      // Modifier la base de données
      const modifyDb = new Database(testDbPath);
      modifyDb.prepare('INSERT INTO test_data (name, value) VALUES (?, ?)').run('test3', 300);
      const beforeRestore = modifyDb.prepare('SELECT COUNT(*) as count FROM test_data').get();
      expect(beforeRestore.count).toBe(3);
      modifyDb.close();

      // Restaurer le backup
      const result = backupService.restoreBackup(backup.file);

      expect(result.success).toBe(true);
      expect(result.safetyBackup).toBeDefined();

      // Vérifier que les données sont restaurées
      const restoredDb = new Database(testDbPath);
      const afterRestore = restoredDb.prepare('SELECT COUNT(*) as count FROM test_data').get();
      expect(afterRestore.count).toBe(2); // Retour à l'état original
      restoredDb.close();
    });

    test('should fail if backup file does not exist', () => {
      const result = backupService.restoreBackup('nonexistent-backup.db.gz');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
