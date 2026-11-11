/**
 * Script de traduction complète pour toutes les 29 langues de Pendo
 *
 * Utilise:
 * - DeepL (gratuit free tier) pour: EN, ES, PT, DE
 * - Google Translate GRATUIT (endpoint gtx) pour: AR et langues africaines
 *
 * IMPORTANT: AUCUNE API payante Google Cloud. Endpoint gtx uniquement.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fetch = require('node-fetch');

// Configuration
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');

// Toutes les langues supportées par Pendo
const ALL_LANGUAGES = {
  // Langues internationales (DeepL)
  en: { name: 'English', api: 'deepl', deeplCode: 'EN' },
  es: { name: 'Español', api: 'deepl', deeplCode: 'ES' },
  pt: { name: 'Português', api: 'deepl', deeplCode: 'PT-PT' },
  de: { name: 'Deutsch', api: 'deepl', deeplCode: 'DE' },

  // Arabe (Google - DeepL ne supporte pas)
  ar: { name: 'العربية', api: 'google', googleCode: 'ar' },

  // Langues africaines - Afrique de l'Ouest (Google)
  wo: { name: 'Wolof', api: 'google', googleCode: 'wo' },
  bm: { name: 'Bambara', api: 'google', googleCode: 'bm' },
  yo: { name: 'Yoruba', api: 'google', googleCode: 'yo' },
  ig: { name: 'Igbo', api: 'google', googleCode: 'ig' },
  ha: { name: 'Hausa', api: 'google', googleCode: 'ha' },
  ff: { name: 'Fulani', api: 'google', googleCode: 'ff' },
  fon: { name: 'Fon', api: 'google', googleCode: 'fon' },
  tw: { name: 'Twi', api: 'google', googleCode: 'tw' },
  ee: { name: 'Ewe', api: 'google', googleCode: 'ee' },

  // Langues africaines - Afrique Centrale (Google)
  ln: { name: 'Lingala', api: 'google', googleCode: 'ln' },
  kg: { name: 'Kikongo', api: 'google', googleCode: 'kg' },
  sg: { name: 'Sango', api: 'google', googleCode: 'sg' },

  // Langues africaines - Afrique de l'Est (Google)
  sw: { name: 'Swahili', api: 'google', googleCode: 'sw' },
  am: { name: 'Amharic', api: 'google', googleCode: 'am' },

  // Langues africaines - Afrique Australe (Google)
  af: { name: 'Afrikaans', api: 'google', googleCode: 'af' },
  zu: { name: 'Zulu', api: 'google', googleCode: 'zu' },
  xh: { name: 'Xhosa', api: 'google', googleCode: 'xh' },
  sn: { name: 'Shona', api: 'google', googleCode: 'sn' },
  st: { name: 'Sesotho', api: 'google', googleCode: 'st' },
  tn: { name: 'Tswana', api: 'google', googleCode: 'tn' },
  ts: { name: 'Tsonga', api: 'google', googleCode: 'ts' },
  // nd: Ndebele - Non supporté par Google Translate
  ss: { name: 'Swati', api: 'google', googleCode: 'ss' },
};

// Délai entre les requêtes
const DELAY_BETWEEN_REQUESTS = 500;

// Statistiques
let stats = {
  opportunities: { total: 0, translated: 0, skipped: 0, errors: 0 },
  news: { total: 0, translated: 0, skipped: 0, errors: 0 },
  deeplChars: 0,
  googleChars: 0,
  languageErrors: {}
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Traduction avec DeepL
 */
async function translateWithDeepL(text, targetLang) {
  if (!text || text.trim().length === 0) return null;
  if (!DEEPL_API_KEY) throw new Error('DEEPL_API_KEY non définie');

  try {
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
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
      throw new Error(`DeepL: ${response.status} - ${error}`);
    }

    const data = await response.json();
    stats.deeplChars += text.length;
    return data.translations[0].text;
  } catch (error) {
    console.error(`   ❌ DeepL error:`, error.message);
    return null;
  }
}

/**
 * Traduction avec Google Translate GRATUIT (endpoint gtx)
 * Aucune clé API requise - AUCUN coût
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
      stats.googleChars += truncated.length;
      return data[0].map(s => s[0]).join('');
    } catch (error) {
      await sleep(2000 * (i + 1));
    }
  }
  console.error(`   Erreur traduction gratuite (${targetLang})`);
  return null;
}

/**
 * Traduction universelle (choisit la bonne API)
 */
async function translate(text, langCode) {
  const langConfig = ALL_LANGUAGES[langCode];
  if (!langConfig) {
    console.error(`   ⚠️ Langue non supportée: ${langCode}`);
    return null;
  }

  if (langConfig.api === 'deepl') {
    return translateWithDeepL(text, langConfig.deeplCode);
  } else {
    return translateWithGoogle(text, langConfig.googleCode);
  }
}

