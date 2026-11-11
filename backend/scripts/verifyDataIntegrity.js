/**
 * SCRIPT DE VÉRIFICATION DE L'INTÉGRITÉ DES DONNÉES PENDO
 *
 * Ce script vérifie que toutes les données sont correctes et cohérentes
 * Exécuter AVANT chaque déploiement ou après modification de données
 *
 * USAGE: node scripts/verifyDataIntegrity.js
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

console.log('🔍 PENDO - Vérification de l\'intégrité des données\n');
console.log('='.repeat(70));

let errors = [];
let warnings = [];
let checks = 0;

function check(condition, errorMsg, warningMsg = null) {
    checks++;
    if (!condition) {
        if (warningMsg) {
            warnings.push(warningMsg);
            console.log(`⚠️  ${warningMsg}`);
        } else {
            errors.push(errorMsg);
            console.log(`❌ ${errorMsg}`);
        }
        return false;
    }
    return true;
}

// ============================================
// 1. VÉRIFICATIONS DES TABLES
// ============================================

console.log('\n📋 1. VÉRIFICATION DES TABLES\n');

const requiredTables = [
    'stocks', 'stock_prices', 'exchanges', 'sectors',
    'investment_opportunities', 'opportunity_tags', 'opportunity_highlights',
    'news', 'indices'
];

requiredTables.forEach(table => {
    const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
    check(exists, `Table manquante: ${table}`);
});

// ============================================
// 2. VÉRIFICATIONS DES OPPORTUNITÉS
// ============================================

console.log('\n💼 2. VÉRIFICATION DES OPPORTUNITÉS D\'INVESTISSEMENT\n');

const oppStats = {
    total: db.prepare('SELECT COUNT(*) as count FROM investment_opportunities').get().count,
    active: db.prepare('SELECT COUNT(*) as count FROM investment_opportunities WHERE status = ?').get('active').count,
    countries: db.prepare('SELECT COUNT(DISTINCT country) as count FROM investment_opportunities').get().count,
    regions: db.prepare('SELECT COUNT(DISTINCT region) as count FROM investment_opportunities').get().count,
    sectors: db.prepare('SELECT COUNT(DISTINCT sector) as count FROM investment_opportunities').get().count
};

console.log(`Total opportunités : ${oppStats.total}`);
console.log(`Opportunités actives : ${oppStats.active}`);
console.log(`Pays couverts : ${oppStats.countries}`);
console.log(`Régions couvertes : ${oppStats.regions}`);
console.log(`Secteurs couverts : ${oppStats.sectors}`);

// Vérifications de base
check(oppStats.total >= 40, 'Moins de 40 opportunités dans la base', 'Recommandation : au moins 40 opportunités pour couverture complète');
check(oppStats.countries >= 25, `Seulement ${oppStats.countries} pays couverts`, 'Recommandation : couvrir au moins 30 pays africains');
check(oppStats.sectors >= 8, `Seulement ${oppStats.sectors} secteurs`, 'Recommandation : diversifier les secteurs (min 10)');

// Vérifier les régions africaines
const regionsCoverage = db.prepare('SELECT region, COUNT(*) as count FROM investment_opportunities GROUP BY region').all();
const expectedRegions = ['Afrique du Nord', 'Afrique de l\'Ouest', 'Afrique de l\'Est', 'Afrique Centrale', 'Afrique Australe'];

console.log('\nCouverture par région :');
expectedRegions.forEach(region => {
    const found = regionsCoverage.find(r => r.region === region);
    if (found) {
        console.log(`  ✅ ${region.padEnd(25)} : ${found.count} opportunités`);
        check(found.count >= 3, `Région ${region} sous-représentée (${found.count} opportunités)`, null);
    } else {
        console.log(`  ❌ ${region.padEnd(25)} : 0 opportunités`);
        errors.push(`Région manquante : ${region}`);
    }
});

// Vérifier les champs obligatoires
const oppWithMissingFields = db.prepare(`
    SELECT id, title FROM investment_opportunities
    WHERE title IS NULL OR sector IS NULL OR country IS NULL
       OR min_investment IS NULL OR expected_return_min IS NULL
`).all();

check(oppWithMissingFields.length === 0, `${oppWithMissingFields.length} opportunités avec champs manquants`);

// Vérifier la cohérence des montants
const invalidInvestments = db.prepare(`
    SELECT id, title, min_investment, max_investment
    FROM investment_opportunities
    WHERE min_investment > max_investment OR min_investment < 0
`).all();

check(invalidInvestments.length === 0, `${invalidInvestments.length} opportunités avec investissements invalides`);

// Vérifier la cohérence des rendements
const invalidReturns = db.prepare(`
    SELECT id, title, expected_return_min, expected_return_max
    FROM investment_opportunities
    WHERE expected_return_min > expected_return_max OR expected_return_min < 0 OR expected_return_max > 200
`).all();

check(invalidReturns.length === 0, `${invalidReturns.length} opportunités avec rendements invalides`);

// Vérifier les tags
const oppWithoutTags = db.prepare(`
    SELECT o.id, o.title
    FROM investment_opportunities o
    LEFT JOIN opportunity_tags t ON o.id = t.opportunity_id
    GROUP BY o.id
    HAVING COUNT(t.tag) = 0
`).all();

check(oppWithoutTags.length === 0, `${oppWithoutTags.length} opportunités sans tags`, 'Tags recommandés pour meilleure découvrabilité');

// ============================================
// 3. VÉRIFICATIONS DES ACTUALITÉS
// ============================================

console.log('\n📰 3. VÉRIFICATION DES ACTUALITÉS\n');

const newsStats = {
    total: db.prepare('SELECT COUNT(*) as count FROM news').get().count,
    categories: db.prepare('SELECT COUNT(DISTINCT category) as count FROM news').get().count,
    countries: db.prepare('SELECT COUNT(DISTINCT country) as count FROM news').get().count
};

console.log(`Total actualités : ${newsStats.total}`);
console.log(`Catégories : ${newsStats.categories}`);
console.log(`Pays couverts : ${newsStats.countries}`);

check(newsStats.total >= 30, `Seulement ${newsStats.total} actualités`, 'Recommandation : au moins 40 actualités pour contenu riche');
check(newsStats.categories >= 8, `Seulement ${newsStats.categories} catégories`, 'Recommandation : diversifier les catégories');

// Vérifier les champs obligatoires
const newsWithMissingFields = db.prepare(`
    SELECT id, title FROM news
    WHERE title IS NULL OR category IS NULL OR summary IS NULL OR content IS NULL
`).all();

check(newsWithMissingFields.length === 0, `${newsWithMissingFields.length} actualités avec champs manquants`);

// Vérifier la distribution des catégories
const categoriesDistribution = db.prepare('SELECT category, COUNT(*) as count FROM news GROUP BY category ORDER BY count DESC').all();
console.log('\nDistribution par catégorie :');
categoriesDistribution.forEach(cat => {
    console.log(`  - ${cat.category.padEnd(20)} : ${cat.count}`);
});

// Vérifier les dates de publication
const futureNews = db.prepare(`
    SELECT id, title, published_at
    FROM news
    WHERE published_at > datetime('now')
`).all();

check(futureNews.length === 0, `${futureNews.length} actualités avec date future`);

// ============================================
// 4. VÉRIFICATIONS DES ACTIONS BOURSIÈRES
// ============================================

console.log('\n📊 4. VÉRIFICATION DES ACTIONS BOURSIÈRES\n');

const stocksStats = {
    total: db.prepare('SELECT COUNT(*) as count FROM stocks').get().count,
    exchanges: db.prepare('SELECT COUNT(DISTINCT exchange_id) as count FROM stocks').get().count,
    sectors: db.prepare('SELECT COUNT(DISTINCT sector_id) as count FROM stocks').get().count,
    with_prices: db.prepare(`
        SELECT COUNT(DISTINCT s.id) as count
        FROM stocks s
        INNER JOIN stock_prices sp ON s.id = sp.stock_id
    `).get().count
};

console.log(`Total actions : ${stocksStats.total}`);
console.log(`Bourses : ${stocksStats.exchanges}`);
console.log(`Secteurs : ${stocksStats.sectors}`);
console.log(`Actions avec prix : ${stocksStats.with_prices}`);

check(stocksStats.total >= 40, `Seulement ${stocksStats.total} actions`, 'Recommandation : au moins 50 actions pour diversité');

// Vérifier que toutes les actions ont des prix
const stocksWithoutPrices = stocksStats.total - stocksStats.with_prices;
if (stocksWithoutPrices > 0) {
    warnings.push(`${stocksWithoutPrices} actions sans prix (données à collecter)`);
    console.log(`  ⚠️  ${stocksWithoutPrices} actions sans prix`);
}

// Vérifier les prix invalides
const invalidPrices = db.prepare(`
    SELECT sp.stock_id, s.ticker, sp.price
    FROM stock_prices sp
    JOIN stocks s ON sp.stock_id = s.id
    WHERE sp.price <= 0 OR sp.price > 1000000
`).all();

check(invalidPrices.length === 0, `${invalidPrices.length} prix invalides (<=0 ou >1M)`);

// ============================================
// 5. VÉRIFICATIONS DES MARCHÉS/INDICES
// ============================================

console.log('\n🌍 5. VÉRIFICATION DES MARCHÉS/INDICES\n');

const marketsCount = db.prepare('SELECT COUNT(*) as count FROM indices').get().count;
console.log(`Total marchés/indices : ${marketsCount}`);

check(marketsCount >= 10, `Seulement ${marketsCount} marchés`, 'Recommandation : au moins 15 marchés africains');

// ============================================
// 6. VÉRIFICATIONS DE L'API
// ============================================

console.log('\n🔌 6. VÉRIFICATION DES ENDPOINTS API (simulation)\n');

// Simuler les requêtes API en vérifiant que les requêtes SQL fonctionnent
try {
    // Test endpoint /api/opportunities
    const oppQuery = db.prepare(`
        SELECT id, title, sector, country_name, min_investment, expected_return_max
        FROM investment_opportunities
        WHERE status = 'active'
        ORDER BY published_at DESC
        LIMIT 20
    `).all();

    check(oppQuery.length > 0, 'Requête /api/opportunities échoue');
    console.log(`  ✅ GET /api/opportunities retournerait ${oppQuery.length} résultats`);

    // Test endpoint /api/opportunities/stats
    const statsQuery = db.prepare(`
        SELECT sector, COUNT(*) as count
        FROM investment_opportunities
        WHERE status = 'active'
        GROUP BY sector
    `).all();

    check(statsQuery.length > 0, 'Requête /api/opportunities/stats échoue');
    console.log(`  ✅ GET /api/opportunities/stats retournerait ${statsQuery.length} secteurs`);

    // Test endpoint /api/news/latest
    const newsQuery = db.prepare(`
        SELECT id, title, category, summary, published_at
        FROM news
        ORDER BY published_at DESC
        LIMIT 20
    `).all();

    check(newsQuery.length > 0, 'Requête /api/news/latest échoue');
    console.log(`  ✅ GET /api/news/latest retournerait ${newsQuery.length} résultats`);

    // Test endpoint /api/stocks
    const stocksQuery = db.prepare(`
        SELECT s.id, s.ticker, s.name, sp.price, sp.change_percent
        FROM stocks s
        LEFT JOIN stock_prices sp ON s.id = sp.stock_id
        LIMIT 20
    `).all();

    check(stocksQuery.length > 0, 'Requête /api/stocks échoue');
    console.log(`  ✅ GET /api/stocks retournerait ${stocksQuery.length} résultats`);

    // Test endpoint /api/markets
    const marketsQuery = db.prepare(`
        SELECT * FROM indices ORDER BY name LIMIT 20
    `).all();

    check(marketsQuery.length > 0, 'Requête /api/markets échoue');
    console.log(`  ✅ GET /api/markets retournerait ${marketsQuery.length} résultats`);

} catch (error) {
    errors.push(`Erreur de requête SQL : ${error.message}`);
    console.log(`  ❌ Erreur : ${error.message}`);
}

// ============================================
// 7. VÉRIFICATIONS DE PERFORMANCE
// ============================================

console.log('\n⚡ 7. VÉRIFICATION DE PERFORMANCE\n');

// Vérifier la taille de la base de données
const fs = require('fs');
const dbSize = fs.statSync(dbPath).size;
const dbSizeMB = (dbSize / (1024 * 1024)).toFixed(2);

console.log(`Taille de la base : ${dbSizeMB} MB`);
check(dbSize < 500 * 1024 * 1024, 'Base de données trop volumineuse (>500MB)', null);

// Vérifier les index
const indexes = db.prepare(`
    SELECT name, tbl_name FROM sqlite_master
    WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
`).all();

console.log(`Nombre d'index : ${indexes.length}`);
if (indexes.length > 0) {
    console.log('Index présents :');
    indexes.forEach(idx => console.log(`  - ${idx.name} sur ${idx.tbl_name}`));
}

// ============================================
// RÉSUMÉ FINAL
// ============================================

console.log('\n' + '='.repeat(70));
console.log('\n📊 RÉSUMÉ DE LA VÉRIFICATION\n');

console.log(`Total de vérifications effectuées : ${checks}`);
console.log(`Erreurs critiques : ${errors.length}`);
console.log(`Avertissements : ${warnings.length}`);

if (errors.length > 0) {
    console.log('\n❌ ERREURS CRITIQUES À CORRIGER :\n');
    errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
}

if (warnings.length > 0) {
    console.log('\n⚠️  AVERTISSEMENTS (recommandations) :\n');
    warnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
}

console.log('\n' + '='.repeat(70));

if (errors.length === 0) {
    console.log('✅ TOUTES LES VÉRIFICATIONS SONT PASSÉES - BASE DE DONNÉES SAINE');
    console.log('='.repeat(70) + '\n');
    process.exit(0);
} else {
    console.log('❌ DES ERREURS ONT ÉTÉ DÉTECTÉES - CORRECTION NÉCESSAIRE');
    console.log('='.repeat(70) + '\n');
    process.exit(1);
}

db.close();
