/**
 * Service de traduction automatique pour PENDO
 * ==============================================
 * Utilise PendoTranslator — 100% GRATUIT, multi-providers, avec cache.
 *
 * IMPORTANT: AUCUNE API payante Google Cloud. JAMAIS.
 * L'API payante a été supprimée après des factures de €300+ et €82.86.
 *
 * Ce fichier est un adaptateur de compatibilité qui utilise le nouveau
 * moteur de traduction dans ./translation/index.js
 */

const { createTranslator, PENDO_LANGUAGES, DB_TRANSLATION_LANGS, PRIORITY_LANGUAGES } = require('./translation');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Instance partagée du traducteur (initialisée au premier appel)
let _translator = null;

function getTranslator(db = null) {
  if (!_translator) {
    _translator = createTranslator({
      db: db,
      enableCache: true,
      defaultLanguages: PRIORITY_LANGUAGES,
      concurrency: 3,
      verbose: process.env.NODE_ENV !== 'production'
    });
  }
  return _translator;
}

// ═══════════════════════════════════════════════════════════════
// API de compatibilité (même interface qu'avant)
// ═══════════════════════════════════════════════════════════════

/**
 * Détecte la langue d'un texte
 */
async function detectLanguage(text) {
  const translator = getTranslator();
  return translator.detectLanguage(text);
}

/**
 * Traduit un texte vers une langue cible
 */
async function translateText(text, targetLang, sourceLang = null) {
  if (!text || text.trim().length === 0) return null;
  if (sourceLang && sourceLang === targetLang) return text;

  const translator = getTranslator();
  const result = await translator.translate(text, targetLang, sourceLang || 'auto');
  return result.text;
}

/**
 * Traduit un article de news dans plusieurs langues
 */