/**
 * Ajouter les colonnes de traduction si elles n'existent pas
 */
function ensureTranslationColumns(db) {
  console.log('\n📋 Vérification des colonnes de traduction...\n');

  const tables = ['investment_opportunities', 'news'];
  const fields = ['title', 'description', 'summary', 'content'];

  for (const table of tables) {
    // Récupérer les colonnes existantes
    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
    const existingColumns = tableInfo.map(col => col.name);

    for (const langCode of Object.keys(ALL_LANGUAGES)) {
      for (const field of fields) {
        const colName = `${field}_${langCode}`;
        if (!existingColumns.includes(colName)) {
          try {
            db.prepare(`ALTER TABLE ${table} ADD COLUMN ${colName} TEXT`).run();
            console.log(`   ✅ Ajouté: ${table}.${colName}`);
          } catch (e) {
            // Colonne existe déjà ou erreur
          }
        }
      }
    }
  }

  console.log('   ✓ Colonnes vérifiées\n');
}

/**
 * Traduire une opportunité dans toutes les langues
 */
async function translateOpportunity(db, opp, languages, dryRun) {
  console.log(`\n📊 Opportunité #${opp.id}: ${opp.title.substring(0, 50)}...`);

  const translations = {};

  for (const langCode of languages) {
    const langConfig = ALL_LANGUAGES[langCode];
    const apiIcon = langConfig.api === 'deepl' ? '🔵' : '🟢';

    // Vérifier si déjà traduit
    const existingTitle = opp[`title_${langCode}`];
    if (existingTitle && existingTitle !== opp.title) {
      console.log(`   ⏭️  ${langCode.toUpperCase()} déjà traduit`);
      stats.opportunities.skipped++;
      continue;
    }

    console.log(`   ${apiIcon} ${langCode.toUpperCase()} (${langConfig.name})...`);

    try {
      const titleTranslated = await translate(opp.title, langCode);
      await sleep(DELAY_BETWEEN_REQUESTS);

      let descTranslated = null;
      if (opp.description) {
        descTranslated = await translate(opp.description.substring(0, 2000), langCode);
        await sleep(DELAY_BETWEEN_REQUESTS);
      }

      let summaryTranslated = null;
      if (opp.summary) {
        summaryTranslated = await translate(opp.summary.substring(0, 1000), langCode);
        await sleep(DELAY_BETWEEN_REQUESTS);
      }

      if (titleTranslated) {
        translations[langCode] = {
          title: titleTranslated,
          description: descTranslated,
          summary: summaryTranslated
        };
        console.log(`      ✅ "${titleTranslated.substring(0, 40)}..."`);
        stats.opportunities.translated++;
      }
    } catch (error) {
      console.error(`      ❌ Erreur: ${error.message}`);
      stats.opportunities.errors++;
      if (!stats.languageErrors[langCode]) stats.languageErrors[langCode] = 0;
      stats.languageErrors[langCode]++;
    }
  }

  // Sauvegarder les traductions
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
      updateValues.push(opp.id);
      db.prepare(`UPDATE investment_opportunities SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
    }
  }
}

/**
 * Traduire une actualité dans toutes les langues
 */
async function translateNews(db, news, languages, dryRun) {
  console.log(`\n📰 News #${news.id}: ${(news.title || '').substring(0, 50)}...`);

  const translations = {};

  for (const langCode of languages) {
    const langConfig = ALL_LANGUAGES[langCode];
    const apiIcon = langConfig.api === 'deepl' ? '🔵' : '🟢';

    // Vérifier si déjà traduit
    const existingTitle = news[`title_${langCode}`];
    if (existingTitle && existingTitle !== news.title) {
      console.log(`   ⏭️  ${langCode.toUpperCase()} déjà traduit`);
      stats.news.skipped++;
      continue;
    }

    console.log(`   ${apiIcon} ${langCode.toUpperCase()} (${langConfig.name})...`);

    try {
      const titleTranslated = news.title ? await translate(news.title, langCode) : null;
      await sleep(DELAY_BETWEEN_REQUESTS);

      let summaryTranslated = null;
      if (news.summary) {
        summaryTranslated = await translate(news.summary.substring(0, 1000), langCode);
        await sleep(DELAY_BETWEEN_REQUESTS);
      }

      let contentTranslated = null;
      if (news.content) {
        contentTranslated = await translate(news.content.substring(0, 3000), langCode);
        await sleep(DELAY_BETWEEN_REQUESTS);
      }

      if (titleTranslated) {
        translations[langCode] = {
          title: titleTranslated,
          summary: summaryTranslated,
          content: contentTranslated
        };
        console.log(`      ✅ "${titleTranslated.substring(0, 40)}..."`);
        stats.news.translated++;
      }
    } catch (error) {
      console.error(`      ❌ Erreur: ${error.message}`);
      stats.news.errors++;
      if (!stats.languageErrors[langCode]) stats.languageErrors[langCode] = 0;
      stats.languageErrors[langCode]++;
    }
  }

  // Sauvegarder les traductions
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
      updateValues.push(news.id);
      db.prepare(`UPDATE news SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🌍 TRADUCTION COMPLÈTE PENDO - 29 LANGUES');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📁 Base de données:', dbPath);
  console.log('🔵 DeepL API:', DEEPL_API_KEY ? '✓ Configurée' : '✗ Manquante');
  console.log('🟢 Google:    Endpoint gratuit (gtx) - aucune clé requise');

  // L'endpoint gratuit Google ne nécessite aucune clé
  // DeepL est optionnel (free tier)

  // Options de ligne de commande
  const dryRun = process.argv.includes('--dry-run');
  const limit = process.argv.includes('--limit')
    ? parseInt(process.argv[process.argv.indexOf('--limit') + 1])
    : null;

  // Langues spécifiques ou toutes
  let selectedLanguages = Object.keys(ALL_LANGUAGES);
  const langIndex = process.argv.indexOf('--lang');
  if (langIndex !== -1 && process.argv[langIndex + 1]) {
    selectedLanguages = process.argv[langIndex + 1].split(',');
    console.log(`\n🎯 Langues sélectionnées: ${selectedLanguages.join(', ')}`);
  }

  // Filtrer par API disponible (Google gratuit toujours dispo, DeepL optionnel)
  selectedLanguages = selectedLanguages.filter(lang => {
    const config = ALL_LANGUAGES[lang];
    if (!config) return false;
    if (config.api === 'deepl' && !DEEPL_API_KEY) return false;
    return true;
  });

  console.log(`\n📋 Langues à traduire (${selectedLanguages.length}):`);
  const deeplLangs = selectedLanguages.filter(l => ALL_LANGUAGES[l].api === 'deepl');
  const googleLangs = selectedLanguages.filter(l => ALL_LANGUAGES[l].api === 'google');
  console.log(`   🔵 DeepL: ${deeplLangs.join(', ') || 'aucune'}`);
  console.log(`   🟢 Google: ${googleLangs.join(', ') || 'aucune'}`);

  if (dryRun) {
    console.log('\n⚠️  MODE DRY-RUN: Aucune modification');
  }

  const db = new Database(dbPath);

  try {
    // Ajouter les colonnes manquantes
    ensureTranslationColumns(db);

    // Traduire les opportunités
    console.log('\n' + '═'.repeat(60));
    console.log('📊 OPPORTUNITÉS D\'INVESTISSEMENT');
    console.log('═'.repeat(60));

    let oppQuery = "SELECT * FROM investment_opportunities WHERE status = 'active'";
    if (limit) oppQuery += ` LIMIT ${limit}`;

    const opportunities = db.prepare(oppQuery).all();
    stats.opportunities.total = opportunities.length;
    console.log(`📝 ${opportunities.length} opportunités à traiter`);

    for (const opp of opportunities) {
      await translateOpportunity(db, opp, selectedLanguages, dryRun);
    }

    // Traduire les actualités
    console.log('\n' + '═'.repeat(60));
    console.log('📰 ACTUALITÉS');
    console.log('═'.repeat(60));

    let newsQuery = 'SELECT * FROM news ORDER BY published_at DESC';
    if (limit) newsQuery += ` LIMIT ${limit}`;

    const news = db.prepare(newsQuery).all();
    stats.news.total = news.length;
    console.log(`📝 ${news.length} actualités à traiter`);

    for (const item of news) {
      await translateNews(db, item, selectedLanguages, dryRun);
    }

    // Statistiques finales
    console.log('\n' + '═'.repeat(60));
    console.log('📊 STATISTIQUES FINALES');
    console.log('═'.repeat(60));

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

    console.log('\n📈 Utilisation API:');
    console.log(`   🔵 DeepL:  ${stats.deeplChars.toLocaleString()} caractères`);
    console.log(`   🟢 Google: ${stats.googleChars.toLocaleString()} caractères`);
    console.log(`   📊 Total:  ${(stats.deeplChars + stats.googleChars).toLocaleString()} caractères`);

    if (Object.keys(stats.languageErrors).length > 0) {
      console.log('\n⚠️ Erreurs par langue:');
      for (const [lang, count] of Object.entries(stats.languageErrors)) {
        console.log(`   ${lang}: ${count} erreurs`);
      }
    }

    if (dryRun) {
      console.log('\n⚠️  MODE DRY-RUN: Aucune modification effectuée');
    } else {
      console.log('\n✅ Traductions enregistrées!');
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Lancement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { translate, ALL_LANGUAGES };
