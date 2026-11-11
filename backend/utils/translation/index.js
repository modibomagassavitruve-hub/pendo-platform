/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║            PENDO TRANSLATOR — Moteur de Traduction          ║
 * ║                   100% GRATUIT — Zéro Coût                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Système de traduction sur mesure pour PENDO.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────┐
 * │  PendoTranslator                                │
 * │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
 * │  │  Cache    │→ │ Provider │→ │ Rate Limiter │  │
 * │  │  (SQLite) │  │  Chain   │  │  (per-provider)│ │
 * │  └──────────┘  └──────────┘  └──────────────┘  │
 * │                                                  │
 * │  Providers (ordre de fallback):                  │
 * │  1. Google GTX (gratuit, le + de langues)        │
 * │  2. Lingva (instances publiques Google)           │
 * │  3. MyMemory (backup, limite chars/jour)          │
 * └──────────────────────────────────────────────────┘
 *
 * IMPORTANT: AUCUNE API payante Google Cloud n'est utilisée.
 * Ne JAMAIS réintroduire de GOOGLE_TRANSLATE_API_KEY.
 */

const { getProvidersForLanguage, ALL_PROVIDERS } = require('./providers');
const { SQLiteTranslationCache, MemoryTranslationCache } = require('./cache');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ═══════════════════════════════════════════════════════════════
// Configuration des langues PENDO
// ═══════════════════════════════════════════════════════════════

const PENDO_LANGUAGES = {
  // Langues internationales
  fr:  { name: 'Français',    region: 'international', rtl: false },
  en:  { name: 'English',     region: 'international', rtl: false },
  es:  { name: 'Español',     region: 'international', rtl: false },
  ar:  { name: 'العربية',     region: 'international', rtl: true },
  de:  { name: 'Deutsch',     region: 'international', rtl: false },
  pt:  { name: 'Português',   region: 'international', rtl: false },

  // Afrique de l'Ouest
  wo:  { name: 'Wolof',       region: 'west_africa',   rtl: false },
  bm:  { name: 'Bambara',     region: 'west_africa',   rtl: false },
  yo:  { name: 'Yoruba',      region: 'west_africa',   rtl: false },
  ig:  { name: 'Igbo',        region: 'west_africa',   rtl: false },
  ha:  { name: 'Hausa',       region: 'west_africa',   rtl: false },
  ff:  { name: 'Fulfulde',    region: 'west_africa',   rtl: false },
  fon: { name: 'Fon',         region: 'west_africa',   rtl: false },
  tw:  { name: 'Twi',         region: 'west_africa',   rtl: false },
  ee:  { name: 'Ewe',         region: 'west_africa',   rtl: false },

  // Afrique Centrale
  ln:  { name: 'Lingala',     region: 'central_africa', rtl: false },
  kg:  { name: 'Kikongo',     region: 'central_africa', rtl: false },
  sg:  { name: 'Sango',       region: 'central_africa', rtl: false },

  // Afrique de l'Est
  sw:  { name: 'Kiswahili',   region: 'east_africa',   rtl: false },
  am:  { name: 'አማርኛ',       region: 'east_africa',   rtl: false },

  // Afrique Australe
  af:  { name: 'Afrikaans',   region: 'southern_africa', rtl: false },
  zu:  { name: 'isiZulu',     region: 'southern_africa', rtl: false },
  xh:  { name: 'isiXhosa',   region: 'southern_africa', rtl: false },
  sn:  { name: 'chiShona',   region: 'southern_africa', rtl: false },
  st:  { name: 'Sesotho',    region: 'southern_africa', rtl: false },
  tn:  { name: 'Setswana',   region: 'southern_africa', rtl: false },
  ts:  { name: 'Xitsonga',   region: 'southern_africa', rtl: false },
  nd:  { name: 'isiNdebele', region: 'southern_africa', rtl: false },
  ss:  { name: 'siSwati',    region: 'southern_africa', rtl: false },
};

// Langues supportées côté DB (colonnes title_{lang}, etc.) — 29 langues complètes
const DB_TRANSLATION_LANGS = [
  // Internationales
  'fr', 'en', 'es', 'ar', 'de', 'pt',
  // Afrique de l'Ouest
  'wo', 'bm', 'yo', 'ig', 'ha', 'ff', 'fon', 'tw', 'ee',
  // Afrique Centrale
  'ln', 'kg', 'sg',
  // Afrique de l'Est
  'sw', 'am',
  // Afrique Australe
  'af', 'zu', 'xh', 'sn', 'st', 'tn', 'ts', 'nd', 'ss'
];

