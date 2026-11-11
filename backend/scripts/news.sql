-- Table pour les actualités financières
CREATE TABLE IF NOT EXISTS news_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    summary TEXT,
    url TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    market_id TEXT,
    country TEXT,
    category TEXT DEFAULT 'Market Update',
    image_url TEXT,
    published_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    views INTEGER DEFAULT 0
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_market ON news_articles(market_id);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_articles(category);

-- Trigger pour nettoyer les vieux articles (garder 90 jours)
CREATE TRIGGER IF NOT EXISTS cleanup_old_news
AFTER INSERT ON news_articles
BEGIN
  DELETE FROM news_articles
  WHERE published_at < datetime('now', '-90 days');
END;
