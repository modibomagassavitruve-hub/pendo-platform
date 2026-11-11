/**
 * PENDO Translation Providers
 * ===========================
 * Fournisseurs de traduction 100% GRATUITS.
 * AUCUNE API payante. AUCUNE clé API Google Cloud.
 *
 * Providers supportés:
 * 1. Google GTX (gratuit, pas de clé)
 * 2. MyMemory (gratuit, 5000 chars/jour sans clé, 50000 avec email)
 * 3. Lingva (instances publiques de Lingva Translate, basé sur Google)
 *
 * Chaque provider implémente: translate(text, targetLang, sourceLang) → string|null
 */

const fetch = require('node-fetch');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ═══════════════════════════════════════════════════════════════
// PROVIDER 1: Google GTX (gratuit, endpoint web)
// ═══════════════════════════════════════════════════════════════

const GoogleGTX = {
  name: 'google-gtx',
  maxCharsPerRequest: 2000,
  delayMs: 350,
  enabled: true,

  // Langues supportées (vérifiées manuellement)
  supportedLanguages: new Set([
    'fr', 'en', 'es', 'ar', 'de', 'pt',
    'wo', 'bm', 'yo', 'ig', 'ha', 'ee',
    'ln', 'sw', 'am',
    'af', 'zu', 'xh', 'sn', 'st', 'ts',
    'ff', 'tw', 'kg', 'sg', 'tn', 'nd', 'ss'
  ]),

  supportsLanguage(lang) {
    return this.supportedLanguages.has(lang);
  },

  async translate(text, targetLang, sourceLang = 'auto', retries = 3) {
    if (!text || text.trim().length === 0) return null;
    const truncated = text.substring(0, this.maxCharsPerRequest);

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(truncated)}`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
          },
          timeout: 10000
        });

        if (response.status === 429) {
          // Rate limited — attendre plus longtemps
          await sleep(3000 * (attempt + 1));
          continue;
        }

        if (!response.ok) {
          await sleep(1500 * (attempt + 1));
          continue;
        }

        const data = await response.json();
        if (data && data[0]) {
          const translated = data[0]
            .filter(segment => segment && segment[0])
            .map(segment => segment[0])
            .join('');

          if (translated && translated.trim().length > 0) {
            return translated;
          }
        }
      } catch (error) {
        if (attempt < retries - 1) {
          await sleep(2000 * (attempt + 1));
        }
      }
    }
    return null;
  },

  async detectLanguage(text) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text.substring(0, 200))}`;
      const response = await fetch(url, { timeout: 8000 });
      if (response.ok) {
        const data = await response.json();
        return data[2] || null;
      }
    } catch (e) {}
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// PROVIDER 2: MyMemory (gratuit, 5000 chars/jour sans clé)
// ═══════════════════════════════════════════════════════════════

const MyMemory = {
  name: 'mymemory',
  maxCharsPerRequest: 500, // Limite stricte MyMemory
  delayMs: 500,
  enabled: true,
  email: null, // Optionnel: augmente la limite à 50000 chars/jour

  // MyMemory utilise les codes ISO 639-1 mais certaines langues africaines ne sont pas supportées
  supportedLanguages: new Set([
    'fr', 'en', 'es', 'ar', 'de', 'pt',
    'sw', 'ha', 'yo', 'ig', 'zu', 'xh', 'af', 'am'
  ]),

  supportsLanguage(lang) {
    return this.supportedLanguages.has(lang);
  },

  async translate(text, targetLang, sourceLang = 'auto', retries = 2) {
    if (!text || text.trim().length === 0) return null;
    const truncated = text.substring(0, this.maxCharsPerRequest);

    // MyMemory a besoin d'un code source explicite
    const src = sourceLang === 'auto' ? 'en' : sourceLang;
    const langPair = `${src}|${targetLang}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        let url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(truncated)}&langpair=${langPair}`;
        if (this.email) {
          url += `&de=${encodeURIComponent(this.email)}`;
        }

        const response = await fetch(url, { timeout: 10000 });
        if (!response.ok) {
          await sleep(2000 * (attempt + 1));
          continue;
        }

        const data = await response.json();

        // Vérifier la qualité de la réponse
        if (data.responseStatus === 200 && data.responseData) {
          const translated = data.responseData.translatedText;

          // MyMemory retourne parfois le texte original si la traduction échoue
          if (translated && translated !== truncated && translated.trim().length > 0) {
            // Vérifier le score de qualité (0-1)
            const quality = data.responseData.match || 0;
            if (quality >= 0.3) {
              return translated;
            }
          }
        }
      } catch (error) {
        if (attempt < retries - 1) {
          await sleep(2000 * (attempt + 1));
        }
      }
    }
    return null;
  },

  async detectLanguage(_text) {
    // MyMemory n'a pas de détection de langue fiable
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// PROVIDER 3: Lingva Translate (instances publiques)
// ═══════════════════════════════════════════════════════════════

const LingvaTranslate = {
  name: 'lingva',
  maxCharsPerRequest: 1500,
  delayMs: 600,
  enabled: true,

  // Instances publiques Lingva (Google Translate frontend libre)
  instances: [
    'https://lingva.ml',
    'https://lingva.thedaviddelta.com',
    'https://translate.plausibility.cloud'
  ],
  currentInstanceIndex: 0,

  supportedLanguages: new Set([
    'fr', 'en', 'es', 'ar', 'de', 'pt',
    'sw', 'ha', 'yo', 'ig', 'zu', 'xh', 'af', 'am',
    'sn', 'st'
  ]),

  supportsLanguage(lang) {
    return this.supportedLanguages.has(lang);
  },

  _getNextInstance() {
    const instance = this.instances[this.currentInstanceIndex];
    this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.instances.length;
    return instance;
  },

  async translate(text, targetLang, sourceLang = 'auto', retries = 2) {
    if (!text || text.trim().length === 0) return null;
    const truncated = text.substring(0, this.maxCharsPerRequest);

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const instance = this._getNextInstance();
        const url = `${instance}/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(truncated)}`;

        const response = await fetch(url, { timeout: 12000 });
        if (!response.ok) {
          await sleep(2000 * (attempt + 1));
          continue;
        }

        const data = await response.json();
        if (data && data.translation && data.translation.trim().length > 0) {
          return data.translation;
        }
      } catch (error) {
        if (attempt < retries - 1) {
          await sleep(2000 * (attempt + 1));
        }
      }
    }
    return null;
  },

  async detectLanguage(_text) {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// REGISTRY: Tous les providers disponibles
// ═══════════════════════════════════════════════════════════════

/**
 * Ordre de priorité des providers:
 * 1. Google GTX — Le plus fiable, le plus de langues
 * 2. Lingva     — Backup Google via instances publiques
 * 3. MyMemory   — Dernier recours (limite de chars)
 */
const ALL_PROVIDERS = [GoogleGTX, LingvaTranslate, MyMemory];

/**
 * Retourne les providers qui supportent une langue donnée,
 * dans l'ordre de priorité
 */
function getProvidersForLanguage(lang) {
  return ALL_PROVIDERS.filter(p => p.enabled && p.supportsLanguage(lang));
}

/**
 * Retourne le meilleur provider pour une langue
 */
function getBestProvider(lang) {
  const providers = getProvidersForLanguage(lang);
  return providers.length > 0 ? providers[0] : null;
}

module.exports = {
  GoogleGTX,
  MyMemory,
  LingvaTranslate,
  ALL_PROVIDERS,
  getProvidersForLanguage,
  getBestProvider
};