// Langues prioritaires pour traduction automatique (les plus parlées / demandées)
const PRIORITY_LANGUAGES = [
  'fr', 'en', 'es', 'ar', 'pt',    // Internationales
  'wo', 'bm',                        // Afrique de l'Ouest (Wolof ~10M, Bambara ~14M locuteurs)
  'sw', 'ha', 'yo',                  // Langues africaines majeures
  'ln', 'am'                         // Lingala + Amharique
];

// ═══════════════════════════════════════════════════════════════
// Rate Limiter par provider
// ═══════════════════════════════════════════════════════════════

class ProviderRateLimiter {
  constructor() {
    this.windows = new Map(); // provider_name → { requests: [], windowStart }
    this.limits = {
      'google-gtx': { maxPerMinute: 30, maxPerHour: 500 },
      'lingva':     { maxPerMinute: 15, maxPerHour: 200 },
      'mymemory':   { maxPerMinute: 10, maxPerHour: 100 }
    };
  }

  canMakeRequest(providerName) {
    const limit = this.limits[providerName];
    if (!limit) return true;

    const now = Date.now();
    let window = this.windows.get(providerName);

    if (!window) {
      window = { requests: [] };
      this.windows.set(providerName, window);
    }

    // Nettoyer les requêtes de plus d'1 heure
    window.requests = window.requests.filter(t => now - t < 3600000);

    // Vérifier limite par heure
    if (window.requests.length >= limit.maxPerHour) return false;

    // Vérifier limite par minute
    const lastMinute = window.requests.filter(t => now - t < 60000);
    if (lastMinute.length >= limit.maxPerMinute) return false;

    return true;
  }

  recordRequest(providerName) {
    let window = this.windows.get(providerName);
    if (!window) {
      window = { requests: [] };
      this.windows.set(providerName, window);
    }
    window.requests.push(Date.now());
  }

