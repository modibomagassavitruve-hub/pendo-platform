/**
 * Script de traduction automatique avec DeepL API
 *
 * Ce script traduit automatiquement tous les contenus (opportunités et actualités)
 * dans les langues supportées : EN, ES, PT
 *
 * Note: DeepL ne supporte pas l'arabe, utilisez Google Translate pour l'arabe
 *
 * Configuration:
 * - Créer un compte gratuit sur https://www.deepl.com/pro-api
 * - Ajouter DEEPL_API_KEY dans le fichier .env
 * - Free tier: 500,000 caractères/mois gratuits
 */

const Database = require('better-sqlite3');
const path = require('path');
const fetch = require('node-fetch');

// Configuration
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';
const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');

// Langues cibles supportées par DeepL
const TARGET_LANGUAGES = {
  'EN': 'EN', // Anglais
  'ES': 'ES', // Espagnol
  'PT-PT': 'PT' // Portugais
};

// Délai entre les requêtes (en ms) pour respecter le rate limit
const DELAY_BETWEEN_REQUESTS = 1000; // 1 seconde

// Compteurs
let stats = {
  opportunities: { total: 0, translated: 0, skipped: 0, errors: 0 },
  news: { total: 0, translated: 0, skipped: 0, errors: 0 },
  charactersUsed: 0
};

/**
 * Fonction pour attendre un certain délai
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Traduction avec DeepL API
 */
async function translateWithDeepL(text, targetLang) {
  if (!text || text.trim().length === 0) {
    return null;
  }

  if (!DEEPL_API_KEY) {
    throw new Error('DEEPL_API_KEY non définie dans le fichier .env');
  }

  try {
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang,
        source_lang: 'FR'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepL API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    stats.charactersUsed += text.length;

    return data.translations[0].text;
  } catch (error) {
    console.error(`Erreur traduction DeepL (${targetLang}):`, error.message);
    return null;
  }
}

/**
 * Traduire une opportunité
 */
