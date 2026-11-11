const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

console.log('🌍 Peuplement des traductions multilingues\n');
console.log(`📁 Base de données: ${dbPath}\n`);

// Traductions manuelles des termes clés pour les opportunités
const translationsDict = {
  // Termes d'énergie
  'Parc Éolien': { en: 'Wind Farm', es: 'Parque Eólico', pt: 'Parque Eólico', ar: 'مزرعة رياح' },
  'Production Hydrogène Vert': { en: 'Green Hydrogen Production', es: 'Producción de Hidrógeno Verde', pt: 'Produção de Hidrogênio Verde', ar: 'إنتاج الهيدروجين الأخضر' },
  'Centrale Solaire': { en: 'Solar Power Plant', es: 'Central Solar', pt: 'Usina Solar', ar: 'محطة طاقة شمسية' },
  'Parc Solaire': { en: 'Solar Park', es: 'Parque Solar', pt: 'Parque Solar', ar: 'حديقة شمسية' },

  // Localisations
  'Tanger': { en: 'Tangier', es: 'Tánger', pt: 'Tânger', ar: 'طنجة' },
  'Égypte': { en: 'Egypt', es: 'Egipto', pt: 'Egito', ar: 'مصر' },
  'Maroc': { en: 'Morocco', es: 'Marruecos', pt: 'Marrocos', ar: 'المغرب' },
  'Afrique': { en: 'Africa', es: 'África', pt: 'África', ar: 'أفريقيا' },

  // Termes financiers
  'bourse': { en: 'stock exchange', es: 'bolsa', pt: 'bolsa', ar: 'بورصة' },
  'BRVM': { en: 'BRVM', es: 'BRVM', pt: 'BRVM', ar: 'بورصة غرب أفريقيا' },
  'Johannesburg': { en: 'Johannesburg', es: 'Johannesburgo', pt: 'Joanesburgo', ar: 'جوهانسبرغ' },
  'trading': { en: 'trading', es: 'comercio', pt: 'negociação', ar: 'تداول' },
  'cryptos': { en: 'cryptocurrencies', es: 'criptomonedas', pt: 'criptomoedas', ar: 'العملات المشفرة' }
};

// Fonction simple de traduction basée sur le dictionnaire
function translateText(text, lang) {
  if (!text) return text;

  let translated = text;

  // Appliquer les traductions du dictionnaire
  for (const [fr, translations] of Object.entries(translationsDict)) {
    if (translations[lang]) {
      const regex = new RegExp(fr, 'gi');
      translated = translated.replace(regex, translations[lang]);
    }
  }

  return translated;
}

// Fonction de traduction automatique basique pour les phrases courantes
function autoTranslate(text, lang) {
  if (!text) return text;

  // Pour l'instant, utilisons notre dictionnaire
  // Dans une version production, on utiliserait une API de traduction
  const translated = translateText(text, lang);

  // Si le texte est identique (pas de traduction trouvée), on retourne null
  // pour indiquer qu'une traduction manuelle est nécessaire
  return translated === text ? null : translated;
}

