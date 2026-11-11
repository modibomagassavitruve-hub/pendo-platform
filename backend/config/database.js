/**
 * Configuration de la base de données
 * Supporte SQLite (développement) et PostgreSQL (production)
 */

const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = process.env.DATABASE_URL || isProduction;

let db = null;
let pool = null;

/**
 * Initialise la connexion à la base de données
 */
function initDatabase() {
  if (usePostgres) {
    return initPostgreSQL();
  } else {
    return initSQLite();
  }
}

/**
 * Initialise PostgreSQL pour la production
 */
function initPostgreSQL() {
  try {
    // L'URL de connexion vient uniquement des variables d'environnement (jamais du code)
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL manquante : définissez-la dans les variables d\'environnement');
    }

    console.log('[Database] Connexion PostgreSQL avec:', connectionString.replace(/:[^:@]+@/, ':***@'));

    pool = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL] Erreur inattendue:', err);
    });

    console.log('[Database] PostgreSQL connecté');
    return pool;
  } catch (error) {
    console.error('[Database] Erreur connexion PostgreSQL:', error);
    throw error;
  }
}

/**
 * Initialise SQLite pour le développement
 */
function initSQLite() {
  try {
    const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    console.log('[Database] SQLite connecté:', dbPath);
    return db;
  } catch (error) {
    console.error('[Database] Erreur connexion SQLite:', error);
    throw error;
  }
}

/**
 * Wrapper pour exécuter des requêtes de manière uniforme
 */
class DatabaseWrapper {
  constructor() {
    this.db = null;
    this.pool = null;
    this.isPostgres = false;
  }

  async init() {
    if (usePostgres) {
      this.pool = initPostgreSQL();
      this.isPostgres = true;
    } else {
      this.db = initSQLite();
      this.isPostgres = false;
    }
  }

  /**
   * Exécute une requête SELECT qui retourne une seule ligne
   */
  async get(sql, params = []) {
    if (this.isPostgres) {
      // Convertir les ? en $1, $2, etc.
      const pgSql = convertPlaceholders(sql);
      const result = await this.pool.query(pgSql, params);
      return result.rows[0];
    } else {
      return this.db.prepare(sql).get(...params);
    }
  }

  /**
   * Exécute une requête SELECT qui retourne plusieurs lignes
   */
  async all(sql, params = []) {
    if (this.isPostgres) {
      const pgSql = convertPlaceholders(sql);
      const result = await this.pool.query(pgSql, params);
      return result.rows;
    } else {
      return this.db.prepare(sql).all(...params);
    }
  }

  /**
   * Exécute une requête INSERT/UPDATE/DELETE
   */
  async run(sql, params = []) {
    if (this.isPostgres) {
      const pgSql = convertPlaceholders(sql);
      const result = await this.pool.query(pgSql, params);
      return {
        changes: result.rowCount,
        lastInsertRowid: result.rows[0]?.id || null
      };
    } else {
      const stmt = this.db.prepare(sql);
      return stmt.run(...params);
    }
  }

  /**
   * Exécute plusieurs requêtes dans une transaction
   */
  async transaction(callback) {
    if (this.isPostgres) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      return this.db.transaction(callback)();
    }
  }

  /**
   * Ferme la connexion
   */
  async close() {
    if (this.isPostgres && this.pool) {
      await this.pool.end();
    } else if (this.db) {
      this.db.close();
    }
  }

  /**
   * Retourne la connexion brute (pour compatibilité)
   */
  getRawConnection() {
    return this.isPostgres ? this.pool : this.db;
  }
}

/**
 * Convertit les placeholders SQLite (?) en PostgreSQL ($1, $2, etc.)
 */
function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

/**
 * Crée les tables PostgreSQL si elles n'existent pas
 */
