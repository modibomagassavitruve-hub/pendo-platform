const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

console.log(`📁 Base de données: ${dbPath}`);

console.log('🌍 Migration: Ajout des colonnes multilingues\n');

// Toutes les 29 langues supportées par Pendo
const SUPPORTED_LANGUAGES = [
  // Langues internationales
  'en', // Anglais
  'ar', // Arabe
  'es', // Espagnol
  'pt', // Portugais
  'de', // Allemand
  // Afrique de l'Ouest
  'wo', // Wolof
  'bm', // Bambara
  'yo', // Yoruba
  'ig', // Igbo
  'ha', // Hausa
  'ff', // Fulfulde
  'fon',// Fon
  'tw', // Twi
  'ee', // Ewe
  // Afrique Centrale
  'ln', // Lingala
  'kg', // Kikongo
  'sg', // Sango
  // Afrique de l'Est
  'sw', // Swahili
  'am', // Amharique
  // Afrique Australe
  'af', // Afrikaans
  'zu', // Zulu
  'xh', // Xhosa
  'sn', // Shona
  'st', // Sesotho
  'tn', // Tswana
  'ts', // Tsonga
  'nd', // Ndebele
  'ss', // Swati
];

/**
 * Ajoute une colonne si elle n'existe pas
 */
function addColumnIfNotExists(tableName, columnName, columnType = 'TEXT') {
  try {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
    return true;
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      return false; // Colonne existe déjà
    }
    throw error;
  }
}

try {
  let addedColumns = { opportunities: 0, news: 0 };

  // Ajouter les colonnes pour investment_opportunities
  console.log('📊 Vérification des colonnes multilingues pour investment_opportunities...');

  for (const lang of SUPPORTED_LANGUAGES) {
    if (addColumnIfNotExists('investment_opportunities', `title_${lang}`)) addedColumns.opportunities++;
    if (addColumnIfNotExists('investment_opportunities', `description_${lang}`)) addedColumns.opportunities++;
    if (addColumnIfNotExists('investment_opportunities', `summary_${lang}`)) addedColumns.opportunities++;
  }

  if (addedColumns.opportunities > 0) {
    console.log(`  ✅ ${addedColumns.opportunities} colonnes ajoutées à investment_opportunities`);
  } else {
    console.log('  ℹ️  Toutes les colonnes existent déjà dans investment_opportunities');
  }

  // Ajouter les colonnes pour news
  console.log('📰 Vérification des colonnes multilingues pour news...');

  for (const lang of SUPPORTED_LANGUAGES) {
    if (addColumnIfNotExists('news', `title_${lang}`)) addedColumns.news++;
    if (addColumnIfNotExists('news', `summary_${lang}`)) addedColumns.news++;
    if (addColumnIfNotExists('news', `content_${lang}`)) addedColumns.news++;
  }

  if (addedColumns.news > 0) {
    console.log(`  ✅ ${addedColumns.news} colonnes ajoutées à news`);
  } else {
    console.log('  ℹ️  Toutes les colonnes existent déjà dans news');
  }

  console.log('\n✅ Migration terminée avec succès!');
  console.log(`\n📝 Langues supportées: ${SUPPORTED_LANGUAGES.join(', ')}`);
  console.log('\n💡 Note: Les colonnes originales (title, description, etc.) restent en français');
  console.log('          et servent de valeur par défaut (fallback).');
  console.log('\n🔄 Pour traduire le contenu existant, exécutez:');
  console.log('   node scripts/translateWithGoogle.js');

} catch (error) {
  console.error('❌ Erreur lors de la migration:', error);
  process.exit(1);
} finally {
  db.close();
}
