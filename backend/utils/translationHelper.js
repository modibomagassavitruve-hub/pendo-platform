/**
 * Utilitaire pour gérer les traductions multilingues
 * Supporte 27 langues : internationales + africaines
 */

// Toutes les langues supportées par Pendo (sauf fr qui est la langue par défaut)
const SUPPORTED_LANGUAGES = [
  // Internationales
  'en', 'es', 'pt', 'de', 'ar',
  // Afrique de l'Ouest
  'wo', 'bm', 'yo', 'ig', 'ha', 'ff', 'fon', 'tw', 'ee',
  // Afrique Centrale
  'ln', 'kg', 'sg',
  // Afrique de l'Est
  'sw', 'am',
  // Afrique Australe
  'af', 'zu', 'xh', 'sn', 'st', 'tn', 'ts', 'ss', 'nd'
];

/**
 * Normalise le code de langue
 * Gère les cas spéciaux comme 'fon' (3 caractères)
 */
function normalizeLangCode(lang) {
  if (!lang) return 'fr';
  const lowered = lang.toLowerCase();

  // Cas spécial pour 'fon' (3 caractères)
  if (lowered === 'fon' || lowered.startsWith('fon')) {
    return 'fon';
  }

  // Pour les autres, prendre les 2-3 premiers caractères
  return lowered.substring(0, 3).replace(/[^a-z]/g, '').substring(0, 2);
}

/**
 * Vérifie si une langue est supportée
 */
function isLanguageSupported(lang) {
  const normalized = normalizeLangCode(lang);
  return SUPPORTED_LANGUAGES.includes(normalized) || normalized === 'fon';
}

/**
 * Récupère les champs traduits selon la langue
 * NOTE: Les articles RSS sont souvent en anglais. Le champ par défaut (title, summary)
 * contient le texte original (souvent anglais). Pour le français, on utilise title_fr si disponible.
 *
 * @param {string} lang - Code de langue
 * @returns {object} - Map des champs à sélectionner
 */
function getTranslatedFields(lang = 'fr') {
  const normalizedLang = normalizeLangCode(lang);

  // Pour le français: utiliser title_fr si disponible, sinon le titre original
  if (normalizedLang === 'fr') {
    return {
      title: `COALESCE(title_fr, title)`,
      description: `COALESCE(description_fr, description)`,
      summary: `COALESCE(summary_fr, summary)`,
      content: `COALESCE(content_fr, content)`
    };
  }

  // Pour les autres langues supportées
  if (isLanguageSupported(normalizedLang)) {
    return {
      title: `COALESCE(title_${normalizedLang}, title)`,
      description: `COALESCE(description_${normalizedLang}, description)`,
      summary: `COALESCE(summary_${normalizedLang}, summary)`,
      content: `COALESCE(content_${normalizedLang}, content)`
    };
  }

  // Langue non supportée: retourner les champs par défaut
  return {
    title: 'title',
    description: 'description',
    summary: 'summary',
    content: 'content'
  };
}

/**
 * Traduit un objet avec les champs multilingues
 * NOTE: Les articles originaux sont souvent en anglais. Pour le français,
 * on utilise title_fr, summary_fr si disponibles.
 *
 * @param {object} obj - Objet à traduire
 * @param {string} lang - Code de langue
 * @returns {object} - Objet avec les champs traduits
 */
function translateObject(obj, lang = 'fr') {
  if (!obj) return obj;

  const normalizedLang = normalizeLangCode(lang);
  const translated = { ...obj };

  // Pour le français: utiliser les champs _fr si disponibles
  if (normalizedLang === 'fr') {
    if (obj.title_fr) {
      translated.title = obj.title_fr;
    }
    if (obj.description_fr) {
      translated.description = obj.description_fr;
    }
    if (obj.summary_fr) {
      translated.summary = obj.summary_fr;
    }
    if (obj.content_fr) {
      translated.content = obj.content_fr;
    }
    return cleanTranslationFields(translated);
  }

  // Pour les autres langues supportées
  if (isLanguageSupported(normalizedLang)) {
    const langSuffix = normalizedLang;

    if (obj[`title_${langSuffix}`]) {
      translated.title = obj[`title_${langSuffix}`];
    }
    if (obj[`description_${langSuffix}`]) {
      translated.description = obj[`description_${langSuffix}`];
    }
    if (obj[`summary_${langSuffix}`]) {
      translated.summary = obj[`summary_${langSuffix}`];
    }
    if (obj[`content_${langSuffix}`]) {
      translated.content = obj[`content_${langSuffix}`];
    }
  }

  // Supprimer tous les champs de traduction bruts
  return cleanTranslationFields(translated);
}

