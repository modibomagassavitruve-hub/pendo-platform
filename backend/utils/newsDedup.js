/**
 * Déduplication d'articles de news quasi-identiques.
 *
 * Problème résolu : plusieurs médias (Reuters Africa, AllAfrica, Africanews...)
 * publient le même événement avec des titres légèrement différents. Sans
 * traitement, ces articles apparaissent tous dans le flux comme des news
 * distinctes alors qu'ils couvrent le même sujet.
 *
 * Approche : similarité de Jaccard sur les tokens du titre (pas de dépendance
 * NLP externe nécessaire), avec regroupement transitif via Union-Find pour que
 * 3+ articles proches finissent bien dans le même cluster (A~B et B~C => A,B,C
 * ensemble, même si A et C ne sont pas assez proches directement).
 * Deux articles ne sont comparés que s'ils ont été publiés à moins de
 * `windowHours` l'un de l'autre, pour éviter de fusionner des sujets récurrents
 * mais sans rapport (ex. deux "résultats trimestriels" à plusieurs mois d'écart).
 */

const STOPWORDS = new Set([
  // Français
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'en', 'à', 'au', 'aux',
  'pour', 'sur', 'dans', 'par', 'avec', 'ce', 'ces', 'cet', 'cette', 'son', 'sa',
  'ses', 'que', 'qui', 'quoi', 'est', 'sont', 'a', 'ont', 'se', 'plus', 'apres',
  // Anglais
  'the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'and', 'with', 'is', 'are',
  'as', 'at', 'by', 'from', 'it', 'its', 'says', 'said', 'after', 'over', 'new',
  'this', 'that', 'be', 'was', 'were', 'will', 'has', 'have'
]);

/**
 * Normalise un texte en liste de tokens exploitables (minuscules, sans accents,
 * sans ponctuation, sans mots vides, sans mots trop courts).
 */
function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // supprime les accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Indice de similarité de Jaccard entre deux listes de tokens : taille de
 * l'intersection / taille de l'union. Retourne une valeur entre 0 et 1.
 */
function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Structure Union-Find (disjoint set) minimaliste pour regrouper les articles
 * de façon transitive.
 */
class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }

  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }

  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent[rootA] = rootB;
  }
}

/**
 * Regroupe les articles quasi-identiques et retourne une liste dédupliquée.
 * Chaque article représentant du cluster porte deux champs supplémentaires :
 *   - related_count : nombre total d'articles fusionnés dans ce cluster
 *   - related_sources : liste { source, url, published_at } des articles fusionnés
 *
 * @param {Array<Object>} articles - articles bruts (doivent avoir .title, .published_at)
 * @param {Object} options
 * @param {number} [options.threshold=0.35] - seuil de similarité Jaccard (0-1) pour fusionner
 * @param {number} [options.windowHours=48] - fenêtre temporelle max entre 2 articles comparés
 * @returns {Array<Object>} articles dédupliqués, triés par published_at décroissant
 */
function deduplicateArticles(articles, { threshold = 0.35, windowHours = 48 } = {}) {
  if (!Array.isArray(articles) || articles.length === 0) return [];

  const entries = articles.map((article) => ({
    article,
    tokens: normalize(article.title),
    time: article.published_at ? new Date(article.published_at).getTime() : 0
  }));

  const uf = new UnionFind(entries.length);

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const hoursApart = Math.abs(entries[i].time - entries[j].time) / 3600000;
      if (hoursApart > windowHours) continue;

      const similarity = jaccardSimilarity(entries[i].tokens, entries[j].tokens);
      if (similarity >= threshold) {
        uf.union(i, j);
      }
    }
  }

  const clusters = new Map();
  for (let i = 0; i < entries.length; i++) {
    const root = uf.find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(entries[i]);
  }

  const deduplicated = [];
  for (const cluster of clusters.values()) {
    // Le représentant du cluster : celui avec le contenu le plus riche,
    // à défaut le plus récent.
    const sorted = cluster.slice().sort((a, b) => {
      const contentLenA = (a.article.content || a.article.summary || '').length;
      const contentLenB = (b.article.content || b.article.summary || '').length;
      if (contentLenA !== contentLenB) return contentLenB - contentLenA;
      return b.time - a.time;
    });

    const representative = sorted[0].article;
    const relatedSources = cluster.map((entry) => ({
      source: entry.article.source,
      url: entry.article.url,
      published_at: entry.article.published_at
    }));

    deduplicated.push({
      ...representative,
      related_count: cluster.length,
      related_sources: relatedSources
    });
  }

  return deduplicated.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
}

module.exports = { deduplicateArticles, normalize, jaccardSimilarity };
