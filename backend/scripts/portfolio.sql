-- PENDO - Tables pour le portefeuille utilisateur

-- Table des holdings (positions) - actions détenues
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    average_buy_price REAL NOT NULL,
    current_price REAL,
    total_value REAL,
    total_cost REAL,
    unrealized_gain_loss REAL,
    unrealized_gain_loss_percent REAL,
    purchase_date DATE NOT NULL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
    UNIQUE(user_id, stock_id)
);

-- Table des transactions
CREATE TABLE IF NOT EXISTS portfolio_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- buy, sell, dividend
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    total_amount REAL NOT NULL,
    fees REAL DEFAULT 0,
    net_amount REAL NOT NULL,
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Table des dividendes reçus
CREATE TABLE IF NOT EXISTS portfolio_dividends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'XOF',
    ex_dividend_date DATE,
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Table de l'historique de performance du portefeuille
CREATE TABLE IF NOT EXISTS portfolio_history (
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
CREATE TABLE IF NOT EXISTS investment_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    goal_name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    target_date DATE,
    goal_type TEXT, -- retirement, education, house, etc.
    priority TEXT DEFAULT 'medium', -- low, medium, high
    status TEXT DEFAULT 'active', -- active, achieved, cancelled
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table watchlist (liste de suivi)
CREATE TABLE IF NOT EXISTS stock_watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    target_price REAL,
    notes TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
    UNIQUE(user_id, stock_id)
);

-- Table des alertes de prix
CREATE TABLE IF NOT EXISTS price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    ticker TEXT NOT NULL,
    alert_type TEXT NOT NULL, -- above, below, change_percent
    target_value REAL NOT NULL,
    current_value REAL,
    is_active INTEGER DEFAULT 1,
    triggered_at DATETIME,
    notification_sent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_holdings_user ON portfolio_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_stock ON portfolio_holdings(stock_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON portfolio_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON portfolio_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_dividends_user ON portfolio_dividends(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user_date ON portfolio_history(user_id, date);
CREATE INDEX IF NOT EXISTS idx_goals_user ON investment_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON stock_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON price_alerts(is_active);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER IF NOT EXISTS update_goals_timestamp
AFTER UPDATE ON investment_goals
BEGIN
    UPDATE investment_goals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger pour mettre à jour last_updated des holdings
CREATE TRIGGER IF NOT EXISTS update_holdings_timestamp
AFTER UPDATE ON portfolio_holdings
BEGIN
    UPDATE portfolio_holdings SET last_updated = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