try {
  // Récupérer toutes les opportunités
  const opportunities = db.prepare('SELECT id, title, description, summary FROM investment_opportunities').all();

  console.log(`📊 Traduction de ${opportunities.length} opportunités d'investissement...\n`);

  let oppUpdated = 0;
  let oppPartial = 0;

  const updateOppStmt = db.prepare(`
    UPDATE investment_opportunities
    SET title_en = ?, title_es = ?, title_pt = ?, title_ar = ?,
        description_en = ?, description_es = ?, description_pt = ?, description_ar = ?,
        summary_en = ?, summary_es = ?, summary_pt = ?, summary_ar = ?
    WHERE id = ?
  `);

  for (const opp of opportunities) {
    const titleEn = autoTranslate(opp.title, 'en') || opp.title;
    const titleEs = autoTranslate(opp.title, 'es') || opp.title;
    const titlePt = autoTranslate(opp.title, 'pt') || opp.title;
    const titleAr = autoTranslate(opp.title, 'ar') || opp.title;

    const descEn = autoTranslate(opp.description, 'en') || opp.description;
    const descEs = autoTranslate(opp.description, 'es') || opp.description;
    const descPt = autoTranslate(opp.description, 'pt') || opp.description;
    const descAr = autoTranslate(opp.description, 'ar') || opp.description;

    const summEn = autoTranslate(opp.summary, 'en') || opp.summary;
    const summEs = autoTranslate(opp.summary, 'es') || opp.summary;
    const summPt = autoTranslate(opp.summary, 'pt') || opp.summary;
    const summAr = autoTranslate(opp.summary, 'ar') || opp.summary;

    updateOppStmt.run(
      titleEn, titleEs, titlePt, titleAr,
      descEn, descEs, descPt, descAr,
      summEn, summEs, summPt, summAr,
      opp.id
    );

    // Vérifier si au moins une traduction a été appliquée
    const hasTranslation = titleEn !== opp.title || descEn !== opp.description;

    if (hasTranslation) {
      oppUpdated++;
    } else {
      oppPartial++;
    }
  }

  console.log(`  ✅ ${oppUpdated} opportunités avec traductions appliquées`);
  console.log(`  ⚠️  ${oppPartial} opportunités avec traductions partielles (copie du français)\n`);

  // Récupérer toutes les actualités
  const news = db.prepare('SELECT id, title, summary, content FROM news').all();

  console.log(`📰 Traduction de ${news.length} actualités...\n`);

  let newsUpdated = 0;
  let newsPartial = 0;

  const updateNewsStmt = db.prepare(`
    UPDATE news
    SET title_en = ?, title_es = ?, title_pt = ?, title_ar = ?,
        summary_en = ?, summary_es = ?, summary_pt = ?, summary_ar = ?,
        content_en = ?, content_es = ?, content_pt = ?, content_ar = ?
    WHERE id = ?
  `);

  for (const item of news) {
    const titleEn = autoTranslate(item.title, 'en') || item.title;
    const titleEs = autoTranslate(item.title, 'es') || item.title;
    const titlePt = autoTranslate(item.title, 'pt') || item.title;
    const titleAr = autoTranslate(item.title, 'ar') || item.title;

    const summEn = autoTranslate(item.summary, 'en') || item.summary;
    const summEs = autoTranslate(item.summary, 'es') || item.summary;
    const summPt = autoTranslate(item.summary, 'pt') || item.summary;
    const summAr = autoTranslate(item.summary, 'ar') || item.summary;

    const contEn = autoTranslate(item.content, 'en') || item.content;
    const contEs = autoTranslate(item.content, 'es') || item.content;
    const contPt = autoTranslate(item.content, 'pt') || item.content;
    const contAr = autoTranslate(item.content, 'ar') || item.content;

    updateNewsStmt.run(
      titleEn, titleEs, titlePt, titleAr,
      summEn, summEs, summPt, summAr,
      contEn, contEs, contPt, contAr,
      item.id
    );

    const hasTranslation = titleEn !== item.title || summEn !== item.summary;

    if (hasTranslation) {
      newsUpdated++;
    } else {
      newsPartial++;
    }
  }

  console.log(`  ✅ ${newsUpdated} actualités avec traductions appliquées`);
  console.log(`  ⚠️  ${newsPartial} actualités avec traductions partielles (copie du français)\n`);

  console.log('✅ Peuplement terminé avec succès!\n');
  console.log('💡 Notes:');
  console.log('   - Les traductions sont basées sur un dictionnaire de termes clés');
  console.log('   - Les champs non traduits contiennent le texte français original');
  console.log('   - Pour une traduction complète, utilisez une API de traduction (DeepL, Google Translate)');
  console.log('   - Les colonnes _fr restent comme référence et valeur par défaut\n');

} catch (error) {
  console.error('❌ Erreur lors du peuplement:', error);
  process.exit(1);
} finally {
  db.close();
}
