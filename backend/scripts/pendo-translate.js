#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║            PENDO TRANSLATE — CLI de Traduction               ║
 * ║                   100% GRATUIT — Zéro Coût                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   node pendo-translate.js                    — Traduire tout (news + opportunités)
 *   node pendo-translate.js --type news        — Traduire seulement les news
 *   node pendo-translate.js --type opps        — Traduire seulement les opportunités
 *   node pendo-translate.js --text "Hello"     — Traduire un texte simple
 *   node pendo-translate.js --langs fr,sw,ar   — Langues cibles spécifiques
 *   node pendo-translate.js --limit 5          — Limiter le nombre d'articles
 *   node pendo-translate.js --stats            — Afficher les statistiques du cache
 *   node pendo-translate.js --dry-run          — Simulation sans écriture en DB
 *   node pendo-translate.js --verbose          — Logs détaillés
 *
 * Providers (gratuits):
 *   1. Google GTX (translate.googleapis.com/translate_a/single?client=gtx)
 *   2. Lingva Translate (instances publiques)
 *   3. MyMemory (api.mymemory.translated.net)
 */

const path = require('path');
const { createTranslator, PENDO_LANGUAGES, DB_TRANSLATION_LANGS, PRIORITY_LANGUAGES } = require('../utils/translation');

// ═══════════════════════════════════════════════════════════════
// Parse arguments
// ═══════════════════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    type: 'all',       // 'all', 'news', 'opps', 'text'
    text: null,        // Texte à traduire (mode texte)
    langs: null,       // Langues cibles
    limit: 10,
    dryRun: false,
    verbose: false,
    stats: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--type':
        opts.type = args[++i];
        break;
      case '--text':
      case '-t':
        opts.type = 'text';
        opts.text = args[++i];
        break;
      case '--langs':
      case '-l':
        opts.langs = args[++i].split(',');
        break;
      case '--limit':
        opts.limit = parseInt(args[++i]);
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        opts.verbose = true;
        break;
      case '--stats':
        opts.stats = true;
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
    }
  }

  return opts;
}

// ═══════════════════════════════════════════════════════════════
// Affichage
// ═══════════════════════════════════════════════════════════════

