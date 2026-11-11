/**
 * Système de logging structuré pour PENDO
 * En production: logs écrits en fichier uniquement
 * En développement: logs console + fichier
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, '../logs');
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isTest = process.env.NODE_ENV === 'test';
    this.logLevel = process.env.LOG_LEVEL || (this.isProduction ? 'info' : 'debug');
    this.enableConsole = !this.isProduction && !this.isTest;
    this.ensureLogsDir();
  }

  // Niveaux de priorité des logs
  get levels() {
    return { error: 0, warn: 1, info: 2, debug: 3 };
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  ensureLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
      pid: process.pid,
      hostname: require('os').hostname()
    });
  }

  writeToFile(filename, content) {
    const filepath = path.join(this.logsDir, filename);
    fs.appendFileSync(filepath, content + '\n');
  }

  log(level, message, meta = {}) {
    // Vérifier si le niveau de log est autorisé
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.formatMessage(level, message, meta);

    // Console (désactivée en production)
    if (this.enableConsole) {
      const colors = {
        error: '\x1b[31m',
        warn: '\x1b[33m',
        info: '\x1b[36m',
        debug: '\x1b[90m',
        reset: '\x1b[0m'
      };
      console.log(`${colors[level] || colors.reset}${formatted}${colors.reset}`);
    }

    // Fichier (toujours actif sauf en test)
    if (!this.isTest) {
      const date = new Date().toISOString().split('T')[0];
      this.writeToFile(`${date}.log`, formatted);

      // Fichier d'erreurs séparé
      if (level === 'error') {
        this.writeToFile(`errors-${date}.log`, formatted);
      }
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  // Méthode pour remplacer les console.log
  console(message, meta = {}) {
    if (!this.isProduction) {
      this.debug(message, meta);
    }
  }

  // Logs d'activité API
  apiRequest(req, meta = {}) {
    this.info('API Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      ...meta
    });
  }

  apiResponse(req, res, duration, meta = {}) {
    this.info('API Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ...meta
    });
  }

  // Logs de base de données
  dbQuery(query, duration, meta = {}) {
    this.debug('DB Query', {
      query,
      duration: `${duration}ms`,
      ...meta
    });
  }

  dbError(error, query, meta = {}) {
    this.error('DB Error', {
      error: error.message,
      stack: error.stack,
      query,
      ...meta
    });
  }

  // Logs d'authentification
  authSuccess(userId, email, meta = {}) {
    this.info('Auth Success', {
      userId,
      email,
      ...meta
    });
  }

  authFailure(email, reason, meta = {}) {
    this.warn('Auth Failure', {
      email,
      reason,
      ...meta
    });
  }

  // Logs de sécurité
  securityEvent(event, meta = {}) {
    this.warn('Security Event', {
      event,
      ...meta
    });

    // Fichier de sécurité séparé
    const date = new Date().toISOString().split('T')[0];
    this.writeToFile(`security-${date}.log`, this.formatMessage('security', event, meta));
  }

  // Rotation des logs (garder 30 jours)
  rotateLogs(daysToKeep = 30) {
    const files = fs.readdirSync(this.logsDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    files.forEach(file => {
      const filepath = path.join(this.logsDir, file);
      const stats = fs.statSync(filepath);

      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filepath);
        this.info('Log file deleted (rotation)', { file });
      }
    });
  }
}

// Instance singleton
const logger = new Logger();

// Rotation automatique des logs une fois par jour
setInterval(() => {
  logger.rotateLogs();
}, 24 * 60 * 60 * 1000);

module.exports = logger;
