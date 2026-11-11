/**
 * Script de traduction automatique avec Google Translate GRATUIT (endpoint gtx)
 *
 * IMPORTANT: N'utilise AUCUNE API payante. Endpoint gratuit uniquement.
 * L'API payante Google Cloud a été supprimée définitivement.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fetch = require('node-fetch');
const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');

// Langues cibles supportées par Google Translate
const TARGET_LANGUAGES = {
  // Langue internationale
  'ar': 'Arabe',

  // Langues africaines principales
  'sw': 'Swahili',
  'ha': 'Hausa',
  'yo': 'Yoruba',
  'am': 'Amharique',
  'ig': 'Igbo',
  'zu': 'Zulu',
  'xh': 'Xhosa',
  'af': 'Afrikaans',
  'sn': 'Shona',
  'st': 'Sesotho'
};

// Délai entre les requêtes
const DELAY_BETWEEN_REQUESTS = 500; // 500ms

// Statistiques
let stats = {
  opportunities: { total: 0, translated: 0, skipped: 0, errors: 0 },
  news: { total: 0, translated: 0, skipped: 0, errors: 0 },
  charactersUsed: 0,
  byLanguage: {}
};

// Initialiser les stats par langue
Object.keys(TARGET_LANGUAGES).forEach(lang => {
  stats.byLanguage[lang] = { translated: 0, errors: 0 };
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Traduction avec Google Translate GRATUIT (endpoint gtx)
 * Aucune clé API requise
 */