function printBanner() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           🌍 PENDO TRANSLATE — Moteur de Traduction         ║');
  console.log('║                   100% GRATUIT — Zéro Coût                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

function printHelp() {
  printBanner();
  console.log('Usage:');
  console.log('  node pendo-translate.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --type <type>    Type: all, news, opps, text (défaut: all)');
  console.log('  --text <texte>   Traduire un texte directement');
  console.log('  --langs <codes>  Langues cibles séparées par virgule (défaut: prioritaires)');
  console.log('  --limit <n>      Nombre max d\'articles (défaut: 10)');
  console.log('  --dry-run        Simulation sans écriture en DB');
  console.log('  --verbose        Logs détaillés');
  console.log('  --stats          Afficher les statistiques du cache');
  console.log('  --help           Afficher cette aide');
  console.log('');
  console.log('Langues supportées:');
  Object.entries(PENDO_LANGUAGES).forEach(([code, info]) => {
    const hasDB = DB_TRANSLATION_LANGS.includes(code) ? '📦' : '  ';
    const isPrio = PRIORITY_LANGUAGES.includes(code) ? '⭐' : '  ';
    console.log(`  ${hasDB}${isPrio} ${code.padEnd(4)} ${info.name} (${info.region})`);
  });
  console.log('');
  console.log('  📦 = colonne en base de données');
  console.log('  ⭐ = langue prioritaire');
}

function printLanguageTable(results) {
  console.log('');
  console.log('┌──────┬──────────────────────┬────────────────────────────────────────┐');
  console.log('│ Lang │ Nom                  │ Traduction                             │');
  console.log('├──────┼──────────────────────┼────────────────────────────────────────┤');
  for (const [code, text] of Object.entries(results)) {
    const info = PENDO_LANGUAGES[code] || { name: code };
    const name = info.name.padEnd(20).substring(0, 20);
    const trad = (text || '—').substring(0, 38).padEnd(38);
    console.log(`│ ${code.padEnd(4)} │ ${name} │ ${trad} │`);
  }
  console.log('└──────┴──────────────────────┴────────────────────────────────────────┘');
}

// ═══════════════════════════════════════════════════════════════
// Mode texte: traduction directe
// ═══════════════════════════════════════════════════════════════

async function translateTextMode(opts) {
  const translator = createTranslator({
    enableCache: true,
    verbose: opts.verbose,
    concurrency: 3
  });

  const langs = opts.langs || PRIORITY_LANGUAGES;
  const sourceLang = await translator.detectLanguage(opts.text);

  console.log(`📝 Texte source: "${opts.text}"`);
  console.log(`🔍 Langue détectée: ${sourceLang}`);
  console.log(`🎯 Langues cibles: ${langs.join(', ')}`);
  console.log('');

  const results = await translator.translateToMultiple(opts.text, langs, sourceLang);
  printLanguageTable(results);

  const stats = translator.getStats();
  console.log(`\n📊 ${stats.session.translated} traduits, ${stats.session.cached} en cache, ${stats.session.failed} échoués`);
}

// ═══════════════════════════════════════════════════════════════
// Mode batch: traduction d'articles en DB
// ═══════════════════════════════════════════════════════════════

async function translateBatchMode(opts) {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    console.error('❌ better-sqlite3 non installé. Installez-le: npm install better-sqlite3');
    process.exit(1);
  }

  const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
  let db;
  try {
    db = new Database(dbPath);
  } catch (e) {
    console.error(`❌ Impossible d'ouvrir la base: ${dbPath}`);
    console.error(e.message);
    process.exit(1);
  }

  const translator = createTranslator({
    db: db,
    enableCache: true,
    verbose: opts.verbose,
    concurrency: 3,
    defaultLanguages: opts.langs || PRIORITY_LANGUAGES
  });

  const langs = opts.langs || PRIORITY_LANGUAGES;

  console.log(`📁 Base de données: ${dbPath}`);
  console.log(`🎯 Langues: ${langs.join(', ')}`);
  console.log(`📊 Limite: ${opts.limit} articles par type`);
  if (opts.dryRun) console.log('⚠️  MODE DRY-RUN: simulation uniquement');
  console.log('');

  // Traduction des news
  if (opts.type === 'all' || opts.type === 'news') {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📰 TRADUCTION DES NEWS');
    console.log('═══════════════════════════════════════════════════════════');

    const langConditions = langs
      .filter(l => l !== 'en')
      .map(l => `title_${l} IS NULL`)
      .join(' OR ');

    const query = `
      SELECT * FROM news
      WHERE ${langConditions}
      ORDER BY published_at DESC
      LIMIT ?
    `;

    const articles = db.prepare(query).all(opts.limit);
    console.log(`\n📝 ${articles.length} articles à traduire\n`);

    const result = await translator.translateBatch(articles, langs, {
      maxTimeMs: 300000, // 5 minutes
      onProgress: (p) => {
        process.stdout.write(`\r   ⏳ ${p.processed}/${p.total} traités, ${p.translated} traduits (${Math.round(p.elapsed / 1000)}s)`);
      },
      onSave: opts.dryRun ? null : async ({ articleId, translations }) => {
        const updateFields = [];
        const updateValues = [];

        for (const [lang, data] of Object.entries(translations)) {
          if (data.title) { updateFields.push(`title_${lang} = ?`); updateValues.push(data.title); }
          if (data.summary) { updateFields.push(`summary_${lang} = ?`); updateValues.push(data.summary); }
          if (data.content) { updateFields.push(`content_${lang} = ?`); updateValues.push(data.content); }
        }

        if (updateFields.length > 0) {
          updateValues.push(articleId);
          db.prepare(`UPDATE news SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
        }
      }
    });

    console.log(`\n\n   ✅ News: ${result.translated} traduits, ${result.skipped} ignorés, ${result.errors} erreurs (${Math.round(result.elapsed / 1000)}s)`);
    if (result.remaining > 0) {
      console.log(`   ⚠️  ${result.remaining} articles restants (relancez le script)`);
    }
  }

  // Traduction des opportunités
  if (opts.type === 'all' || opts.type === 'opps') {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 TRADUCTION DES OPPORTUNITÉS');
    console.log('═══════════════════════════════════════════════════════════');

    const langConditions = langs
      .filter(l => l !== 'en')
      .map(l => `title_${l} IS NULL`)
      .join(' OR ');

    const query = `
      SELECT * FROM investment_opportunities
      WHERE (${langConditions}) AND status = 'active'
      ORDER BY published_at DESC
      LIMIT ?
    `;

    const opps = db.prepare(query).all(opts.limit);
    console.log(`\n📝 ${opps.length} opportunités à traduire\n`);

    const result = await translator.translateBatch(opps, langs, {
      maxTimeMs: 300000,
      onProgress: (p) => {
        process.stdout.write(`\r   ⏳ ${p.processed}/${p.total} traités, ${p.translated} traduits (${Math.round(p.elapsed / 1000)}s)`);
      },
      onSave: opts.dryRun ? null : async ({ articleId, translations }) => {
        const updateFields = [];
        const updateValues = [];

        for (const [lang, data] of Object.entries(translations)) {
          if (data.title) { updateFields.push(`title_${lang} = ?`); updateValues.push(data.title); }
          if (data.summary) { updateFields.push(`summary_${lang} = ?`); updateValues.push(data.summary); }
          if (data.description) { updateFields.push(`description_${lang} = ?`); updateValues.push(data.description); }
        }

        if (updateFields.length > 0) {
          updateValues.push(articleId);
          db.prepare(`UPDATE investment_opportunities SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
        }
      }
    });

    console.log(`\n\n   ✅ Opportunités: ${result.translated} traduites, ${result.skipped} ignorées, ${result.errors} erreurs (${Math.round(result.elapsed / 1000)}s)`);
  }

  // Statistiques finales
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 STATISTIQUES');
  console.log('═══════════════════════════════════════════════════════════\n');

  const stats = translator.getStats();

  console.log('   Session:');
  console.log(`     Traduits:     ${stats.session.translated}`);
  console.log(`     En cache:     ${stats.session.cached}`);
  console.log(`     Échoués:      ${stats.session.failed}`);

  if (Object.keys(stats.session.providerUsage).length > 0) {
    console.log('\n   Providers utilisés:');
    for (const [name, count] of Object.entries(stats.session.providerUsage)) {
      console.log(`     ${name}: ${count} requêtes`);
    }
  }

  if (stats.cache) {
    console.log('\n   Cache:');
    console.log(`     Entrées:      ${stats.cache.size}`);
    console.log(`     Hit rate:     ${stats.cache.hitRate}`);
    console.log(`     Hits:         ${stats.cache.hits}`);
    console.log(`     Misses:       ${stats.cache.misses}`);
  }

  if (opts.dryRun) {
    console.log('\n⚠️  MODE DRY-RUN: aucune modification enregistrée');
  }

  db.close();
}

// ═══════════════════════════════════════════════════════════════
// Mode stats: affichage des stats du cache
// ═══════════════════════════════════════════════════════════════

async function showStats() {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    console.error('❌ better-sqlite3 non installé');
    process.exit(1);
  }

  const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
  const db = new Database(dbPath);

  const translator = createTranslator({ db, enableCache: true });

  console.log('📊 Statistiques du cache de traduction:\n');

  const stats = translator.getStats();
  if (stats.cache) {
    console.log(`   Entrées en cache: ${stats.cache.size}`);
    console.log(`   Hit rate:         ${stats.cache.hitRate}`);

    const topLangs = stats.cache.getTopLanguages ? stats.cache.getTopLanguages() : [];
    if (topLangs.length > 0) {
      console.log('\n   Top langues traduites:');
      topLangs.forEach(({ target_lang, count, total_uses }) => {
        const info = PENDO_LANGUAGES[target_lang];
        const name = info ? info.name : target_lang;
        console.log(`     ${target_lang} (${name}): ${count} entrées, ${total_uses} utilisations`);
      });
    }
  }

  console.log('\n   Providers disponibles:');
  stats.providers.forEach(p => {
    console.log(`     ${p.enabled ? '✅' : '❌'} ${p.name}: ${p.supportedLanguages} langues`);
  });

  db.close();
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

async function main() {
  const opts = parseArgs();

  if (opts.help) {
    printHelp();
    return;
  }

  printBanner();

  if (opts.stats) {
    await showStats();
    return;
  }

  if (opts.type === 'text') {
    if (!opts.text) {
      console.error('❌ Spécifiez un texte: --text "Votre texte"');
      process.exit(1);
    }
    await translateTextMode(opts);
    return;
  }

  await translateBatchMode(opts);
}

main().catch(err => {
  console.error('\n❌ Erreur fatale:', err);
  process.exit(1);
});
