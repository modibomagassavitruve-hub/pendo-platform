#!/usr/bin/env node
/**
 * PENDO Translation Sync Script
 *
 * Synchronise toutes les clés de traduction depuis le fichier FR (référence)
 * vers les 28 autres langues, avec traduction automatique gratuite.
 *
 * Usage:
 *   node scripts/sync-translations.js              # Sync toutes les langues
 *   node scripts/sync-translations.js --dry-run     # Voir les clés manquantes sans modifier
 *   node scripts/sync-translations.js --lang=wo,bm  # Sync seulement certaines langues
 *
 * Utilise l'endpoint GRATUIT gtx de Google Translate (pas d'API key, pas de facturation)
 * ⚠️ IMPORTANT: NE JAMAIS utiliser l'API Google Cloud payante
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ─── Config ─────────────────────────────────────────────────────────
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');
const REFERENCE_LANG = 'fr';

// Toutes les langues cibles
const ALL_LANGS = [
  'en', 'es', 'pt', 'de', 'ar',
  'wo', 'bm', 'yo', 'ig', 'ha', 'ff', 'fon', 'tw', 'ee',
  'ln', 'kg', 'sg',
  'sw', 'am',
  'af', 'zu', 'xh', 'sn', 'st', 'tn', 'ts', 'ss', 'nd'
];

// Map des codes i18n vers codes Google Translate
const GOOGLE_LANG_MAP = {
  'wo': 'wo',    // Wolof — not well supported but try
  'bm': 'bm',    // Bambara
  'yo': 'yo',    // Yoruba
  'ig': 'ig',    // Igbo
  'ha': 'ha',    // Hausa
  'ff': 'fr',    // Fulfulde — fallback to French
  'fon': 'fr',   // Fon — fallback to French
  'tw': 'ak',    // Twi → Akan
  'ee': 'ee',    // Ewe
  'ln': 'ln',    // Lingala
  'kg': 'fr',    // Kikongo — fallback
  'sg': 'fr',    // Sango — fallback
  'sw': 'sw',    // Swahili
  'am': 'am',    // Amharic
  'af': 'af',    // Afrikaans
  'zu': 'zu',    // Zulu
  'xh': 'xh',    // Xhosa
  'sn': 'sn',    // Shona
  'st': 'st',    // Sesotho
  'tn': 'tn',    // Tswana
  'ts': 'ts',    // Tsonga
  'ss': 'fr',    // Swati — fallback
  'nd': 'fr',    // Ndebele — fallback
};

// ─── Args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const langArg = args.find(a => a.startsWith('--lang='));
const TARGET_LANGS = langArg
  ? langArg.replace('--lang=', '').split(',').filter(l => ALL_LANGS.includes(l))
  : ALL_LANGS;

// ─── Translation via FREE gtx endpoint ──────────────────────────────
function translateText(text, targetLang, sourceLang = 'fr') {
  return new Promise((resolve) => {
    if (!text || text.trim().length === 0) return resolve(text);

    const googleLang = GOOGLE_LANG_MAP[targetLang] || targetLang;

    // If fallback is same as source, return original
    if (googleLang === sourceLang && GOOGLE_LANG_MAP[targetLang] === sourceLang) {
      return resolve(text);
    }

    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${googleLang}&dt=t&q=${encodedText}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed[0]) {
            const translated = parsed[0].map(s => s[0]).join('');
            resolve(translated || text);
          } else {
            resolve(text);
          }
        } catch (e) {
          console.error(`    ⚠️  Parse error for ${targetLang}: ${e.message}`);
          resolve(text);
        }
      });
    }).on('error', (e) => {
      console.error(`    ⚠️  Network error for ${targetLang}: ${e.message}`);
      resolve(text);
    });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Key utilities ──────────────────────────────────────────────────
function getAllLeafKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllLeafKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getNestedValue(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function setNestedValue(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log('🌍 PENDO Translation Sync');
  console.log(`   Reference: ${REFERENCE_LANG}`);
  console.log(`   Targets: ${TARGET_LANGS.length} languages`);
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  WRITE'}`);
  console.log('');

  // Load reference file
  const refPath = path.join(LOCALES_DIR, REFERENCE_LANG, 'translation.json');
  const refData = JSON.parse(fs.readFileSync(refPath, 'utf-8'));
  const refKeys = getAllLeafKeys(refData);
  console.log(`📋 Reference (${REFERENCE_LANG}): ${refKeys.length} keys\n`);

  let totalMissing = 0;
  let totalTranslated = 0;
  let totalErrors = 0;

  for (const lang of TARGET_LANGS) {
    const langPath = path.join(LOCALES_DIR, lang, 'translation.json');

    if (!fs.existsSync(langPath)) {
      console.log(`⚠️  ${lang}: file not found, skipping`);
      continue;
    }

    const langData = JSON.parse(fs.readFileSync(langPath, 'utf-8'));
    const langKeys = getAllLeafKeys(langData);

    // Find missing keys
    const missingKeys = refKeys.filter(k => getNestedValue(langData, k) === undefined);

    // Find empty values
    const emptyKeys = refKeys.filter(k => {
      const v = getNestedValue(langData, k);
      return v !== undefined && (v === '' || v === null);
    });

    const allToFix = [...new Set([...missingKeys, ...emptyKeys])];

    if (allToFix.length === 0) {
      console.log(`✅ ${lang}: all ${langKeys.length} keys present`);
      continue;
    }

    console.log(`🔧 ${lang}: ${allToFix.length} keys to fix (${missingKeys.length} missing, ${emptyKeys.length} empty)`);
    totalMissing += allToFix.length;

    if (DRY_RUN) {
      allToFix.forEach(k => console.log(`   - ${k}: "${getNestedValue(refData, k)}"`));
      continue;
    }

    // Translate and add missing keys
    for (const key of allToFix) {
      const frValue = getNestedValue(refData, key);

      if (typeof frValue !== 'string') {
        // Non-string value (object, array), copy as-is
        setNestedValue(langData, key, frValue);
        totalTranslated++;
        continue;
      }

      try {
        // For English, use special handling
        const sourceLang = lang === 'en' ? 'fr' : 'fr';
        const translated = await translateText(frValue, lang, sourceLang);
        setNestedValue(langData, key, translated);
        totalTranslated++;
        console.log(`   ✅ ${key}: "${frValue}" → "${translated}"`);
      } catch (e) {
        console.error(`   ❌ ${key}: ${e.message}`);
        // Fallback: use French value
        setNestedValue(langData, key, frValue);
        totalErrors++;
      }

      // Rate limit: 200ms between requests
      await sleep(200);
    }

    // Write updated file (preserve formatting)
    fs.writeFileSync(langPath, JSON.stringify(langData, null, 2) + '\n', 'utf-8');
    console.log(`   💾 Saved ${lang}/translation.json\n`);
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   Keys checked: ${refKeys.length} × ${TARGET_LANGS.length} = ${refKeys.length * TARGET_LANGS.length}`);
  console.log(`   Missing found: ${totalMissing}`);
  console.log(`   Translated: ${totalTranslated}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   💰 Cost: $0.00 (FREE gtx endpoint)`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
