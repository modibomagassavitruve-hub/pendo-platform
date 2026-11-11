/**
 * Logger Utilitaire
 *
 * Logging structuré avec niveaux et timestamps
 *
 * @module utils/logger
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Niveau de log actuel (configurable via env)
let currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

// Couleurs pour la console
const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m',  // Cyan
  info: '\x1b[32m',   // Vert
  warn: '\x1b[33m',   // Jaune
  error: '\x1b[31m'   // Rouge
};

/**
 * Formate un message de log
 * @param {string} level - Niveau de log
 * @param {string} module - Module source
 * @param {string} message - Message
 * @param {Object} data - Données additionnelles
 * @returns {string}
 */
function formatMessage(level, module, message, data) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`;

  if (data && Object.keys(data).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }

  return `${prefix} ${message}`;
}

/**
 * Log un message
 * @param {string} level - Niveau de log
 * @param {string} module - Module source
 * @param {string} message - Message
 * @param {Object} data - Données additionnelles
 */
function log(level, module, message, data = {}) {
  const levelValue = LOG_LEVELS[level.toUpperCase()];

  if (levelValue < currentLevel) return;

  const color = COLORS[level.toLowerCase()] || COLORS.reset;
  const formatted = formatMessage(level, module, message, data);

  switch (level.toUpperCase()) {
    case 'ERROR':
      console.error(`${color}${formatted}${COLORS.reset}`);
      break;
    case 'WARN':
      console.warn(`${color}${formatted}${COLORS.reset}`);
      break;
    default:
      console.log(`${color}${formatted}${COLORS.reset}`);
  }
}

/**
 * Crée un logger pour un module spécifique
 * @param {string} moduleName - Nom du module
 * @returns {Object} Logger avec méthodes debug, info, warn, error
 */
function createLogger(moduleName) {
  return {
    debug: (message, data) => log('DEBUG', moduleName, message, data),
    info: (message, data) => log('INFO', moduleName, message, data),
    warn: (message, data) => log('WARN', moduleName, message, data),
    error: (message, data) => log('ERROR', moduleName, message, data)
  };
}

/**
 * Définit le niveau de log
 * @param {string} level - Niveau (DEBUG, INFO, WARN, ERROR)
 */
function setLevel(level) {
  const newLevel = LOG_LEVELS[level.toUpperCase()];
  if (newLevel !== undefined) {
    currentLevel = newLevel;
  }
}

module.exports = {
  log,
  createLogger,
  setLevel,
  LOG_LEVELS
};