// Regex pré-compilée (une seule fois au chargement du module, pas à chaque appel)
const LANG_FIELD_PATTERN = new RegExp(`_(${SUPPORTED_LANGUAGES.join('|')}|fon|fr)$`);

/**
 * Supprime les champs de traduction bruts de l'objet
 */
function cleanTranslationFields(obj) {
  if (!obj) return obj;

  const cleaned = { ...obj };

  Object.keys(cleaned).forEach(key => {
    if (LANG_FIELD_PATTERN.test(key)) {
      delete cleaned[key];
    }
  });

  return cleaned;
}

/**
 * Traduit un tableau d'objets
 * @param {array} arr - Tableau d'objets à traduire
 * @param {string} lang - Code de langue
 * @returns {array} - Tableau avec les objets traduits
 */
function translateArray(arr, lang = 'fr') {
  if (!Array.isArray(arr)) return arr;
  return arr.map(obj => translateObject(obj, lang));
}

/**
 * Extrait la langue depuis les headers de la requête
 * @param {object} req - Objet requête Express
 * @returns {string} - Code de langue
 */
function getLanguageFromRequest(req) {
  // Vérifier le query param lang (priorité)
  if (req.query && req.query.lang) {
    return req.query.lang;
  }

  // Vérifier le header Accept-Language
  const acceptLanguage = req.headers && req.headers['accept-language'];
  if (acceptLanguage) {
    // Prendre la première langue
    const lang = acceptLanguage.split(',')[0].split('-')[0];
    return lang;
  }

  // Par défaut, français
  return 'fr';
}

/**
 * Liste des langues supportées avec leurs noms
 */
const LANGUAGE_INFO = {
  fr: { name: 'Français', nativeName: 'Français', region: 'international' },
  en: { name: 'English', nativeName: 'English', region: 'international' },
  es: { name: 'Español', nativeName: 'Español', region: 'international' },
  pt: { name: 'Português', nativeName: 'Português', region: 'international' },
  de: { name: 'Deutsch', nativeName: 'Deutsch', region: 'international' },
  ar: { name: 'العربية', nativeName: 'العربية', region: 'international', rtl: true },
  wo: { name: 'Wolof', nativeName: 'Wolof', region: 'west' },
  bm: { name: 'Bambara', nativeName: 'Bamanankan', region: 'west' },
  yo: { name: 'Yoruba', nativeName: 'Yorùbá', region: 'west' },
  ig: { name: 'Igbo', nativeName: 'Igbo', region: 'west' },
  ha: { name: 'Hausa', nativeName: 'Hausa', region: 'west' },
  ff: { name: 'Fulani', nativeName: 'Fulfulde', region: 'west' },
  fon: { name: 'Fon', nativeName: 'Fongbe', region: 'west' },
  tw: { name: 'Twi', nativeName: 'Twi', region: 'west' },
  ee: { name: 'Ewe', nativeName: 'Eʋegbe', region: 'west' },
  ln: { name: 'Lingala', nativeName: 'Lingála', region: 'central' },
  kg: { name: 'Kikongo', nativeName: 'Kikongo', region: 'central' },
  sg: { name: 'Sango', nativeName: 'Sängö', region: 'central' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili', region: 'east' },
  am: { name: 'Amharic', nativeName: 'አማርኛ', region: 'east' },
  af: { name: 'Afrikaans', nativeName: 'Afrikaans', region: 'south' },
  zu: { name: 'Zulu', nativeName: 'isiZulu', region: 'south' },
  xh: { name: 'Xhosa', nativeName: 'isiXhosa', region: 'south' },
  sn: { name: 'Shona', nativeName: 'chiShona', region: 'south' },
  st: { name: 'Sesotho', nativeName: 'Sesotho', region: 'south' },
  tn: { name: 'Tswana', nativeName: 'Setswana', region: 'south' },
  ts: { name: 'Tsonga', nativeName: 'Xitsonga', region: 'south' },
  ss: { name: 'Swati', nativeName: 'siSwati', region: 'south' },
};

module.exports = {
  SUPPORTED_LANGUAGES,
  LANGUAGE_INFO,
  normalizeLangCode,
  isLanguageSupported,
  getTranslatedFields,
  translateObject,
  translateArray,
  getLanguageFromRequest,
  cleanTranslationFields
};
