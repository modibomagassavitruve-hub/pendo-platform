/**
 * PENDO Translation Cache
 * =======================
 * Cache intelligent pour les traductions avec stockage SQLite.
 *
 * Avantages:
 * - Évite de re-traduire le même contenu (économise du temps + rate limits)
 * - Persistant entre les redémarrages du serveur
 * - Nettoyage automatique des entrées expirées
 * - Statistiques d'utilisation intégrées
 *
 * Stratégie de cache:
 * - Clé = hash(texte_source + lang_source + lang_cible)
 * - TTL = 30 jours par défaut (le contenu traduit ne change pas)
 * - LRU eviction quand la taille dépasse le seuil
 */

const crypto = require('crypto');

// Cache en mémoire (fallback si SQLite non disponible)
const memoryCache = new Map();
const MEMORY_CACHE_MAX = 5000;

// Stats
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  evictions: 0
};

/**
 * Génère une clé de cache déterministe
 */
function cacheKey(text, sourceLang, targetLang) {
  const input = `${sourceLang}:${targetLang}:${text.trim().toLowerCase()}`;
  return crypto.createHash('md5').update(input).digest('hex');
}

/**
 * Cache basé sur SQLite (persistant)
 * Nécessite une instance de base de données better-sqlite3
 */
class SQLiteTranslationCache {
  constructor(db) {
    this.db = db;
    this.ttlMs = 30 * 24 * 60 * 60 * 1000; // 30 jours
    this.maxEntries = 50000;
    this._initTable();
  }

