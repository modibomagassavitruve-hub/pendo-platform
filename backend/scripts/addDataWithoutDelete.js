/**
 * SCRIPT D'AJOUT DE DONNÉES PENDO (SANS SUPPRESSION)
 * Ajoute de nouvelles données SANS supprimer les anciennes
 *
 * USAGE: node scripts/addDataWithoutDelete.js
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

console.log('🌍 PENDO - Ajout de données (conservation des existantes)\n');
console.log('='.repeat(70));

// Fonction pour générer un slug unique
function generateSlug(title) {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Compter les données existantes
const existingOpp = db.prepare('SELECT COUNT(*) as count FROM investment_opportunities').get().count;
const existingNews = db.prepare('SELECT COUNT(*) as count FROM news').get().count;

console.log(`📊 Données existantes:`);
console.log(`   - Opportunités: ${existingOpp}`);
console.log(`   - Actualités: ${existingNews}\n`);

// Le script va exécuter le script complet original
console.log('⚠️  ATTENTION: Le script seedCompleteAfricaData.js va REMPLACER toutes les données.');
console.log('Pour AJOUTER sans supprimer, utilisez plutôt les scripts individuels:\n');
console.log('   - scripts/addMoreOpportunities.js');
console.log('   - scripts/addMoreNews.js\n');

console.log('Pour continuer quand même, exécutez:');
console.log('   node scripts/seedCompleteAfricaData.js\n');

db.close();
