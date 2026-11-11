import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Seul le français est chargé au démarrage (langue par défaut)
// Les autres langues sont chargées à la demande (lazy loading)
import translationFR from './locales/fr/translation.json';
import logger from './utils/logger';

// Map des imports dynamiques pour chaque langue
const languageLoaders = {
  en: () => import('./locales/en/translation.json'),
  es: () => import('./locales/es/translation.json'),
  ar: () => import('./locales/ar/translation.json'),
  de: () => import('./locales/de/translation.json'),
  pt: () => import('./locales/pt/translation.json'),
  wo: () => import('./locales/wo/translation.json'),
  bm: () => import('./locales/bm/translation.json'),
  yo: () => import('./locales/yo/translation.json'),
  ig: () => import('./locales/ig/translation.json'),
  ha: () => import('./locales/ha/translation.json'),
  ff: () => import('./locales/ff/translation.json'),
  fon: () => import('./locales/fon/translation.json'),
  tw: () => import('./locales/tw/translation.json'),
  ee: () => import('./locales/ee/translation.json'),
  ln: () => import('./locales/ln/translation.json'),
  kg: () => import('./locales/kg/translation.json'),
  sg: () => import('./locales/sg/translation.json'),
  sw: () => import('./locales/sw/translation.json'),
  am: () => import('./locales/am/translation.json'),
  af: () => import('./locales/af/translation.json'),
  zu: () => import('./locales/zu/translation.json'),
  xh: () => import('./locales/xh/translation.json'),
  sn: () => import('./locales/sn/translation.json'),
  st: () => import('./locales/st/translation.json'),
  tn: () => import('./locales/tn/translation.json'),
  ts: () => import('./locales/ts/translation.json'),
  nd: () => import('./locales/nd/translation.json'),
  ss: () => import('./locales/ss/translation.json'),
};

// Language names for the selector
export const languages = {
  // International languages
  fr: { name: 'Français', nativeName: 'Français', flag: '🇫🇷', region: 'international' },
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧', region: 'international' },
  es: { name: 'Español', nativeName: 'Español', flag: '🇪🇸', region: 'international' },
  ar: { name: 'العربية', nativeName: 'العربية', flag: '🇸🇦', rtl: true, region: 'international' },
  de: { name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪', region: 'international' },
  pt: { name: 'Português', nativeName: 'Português', flag: '🇵🇹', region: 'international' },

  // West African languages
  wo: { name: 'Wolof', nativeName: 'Wolof', flag: '🇸🇳', region: 'west' },
  bm: { name: 'Bambara', nativeName: 'Bamanankan', flag: '🇲🇱', region: 'west' },
  yo: { name: 'Yoruba', nativeName: 'Yorùbá', flag: '🇳🇬', region: 'west' },
  ig: { name: 'Igbo', nativeName: 'Igbo', flag: '🇳🇬', region: 'west' },
  ha: { name: 'Hausa', nativeName: 'Hausa', flag: '🇳🇬', region: 'west' },
  ff: { name: 'Fulani', nativeName: 'Fulfulde', flag: '🇸🇳', region: 'west' },
  fon: { name: 'Fon', nativeName: 'Fongbe', flag: '🇧🇯', region: 'west' },
  tw: { name: 'Twi', nativeName: 'Twi', flag: '🇬🇭', region: 'west' },
  ee: { name: 'Ewe', nativeName: 'Eʋegbe', flag: '🇬🇭', region: 'west' },

  // Central African languages
  ln: { name: 'Lingala', nativeName: 'Lingála', flag: '🇨🇩', region: 'central' },
  kg: { name: 'Kikongo', nativeName: 'Kikongo', flag: '🇨🇩', region: 'central' },
  sg: { name: 'Sango', nativeName: 'Sängö', flag: '🇨🇫', region: 'central' },

  // East African languages
  sw: { name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', region: 'east' },
  am: { name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', region: 'east' },

  // Southern African languages
  af: { name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦', region: 'south' },
  zu: { name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦', region: 'south' },
  xh: { name: 'Xhosa', nativeName: 'isiXhosa', flag: '🇿🇦', region: 'south' },
  sn: { name: 'Shona', nativeName: 'chiShona', flag: '🇿🇼', region: 'south' },
  st: { name: 'Sesotho', nativeName: 'Sesotho', flag: '🇱🇸', region: 'south' },
  tn: { name: 'Tswana', nativeName: 'Setswana', flag: '🇧🇼', region: 'south' },
  ts: { name: 'Tsonga', nativeName: 'Xitsonga', flag: '🇿🇦', region: 'south' },
  nd: { name: 'Ndebele', nativeName: 'isiNdebele', flag: '🇿🇦', region: 'south' },
  ss: { name: 'Swati', nativeName: 'siSwati', flag: '🇸🇿', region: 'south' },
};

// Charge dynamiquement une langue quand l'utilisateur la sélectionne
async function loadLanguage(lng) {
  if (lng === 'fr') return; // Déjà chargé
  if (i18n.hasResourceBundle(lng, 'translation')) return; // Déjà en cache

  const loader = languageLoaders[lng];
  if (!loader) return;

  try {
    const module = await loader();
    const translations = module.default || module;
    i18n.addResourceBundle(lng, 'translation', translations, true, true);
  } catch (e) {
    logger.warn(`[i18n] Impossible de charger la langue ${lng}:`, e.message);
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: translationFR },
    },
    fallbackLng: 'fr',
    supportedLngs: Object.keys(languages),

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    lng: localStorage.getItem('i18nextLng') || 'fr',

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

// Charger la langue sauvegardée si ce n'est pas le français
const savedLng = localStorage.getItem('i18nextLng');
if (savedLng && savedLng !== 'fr') {
  loadLanguage(savedLng);
}

// Charger automatiquement quand l'utilisateur change de langue
i18n.on('languageChanged', (lng) => {
  loadLanguage(lng);
  const dir = languages[lng]?.rtl ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

export { loadLanguage };
export default i18n;
