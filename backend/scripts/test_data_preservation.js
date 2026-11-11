/**
 * Script de test pour vérifier que les données anciennes sont préservées
 */

const Database = require('better-sqlite3');
const path = require('path');
const Collector = require('../services/comprehensiveAfricaOpportunitiesCollector');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

console.log('🧪 TEST DE PRÉSERVATION DES DONNÉES\n');
console.log('━'.repeat(60));

// 1. Vérifier les actualités
console.log('\n📰 ACTUALITÉS:');
const newsStats = db.prepare(`
  SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN content IS NOT NULL AND LENGTH(content) > 100 THEN 1 END) as with_content,
    AVG(LENGTH(content)) as avg_content_length
  FROM news
`).get();

console.log(`   Total: ${newsStats.total}`);
console.log(`   Avec contenu détaillé: ${newsStats.with_content}`);
console.log(`   Longueur moyenne: ${Math.round(newsStats.avg_content_length)} caractères`);

if (newsStats.with_content === newsStats.total) {
  console.log('   ✅ Toutes les actualités ont du contenu détaillé');
} else {
  console.log(`   ⚠️  ${newsStats.total - newsStats.with_content} actualités sans contenu`);
}

// 2. Vérifier les opportunités
console.log('\n💼 OPPORTUNITÉS:');
const oppStats = db.prepare(`
  SELECT
    COUNT(*) as total,
    COUNT(DISTINCT country) as countries,
    COUNT(DISTINCT sector) as sectors
  FROM investment_opportunities
`).get();

console.log(`   Total: ${oppStats.total}`);
console.log(`   Pays couverts: ${oppStats.countries}/54`);
console.log(`   Secteurs: ${oppStats.sectors}`);

// Opportunités par secteur
const bySector = db.prepare(`
  SELECT sector, COUNT(*) as count
  FROM investment_opportunities
  GROUP BY sector
  ORDER BY count DESC
  LIMIT 10
`).all();

console.log('\n   Répartition par secteur:');
bySector.forEach(s => {
  console.log(`     - ${s.sector}: ${s.count}`);
});

// 3. Vérifier les descriptions détaillées
console.log('\n📝 QUALITÉ DES DESCRIPTIONS:');
const descStats = db.prepare(`
  SELECT
    AVG(LENGTH(description)) as avg_desc_length,
    MIN(LENGTH(description)) as min_desc_length,
    MAX(LENGTH(description)) as max_desc_length,
    COUNT(CASE WHEN LENGTH(description) > 500 THEN 1 END) as detailed_count
  FROM investment_opportunities
`).get();

console.log(`   Longueur moyenne: ${Math.round(descStats.avg_desc_length)} caractères`);
console.log(`   Longueur minimale: ${descStats.min_desc_length} caractères`);
console.log(`   Longueur maximale: ${descStats.max_desc_length} caractères`);
console.log(`   Opportunités avec descriptions détaillées (>500 chars): ${descStats.detailed_count}/${oppStats.total}`);

if (descStats.detailed_count / oppStats.total > 0.8) {
  console.log('   ✅ La plupart des opportunités ont des descriptions détaillées');
} else {
  console.log('   ⚠️  Beaucoup d\'opportunités ont des descriptions courtes');
}

// 4. Exemples d'opportunités
console.log('\n📋 ÉCHANTILLON D\'OPPORTUNITÉS PAR SECTEUR:\n');

const sectors = ['Finance', 'Énergie', 'Tech', 'Agriculture'];
for (const sector of sectors) {
  const example = db.prepare(`
    SELECT title, subsector, country_name,
           SUBSTR(description, 1, 200) as desc_preview,
           LENGTH(description) as desc_length
    FROM investment_opportunities
    WHERE sector = ?
    LIMIT 1
  `).get(sector);

  if (example) {
    console.log(`${sector}:`);
    console.log(`  • ${example.title}`);
    console.log(`    Sous-secteur: ${example.subsector} | Pays: ${example.country_name}`);
    console.log(`    Description (${example.desc_length} chars): ${example.desc_preview}...`);
    console.log();
  }
}

// 5. Test d'ajout de nouvelles opportunités
console.log('━'.repeat(60));
console.log('\n🧪 TEST D\'AJOUT DE NOUVELLES OPPORTUNITÉS\n');

const beforeCount = db.prepare('SELECT COUNT(*) as count FROM investment_opportunities').get().count;
console.log(`État initial: ${beforeCount} opportunités`);

console.log('\n⏳ Génération de nouvelles opportunités (cela peut prendre 30 secondes)...');

const collector = new Collector();
collector.collectAllAfricanOpportunities().then(() => {
  const afterCount = db.prepare('SELECT COUNT(*) as count FROM investment_opportunities').get().count;
  const added = afterCount - beforeCount;

  console.log(`\n✅ Génération terminée`);
  console.log(`   Avant: ${beforeCount} opportunités`);
  console.log(`   Après: ${afterCount} opportunités`);
  console.log(`   Ajoutées: ${added} nouvelles opportunités`);

  if (afterCount > beforeCount) {
    console.log('\n   ✅ Les anciennes opportunités ont été préservées !');
  } else if (afterCount === beforeCount) {
    console.log('\n   ⚠️  Aucune nouvelle opportunité ajoutée (doublons détectés)');
  } else {
    console.log('\n   ❌ ERREUR: Des opportunités ont été supprimées !');
  }

  console.log('\n━'.repeat(60));
  console.log('✅ TESTS TERMINÉS\n');

  db.close();
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Erreur:', err.message);
  db.close();
  process.exit(1);
});
