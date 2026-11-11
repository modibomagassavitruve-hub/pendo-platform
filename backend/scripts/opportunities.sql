-- PENDO - Tables pour les opportunités d'investissement

-- Table principale des opportunités d'investissement
CREATE TABLE IF NOT EXISTS investment_opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    views INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    verification_date DATETIME
);

-- Table des points clés (key highlights)
CREATE TABLE IF NOT EXISTS opportunity_highlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER NOT NULL,
    highlight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (opportunity_id) REFERENCES investment_opportunities(id) ON DELETE CASCADE
);

-- Table des tags
CREATE TABLE IF NOT EXISTS opportunity_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY (opportunity_id) REFERENCES investment_opportunities(id) ON DELETE CASCADE
);

-- Table des métriques et KPIs
CREATE TABLE IF NOT EXISTS opportunity_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value TEXT NOT NULL,
    metric_unit TEXT,
    metric_period TEXT,
    FOREIGN KEY (opportunity_id) REFERENCES investment_opportunities(id) ON DELETE CASCADE
);

-- Table de watchlist utilisateurs
CREATE TABLE IF NOT EXISTS user_opportunity_watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    opportunity_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(user_id, opportunity_id),
    FOREIGN KEY (opportunity_id) REFERENCES investment_opportunities(id) ON DELETE CASCADE
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_opportunities_sector ON investment_opportunities(sector);
CREATE INDEX IF NOT EXISTS idx_opportunities_country ON investment_opportunities(country);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON investment_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_risk ON investment_opportunities(risk_level);
CREATE INDEX IF NOT EXISTS idx_opportunities_published ON investment_opportunities(published_at);
CREATE INDEX IF NOT EXISTS idx_opportunity_tags_tag ON opportunity_tags(tag);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON user_opportunity_watchlist(user_id);
