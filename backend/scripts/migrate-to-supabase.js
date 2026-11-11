/**
 * Script de migration des opportunités vers Supabase
 * Utilise les données exportées plutôt que SQLite directement
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connexion Supabase
const SUPABASE_URL = process.env.DATABASE_URL;

// Données d'opportunités (remplacées par export depuis SQLite)
const opportunities = require('../data/opportunities-export.json');

async function migrateToSupabase() {
  const pool = new Pool({
    connectionString: SUPABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  console.log('📦 Connexion à Supabase...');

  try {
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connecté à Supabase:', testResult.rows[0].now);

    console.log(`\n📊 Migration de ${opportunities.length} opportunités...`);

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
      ) ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;

    let inserted = 0;
    let updated = 0;

    for (const opp of opportunities) {
      try {
        const values = [
          opp.title, opp.slug, opp.sector, opp.subsector || null, opp.country, opp.country_name, opp.region || null,
          opp.summary, opp.description, opp.opportunity_type, opp.min_investment || null, opp.max_investment || null,
          opp.expected_return_min || null, opp.expected_return_max || null, opp.investment_horizon || null, opp.risk_level,
          opp.company_name || null, opp.company_size || null, opp.stage || null, opp.market_size_usd || null,
          opp.source_name, opp.source_url || null, opp.contact_info || null, opp.external_links || null,
          opp.image_url || null, opp.logo_url || null, opp.status || 'active', opp.deadline || null,
          opp.published_at || new Date().toISOString(), opp.updated_at || new Date().toISOString(),
          opp.scraped_at || new Date().toISOString(), opp.views || 0, opp.saves || 0,
          opp.is_verified || 0, opp.verification_date || null, opp.tags || null
        ];

        const result = await pool.query(insertQuery, values);

        if (result.rows.length > 0) {
          inserted++;
          if (inserted % 10 === 0) {
            console.log(`  ✅ ${inserted}/${opportunities.length} opportunités migrées...`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Erreur pour "${opp.title}":`, error.message);
      }
    }

    console.log(`\n✅ Migration terminée: ${inserted} opportunités insérées/mises à jour`);

    // Vérification
    const countResult = await pool.query('SELECT COUNT(*) as total FROM investment_opportunities');
    console.log(`📊 Total dans Supabase: ${countResult.rows[0].total} opportunités`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécution
migrateToSupabase()
  .then(() => {
    console.log('\n🎉 Migration réussie!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec de la migration:', error);
    process.exit(1);
  });
