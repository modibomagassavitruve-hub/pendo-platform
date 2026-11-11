/**
 * Middleware de validation pour les requêtes API
 */

// Validation des transactions de portefeuille
const validateTransaction = (req, res, next) => {
  const { ticker, type, quantity, price } = req.body;
  const errors = [];

  // Vérifier ticker
  if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
    errors.push('Le ticker est requis et doit être une chaîne non vide');
  } else if (ticker.length > 20) {
    errors.push('Le ticker ne peut pas dépasser 20 caractères');
  }

  // Vérifier type
  if (!type || !['buy', 'sell'].includes(type)) {
    errors.push('Le type de transaction doit être "buy" ou "sell"');
  }

  // Vérifier quantity
  if (quantity === undefined || quantity === null) {
    errors.push('La quantité est requise');
  } else if (typeof quantity !== 'number' || isNaN(quantity)) {
    errors.push('La quantité doit être un nombre valide');
  } else if (quantity <= 0) {
    errors.push('La quantité doit être supérieure à 0');
  } else if (!Number.isInteger(quantity)) {
    errors.push('La quantité doit être un nombre entier');
  }

  // Vérifier price
  if (price === undefined || price === null) {
    errors.push('Le prix est requis');
  } else if (typeof price !== 'number' || isNaN(price)) {
    errors.push('Le prix doit être un nombre valide');
  } else if (price <= 0) {
    errors.push('Le prix doit être supérieur à 0');
  }

  // Vérifier date (optionnel)
  if (req.body.date) {
    const date = new Date(req.body.date);
    if (isNaN(date.getTime())) {
      errors.push('La date fournie n\'est pas valide');
    }
    if (date > new Date()) {
      errors.push('La date ne peut pas être dans le futur');
    }
  }

  // Vérifier fees (optionnel)
  if (req.body.fees !== undefined) {
    if (typeof req.body.fees !== 'number' || isNaN(req.body.fees)) {
      errors.push('Les frais doivent être un nombre valide');
    } else if (req.body.fees < 0) {
      errors.push('Les frais ne peuvent pas être négatifs');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Données de transaction invalides',
      details: errors
    });
  }

  next();
};

// Validation des alertes de prix
const validateAlert = (req, res, next) => {
  const { ticker, alertType, targetValue } = req.body;
  const errors = [];

  // Vérifier ticker
  if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
    errors.push('Le ticker est requis');
  }

  // Vérifier alertType
  if (!alertType || !['price_above', 'price_below'].includes(alertType)) {
    errors.push('Le type d\'alerte doit être "price_above" ou "price_below"');
  }

  // Vérifier targetValue
  if (targetValue === undefined || targetValue === null) {
    errors.push('La valeur cible est requise');
  } else if (typeof targetValue !== 'number' || isNaN(targetValue)) {
    errors.push('La valeur cible doit être un nombre valide');
  } else if (targetValue <= 0) {
    errors.push('La valeur cible doit être supérieure à 0');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Données d\'alerte invalides',
      details: errors
    });
  }

  next();
};

// Validation de l'authentification
const validateAuth = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  // Vérifier email
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('L\'email est requis');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('L\'email n\'est pas valide');
  } else if (email.length > 255) {
    errors.push('L\'email ne peut pas dépasser 255 caractères');
  }

  // Vérifier password avec exigences de complexité
  if (!password || typeof password !== 'string') {
    errors.push('Le mot de passe est requis');
  } else if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  } else if (password.length > 128) {
    errors.push('Le mot de passe ne peut pas dépasser 128 caractères');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Données d\'authentification invalides',
      details: errors
    });
  }

  next();
};

// Validation stricte pour l'inscription
const validateRegistration = (req, res, next) => {
  const { email, password, first_name, last_name } = req.body;
  const errors = [];

  // Vérifier email
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('L\'email est requis');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('L\'email n\'est pas valide');
  } else if (email.length > 255) {
    errors.push('L\'email ne peut pas dépasser 255 caractères');
  }

  // Vérifier password avec exigences de complexité
  if (!password || typeof password !== 'string') {
    errors.push('Le mot de passe est requis');
  } else {
    if (password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    }
    if (password.length > 128) {
      errors.push('Le mot de passe ne peut pas dépasser 128 caractères');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }
  }

  // Vérifier first_name
  if (!first_name || typeof first_name !== 'string' || first_name.trim().length === 0) {
    errors.push('Le prénom est requis');
  } else if (first_name.length > 100) {
    errors.push('Le prénom ne peut pas dépasser 100 caractères');
  }

  // Vérifier last_name
  if (!last_name || typeof last_name !== 'string' || last_name.trim().length === 0) {
    errors.push('Le nom est requis');
  } else if (last_name.length > 100) {
    errors.push('Le nom ne peut pas dépasser 100 caractères');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Données d\'inscription invalides',
      details: errors
    });
  }

  next();
};

// Sanitization des entrées (protection XSS et injection)
const sanitizeInput = (req, res, next) => {
  // Nettoyer les chaînes de caractères
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;

    // Protection XSS: encoder les caractères HTML dangereux
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();
  };

  // Parcourir req.body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }

  // Parcourir req.params
  if (req.params) {
    Object.keys(req.params).forEach(key => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = sanitizeString(req.params[key]);
      }
    });
  }

  // Parcourir req.query
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    });
  }

  next();
};

// Validation des paramètres de pagination
const validatePagination = (req, res, next) => {
  const { limit, offset } = req.query;
  const errors = [];

  if (limit !== undefined) {
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      errors.push('La limite doit être un nombre positif');
    } else if (parsedLimit > 100) {
      errors.push('La limite ne peut pas dépasser 100');
    }
    req.query.limit = parsedLimit;
  }

  if (offset !== undefined) {
    const parsedOffset = parseInt(offset);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      errors.push('L\'offset doit être un nombre positif ou zéro');
    }
    req.query.offset = parsedOffset;
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Paramètres de pagination invalides',
      details: errors
    });
  }

  next();
};

// Validation des limites numériques (protection contre les abus)
const validateNumericLimits = (req, res, next) => {
  const checkNumber = (value, fieldName, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    if (value === undefined || value === null) return null;
    const num = parseFloat(value);
    if (isNaN(num)) return `${fieldName} doit être un nombre valide`;
    if (num < min) return `${fieldName} doit être supérieur ou égal à ${min}`;
    if (num > max) return `${fieldName} doit être inférieur ou égal à ${max}`;
    return null;
  };

  const errors = [];

  // Vérifier les paramètres de query courants
  if (req.query.limit) {
    const err = checkNumber(req.query.limit, 'limit', 1, 1000);
    if (err) errors.push(err);
  }
  if (req.query.offset) {
    const err = checkNumber(req.query.offset, 'offset', 0, 100000);
    if (err) errors.push(err);
  }
  if (req.query.min_investment_min) {
    const err = checkNumber(req.query.min_investment_min, 'min_investment_min', 0, 1000000000);
    if (err) errors.push(err);
  }
  if (req.query.min_investment_max) {
    const err = checkNumber(req.query.min_investment_max, 'min_investment_max', 0, 1000000000);
    if (err) errors.push(err);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Paramètres numériques invalides',
      details: errors
    });
  }

  next();
};

module.exports = {
  validateTransaction,
  validateAlert,
  validateAuth,
  validateRegistration,
  sanitizeInput,
  validatePagination,
  validateNumericLimits
};