  getWaitTime(providerName) {
    const limit = this.limits[providerName];
    if (!limit) return 0;

    const window = this.windows.get(providerName);
    if (!window || window.requests.length === 0) return 0;

    const now = Date.now();
    const lastMinute = window.requests.filter(t => now - t < 60000);

    if (lastMinute.length >= limit.maxPerMinute) {
      // Attendre que la plus vieille requête de la dernière minute expire
      return 60000 - (now - lastMinute[0]) + 100;
    }

    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// PendoTranslator — Classe principale
// ═══════════════════════════════════════════════════════════════

class PendoTranslator {
  /**
   * @param {object} options
   * @param {object} options.db - Instance better-sqlite3 (optionnel, pour le cache)
   * @param {boolean} options.enableCache - Activer le cache (défaut: true)
   * @param {string[]} options.defaultLanguages - Langues par défaut pour batch
   * @param {number} options.concurrency - Nombre de traductions parallèles (défaut: 3)
   * @param {boolean} options.verbose - Logs détaillés (défaut: false)
   */
  constructor(options = {}) {
    const {
      db = null,
      enableCache = true,
      defaultLanguages = PRIORITY_LANGUAGES,
      concurrency = 3,
      verbose = false
    } = options;

    this.concurrency = concurrency;
    this.defaultLanguages = defaultLanguages;
    this.verbose = verbose;
    this.rateLimiter = new ProviderRateLimiter();

    // Initialiser le cache
    if (enableCache && db) {
      this.cache = new SQLiteTranslationCache(db);
    } else if (enableCache) {
      this.cache = new MemoryTranslationCache();
    } else {
      this.cache = null;
    }

    // Stats de session
    this.sessionStats = {
      translated: 0,
      cached: 0,
      failed: 0,
      providerUsage: {}
    };

    this._log('PendoTranslator initialisé', {
      cache: enableCache ? (db ? 'SQLite' : 'Memory') : 'Désactivé',
      concurrency,
      defaultLanguages: defaultLanguages.join(', ')
    });
  }

  _log(message, data = null) {
    if (this.verbose) {
      console.log(`[PendoTranslator] ${message}`, data || '');
    }
  }

  // ─── Traduction d'un texte simple ───────────────────────────

  /**
   * Traduit un texte vers une langue cible
   * Utilise le cache, puis les providers en fallback
   *
   * @param {string} text - Texte source
   * @param {string} targetLang - Code langue cible (ex: 'fr', 'sw')
   * @param {string} sourceLang - Code langue source (défaut: 'auto')
   * @returns {Promise<{text: string|null, provider: string, cached: boolean}>}
   */
  async translate(text, targetLang, sourceLang = 'auto') {
    if (!text || text.trim().length === 0) {
      return { text: null, provider: null, cached: false };
    }

    // Pas besoin de traduire vers la même langue
    if (sourceLang !== 'auto' && sourceLang === targetLang) {
      return { text, provider: 'identity', cached: false };
    }

    // 1. Vérifier le cache
    if (this.cache) {
      const cached = this.cache.get(text, sourceLang, targetLang);
      if (cached) {
        this.sessionStats.cached++;
        this._log(`Cache HIT: ${text.substring(0, 40)}... → ${targetLang}`);
        return { text: cached, provider: 'cache', cached: true };
      }
    }

    // 2. Essayer chaque provider en fallback
    const providers = getProvidersForLanguage(targetLang);
    if (providers.length === 0) {
      this._log(`Aucun provider pour ${targetLang}`);
      this.sessionStats.failed++;
      return { text: null, provider: null, cached: false };
    }

    for (const provider of providers) {
      // Vérifier le rate limit
      if (!this.rateLimiter.canMakeRequest(provider.name)) {
        const waitTime = this.rateLimiter.getWaitTime(provider.name);
        this._log(`Rate limit ${provider.name}, attente ${waitTime}ms`);

        if (waitTime < 5000) {
          await sleep(waitTime);
        } else {
          continue; // Passer au provider suivant
        }
      }

      try {
        this.rateLimiter.recordRequest(provider.name);
        const result = await provider.translate(text, targetLang, sourceLang);

        if (result && result.trim().length > 0) {
          // Stocker en cache
          if (this.cache) {
            this.cache.set(text, sourceLang, targetLang, result, provider.name);
          }

          // Stats
          this.sessionStats.translated++;
          this.sessionStats.providerUsage[provider.name] =
            (this.sessionStats.providerUsage[provider.name] || 0) + 1;

          // Délai entre requêtes
          await sleep(provider.delayMs || 300);

          return { text: result, provider: provider.name, cached: false };
        }
      } catch (error) {
        this._log(`Erreur ${provider.name}: ${error.message}`);
      }
    }

    this.sessionStats.failed++;
    return { text: null, provider: null, cached: false };
  }

  // ─── Détection de langue ────────────────────────────────────

  /**
   * Détecte la langue d'un texte
   * @param {string} text
   * @returns {Promise<string>} Code langue (ex: 'en', 'fr')
   */
  async detectLanguage(text) {
    if (!text || text.trim().length === 0) return 'en';

    for (const provider of ALL_PROVIDERS) {
      if (provider.detectLanguage) {
        const lang = await provider.detectLanguage(text);
        if (lang) return lang;
      }
    }

    return 'en'; // Fallback
  }

  // ─── Traduction batch (multi-langues) ───────────────────────

  /**
   * Traduit un texte vers plusieurs langues en parallèle contrôlé
   *
   * @param {string} text - Texte source
   * @param {string[]} targetLanguages - Langues cibles
   * @param {string} sourceLang - Langue source
   * @returns {Promise<Object>} { fr: 'texte traduit', sw: '...', ... }
   */
  async translateToMultiple(text, targetLanguages = null, sourceLang = 'auto') {
    const langs = targetLanguages || this.defaultLanguages;
    const results = {};

    // Traiter par lots de `this.concurrency`
    for (let i = 0; i < langs.length; i += this.concurrency) {
      const batch = langs.slice(i, i + this.concurrency);
      const promises = batch.map(async (lang) => {
        if (sourceLang !== 'auto' && lang === sourceLang) {
          results[lang] = text;
          return;
        }
        const result = await this.translate(text, lang, sourceLang);
        if (result.text) {
          results[lang] = result.text;
        }
      });

      await Promise.all(promises);
    }

    return results;
  }

  // ─── Traduction d'un article complet ────────────────────────

  /**
   * Traduit un article (titre + résumé + contenu) vers plusieurs langues
   *
   * @param {object} article - { title, summary, content }
   * @param {string[]} targetLanguages - Langues cibles
   * @param {string} sourceLang - Langue source (auto-détecté si 'auto')
   * @returns {Promise<object>} Traductions par langue
   */
  async translateArticle(article, targetLanguages = null, sourceLang = 'auto') {
    const langs = targetLanguages || this.defaultLanguages;

    // Auto-détecter la langue si nécessaire
    if (sourceLang === 'auto' && article.title) {
      sourceLang = await this.detectLanguage(article.title);
      this._log(`Langue détectée: ${sourceLang}`);
    }

    const translations = {};

    for (const lang of langs) {
      if (lang === sourceLang) continue;

      const translation = {};
      let hasContent = false;

      // Titre
      if (article.title) {
        const result = await this.translate(article.title, lang, sourceLang);
        if (result.text) {
          translation.title = result.text;
          hasContent = true;
        }
      }

      // Résumé (summary)
      if (article.summary) {
        const result = await this.translate(
          article.summary.substring(0, 3000),
          lang,
          sourceLang
        );
        if (result.text) {
          translation.summary = result.text;
          hasContent = true;
        }
      }

      // Contenu ou description
      const contentField = article.content || article.description;
      if (contentField) {
        // Nettoyer le HTML si nécessaire
        const cleanContent = contentField
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 5000);

        if (cleanContent.length > 0) {
          const result = await this.translate(cleanContent, lang, sourceLang);
          if (result.text) {
            translation.content = result.text;
            if (article.description && !article.content) {
              translation.description = result.text;
            }
            hasContent = true;
          }
        }
      }

      if (hasContent) {
        translations[lang] = translation;
      }
    }

    return {
      sourceLang,
      translations,
      languageCount: Object.keys(translations).length
    };
  }

  // ─── Traduction d'articles en lot ───────────────────────────

  /**
   * Traduit plusieurs articles avec gestion du temps
   *
   * @param {object[]} articles - Liste d'articles à traduire
   * @param {string[]} targetLanguages - Langues cibles
   * @param {object} options
   * @param {number} options.maxTimeMs - Temps max en ms (défaut: 40000 pour Vercel)
   * @param {Function} options.onProgress - Callback de progression
   * @param {Function} options.onSave - Callback pour sauvegarder (reçoit { articleId, translations })
   * @returns {Promise<object>} Résumé de la traduction batch
   */
  async translateBatch(articles, targetLanguages = null, options = {}) {
    const {
      maxTimeMs = 40000,
      onProgress = null,
      onSave = null
    } = options;

    const startTime = Date.now();
    const langs = targetLanguages || this.defaultLanguages;
    let processed = 0;
    let translated = 0;
    let skipped = 0;
    let errors = 0;

    for (const article of articles) {
      // Vérifier le temps restant
      const elapsed = Date.now() - startTime;
      if (elapsed > maxTimeMs) {
        this._log(`Temps max atteint (${elapsed}ms), arrêt du batch`);
        break;
      }

      try {
        const result = await this.translateArticle(article, langs);
        processed++;

        if (result.languageCount > 0) {
          translated++;

          if (onSave) {
            await onSave({
              articleId: article.id,
              sourceLang: result.sourceLang,
              translations: result.translations
            });
          }
        } else {
          skipped++;
        }

        if (onProgress) {
          onProgress({
            processed,
            total: articles.length,
            translated,
            skipped,
            elapsed: Date.now() - startTime
          });
        }
      } catch (error) {
        errors++;
        this._log(`Erreur article #${article.id}: ${error.message}`);
      }
    }

    return {
      processed,
      translated,
      skipped,
      errors,
      elapsed: Date.now() - startTime,
      remaining: articles.length - processed
    };
  }

  // ─── Utilitaires ────────────────────────────────────────────

  /**
   * Retourne les statistiques de la session
   */
  getStats() {
    return {
      session: this.sessionStats,
      cache: this.cache ? this.cache.getStats() : null,
      providers: ALL_PROVIDERS.map(p => ({
        name: p.name,
        enabled: p.enabled,
        supportedLanguages: p.supportedLanguages.size
      }))
    };
  }

  /**
   * Nettoie le cache
   */
  cleanupCache() {
    if (this.cache) {
      this.cache.cleanup();
    }
  }

  /**
   * Vérifie si une langue est supportée
   */
  isLanguageSupported(lang) {
    return lang in PENDO_LANGUAGES;
  }

  /**
   * Retourne les infos d'une langue
   */
  getLanguageInfo(lang) {
    return PENDO_LANGUAGES[lang] || null;
  }

  /**
   * Retourne toutes les langues supportées
   */
  getAllLanguages() {
    return { ...PENDO_LANGUAGES };
  }

  /**
   * Retourne les langues qui ont un support DB (colonnes de traduction)
   */
  getDBLanguages() {
    return [...DB_TRANSLATION_LANGS];
  }
}

// ═══════════════════════════════════════════════════════════════
// Factory: Créer une instance avec config par défaut
// ═══════════════════════════════════════════════════════════════

let _defaultInstance = null;

/**
 * Retourne l'instance singleton du traducteur
 * @param {object} options - Options de configuration
 */
function getTranslator(options = {}) {
  if (!_defaultInstance) {
    _defaultInstance = new PendoTranslator(options);
  }
  return _defaultInstance;
}

/**
 * Crée une nouvelle instance indépendante
 */
function createTranslator(options = {}) {
  return new PendoTranslator(options);
}

module.exports = {
  PendoTranslator,
  getTranslator,
  createTranslator,
  PENDO_LANGUAGES,
  DB_TRANSLATION_LANGS,
  PRIORITY_LANGUAGES
};