  _initTable() {
    try {
      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS translation_cache (
          key TEXT PRIMARY KEY,
          source_text TEXT NOT NULL,
          translated_text TEXT NOT NULL,
          source_lang TEXT NOT NULL,
          target_lang TEXT NOT NULL,
          provider TEXT,
          created_at INTEGER NOT NULL,
          last_used_at INTEGER NOT NULL,
          use_count INTEGER DEFAULT 1
        )
      `).run();

      this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_cache_last_used
        ON translation_cache(last_used_at)
      `).run();

      this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_cache_langs
        ON translation_cache(source_lang, target_lang)
      `).run();
    } catch (e) {
      console.warn('[TranslationCache] SQLite init failed, using memory cache:', e.message);
      this.db = null;
    }
  }

  /**
   * Cherche une traduction en cache
   */
  get(text, sourceLang, targetLang) {
    const key = cacheKey(text, sourceLang, targetLang);

    if (!this.db) {
      // Fallback mémoire
      const entry = memoryCache.get(key);
      if (entry && Date.now() - entry.createdAt < this.ttlMs) {
        stats.hits++;
        return entry.translatedText;
      }
      stats.misses++;
      return null;
    }

    try {
      const row = this.db.prepare(`
        SELECT translated_text, created_at FROM translation_cache WHERE key = ?
      `).get(key);

      if (row && Date.now() - row.created_at < this.ttlMs) {
        // Mettre à jour last_used_at et use_count
        this.db.prepare(`
          UPDATE translation_cache
          SET last_used_at = ?, use_count = use_count + 1
          WHERE key = ?
        `).run(Date.now(), key);

        stats.hits++;
        return row.translated_text;
      }

      stats.misses++;
      return null;
    } catch (e) {
      stats.misses++;
      return null;
    }
  }

  /**
   * Stocke une traduction en cache
   */
  set(text, sourceLang, targetLang, translatedText, provider = 'unknown') {
    if (!translatedText || translatedText.trim().length === 0) return;

    const key = cacheKey(text, sourceLang, targetLang);
    const now = Date.now();
    stats.sets++;

    if (!this.db) {
      // Fallback mémoire avec LRU
      if (memoryCache.size >= MEMORY_CACHE_MAX) {
        const firstKey = memoryCache.keys().next().value;
        memoryCache.delete(firstKey);
        stats.evictions++;
      }
      memoryCache.set(key, {
        translatedText,
        createdAt: now
      });
      return;
    }

    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO translation_cache
        (key, source_text, translated_text, source_lang, target_lang, provider, created_at, last_used_at, use_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(key, text.substring(0, 500), translatedText, sourceLang, targetLang, provider, now, now);

      // Eviction LRU si nécessaire
      this._evictIfNeeded();
    } catch (e) {
      // Fallback silencieux
    }
  }

  /**
   * Vérifie si une traduction existe en cache
   */
  has(text, sourceLang, targetLang) {
    return this.get(text, sourceLang, targetLang) !== null;
  }

  /**
   * Supprime les entrées les plus anciennes si le cache dépasse la taille max
   */
  _evictIfNeeded() {
    if (!this.db) return;

    try {
      const count = this.db.prepare('SELECT COUNT(*) as count FROM translation_cache').get();
      if (count.count > this.maxEntries) {
        const toDelete = count.count - this.maxEntries + 1000; // Supprimer 1000 d'un coup
        this.db.prepare(`
          DELETE FROM translation_cache
          WHERE key IN (
            SELECT key FROM translation_cache
            ORDER BY last_used_at ASC
            LIMIT ?
          )
        `).run(toDelete);
        stats.evictions += toDelete;
      }
    } catch (e) {}
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup() {
    if (!this.db) {
      for (const [key, entry] of memoryCache) {
        if (Date.now() - entry.createdAt > this.ttlMs) {
          memoryCache.delete(key);
        }
      }
      return;
    }

    try {
      const cutoff = Date.now() - this.ttlMs;
      const result = this.db.prepare('DELETE FROM translation_cache WHERE created_at < ?').run(cutoff);
      if (result.changes > 0) {
        console.log(`[TranslationCache] Nettoyé ${result.changes} entrées expirées`);
      }
    } catch (e) {}
  }

  /**
   * Statistiques du cache
   */
  getStats() {
    let cacheSize = memoryCache.size;

    if (this.db) {
      try {
        const row = this.db.prepare('SELECT COUNT(*) as count FROM translation_cache').get();
        cacheSize = row.count;
      } catch (e) {}
    }

    const total = stats.hits + stats.misses;
    return {
      ...stats,
      size: cacheSize,
      hitRate: total > 0 ? ((stats.hits / total) * 100).toFixed(1) + '%' : 'N/A'
    };
  }

  /**
   * Retourne les langues les plus traduites
   */
  getTopLanguages(limit = 10) {
    if (!this.db) return [];

    try {
      return this.db.prepare(`
        SELECT target_lang, COUNT(*) as count, SUM(use_count) as total_uses
        FROM translation_cache
        GROUP BY target_lang
        ORDER BY count DESC
        LIMIT ?
      `).all(limit);
    } catch (e) {
      return [];
    }
  }
}

/**
 * Cache en mémoire simple (pour les environnements sans SQLite)
 */
class MemoryTranslationCache {
  constructor() {
    this.ttlMs = 30 * 24 * 60 * 60 * 1000;
  }

  get(text, sourceLang, targetLang) {
    const key = cacheKey(text, sourceLang, targetLang);
    const entry = memoryCache.get(key);
    if (entry && Date.now() - entry.createdAt < this.ttlMs) {
      stats.hits++;
      return entry.translatedText;
    }
    stats.misses++;
    return null;
  }

  set(text, sourceLang, targetLang, translatedText, provider = 'unknown') {
    if (!translatedText) return;
    const key = cacheKey(text, sourceLang, targetLang);
    if (memoryCache.size >= MEMORY_CACHE_MAX) {
      const firstKey = memoryCache.keys().next().value;
      memoryCache.delete(firstKey);
    }
    memoryCache.set(key, { translatedText, createdAt: Date.now() });
    stats.sets++;
  }

  has(text, sourceLang, targetLang) {
    return this.get(text, sourceLang, targetLang) !== null;
  }

  cleanup() {
    for (const [key, entry] of memoryCache) {
      if (Date.now() - entry.createdAt > this.ttlMs) {
        memoryCache.delete(key);
      }
    }
  }

  getStats() {
    const total = stats.hits + stats.misses;
    return {
      ...stats,
      size: memoryCache.size,
      hitRate: total > 0 ? ((stats.hits / total) * 100).toFixed(1) + '%' : 'N/A'
    };
  }

  getTopLanguages() { return []; }
}

module.exports = {
  SQLiteTranslationCache,
  MemoryTranslationCache,
  cacheKey
};
