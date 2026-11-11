import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { OPPORTUNITIES_DATA } from '../data/opportunitiesData';
import { API_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import logger from '../utils/logger';
import { translateMissingFields } from '../utils/gtxTranslate';

// Fonction pour convertir snake_case en camelCase
const toCamelCase = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      newObj[camelKey] = toCamelCase(obj[key]);
    }
    return newObj;
  }
  return obj;
};

// Fonction pour fusionner snake_case et camelCase
const mergeKeys = (rawArray) => {
  if (!Array.isArray(rawArray)) return rawArray;
  const camelArray = toCamelCase(rawArray);
  return rawArray.map((item, i) => ({
    ...item,
    ...(camelArray[i] || {})
  }));
};

// Applique les traductions côté client à partir des colonnes title_XX, summary_XX, description_XX
const applyTranslations = (items, lang) => {
  if (!Array.isArray(items) || !lang || lang.length < 2) return items;
  const langCode = lang.substring(0, 2).toLowerCase();
  return items.map(item => {
    const translated = { ...item };
    // Try exact language column, fall back to French, then base
    const camelLang = langCode.charAt(0).toUpperCase() + langCode.slice(1);
    translated.title =
      item[`title_${langCode}`] || item[`title${camelLang}`] ||
      item['title_fr'] || item.title;
    translated.summary =
      item[`summary_${langCode}`] || item[`summary${camelLang}`] ||
      item['summary_fr'] || item.summary;
    translated.description =
      item[`description_${langCode}`] || item[`description${camelLang}`] ||
      item['description_fr'] || item.description;
    return translated;
  });
};

// Colonnes de base nécessaires (sans les 29×3 colonnes de traduction)
const BASE_COLS = [
  'id','title','slug','summary','description','sector','subsector',
  'country','country_name','region','opportunity_type',
  'min_investment','max_investment','expected_return_min','expected_return_max',
  'investment_horizon','risk_level','company_name','company_size','stage',
  'source_url','source_name','image_url','status',
  'published_at','updated_at','tags'
].join(',');

// Colonnes de traduction pour la langue courante
const getLangCols = (lang) => {
  const l = (lang || 'fr').substring(0, 2).toLowerCase();
  if (l === 'en') return ',title_en,summary_en,description_en';
  if (l === 'fr') return ',title_fr,summary_fr,description_fr';
  return `,title_${l},summary_${l},description_${l},title_fr,summary_fr,description_fr`;
};

/**
 * Fetch opportunities from Supabase with only needed columns
 */
const fetchFromSupabase = async (lang = 'fr', limit = 50, offset = 0) => {
  const cols = BASE_COLS + getLangCols(lang);
  const url = `${SUPABASE_URL}/rest/v1/investment_opportunities?select=${cols}&order=id.desc&limit=${limit}&offset=${offset}`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept': 'application/json',
      'Prefer': 'count=exact'
    }
  });
  if (!response.ok) throw new Error(`Supabase fetch failed: ${response.status}`);
  const total = parseInt(response.headers.get('content-range')?.split('/')?.[1] || '0', 10);
  const data = await response.json();
  return { data, total };
};

export const useOpportunities = () => {
  const { i18n } = useTranslation();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const transform = (rawData) => applyTranslations(mergeKeys(rawData), i18n.language);

  /**
   * After the initial display, translate any items that lack the target-language column.
   * Results update the state in the background — user sees French first, then their language.
   */
  const enrichWithOnDemandTranslations = (rawItems, currentOpportunities, setter) => {
    const lc = (i18n.language || 'fr').substring(0, 2).toLowerCase();
    // No early return for French — DB rows may have base fields in English
    translateMissingFields(rawItems, {
      to: lc,
      from: 'auto',
      fields: ['title', 'summary', 'description'],
    }).then(enriched => {
      if (enriched !== rawItems) {
        setter(applyTranslations(mergeKeys(enriched), i18n.language));
      }
    }).catch(() => {}); // silent fail
  };

  const loadOpportunities = async () => {
    const lang = i18n.language;
    try {
      // Phase 1 : Charger les 50 premières rapidement
      let firstBatch = null;
      let totalCount = 0;

      try {
        const result = await fetchFromSupabase(lang, 50, 0);
        if (result.data && result.data.length > 0) {
          firstBatch = result.data;
          totalCount = result.total || result.data.length;
        }
      } catch (supabaseErr) {
        // Supabase unavailable — try backend
      }

      // Fallback: backend API
      if (!firstBatch) {
        try {
          const url = `${API_URL}/opportunities?limit=50&lang=${lang}`;
          const response = await fetch(url);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              const items = Array.isArray(result.data) ? result.data : (result.data.opportunities || []);
              if (items.length > 0) {
                firstBatch = items;
                totalCount = items.length;
              }
            }
          }
        } catch (backendErr) {
          // Backend also unavailable
        }
      }

      if (firstBatch && firstBatch.length > 0) {
        const transformed = transform(firstBatch);
        setOpportunities(transformed);
        setTotal(totalCount);
        setError(null);
        setLoading(false);
        // Translate missing columns in background
        enrichWithOnDemandTranslations(firstBatch, transformed, setOpportunities);

        // Phase 2 : Charger le reste en arrière-plan si >50
        if (totalCount > 50) {
          setLoadingMore(true);
          try {
            const remaining = await fetchFromSupabase(lang, totalCount - 50, 50);
            if (remaining.data && remaining.data.length > 0) {
              const remainingTransformed = transform(remaining.data);
              setOpportunities(prev => [...prev.slice(0, transformed.length), ...remainingTransformed]);
              setTotal(transformed.length + remainingTransformed.length);
              // Translate missing columns for second batch in background
              enrichWithOnDemandTranslations(remaining.data, remainingTransformed,
                enriched => setOpportunities(prev => [...prev.slice(0, transformed.length), ...enriched])
              );
            }
          } catch {
            // Pas grave — on garde les 50 premiers
          } finally {
            setLoadingMore(false);
          }
        }
        return;
      }

      loadFallbackData();
    } catch (err) {
      logger.error('Error loading opportunities:', err);
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackData = () => {
    setOpportunities(OPPORTUNITIES_DATA || []);
    setTotal((OPPORTUNITIES_DATA || []).length);
    setError('Utilisation des données de démonstration');
  };

  // Recharger quand la langue change
  useEffect(() => {
    setLoading(true);
    loadOpportunities();
  }, [i18n.language]);

  return {
    opportunities,
    loading,
    loadingMore,
    error,
    total,
    refreshOpportunities: loadOpportunities
  };
};