async function createPostgresTables(pool) {
  const schema = `
    -- Market cache
    CREATE TABLE IF NOT EXISTS market_cache (
      market_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      source TEXT,
      fetched_at TIMESTAMP NOT NULL,
      expires_at TIMESTAMP NOT NULL
    );

    -- Market history
    CREATE TABLE IF NOT EXISTS market_history (
      id SERIAL PRIMARY KEY,
      market_id TEXT NOT NULL,
      value REAL,
      change_percent REAL,
      volume TEXT,
      source TEXT,
      recorded_at TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_history_market_date ON market_history(market_id, recorded_at);

    -- Collection stats
    CREATE TABLE IF NOT EXISTS collection_stats (
      id SERIAL PRIMARY KEY,
      started_at TIMESTAMP NOT NULL,
      completed_at TIMESTAMP,
      markets_fetched INTEGER DEFAULT 0,
      sources_used TEXT,
      duration_ms INTEGER,
      success INTEGER DEFAULT 1
    );

    -- Stock prices
    CREATE TABLE IF NOT EXISTS stock_prices (
      id SERIAL PRIMARY KEY,
      stock_id TEXT,
      symbol TEXT NOT NULL,
      name TEXT,
      price REAL,
      change_percent REAL,
      volume TEXT,
      market_cap TEXT,
      exchange TEXT,
      sector TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      source TEXT
    );

    -- Market history data
    CREATE TABLE IF NOT EXISTS market_history_data (
      id SERIAL PRIMARY KEY,
      market_id TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      open REAL,
      high REAL,
      low REAL,
      close REAL,
      volume INTEGER,
      source TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(market_id, timestamp)
    );
    CREATE INDEX IF NOT EXISTS idx_mh_market ON market_history_data(market_id);
    CREATE INDEX IF NOT EXISTS idx_mh_timestamp ON market_history_data(timestamp);

    -- Stocks
    CREATE TABLE IF NOT EXISTS stocks (
      id SERIAL PRIMARY KEY,
      symbol TEXT,
      name TEXT,
      price REAL,
      change_percent REAL,
      volume INTEGER,
      exchange TEXT,
      sector TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Market values
    CREATE TABLE IF NOT EXISTS market_values (
      id SERIAL PRIMARY KEY,
      market_id TEXT UNIQUE NOT NULL,
      value REAL,
      change_percent REAL,
      volume INTEGER,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      source TEXT
    );

    -- Market values history
    CREATE TABLE IF NOT EXISTS market_values_history (
      id SERIAL PRIMARY KEY,
      market_id TEXT NOT NULL,
      value REAL,
      change_percent REAL,
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- News
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(url)
    );
    CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_news_market ON news(market_id);
    CREATE INDEX IF NOT EXISTS idx_news_country ON news(country);

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      country TEXT,
      profile_image TEXT,
      is_verified INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP,
      email_verified_at TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    -- User sessions
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      refresh_token TEXT UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);

    -- Portfolios
    CREATE TABLE IF NOT EXISTS portfolios (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      name TEXT DEFAULT 'Mon Portefeuille',
      initial_balance REAL DEFAULT 100000,
      current_balance REAL DEFAULT 100000,
      currency TEXT DEFAULT 'USD',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Portfolio holdings
    CREATE TABLE IF NOT EXISTS portfolio_holdings (
      id SERIAL PRIMARY KEY,
      portfolio_id INTEGER,
      market_id TEXT NOT NULL,
      symbol TEXT,
      quantity REAL NOT NULL,
      average_price REAL NOT NULL,
      current_price REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
    );

    -- Portfolio transactions
    CREATE TABLE IF NOT EXISTS portfolio_transactions (
      id SERIAL PRIMARY KEY,
      portfolio_id INTEGER,
      type TEXT NOT NULL,
      market_id TEXT NOT NULL,
      symbol TEXT,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      fees REAL DEFAULT 0,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
    );

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

    -- News articles
    CREATE TABLE IF NOT EXISTS news_articles (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      url TEXT UNIQUE NOT NULL,
      source TEXT NOT NULL,
      market_id TEXT,
      country TEXT,
      category TEXT DEFAULT 'Market Update',
      image_url TEXT,
      published_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      views INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_news_category ON news_articles(category);

    -- User notifications
    CREATE TABLE IF NOT EXISTS user_notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      ticker TEXT,
      metadata TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON user_notifications(is_read);

    -- User transactions
    CREATE TABLE IF NOT EXISTS user_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      portfolio_id INTEGER,
      ticker TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      total_amount REAL NOT NULL,
      fees REAL DEFAULT 0,
      net_amount REAL NOT NULL,
      transaction_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_transactions_user ON user_transactions(user_id);

    -- User watchlist
    CREATE TABLE IF NOT EXISTS user_stock_watchlist (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      ticker TEXT NOT NULL,
      market_id TEXT,
      target_price REAL,
      notes TEXT,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, ticker)
    );

    -- User price alerts
    CREATE TABLE IF NOT EXISTS user_price_alerts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      ticker TEXT NOT NULL,
      market_id TEXT,
      alert_type TEXT NOT NULL,
      target_value REAL NOT NULL,
      current_value REAL,
      is_active INTEGER DEFAULT 1,
      triggered_at TIMESTAMP,
      notification_sent INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_alerts_user ON user_price_alerts(user_id);

    -- Social publications (réseaux sociaux)
    CREATE TABLE IF NOT EXISTS social_publications (
      id SERIAL PRIMARY KEY,
      content_type TEXT NOT NULL,
      content_id TEXT,
      content_lang TEXT NOT NULL,
      platform TEXT NOT NULL,
      platform_post_id TEXT,
      platform_post_url TEXT,
      message TEXT NOT NULL,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      likes INTEGER,
      comments INTEGER,
      shares INTEGER,
      reach INTEGER,
      metrics_updated_at TIMESTAMP,
      scheduled_for TIMESTAMP,
      published_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_social_pub_content_platform_lang
      ON social_publications(content_type, content_id, platform, content_lang);
    CREATE INDEX IF NOT EXISTS idx_social_pub_status ON social_publications(status);
    CREATE INDEX IF NOT EXISTS idx_social_pub_platform ON social_publications(platform);
    CREATE INDEX IF NOT EXISTS idx_social_pub_published ON social_publications(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_social_pub_scheduled ON social_publications(scheduled_for DESC);
  `;

  // Exécuter le schéma par morceaux
  const statements = schema.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await pool.query(statement);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('[Schema] Erreur:', statement.substring(0, 100), error.message);
        }
      }
    }
  }

  console.log('[Database] Schéma PostgreSQL créé/vérifié');
}

module.exports = {
  initDatabase,
  DatabaseWrapper,
  createPostgresTables,
  isProduction,
  usePostgres
};
