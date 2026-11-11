#!/usr/bin/env node
/**
 * fix-translations.mjs
 * Audit + correction automatique de toutes les traductions PENDO
 * - Endpoint GTX gratuit (aucun coût API)
 * - Fallback EN pour les langues non supportées par GTX
 * - Préserve les traductions existantes correctes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '../src/locales');

// Codes GTX supportés (vérifiés). Les autres reçoivent le fallback EN.
const GTX_SUPPORTED = new Set([
  'en','es','ar','de','pt','sw','am','af','zu','xh','sn','st','tn',
  'yo','ig','ha','wo','tw','ln','ee','ff'
]);

// Valeurs à ne jamais traduire (proper nouns, abréviations, etc.)
const NO_TRANSLATE_PATTERN = /^(PENDO|API|PDF|XOF|USD|EUR|GBP|MAD|NGN|KES|ZAR|ETB|GHS|ZWG|MWK|N\/A|[A-Z]{2,5}|[\d.,\s%+-]+)$/;

// ── Utilitaires JSON ────────────────────────────────────────────────────────

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = String(v ?? '');
    }
  }
  return out;
}

function setNested(obj, dotKey, value) {
  const parts = dotKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ── Traduction GTX ──────────────────────────────────────────────────────────

async function gtx(text, tl, sl = 'fr') {
  if (!text || NO_TRANSLATE_PATTERN.test(text.trim())) return text;
  const url =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    // data[0] = array of [translated_chunk, original_chunk, ...]
    return data[0]?.map(c => c[0]).join('').trim() || null;
  } catch {
    return null;
  }
}

// Traduit en préservant les variables i18next {{variable}}
async function translateSafe(text, tl, sl = 'fr') {
  // Remplace {{var}} par placeholders
  const vars = [];
  const masked = text.replace(/\{\{[^}]+\}\}/g, m => {
    vars.push(m);
    return `__VAR${vars.length - 1}__`;
  });

  const translated = await gtx(masked, tl, sl);
  if (!translated) return null;

  // Restore placeholders
  return translated.replace(/__VAR(\d+)__/g, (_, i) => vars[parseInt(i)] ?? '');
}

// ── Traitement par langue ───────────────────────────────────────────────────

async function processLanguage(lang, frFlat, enFlat) {
  const file = path.join(LOCALES_DIR, lang, 'translation.json');
  if (!fs.existsSync(file)) return;

  const raw = readJSON(file);
  const flat = flatten(raw);

  const supportsGTX = GTX_SUPPORTED.has(lang);
  let fixed = 0;
  let skipped = 0;

  for (const [key, frVal] of Object.entries(frFlat)) {
    const current = flat[key] ?? '';
    const enVal   = enFlat[key] ?? frVal;

    // Valeur déjà traduite correctement : différente de FR et de EN
    const alreadyTranslated =
      current !== '' &&
      current !== frVal &&
      current !== enVal;

    if (alreadyTranslated) continue;

    // Essayer GTX (depuis EN pour meilleures perfs)
    let result = null;
    if (supportsGTX) {
      result = await translateSafe(enVal, lang, 'en');
      await sleep(120); // politesse envers GTX
    }

    // Fallback : valeur EN si GTX échoue ou langue non supportée
    if (!result || result === enVal || result === frVal) {
      result = enVal !== frVal ? enVal : frVal;
    }

    if (result && result !== current) {
      setNested(raw, key, result);
      fixed++;
    } else {
      skipped++;
    }
  }

  writeJSON(file, raw);
  console.log(`  [${lang}] ✓ ${fixed} corrigées, ${skipped} ignorées`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Point d'entrée ──────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  PENDO — Audit & correction traductions');
  console.log('═══════════════════════════════════════\n');

  const frFlat = flatten(readJSON(path.join(LOCALES_DIR, 'fr/translation.json')));
  const enFlat = flatten(readJSON(path.join(LOCALES_DIR, 'en/translation.json')));

  console.log(`Référence FR : ${Object.keys(frFlat).length} clés\n`);

  const langs = fs.readdirSync(LOCALES_DIR)
    .filter(d =>
      fs.statSync(path.join(LOCALES_DIR, d)).isDirectory() &&
      d !== 'fr'
    )
    .sort();

  console.log(`Langues à traiter : ${langs.join(', ')}\n`);

  for (const lang of langs) {
    process.stdout.write(`Traitement [${lang}]…\n`);
    await processLanguage(lang, frFlat, enFlat);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  Terminé. Toutes les traductions sont à jour.');
  console.log('═══════════════════════════════════════');
}

main().catch(err => {
  console.error('Erreur :', err);
  process.exit(1);
});
