/**
 * Fusionne les données de décembre avec les données actuelles
 */
const Database = require('better-sqlite3');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 Fusion des données de décembre avec les données actuelles\n');

// Décompresser la sauvegarde de décembre
console.log('📦 Décompression de la sauvegarde...');
execSync('gunzip -c backups/pendo-backup-2025-12-29T21-04-40-320Z.db.gz > /tmp/pendo-dec29.db');

const dbCurrent = new Database(path.join(__dirname, '..', 'data', 'pendo.db'));
const dbDec = new Database('/tmp/pendo-dec29.db');

console.log('\n📊 État actuel:');
const currentOpp = dbCurrent.prepare('SELECT COUNT(*) as c FROM investment_opportunities').get().c;
const currentNews = dbCurrent.prepare('SELECT COUNT(*) as c FROM news').get().c;
console.log(`   Opportunités: ${currentOpp}`);
console.log(`   Actualités: ${currentNews}`);

console.log('\n📅 Données de décembre:');
const decOpp = dbDec.prepare('SELECT COUNT(*) as c FROM investment_opportunities').get().c;
const decNews = dbDec.prepare('SELECT COUNT(*) as c FROM news').get().c;
console.log(`   Opportunités: ${decOpp}`);
console.log(`   Actualités: ${decNews}`);

// Importer les actualités de décembre qui n'existent pas déjà
console.log('\n🔄 Fusion des actualités de décembre...');

const newsFromDec = dbDec.prepare('SELECT * FROM news').all();
let addedNews = 0;

const insertNews = dbCurrent.prepare(`
    INSERT OR IGNORE INTO news (title, summary, content, url, source, category, country, market_id, image_url, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const news of newsFromDec) {
    try {
        const result = insertNews.run(
            news.title,
            news.summary,
            news.content,
            news.url,
            news.source,
            news.category,
            news.country,
            news.market_id,
            news.image_url,
            news.published_at
        );
        if (result.changes > 0) {
            addedNews++;
        }
    } catch (error) {
        // Ignorer les doublons
    }
}

console.log(`✅ ${addedNews} actualités de décembre ajoutées`);

console.log('\n📊 État final:');
const finalOpp = dbCurrent.prepare('SELECT COUNT(*) as c FROM investment_opportunities').get().c;
const finalNews = dbCurrent.prepare('SELECT COUNT(*) as c FROM news').get().c;
console.log(`   Opportunités: ${finalOpp}`);
console.log(`   Actualités: ${finalNews}`);

dbCurrent.close();
dbDec.close();

console.log('\n✅ Fusion terminée!');