async function translateNewsArticle(db, articleId, languages = PRIORITY_LANGUAGES) {
  try {
    const article = db.prepare('SELECT * FROM news WHERE id = ?').get(articleId);
    if (!article) {
      return { success: false, reason: 'article_not_found' };
    }

    const translator = getTranslator(db);

    // Filtrer les langues déjà traduites
    const langsToTranslate = languages.filter(lang => !article[`title_${lang}`]);

    if (langsToTranslate.length === 0) {
      console.log(`[AutoTranslate] Article #${articleId} déjà traduit dans toutes les langues`);
      return { success: true, articleId, count: 0, translatedLanguages: [] };
    }

    const result = await translator.translateArticle(
      { title: article.title, summary: article.summary, content: article.content },
      langsToTranslate
    );

    // Mettre à jour la base de données
    if (result.languageCount > 0) {
      const updateFields = [];
      const updateValues = [];

      for (const [lang, data] of Object.entries(result.translations)) {
        if (data.title) {
          updateFields.push(`title_${lang} = ?`);
          updateValues.push(data.title);
        }
        if (data.summary) {
          updateFields.push(`summary_${lang} = ?`);
          updateValues.push(data.summary);
        }
        if (data.content) {
          updateFields.push(`content_${lang} = ?`);
          updateValues.push(data.content);
        }
      }

      if (updateFields.length > 0) {
        updateValues.push(articleId);
        db.prepare(`
          UPDATE news SET ${updateFields.join(', ')} WHERE id = ?
        `).run(...updateValues);
      }
    }

    console.log(`[AutoTranslate] ✓ Article #${articleId}: ${result.languageCount} langues traduites`);

    return {
      success: true,
      articleId,
      sourceLang: result.sourceLang,
      translatedLanguages: Object.keys(result.translations),
      count: result.languageCount
    };
  } catch (error) {
    console.error(`[AutoTranslate] Erreur article #${articleId}:`, error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Traduit tous les articles non traduits
 */
async function translateUntranslatedNews(db, limit = 10, languages = PRIORITY_LANGUAGES) {
  const langConditions = languages
    .filter(lang => lang !== 'en')
    .map(lang => `title_${lang} IS NULL`)
    .join(' OR ');

  const query = `
    SELECT id, title FROM news
    WHERE ${langConditions}
    ORDER BY published_at DESC
    LIMIT ?
  `;

  const articles = db.prepare(query).all(limit);
  console.log(`[AutoTranslate] ${articles.length} articles à traduire`);

  let translatedCount = 0;
  let errors = 0;

  for (const article of articles) {
    const result = await translateNewsArticle(db, article.id, languages);
    if (result.success && result.count > 0) translatedCount++;
    else if (!result.success) errors++;
  }

  // Afficher les stats du traducteur
  const translator = getTranslator();
  const stats = translator.getStats();
  console.log(`[AutoTranslate] Stats: ${stats.session.translated} traduits, ${stats.session.cached} en cache, ${stats.session.failed} échoués`);
  if (stats.cache) {
    console.log(`[AutoTranslate] Cache: ${stats.cache.hitRate} hit rate, ${stats.cache.size} entrées`);
  }

  return { success: true, processed: articles.length, translated: translatedCount, errors };
}

/**
 * Traduit les nouveaux articles en arrière-plan
 */
function translateNewArticlesAsync(db, articleIds, languages = PRIORITY_LANGUAGES) {
  if (!articleIds || articleIds.length === 0) return;

  setImmediate(async () => {
    console.log(`[AutoTranslate] Démarrage traduction de ${articleIds.length} articles...`);
    for (const id of articleIds) {
      await translateNewsArticle(db, id, languages);
    }
    console.log(`[AutoTranslate] Traduction terminée pour ${articleIds.length} articles`);
  });
}

/**
 * Traduit une opportunité d'investissement
 */
async function translateOpportunity(db, opportunityId, languages = PRIORITY_LANGUAGES) {
  try {
    const article = await db.get('SELECT * FROM investment_opportunities WHERE id = ?', [opportunityId]);
    if (!article) {
      return { success: false, reason: 'opportunity_not_found' };
    }

    const translator = getTranslator();

    const langsToTranslate = languages.filter(lang => !article[`title_${lang}`]);
    if (langsToTranslate.length === 0) {
      return { success: true, opportunityId, count: 0, translatedLanguages: [] };
    }

    const result = await translator.translateArticle(
      { title: article.title, summary: article.summary, description: article.description },
      langsToTranslate
    );

    // Mettre à jour la base de données
    if (result.languageCount > 0) {
      const updateFields = [];
      const updateValues = [];

      for (const [lang, data] of Object.entries(result.translations)) {
        if (data.title) {
          updateFields.push(`title_${lang} = ?`);
          updateValues.push(data.title);
        }
        if (data.summary) {
          updateFields.push(`summary_${lang} = ?`);
          updateValues.push(data.summary);
        }
        if (data.description) {
          updateFields.push(`description_${lang} = ?`);
          updateValues.push(data.description);
        }
      }

      if (updateFields.length > 0) {
        updateValues.push(opportunityId);
        await db.run(`
          UPDATE investment_opportunities SET ${updateFields.join(', ')} WHERE id = ?
        `, updateValues);
      }
    }

    console.log(`[AutoTranslate] ✓ Opportunité #${opportunityId}: ${result.languageCount} langues`);

    return {
      success: true,
      opportunityId,
      sourceLang: result.sourceLang,
      translatedLanguages: Object.keys(result.translations),
      count: result.languageCount
    };
  } catch (error) {
    console.error(`[AutoTranslate] Erreur opportunité #${opportunityId}:`, error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Traduit les opportunités non traduites en batch
 */
async function translateUntranslatedOpportunities(db, limit = 10, languages = PRIORITY_LANGUAGES) {
  const langConditions = languages
    .filter(lang => lang !== 'en')
    .map(lang => `title_${lang} IS NULL`)
    .join(' OR ');

  const query = `
    SELECT id, title FROM investment_opportunities
    WHERE ${langConditions}
    ORDER BY published_at DESC
    LIMIT ?
  `;

  const articles = await db.all(query, [limit]);
  console.log(`[AutoTranslate] ${articles.length} opportunités à traduire`);

  let translatedCount = 0;
  let errors = 0;

  for (const article of articles) {
    const result = await translateOpportunity(db, article.id, languages);
    if (result.success && result.count > 0) translatedCount++;
    else if (!result.success) errors++;
  }

  return { success: true, processed: articles.length, translated: translatedCount, errors };
}

/**
 * Traduit les nouvelles opportunités en arrière-plan
 */
function translateNewOpportunitiesAsync(db, opportunityIds, languages = PRIORITY_LANGUAGES) {
  if (!opportunityIds || opportunityIds.length === 0) return;

  setImmediate(async () => {
    console.log(`[AutoTranslate] Démarrage traduction de ${opportunityIds.length} opportunités...`);
    for (const id of opportunityIds) {
      await translateOpportunity(db, id, languages);
    }
    console.log(`[AutoTranslate] Traduction terminée pour ${opportunityIds.length} opportunités`);
  });
}

// Compatibilité avec les anciens noms d'exports
const GOOGLE_TRANSLATE_SUPPORTED = DB_TRANSLATION_LANGS;
const ALL_SUPPORTED_LANGUAGES = DB_TRANSLATION_LANGS;
const PENDO_LANGUAGES_LIST = Object.keys(PENDO_LANGUAGES);

module.exports = {
  detectLanguage,
  translateText,
  translateNewsArticle,
  translateUntranslatedNews,
  translateNewArticlesAsync,
  translateOpportunity,
  translateUntranslatedOpportunities,
  translateNewOpportunitiesAsync,
  PRIORITY_LANGUAGES,
  ALL_SUPPORTED_LANGUAGES,
  GOOGLE_TRANSLATE_SUPPORTED,
  PENDO_LANGUAGES: PENDO_LANGUAGES_LIST,
  // Nouveau: accès direct au traducteur
  getTranslator
};
