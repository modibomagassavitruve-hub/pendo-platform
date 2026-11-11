import i18n from '../i18n';

/**
 * Fonction helper pour les appels fetch avec support multilingue
 * Ajoute automatiquement le header Accept-Language
 */
export const apiFetch = async (url, options = {}) => {
  // Récupérer la langue actuelle
  const currentLang = i18n.language || 'fr';

  // Préparer les headers
  const headers = {
    'Content-Type': 'application/json',
    'Accept-Language': currentLang,
    ...(options.headers || {})
  };

  // Effectuer la requête
  const response = await fetch(url, {
    ...options,
    headers
  });

  return response;
};

/**
 * Fonction helper pour les appels fetch qui retournent du JSON
 */
export const apiFetchJson = async (url, options = {}) => {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Fonction pour construire une URL avec le paramètre lang
 */
export const buildApiUrl = (baseUrl, params = {}) => {
  const currentLang = i18n.language || 'fr';
  const urlParams = new URLSearchParams({
    lang: currentLang,
    ...params
  });

  return `${baseUrl}?${urlParams.toString()}`;
};
