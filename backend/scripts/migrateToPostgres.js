/**
 * Script de migration de SQLite vers PostgreSQL
 * À exécuter UNE SEULE FOIS lors du déploiement initial sur Railway
 */

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'pendo.db');

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not set');
  console.error('Please set the DATABASE_URL environment variable');
  process.exit(1);
}

console.log('🔄 Migration SQLite → PostgreSQL\n');
console.log(`📂 SQLite: ${SQLITE_PATH}`);
console.log(`🐘 PostgreSQL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

async function migrate() {
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pg = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('📊 Création des tables PostgreSQL...\n');

    // 1. Table investment_opportunities
    await pg.query(`
      CREATE TABLE IF NOT EXISTS investment_opportunities (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        sector TEXT NOT NULL,
        subsector TEXT,
        country TEXT NOT NULL,
        country_name TEXT NOT NULL,
        region TEXT,
        summary TEXT NOT NULL,
        description TEXT NOT NULL,
        opportunity_type TEXT NOT NULL,
        min_investment DECIMAL,
        max_investment DECIMAL,
        expected_return_min DECIMAL,
        expected_return_max DECIMAL,
        investment_horizon TEXT,
        risk_level TEXT NOT NULL,
        company_name TEXT,
        company_size TEXT,
        stage TEXT,
        market_size_usd DECIMAL,
        source_name TEXT,
        image_url TEXT,
        logo_url TEXT,
        status TEXT DEFAULT 'active',
        deadline TIMESTAMP,
        published_at TIMESTAMP,
        views INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        is_verified BOOLEAN DEFAULT FALSE
      );
    `);
    console.log('✅ Table investment_opportunities créée');

    // 2. Table news
    await pg.query(`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT,
        content TEXT,
        url TEXT,
        source TEXT,
        category TEXT,
        country TEXT,
        market_id TEXT,
        image_url TEXT,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table news créée');

    // 3. Table stocks
    await pg.query(`
      CREATE TABLE IF NOT EXISTS stocks (
        id SERIAL PRIMARY KEY,
        ticker TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT,
        exchange_id TEXT,
        sector_id INTEGER,
        country TEXT,
        country_name TEXT,
        isin TEXT
      );
    `);
    console.log('✅ Table stocks créée');

    // 4. Table stock_prices
    await pg.query(`
      CREATE TABLE IF NOT EXISTS stock_prices (
        id SERIAL PRIMARY KEY,
        stock_id INTEGER REFERENCES stocks(id),
        price DECIMAL,
        change_percent DECIMAL,
        volume BIGINT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table stock_prices créée');

    // 5. Table exchanges
    await pg.query(`
      CREATE TABLE IF NOT EXISTS exchanges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        country TEXT,
        timezone TEXT
      );
    `);
    console.log('✅ Table exchanges créée');

    // 6. Table sectors
    await pg.query(`
      CREATE TABLE IF NOT EXISTS sectors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        name_fr TEXT,
        description TEXT
      );
    `);
    console.log('✅ Table sectors créée');

    // 7. Table indices
    await pg.query(`
      CREATE TABLE IF NOT EXISTS indices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        country TEXT,
        type TEXT
      );
    `);
    console.log('✅ Table indices créée');

    console.log('\n📥 Migration des données...\n');

    // Migrer investment_opportunities
    const opportunities = sqlite.prepare('SELECT * FROM investment_opportunities').all();
    console.log(`   Opportunités à migrer: ${opportunities.length}`);

    for (const opp of opportunities) {
      await pg.query(`
        INSERT INTO investment_opportunities (
          title, slug, sector, subsector, country, country_name, region,
          summary, description, opportunity_type, min_investment, max_investment,
          expected_return_min, expected_return_max, investment_horizon,
          risk_level, company_name, company_size, stage, market_size_usd,
          source_name, image_url, logo_url, status, deadline, published_at,
          views, saves, is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
        ON CONFLICT (slug) DO NOTHING
      `, [
        opp.title, opp.slug, opp.sector, opp.subsector, opp.country, opp.country_name, opp.region,
        opp.summary, opp.description, opp.opportunity_type, opp.min_investment, opp.max_investment,
        opp.expected_return_min, opp.expected_return_max, opp.investment_horizon,
        opp.risk_level, opp.company_name, opp.company_size, opp.stage, opp.market_size_usd,
        opp.source_name, opp.image_url, opp.logo_url, opp.status, opp.deadline, opp.published_at,
        opp.views || 0, opp.saves || 0, opp.is_verified || false
      ]);
    }
    console.log(`   ✅ ${opportunities.length} opportunités migrées`);

    // Migrer news
    const news = sqlite.prepare('SELECT * FROM news').all();
    console.log(`   Actualités à migrer: ${news.length}`);

    for (const item of news) {
      await pg.query(`
        INSERT INTO news (
          title, summary, content, url, source, category, country,
          market_id, image_url, published_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        item.title, item.summary, item.content, item.url, item.source,
        item.category, item.country, item.market_id, item.image_url, item.published_at
      ]);
    }
    console.log(`   ✅ ${news.length} actualités migrées`);

    // Migrer stocks
    const stocks = sqlite.prepare('SELECT * FROM stocks').all();
    console.log(`   Actions à migrer: ${stocks.length}`);

    for (const stock of stocks) {
      await pg.query(`
        INSERT INTO stocks (
          ticker, name, full_name, exchange_id, sector_id, country, country_name, isin
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (ticker) DO NOTHING
      `, [
        stock.ticker, stock.name, stock.full_name, stock.exchange_id, stock.sector_id,
        stock.country, stock.country_name, stock.isin
      ]);
    }
    console.log(`   ✅ ${stocks.length} actions migrées`);

    // Migrer exchanges
    const exchanges = sqlite.prepare('SELECT * FROM exchanges').all();
    for (const exchange of exchanges) {
      await pg.query(`
        INSERT INTO exchanges (id, name, country, timezone)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
      `, [exchange.id, exchange.name, exchange.country, exchange.timezone]);
    }
    console.log(`   ✅ ${exchanges.length} bourses migrées`);

    // Migrer sectors
    const sectors = sqlite.prepare('SELECT * FROM sectors').all();
    for (const sector of sectors) {
      await pg.query(`
        INSERT INTO sectors (name, name_fr, description)
        VALUES ($1, $2, $3)
      `, [sector.name, sector.name_fr, sector.description]);
    }
    console.log(`   ✅ ${sectors.length} secteurs migrés`);

    // Migrer indices
    const indices = sqlite.prepare('SELECT * FROM indices').all();
    for (const index of indices) {
      await pg.query(`
        INSERT INTO indices (id, name, country, type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
      `, [index.id, index.name, index.country, index.type]);
    }
    console.log(`   ✅ ${indices.length} indices migrés`);

    console.log('\n📊 Vérification...\n');

    const result = await pg.query(`
      SELECT
        (SELECT COUNT(*) FROM investment_opportunities) as opportunities,
        (SELECT COUNT(*) FROM news) as news,
        (SELECT COUNT(*) FROM stocks) as stocks
    `);

    console.log(`   Opportunités: ${result.rows[0].opportunities}`);
    console.log(`   Actualités: ${result.rows[0].news}`);
    console.log(`   Actions: ${result.rows[0].stocks}`);

    console.log('\n✅ Migration terminée avec succès!\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    sqlite.close();
    await pg.end();
  }
}

migrate()
  .then(() => {
    console.log('🎉 Migration réussie!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration échouée:', error);
    process.exit(1);
  });
