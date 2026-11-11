#!/usr/bin/env node
/**
 * Auto-translate script for PENDO platform
 * Translates untranslated opportunities and news into 29 languages
 * Uses FREE google-translate-api-x (no API key, no billing!)
 * + Supabase REST API
 * Designed to run as a GitHub Action (standalone, no backend dependency)
 *
 * v4 — FREE: replaced paid Google Cloud API with google-translate-api-x
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// All 29 languages matching the frontend (i18n.js)
// Note: frontend uses lang.substring(0,2) so 'fon' → 'fo' in DB columns
const LANGUAGES = [
  'fr','en','es','ar','de','pt',           // International
  'wo','bm','yo','ig','ha','ff','fo','tw','ee', // West Africa (fo = fon)
  'ln','kg','sg',                           // Central Africa
  'sw','am',                                // East Africa
  'af','zu','xh','sn','st','tn','ts','nd','ss' // Southern Africa
];

const MAX_ITEMS = parseInt(process.env.TRANSLATE_MAX_ITEMS || '50', 10);

// Map DB language codes to google-translate-api-x codes
const GOOGLE_LANG_MAP = {
  'fo': null,   // Fon (Fongbe) — 'fo' = Faroese in Google, not Fon
  'ff': null,   // Fulfulde/Fulani — not supported
  'tw': 'ak',   // Twi → Akan in Google Translate
  'kg': null,   // Kikongo — not supported
  'sg': null,   // Sango — not supported
  'nd': null,   // Ndebele — not supported
  'ss': null,   // Swati — not supported
};

const UNSUPPORTED_LANGS = new Set(
  Object.entries(GOOGLE_LANG_MAP).filter(([_, v]) => v === null).map(([k]) => k)
);

// ─── Helpers ────────────────────────────────────────────────────────
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let translateFn = null; // Will be loaded dynamically
let consecutiveErrors = 0;
const ERROR_THRESHOLD = 5; // Stop after 5 consecutive errors

async function loadTranslator() {
  // Dynamic import of google-translate-api-x (ESM module)
  const { translate } = await import('google-translate-api-x');
  return translate;
}

async function translateText(text, targetLang) {
  if (!text || text.trim().length === 0) return null;

  // Skip unsupported languages
  if (UNSUPPORTED_LANGS.has(targetLang)) return null;

  const googleLang = GOOGLE_LANG_MAP[targetLang] || targetLang;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await translateFn(text, { to: googleLang });
      if (result && result.text) {
        consecutiveErrors = 0;
        return result.text;
      }
      return null;
    } catch (err) {
      const errMsg = err.message || '';
      if (errMsg.includes('429') || errMsg.includes('Too Many') || errMsg.includes('ECONNRESET')) {
        const wait = (attempt + 1) * 5;
        console.log(`    ⚠️  Rate limited for ${targetLang}, waiting ${wait}s (attempt ${attempt + 1}/3)...`);
        await sleep(wait * 1000);
        continue;
      }
      if (errMsg.includes('not supported') || errMsg.includes('is not supported')) {
        console.log(`    ⚠️  Language ${targetLang} (${googleLang}) not supported, skipping`);
        UNSUPPORTED_LANGS.add(targetLang); // Remember for future calls
        return null;
      }
      console.error(`    ❌ Translate error for ${targetLang} (attempt ${attempt + 1}): ${errMsg}`);
      await sleep(2000);
    }
  }
  consecutiveErrors++;
  return null;
}

async function translateBatch(texts, targetLang) {
  if (!texts || texts.length === 0) return [];
  if (UNSUPPORTED_LANGS.has(targetLang)) {
    return texts.map(() => null);
  }

  const googleLang = GOOGLE_LANG_MAP[targetLang] || targetLang;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // google-translate-api-x supports batch via array
      const results = await translateFn(texts, { to: googleLang });
      if (Array.isArray(results)) {
        consecutiveErrors = 0;
        return results.map(r => r?.text || null);
      }
      // Single text returns single result
      if (results && results.text) {
        consecutiveErrors = 0;
        return [results.text];
      }
      return texts.map(() => null);
    } catch (err) {
      const errMsg = err.message || '';
      if (errMsg.includes('429') || errMsg.includes('Too Many') || errMsg.includes('ECONNRESET')) {
        const wait = (attempt + 1) * 5;
        console.log(`    ⚠️  Rate limited for ${targetLang}, waiting ${wait}s (attempt ${attempt + 1}/3)...`);
        await sleep(wait * 1000);
        continue;
      }
      if (errMsg.includes('not supported') || errMsg.includes('is not supported')) {
        console.log(`    ⚠️  Language ${targetLang} (${googleLang}) not supported, skipping`);
        UNSUPPORTED_LANGS.add(targetLang);
        return texts.map(() => null);
      }
      console.error(`    ❌ Batch translate error for ${targetLang} (attempt ${attempt + 1}): ${errMsg}`);
      await sleep(2000);
    }
  }
  consecutiveErrors++;
  return texts.map(() => null);
}

// ─── Supabase helpers ───────────────────────────────────────────────
async function supabaseGet(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`Supabase GET ${table} failed: ${res.status}`);
  return res.json();
}

async function supabasePatch(table, id, updates) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase PATCH ${table}/${id} failed: ${res.status} - ${text}`);
  }
}

// ─── Translation logic ─────────────────────────────────────────────
async function translateItemBatched(item, fields) {
  const updates = {};
  let translatedCount = 0;
  let langFailures = 0;

  for (const lang of LANGUAGES) {
    // Collect fields that need translation for this language
    const toTranslate = [];
    const fieldNames = [];

    for (const field of fields) {
      const colName = `${field}_${lang}`;
      if (item[colName] && item[colName].trim().length > 0) continue;
      if (!item[field] || item[field].trim().length === 0) continue;
      toTranslate.push(item[field]);
      fieldNames.push(field);
    }

    if (toTranslate.length === 0) continue;

    // Translate one field at a time to avoid overloading the free API
    for (let i = 0; i < toTranslate.length; i++) {
      const result = await translateText(toTranslate[i], lang);
      if (result) {
        updates[`${fieldNames[i]}_${lang}`] = result;
        translatedCount++;
        langFailures = 0;
      }
      // Delay between individual translations — be gentle with free API
      await sleep(150);
    }

    if (toTranslate.length > 0 && !Object.keys(updates).some(k => k.endsWith(`_${lang}`))) {
      langFailures++;
      if (langFailures >= 3) {
        console.log(`    🛑 3+ consecutive language failures, stopping this item`);
        break;
      }
    }

    // Delay between languages
    await sleep(200);
  }

  return { updates, translatedCount };
}

// ─── Main ──────────────────────────────────────────────────────────
async function translateTable(table, fields) {
  console.log(`\n📋 Translating ${table} (fields: ${fields.join(', ')})`);

  // Find items that need translation using multiple proxy columns
  const proxyLangs = ['fr', 'ar', 'sw', 'ha', 'yo', 'wo', 'bm'];
  let allItems = [];
  const seenIds = new Set();

  for (const proxyLang of proxyLangs) {
    try {
      const query = `select=*&title_${proxyLang}=is.null&order=id.desc&limit=${MAX_ITEMS}`;
      const items = await supabaseGet(table, query);
      if (items && items.length > 0) {
        for (const item of items) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            allItems.push(item);
          }
        }
      }
    } catch (err) {
      console.log(`  Note: Could not query ${table}.title_${proxyLang}: ${err.message}`);
    }
    if (allItems.length >= MAX_ITEMS) break;
  }

  // Also check empty strings on title_fr
  try {
    const query2 = `select=*&title_fr=eq.&order=id.desc&limit=${MAX_ITEMS}`;
    const items2 = await supabaseGet(table, query2);
    if (items2 && items2.length > 0) {
      for (const item of items2) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
        }
      }
    }
  } catch (err) { /* ignore */ }

  allItems = allItems.slice(0, MAX_ITEMS);
  console.log(`  Found ${allItems.length} items needing translation`);
  if (allItems.length === 0) return 0;

  let totalTranslated = 0;
  let consecutiveZero = 0;

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    console.log(`  [${i + 1}/${allItems.length}] Translating ${table} ID ${item.id}: "${(item.title || '').substring(0, 50)}..."`);

    try {
      const { updates, translatedCount } = await translateItemBatched(item, fields);

      if (Object.keys(updates).length > 0) {
        await supabasePatch(table, item.id, updates);
        totalTranslated += translatedCount;
        consecutiveZero = 0;
        console.log(`    ✅ ${translatedCount} translations saved`);
      } else {
        consecutiveZero++;
        console.log(`    ⏭️  No new translations [${consecutiveZero}/3]`);
        if (consecutiveZero >= 3) {
          console.log(`\n  🛑 3 consecutive items with 0 translations. Stopping.`);
          break;
        }
      }
    } catch (err) {
      console.error(`    ❌ Error: ${err.message}`);
    }

    // Check global error threshold
    if (consecutiveErrors >= ERROR_THRESHOLD) {
      console.log(`\n  🛑 Too many consecutive errors (${consecutiveErrors}). API may be blocked. Stopping.`);
      break;
    }

    // Delay between items — 500ms for faster throughput
    await sleep(500);
  }

  return totalTranslated;
}

async function main() {
  console.log('🌍 PENDO Auto-Translation Script v4 (FREE — no API key!)');
  console.log(`  Languages: ${LANGUAGES.length} (${LANGUAGES.join(', ')})`);
  console.log(`  Unsupported: ${[...UNSUPPORTED_LANGS].join(', ')}`);
  console.log(`  Max items per table: ${MAX_ITEMS}`);
  console.log(`  Translation engine: google-translate-api-x (FREE)`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing required environment variables:');
    if (!SUPABASE_URL) console.error('  - SUPABASE_URL');
    if (!SUPABASE_KEY) console.error('  - SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  // Load the free translator
  console.log('  Loading translator...');
  translateFn = await loadTranslator();
  console.log('  ✅ Translator loaded\n');

  const startTime = Date.now();

  const oppsCount = await translateTable('investment_opportunities', ['title', 'summary', 'description']);
  const newsCount = await translateTable('news', ['title', 'summary']);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Translation complete in ${elapsed}s`);
  console.log(`   Opportunities: ${oppsCount} translations`);
  console.log(`   News: ${newsCount} translations`);
  console.log(`   Total: ${oppsCount + newsCount} translations`);
  console.log(`   💰 Cost: $0.00 (FREE!)`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
