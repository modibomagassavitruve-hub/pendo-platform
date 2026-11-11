/**
 * Script d'initialisation de Supabase
 * Crée les tables PostgreSQL et migre les données depuis SQLite
 */

const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

// Connexion Supabase
const SUPABASE_URL = process.env.DATABASE_URL;

async function initSupabase() {
  const pool = new Pool({
    connectionString: SUPABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  console.log('📦 Connexion à Supabase...');

  try {
    // Test de connexion
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connecté à Supabase:', testResult.rows[0].now);

    // Création des tables
    console.log('\n🔨 Création des tables...');
    await createTables(pool);

    // Migration des données depuis SQLite
    console.log('\n📊 Migration des données depuis SQLite...');
    await migrateData(pool);

    console.log('\n✅ Initialisation Supabase terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function createTables(pool) {
  const schema = `
    -- Investment opportunities
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
      min_investment REAL,
      max_investment REAL,
      expected_return_min REAL,
      expected_return_max REAL,
      investment_horizon TEXT,
      risk_level TEXT NOT NULL,
      company_name TEXT,
      company_size TEXT,
      stage TEXT,
      market_size_usd REAL,
      source_name TEXT NOT NULL,
      source_url TEXT,
      contact_info TEXT,
      external_links TEXT,
      image_url TEXT,
      logo_url TEXT,
      status TEXT DEFAULT 'active',
      deadline DATE,
      published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      views INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      verification_date TIMESTAMP,
      tags TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_opportunities_sector ON investment_opportunities(sector);
    CREATE INDEX IF NOT EXISTS idx_opportunities_country ON investment_opportunities(country);
    CREATE INDEX IF NOT EXISTS idx_opportunities_status ON investment_opportunities(status);

    -- Opportunity tags
    CREATE TABLE IF NOT EXISTS opportunity_tags (
      opportunity_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      FOREIGN KEY (opportunity_id) REFERENCES investment_opportunities(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tags_opportunity ON opportunity_tags(opportunity_id);
  `;

  const statements = schema.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await pool.query(statement);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('Erreur SQL:', error.message);
        }
      }
    }
  }

  console.log('✅ Tables créées');
}

async function migrateData(pool) {
  // Ouvrir la base SQLite locale
  const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');

  try {
    const sqlite = new Database(dbPath, { readonly: true });

    // Compter les opportunités dans SQLite
    const count = sqlite.prepare('SELECT COUNT(*) as total FROM investment_opportunities').get();
    console.log(`📊 ${count.total} opportunités trouvées dans SQLite`);

    if (count.total === 0) {
      console.log('⚠️  Aucune opportunité à migrer');
      sqlite.close();
      return;
    }

    // Lire toutes les opportunités
    const opportunities = sqlite.prepare('SELECT * FROM investment_opportunities').all();

    // Convertir les placeholders SQLite (?) en PostgreSQL ($1, $2, etc.)
    const insertQuery = `
      INSERT INTO investment_opportunities (
        title, slug, sector, subsector, country, country_name, region,
        summary, description, opportunity_type, min_investment, max_investment,
        expected_return_min, expected_return_max, investment_horizon, risk_level,
        company_name, company_size, stage, market_size_usd, source_name, source_url,
        contact_info, external_links, image_url, logo_url, status, deadline,
        published_at, updated_at, scraped_at, views, saves, is_verified, verification_date, tags
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36
      ) ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `;

    let inserted = 0;
    let skipped = 0;

    for (const opp of opportunities) {
      try {
        const values = [
          opp.title, opp.slug, opp.sector, opp.subsector, opp.country, opp.country_name, opp.region,
          opp.summary, opp.description, opp.opportunity_type, opp.min_investment, opp.max_investment,
          opp.expected_return_min, opp.expected_return_max, opp.investment_horizon, opp.risk_level,
          opp.company_name, opp.company_size, opp.stage, opp.market_size_usd, opp.source_name, opp.source_url,
          opp.contact_info, opp.external_links, opp.image_url, opp.logo_url, opp.status, opp.deadline,
          opp.published_at, opp.updated_at, opp.scraped_at, opp.views, opp.saves, opp.is_verified,
          opp.verification_date, opp.tags
        ];

        const result = await pool.query(insertQuery, values);

        if (result.rows.length > 0) {
          const newId = result.rows[0].id;

          // Migrer les tags si présents
          const tags = sqlite.prepare('SELECT tag FROM opportunity_tags WHERE opportunity_id = ?').all(opp.id);
          for (const tagRow of tags) {
            await pool.query(
              'INSERT INTO opportunity_tags (opportunity_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [newId, tagRow.tag]
            );
          }

          inserted++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Erreur pour "${opp.title}":`, error.message);
        skipped++;
      }
    }

    sqlite.close();
    console.log(`✅ Migration terminée: ${inserted} insérées, ${skipped} ignorées`);
  } catch (error) {
    if (error.code === 'SQLITE_CANTOPEN') {
      console.log('⚠️  Base SQLite non trouvée, création de tables uniquement');
    } else {
      throw error;
    }
  }
}

// Exécution
initSupabase()
  .then(() => {
    console.log('\n🎉 Supabase est prêt!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec de l\'initialisation:', error);
    process.exit(1);
  });