async function translateWithGoogle(text, targetLang) {
  if (!text || text.trim().length === 0) return null;

  const truncated = text.substring(0, 2000);
  for (let i = 0; i < 3; i++) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(truncated)}`;
      const response = await fetch(url);
      if (!response.ok) {
        await sleep(2000 * (i + 1));
        continue;
      }
      const data = await response.json();
      stats.charactersUsed += truncated.length;
      return data[0].map(s => s[0]).join('');
    } catch (error) {
      await sleep(2000 * (i + 1));
    }
  }
  console.error(`Erreur traduction gratuite (${targetLang}): échec après 3 tentatives`);
  return null;
}

/**
 * Traduire une opportunité
 */
async function translateOpportunity(db, opportunity, targetLangs, dryRun = false) {
  console.log(`\n📊 Opportunité #${opportunity.id}: ${opportunity.title?.substring(0, 60)}`);

  const translations = {};

  for (const lang of targetLangs) {
    console.log(`   Traduction ${TARGET_LANGUAGES[lang]} (${lang})...`);

    // Vérifier si déjà traduit
    const alreadyTranslated = opportunity[`title_${lang}`] &&
                              opportunity[`title_${lang}`] !== opportunity.title;

    if (alreadyTranslated) {
      console.log(`   ⏭️  Déjà traduit`);
      stats.opportunities.skipped++;
      continue;
    }

    try {
      // Traduire titre
      const titleTranslated = await translateWithGoogle(opportunity.title, lang);
      await sleep(DELAY_BETWEEN_REQUESTS);

      // Traduire description (limiter à 3000 caractères)
      const descToTranslate = opportunity.description?.substring(0, 3000);
      const descriptionTranslated = descToTranslate
        ? await translateWithGoogle(descToTranslate, lang)
        : null;
      if (descriptionTranslated) await sleep(DELAY_BETWEEN_REQUESTS);

      // Traduire résumé
      const summaryTranslated = opportunity.summary
        ? await translateWithGoogle(opportunity.summary, lang)
        : null;
      if (summaryTranslated) await sleep(DELAY_BETWEEN_REQUESTS);

      translations[lang] = {
        title: titleTranslated,
        description: descriptionTranslated,
        summary: summaryTranslated
      };

      console.log(`   ✅ "${titleTranslated?.substring(0, 50)}..."`);
      stats.opportunities.translated++;
      stats.byLanguage[lang].translated++;

    } catch (error) {
      console.error(`   ❌ Erreur:`, error.message);
      stats.opportunities.errors++;
      stats.byLanguage[lang].errors++;
    }
  }

  // Mettre à jour la base de données
  if (!dryRun && Object.keys(translations).length > 0) {
    const updateFields = [];
    const updateValues = [];

    for (const [lang, data] of Object.entries(translations)) {
      if (data.title) {
        updateFields.push(`title_${lang} = ?`);
        updateValues.push(data.title);
      }
      if (data.description) {
        updateFields.push(`description_${lang} = ?`);
        updateValues.push(data.description);
      }
      if (data.summary) {
        updateFields.push(`summary_${lang} = ?`);
        updateValues.push(data.summary);
      }
    }

    if (updateFields.length > 0) {
      updateValues.push(opportunity.id);
      const updateQuery = `
        UPDATE investment_opportunities
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      db.prepare(updateQuery).run(...updateValues);
    }
  }
}

/**
 * Traduire une actualité
 */
async function translateNews(db, newsItem, targetLangs, dryRun = false) {
  console.log(`\n📰 Actualité #${newsItem.id}: ${newsItem.title?.substring(0, 60)}...`);

  const translations = {};

  for (const lang of targetLangs) {
    console.log(`   Traduction ${TARGET_LANGUAGES[lang]} (${lang})...`);

    // Vérifier si déjà traduit
    const alreadyTranslated = newsItem[`title_${lang}`] &&
                              newsItem[`title_${lang}`] !== newsItem.title;

    if (alreadyTranslated) {
      console.log(`   ⏭️  Déjà traduit`);
      stats.news.skipped++;
      continue;
    }

    try {
      const titleTranslated = await translateWithGoogle(newsItem.title, lang);
      await sleep(DELAY_BETWEEN_REQUESTS);

      const summaryTranslated = newsItem.summary
        ? await translateWithGoogle(newsItem.summary, lang)
        : null;
      if (summaryTranslated) await sleep(DELAY_BETWEEN_REQUESTS);

      // Limiter le contenu
      const contentToTranslate = newsItem.content?.substring(0, 3000);
      const contentTranslated = contentToTranslate
        ? await translateWithGoogle(contentToTranslate, lang)
        : null;
      if (contentTranslated) await sleep(DELAY_BETWEEN_REQUESTS);

      translations[lang] = {
        title: titleTranslated,
        summary: summaryTranslated,
        content: contentTranslated
      };

      console.log(`   ✅ "${titleTranslated?.substring(0, 50)}..."`);
      stats.news.translated++;
      stats.byLanguage[lang].translated++;

    } catch (error) {
      console.error(`   ❌ Erreur:`, error.message);
      stats.news.errors++;
      stats.byLanguage[lang].errors++;
    }
  }

  // Mettre à jour la base de données
  if (!dryRun && Object.keys(translations).length > 0) {
    const updateFields = [];
    const updateValues = [];

    for (const [lang, data] of Object.entries(translations)) {
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
      updateValues.push(newsItem.id);
      const updateQuery = `
        UPDATE news
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      db.prepare(updateQuery).run(...updateValues);
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🌍 Traduction automatique avec Google Translate API\n');
  console.log(`📁 Base de données: ${dbPath}`);

  // Endpoint gratuit - aucune clé API nécessaire
  console.log('   Utilise l\'endpoint gratuit gtx (aucune API payante)');

  // Options
  const dryRun = process.argv.includes('--dry-run');
  const limit = process.argv.includes('--limit')
    ? parseInt(process.argv[process.argv.indexOf('--limit') + 1])
    : null;

  // Sélectionner les langues à traduire
  let targetLangs = Object.keys(TARGET_LANGUAGES);
  if (process.argv.includes('--langs')) {
    const langsArg = process.argv[process.argv.indexOf('--langs') + 1];
    targetLangs = langsArg.split(',');
  }

  console.log(`\n🌐 Langues cibles: ${targetLangs.map(l => `${l} (${TARGET_LANGUAGES[l]})`).join(', ')}`);

  if (dryRun) {
    console.log('\n⚠️  MODE DRY-RUN: Simulation uniquement\n');
  }

  const db = new Database(dbPath);

  try {
    // Traduire les opportunités
    console.log('\n📊 === OPPORTUNITÉS D\'INVESTISSEMENT ===\n');

    let oppQuery = 'SELECT * FROM investment_opportunities WHERE status = "active"';
    if (limit) oppQuery += ` LIMIT ${limit}`;

    const opportunities = db.prepare(oppQuery).all();
    stats.opportunities.total = opportunities.length;

    console.log(`📝 ${opportunities.length} opportunités à traiter\n`);

    for (const opp of opportunities) {
      await translateOpportunity(db, opp, targetLangs, dryRun);
    }

    // Traduire les actualités
    console.log('\n\n📰 === ACTUALITÉS ===\n');

    let newsQuery = 'SELECT * FROM news ORDER BY published_at DESC';
    if (limit) newsQuery += ` LIMIT ${limit}`;

    const news = db.prepare(newsQuery).all();
    stats.news.total = news.length;

    console.log(`📝 ${news.length} actualités à traiter\n`);

    for (const item of news) {
      await translateNews(db, item, targetLangs, dryRun);
    }

    // Statistiques
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 STATISTIQUES FINALES');
    console.log('='.repeat(60));

    console.log('\n📊 Opportunités:');
    console.log(`   Total:     ${stats.opportunities.total}`);
    console.log(`   Traduites: ${stats.opportunities.translated}`);
    console.log(`   Ignorées:  ${stats.opportunities.skipped}`);
    console.log(`   Erreurs:   ${stats.opportunities.errors}`);

    console.log('\n📰 Actualités:');
    console.log(`   Total:     ${stats.news.total}`);
    console.log(`   Traduites: ${stats.news.translated}`);
    console.log(`   Ignorées:  ${stats.news.skipped}`);
    console.log(`   Erreurs:   ${stats.news.errors}`);

    console.log('\n🌐 Par langue:');
    Object.entries(stats.byLanguage).forEach(([lang, data]) => {
      console.log(`   ${lang} (${TARGET_LANGUAGES[lang]}): ${data.translated} traduites, ${data.errors} erreurs`);
    });

    console.log('\n📈 Utilisation Google Translate:');
    console.log(`   Caractères utilisés: ${stats.charactersUsed.toLocaleString()}`);
    console.log(`   Limite gratuite:     500,000 caractères/mois`);
    console.log(`   Restant:             ${(500000 - stats.charactersUsed).toLocaleString()}`);
    console.log(`   Utilisation:         ${((stats.charactersUsed / 500000) * 100).toFixed(2)}%`);

    if (dryRun) {
      console.log('\n⚠️  MODE DRY-RUN: Aucune modification effectuée');
    } else {
      console.log('\n✅ Traductions enregistrées');
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { translateWithGoogle };
