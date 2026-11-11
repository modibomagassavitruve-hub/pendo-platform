/**
 * On-demand translation via GTX free endpoint (translate.googleapis.com)
 * Used only when pre-translated DB columns are missing (new content not yet processed by auto-translate).
 * Results are cached in sessionStorage to avoid duplicate calls.
 *
 * NEVER use the paid Google Cloud Translate API — only this free client=gtx endpoint.
 */

const CACHE_PREFIX = 'pendo_gtx_';
const SEPARATOR = '\n\u200B\n'; // zero-width space separator that GTX preserves

/** Translate a single text string from `from` to `to`.
 *  Pass from='auto' to let GTX detect the source language automatically. */
async function translateOne(text, { from = 'fr', to }) {
  if (!text?.trim()) return text;
  // Skip if source is explicitly the same as target (auto-detect always proceeds)
  if (from !== 'auto' && from === to) return text;

  const sl = from === 'auto' ? 'auto' : from;
  const cacheKey = `${CACHE_PREFIX}${sl}_${to}_${btoa(encodeURIComponent(text.slice(0, 80))).replace(/=/g, '')}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return text;
    const data = await resp.json();
    const result = Array.isArray(data[0])
      ? data[0].map(s => s?.[0] ?? '').join('')
      : text;
    if (result) sessionStorage.setItem(cacheKey, result);
    return result || text;
  } catch {
    return text; // silently fall back to original
  }
}

/**
 * Translate an array of texts in one GTX call (joined by separator).
 * Splits the result back by the same separator.
 * Falls back to individual per-item translation if the batch split fails
 * (common with long summaries/descriptions that GTX merges or truncates).
 */
async function translateBatch(texts, { from = 'fr', to }) {
  if (!texts.length || from === to) return texts;

  // Only batch short texts (titles); translate long texts individually
  const AVG_LEN = texts.reduce((s, t) => s + (t?.length || 0), 0) / texts.length;
  if (texts.length === 1 || AVG_LEN > 200) {
    // Translate individually to avoid GTX merge/split issues with long text
    return Promise.all(texts.map(text => translateOne(text, { from, to })));
  }

  const joined = texts.join(SEPARATOR);
  const translated = await translateOne(joined, { from, to });
  const parts = translated.split(/\n[\u200B\s]*\n/);
  // If split doesn't produce the right number of parts, fall back to individual
  if (parts.length !== texts.length) {
    return Promise.all(texts.map(text => translateOne(text, { from, to })));
  }
  return parts.map((p, i) => p.trim() || texts[i]);
}

/**
 * Detects items missing a translation column for `to` and translates them.
 * Works for both news and opportunities.
 *
 * @param {Array} items  - raw items from Supabase
 * @param {string} to    - target language code (e.g. 'yo', 'sw')
 * @param {string} from  - source language code (default 'auto' = GTX auto-detect)
 * @param {string[]} fields - fields to translate (default ['title', 'summary'])
 * @returns {Promise<Array>} - same array with translated fields filled in
 */
export async function translateMissingFields(items, { to, from = 'auto', fields = ['title', 'summary'] }) {
  if (!items?.length || !to) return items;
  if (from !== 'auto' && from === to) return items;

  // Build a flat list of (itemIndex, field, sourceText) for untranslated fields
  const toTranslate = [];
  items.forEach((item, idx) => {
    fields.forEach(field => {
      // Already has the target column? Skip.
      if (item[`${field}_${to}`]) return;
      // Get best source text: prefer explicit `from` column, fall back to base field
      const source = (from !== 'auto' ? item[`${field}_${from}`] : null) || item[field];
      if (source?.trim()) {
        toTranslate.push({ idx, field, source });
      }
    });
  });

  if (!toTranslate.length) return items;

  // Group by field to batch per-field (keeps sentence context together)
  const byField = {};
  toTranslate.forEach(entry => {
    if (!byField[entry.field]) byField[entry.field] = [];
    byField[entry.field].push(entry);
  });

  const result = items.map(item => ({ ...item }));

  await Promise.all(
    Object.entries(byField).map(async ([field, entries]) => {
      const texts = entries.map(e => e.source);
      let translated;
      try {
        translated = await translateBatch(texts, { from, to });
      } catch {
        translated = texts;
      }
      entries.forEach((entry, i) => {
        if (translated[i] && translated[i] !== texts[i]) {
          result[entry.idx][`${field}_${to}`] = translated[i];
        }
      });
    })
  );

  return result;
}
