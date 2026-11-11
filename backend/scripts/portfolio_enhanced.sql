-- PENDO - Extension du système de portefeuille existant

-- Mettre à jour la table portfolios si elle existe
-- ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS cash_balance REAL DEFAULT 0;
-- ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'XOF';

-- Table des transactions améliorées
CREATE TABLE IF NOT EXISTS user_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    portfolio_id INTEGER,
    ticker TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- buy, sell, dividend
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    total_amount REAL NOT NULL,
    fees REAL DEFAULT 0,
    net_amount REAL NOT NULL,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

-- Table des dividendes reçus
CREATE TABLE IF NOT EXISTS user_dividends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    portfolio_id INTEGER,
    ticker TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'XOF',
    ex_dividend_date DATE,
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

-- Table de l'historique de performance
CREATE TABLE IF NOT EXISTS user_portfolio_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    total_value REAL NOT NULL,
    total_cost REAL NOT NULL,
    total_gain_loss REAL NOT NULL,
    total_gain_loss_percent REAL NOT NULL,
    cash_balance REAL DEFAULT 0,
    number_of_holdings INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date)
);

-- Table des objectifs d'investissement
CREATE TABLE IF NOT EXISTS user_investment_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    goal_name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    target_date DATE,
    goal_type TEXT, -- retirement, education, house, wealth, other
    priority TEXT DEFAULT 'medium', -- low, medium, high
    status TEXT DEFAULT 'active', -- active, achieved, cancelled
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table watchlist (liste de suivi)
CREATE TABLE IF NOT EXISTS user_stock_watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    market_id TEXT,
    target_price REAL,
    notes TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, ticker)
);

-- Table des alertes de prix
CREATE TABLE IF NOT EXISTS user_price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    market_id TEXT,
    alert_type TEXT NOT NULL, -- above, below, change_percent_up, change_percent_down
    target_value REAL NOT NULL,
    current_value REAL,
    is_active INTEGER DEFAULT 1,
    triggered_at DATETIME,
    notification_sent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_user_transactions_user ON user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_date ON user_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_user_dividends_user ON user_dividends(user_id);
CREATE INDEX IF NOT EXISTS idx_user_history_user_date ON user_portfolio_history(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_goals_user ON user_investment_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user ON user_stock_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_user ON user_price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_active ON user_price_alerts(is_active);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER IF NOT EXISTS update_user_goals_timestamp
AFTER UPDATE ON user_investment_goals
BEGIN
    UPDATE user_investment_goals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
