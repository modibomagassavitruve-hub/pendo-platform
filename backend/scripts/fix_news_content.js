/**
 * Script pour régénérer le contenu manquant des actualités
 */

const Database = require('better-sqlite3');
const path = require('path');
const { generateArticleContent } = require('../services/newsService');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

console.log('🔧 CORRECTION DU CONTENU DES ACTUALITÉS\n');
console.log('━'.repeat(60));

// Récupérer toutes les actualités sans contenu ou avec un contenu vide
const newsWithoutContent = db.prepare(`
  SELECT id, title, summary, content, url, source, market_id, country
  FROM news
  WHERE content IS NULL OR LENGTH(content) < 100
`).all();

console.log(`\n📰 Actualités trouvées sans contenu détaillé: ${newsWithoutContent.length}\n`);

if (newsWithoutContent.length === 0) {
  console.log('✅ Toutes les actualités ont déjà du contenu !');
  db.close();
  process.exit(0);
}

// Mise à jour du contenu
const updateStmt = db.prepare(`
  UPDATE news
  SET content = ?, summary = ?
  WHERE id = ?
`);

let updated = 0;
let errors = 0;

for (const article of newsWithoutContent) {
  try {
    // Générer le contenu détaillé
    const content = generateArticleContent(article);

    // Générer un résumé si manquant
    let summary = article.summary;
    if (!summary || summary.length < 50) {
      // Extraire les 2 premières phrases du contenu comme résumé
      const sentences = content.split(/[.!?]\s+/).filter(s => s.length > 20);
      summary = sentences.slice(0, 2).join('. ') + '.';
    }

    // Mettre à jour
    updateStmt.run(content, summary, article.id);
    updated++;

    if (updated % 50 === 0) {
      console.log(`   ✓ ${updated}/${newsWithoutContent.length} actualités mises à jour...`);
    }
  } catch (error) {
    console.error(`   ✗ Erreur pour l'actualité #${article.id}:`, error.message);
    errors++;
  }
}

console.log('\n' + '━'.repeat(60));
console.log('✅ CORRECTION TERMINÉE\n');
console.log(`📊 STATISTIQUES:`);
console.log(`   - Actualités traitées: ${newsWithoutContent.length}`);
console.log(`   - Mises à jour réussies: ${updated}`);
console.log(`   - Erreurs: ${errors}`);

// Afficher quelques exemples
console.log('\n📋 ÉCHANTILLON DES ACTUALITÉS CORRIGÉES:\n');
const samples = db.prepare(`
  SELECT id, title,
         SUBSTR(summary, 1, 100) as summary_preview,
         SUBSTR(content, 1, 150) as content_preview
  FROM news
  WHERE id IN (${newsWithoutContent.slice(0, 3).map(n => n.id).join(',')})
`).all();

samples.forEach((item, i) => {
  console.log(`${i+1}. ${item.title}`);
  console.log(`   Résumé: ${item.summary_preview}...`);
  console.log(`   Contenu: ${item.content_preview}...\n`);
});

db.close();
console.log('✅ Base de données fermée\n');
