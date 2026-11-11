/**
 * Middleware de gestion centralisée des erreurs
 */

// Classe d'erreur personnalisée
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Middleware de gestion des erreurs
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log de l'erreur pour le debugging
  console.error('❌ Erreur:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    body: req.body
  });

  // Erreur de base de données SQLite
  if (err.code === 'SQLITE_CONSTRAINT') {
    error = new AppError('Contrainte de base de données violée', 400, err.message);
  }

  // Erreur de JWT
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Token JWT invalide', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token JWT expiré', 401);
  }

  // Erreur de validation
  if (err.name === 'ValidationError') {
    error = new AppError('Erreur de validation', 400, err.details);
  }

  // Erreur de syntaxe JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError('JSON invalide dans la requête', 400);
  }

  // Déterminer le code de statut
  const statusCode = error.statusCode || 500;

  // Préparer la réponse
  const response = {
    success: false,
    error: error.message || 'Erreur serveur interne'
  };

  // Ajouter les détails en mode développement
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = error.details;
  }

  res.status(statusCode).json(response);
};

// Middleware pour les routes non trouvées
const notFound = (req, res, next) => {
  const error = new AppError(`Route non trouvée: ${req.originalUrl}`, 404);
  next(error);
};

// Wrapper pour les fonctions async
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Gestion des erreurs non capturées
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION! Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    process.exit(1);
  });
};

const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (err) => {
    console.error('❌ UNHANDLED REJECTION! Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    process.exit(1);
  });
};

module.exports = {
  AppError,
  errorHandler,
  notFound,
  asyncHandler,
  handleUncaughtException,
  handleUnhandledRejection
};