async function translateOpportunity(db, opportunity, dryRun = false) {
  console.log(`\n📊 Opportunité #${opportunity.id}: ${opportunity.title}`);

  const translations = {};

  // Traduire pour chaque langue
  for (const [deeplLang, dbLang] of Object.entries(TARGET_LANGUAGES)) {
    console.log(`   Traduction ${dbLang}...`);

    // Vérifier si déjà traduit
    const alreadyTranslated = opportunity[`title_${dbLang.toLowerCase()}`] &&
                              opportunity[`title_${dbLang.toLowerCase()}`] !== opportunity.title;

    if (alreadyTranslated) {
      console.log(`   ⏭️  Déjà traduit en ${dbLang}`);
      stats.opportunities.skipped++;
      continue;
    }

    try {
      // Traduire les champs
      const titleTranslated = await translateWithDeepL(opportunity.title, deeplLang);
      await sleep(DELAY_BETWEEN_REQUESTS);

      const descriptionTranslated = opportunity.description
        ? await translateWithDeepL(opportunity.description, deeplLang)
        : null;
      if (descriptionTranslated) await sleep(DELAY_BETWEEN_REQUESTS);

      const summaryTranslated = opportunity.summary
        ? await translateWithDeepL(opportunity.summary, deeplLang)
        : null;
      if (summaryTranslated) await sleep(DELAY_BETWEEN_REQUESTS);

      translations[dbLang.toLowerCase()] = {
        title: titleTranslated,
        description: descriptionTranslated,
        summary: summaryTranslated
      };

      console.log(`   ✅ ${dbLang}: "${titleTranslated?.substring(0, 50)}..."`);
      stats.opportunities.translated++;

    } catch (error) {
      console.error(`   ❌ Erreur ${dbLang}:`, error.message);
      stats.opportunities.errors++;
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
async function translateNews(db, newsItem, dryRun = false) {
  console.log(`\n📰 Actualité #${newsItem.id}: ${newsItem.title?.substring(0, 60)}...`);

  const translations = {};

  // Traduire pour chaque langue
  for (const [deeplLang, dbLang] of Object.entries(TARGET_LANGUAGES)) {
    console.log(`   Traduction ${dbLang}...`);

    // Vérifier si déjà traduit
    const alreadyTranslated = newsItem[`title_${dbLang.toLowerCase()}`] &&
                              newsItem[`title_${dbLang.toLowerCase()}`] !== newsItem.title;

    if (alreadyTranslated) {
      console.log(`   ⏭️  Déjà traduit en ${dbLang}`);
      stats.news.skipped++;
      continue;
    }

    try {
      // Traduire les champs
      const titleTranslated = await translateWithDeepL(newsItem.title, deeplLang);
      await sleep(DELAY_BETWEEN_REQUESTS);

      const summaryTranslated = newsItem.summary
        ? await translateWithDeepL(newsItem.summary, deeplLang)
        : null;
      if (summaryTranslated) await sleep(DELAY_BETWEEN_REQUESTS);

      // Limiter le contenu à 5000 caractères pour éviter de dépasser les limites
      const contentToTranslate = newsItem.content?.substring(0, 5000);
      const contentTranslated = contentToTranslate
        ? await translateWithDeepL(contentToTranslate, deeplLang)
        : null;
      if (contentTranslated) await sleep(DELAY_BETWEEN_REQUESTS);

      translations[dbLang.toLowerCase()] = {
        title: titleTranslated,
        summary: summaryTranslated,
        content: contentTranslated
      };

      console.log(`   ✅ ${dbLang}: "${titleTranslated?.substring(0, 50)}..."`);
      stats.news.translated++;

    } catch (error) {
      console.error(`   ❌ Erreur ${dbLang}:`, error.message);
      stats.news.errors++;
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
  console.log('🌍 Traduction automatique avec DeepL API\n');
  console.log(`📁 Base de données: ${dbPath}`);

  // Vérifier la clé API
  if (!DEEPL_API_KEY) {
    console.error('\n❌ Erreur: DEEPL_API_KEY non définie');
    console.log('\n💡 Pour configurer:');
    console.log('   1. Créer un compte gratuit sur https://www.deepl.com/pro-api');
    console.log('   2. Copier votre clé API');
    console.log('   3. Ajouter dans .env: DEEPL_API_KEY=votre_clé');
    console.log('\n📊 Limite gratuite: 500,000 caractères/mois');
    process.exit(1);
  }

  // Mode dry-run (simulation)
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('\n⚠️  MODE DRY-RUN: Aucune modification ne sera effectuée\n');
  }

  // Limiter le nombre d'items (pour tester)
  const limit = process.argv.includes('--limit')
    ? parseInt(process.argv[process.argv.indexOf('--limit') + 1])
    : null;

  const db = new Database(dbPath);

  try {
    // Traduire les opportunités
    console.log('\n📊 === OPPORTUNITÉS D\'INVESTISSEMENT ===\n');

    let oppQuery = "SELECT * FROM investment_opportunities WHERE status = 'active'";
    if (limit) oppQuery += ` LIMIT ${limit}`;

    const opportunities = db.prepare(oppQuery).all();
    stats.opportunities.total = opportunities.length;

    console.log(`📝 ${opportunities.length} opportunités à traiter\n`);

    for (const opp of opportunities) {
      await translateOpportunity(db, opp, dryRun);
    }

    // Traduire les actualités
    console.log('\n\n📰 === ACTUALITÉS ===\n');

    let newsQuery = 'SELECT * FROM news ORDER BY published_at DESC';
    if (limit) newsQuery += ` LIMIT ${limit}`;

    const news = db.prepare(newsQuery).all();
    stats.news.total = news.length;

    console.log(`📝 ${news.length} actualités à traiter\n`);

    for (const item of news) {
      await translateNews(db, item, dryRun);
    }

    // Afficher les statistiques
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

    console.log('\n📈 Utilisation DeepL:');
    console.log(`   Caractères utilisés: ${stats.charactersUsed.toLocaleString()}`);
    console.log(`   Limite gratuite:     500,000 caractères/mois`);
    console.log(`   Restant:             ${(500000 - stats.charactersUsed).toLocaleString()}`);
    console.log(`   Utilisation:         ${((stats.charactersUsed / 500000) * 100).toFixed(2)}%`);

    if (dryRun) {
      console.log('\n⚠️  MODE DRY-RUN: Aucune modification effectuée');
      console.log('   Pour appliquer les traductions, relancez sans --dry-run');
    } else {
      console.log('\n✅ Traductions enregistrées dans la base de données');
    }

    console.log('\n💡 Prochaines étapes:');
    console.log('   - Vérifier les traductions dans l\'application');
    console.log('   - Corriger manuellement si nécessaire');
    console.log('   - Ajouter la traduction arabe avec Google Translate');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Lancement du script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { translateWithDeepL };
