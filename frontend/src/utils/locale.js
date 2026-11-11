import i18n from 'i18next';

/**
 * Returns the browser locale string matching the current i18n language.
 * Falls back to 'fr-FR' if no match.
 */
export const getLocale = () => {
  const lang = i18n.language || 'fr';
  const map = {
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
    pt: 'pt-BR',
    ar: 'ar-SA',
    sw: 'sw-KE',
    de: 'de-DE',
    zh: 'zh-CN',
    ja: 'ja-JP',
    ko: 'ko-KR',
  };
  return map[lang] || map[lang.split('-')[0]] || 'fr-FR';
};

/**
 * Format a number with locale-aware separators.
 */
export const formatNumber = (value, options = {}) => {
  return new Intl.NumberFormat(getLocale(), options).format(value);
};

/**
 * Format currency (defaults to XOF).
 */
export const formatCurrency = (value, currency = 'XOF') => {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format a date string or Date object.
 */
export const formatDate = (date, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString(getLocale(), options);
};

/**
 * Format a time string or Date object.
 */
export const formatTime = (date, options = { hour: '2-digit', minute: '2-digit' }) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString(getLocale(), options);
};
