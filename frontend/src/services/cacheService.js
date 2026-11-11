/**
 * Service de cache pour les requêtes API
 * Réduit les appels serveur et améliore les performances
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  /**
   * Récupérer une valeur du cache
   */
  get(key, maxAge = 60000) {
    // 60 secondes par défaut
    const timestamp = this.timestamps.get(key);

    if (!timestamp) return null;

    const age = Date.now() - timestamp;
    if (age > maxAge) {
      // Cache expiré
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  /**
   * Mettre une valeur en cache
   */
  set(key, value) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  /**
   * Supprimer une valeur du cache
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  /**
   * Vider tout le cache
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }

  /**
   * Vider les entrées expirées
   */
  clearExpired(maxAge = 60000) {
    const now = Date.now();
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > maxAge) {
        this.cache.delete(key);
        this.timestamps.delete(key);
      }
    }
  }

  /**
   * Wrapper pour fetch avec cache
   */
  async fetchWithCache(url, options = {}, maxAge = 60000) {
    const cacheKey = `${url}-${JSON.stringify(options)}`;

    // Vérifier le cache
    const cached = this.get(cacheKey, maxAge);
    if (cached) {
      return cached;
    }

    // Faire la requête
    const response = await fetch(url, options);
    const data = await response.json();

    // Mettre en cache
    this.set(cacheKey, data);

    return data;
  }
}

// Instance singleton
const cacheService = new CacheService();

// Nettoyer le cache expiré toutes les 5 minutes
setInterval(() => {
  cacheService.clearExpired();
}, 5 * 60 * 1000);

export default cacheService;
