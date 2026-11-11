/**
 * Middleware global de traduction automatique
 * Intercepte toutes les réponses JSON et traduit le contenu selon la langue demandée
 */

const { translateArray, translateObject, getLanguageFromRequest } = require('../utils/translationHelper');

/**
 * Middleware qui intercepte res.json() pour traduire automatiquement
 */
function translationMiddleware(req, res, next) {
  // Sauvegarder la fonction json originale
  const originalJson = res.json.bind(res);

  // Remplacer res.json avec notre version qui traduit
  res.json = function(data) {
    // Extraire la langue de la requête
    const lang = getLanguageFromRequest(req);

    // Si c'est français ou pas de langue, retourner tel quel
    if (!lang || lang === 'fr') {
      return originalJson(data);
    }

    // Traduire les données selon leur structure
    if (data && typeof data === 'object') {
      // Si c'est un objet avec une propriété 'data' (format API standard)
      if (data.data) {
        if (Array.isArray(data.data)) {
          // Traduire le tableau
          data.data = translateArray(data.data, lang);
        } else if (typeof data.data === 'object') {
          // Traduire l'objet unique
          data.data = translateObject(data.data, lang);
        }
      }
      // Si c'est directement un tableau
      else if (Array.isArray(data)) {
        data = translateArray(data, lang);
      }
      // Si c'est un objet simple sans structure API
      else if (!data.success && !data.error) {
        data = translateObject(data, lang);
      }
    }

    return originalJson(data);
  };

  next();
}

module.exports = translationMiddleware;
