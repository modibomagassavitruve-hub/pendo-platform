-- Table pour les notifications utilisateur
CREATE TABLE IF NOT EXISTS user_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'price_alert', 'news', 'system', 'portfolio'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    ticker TEXT,
    metadata TEXT, -- JSON pour données additionnelles
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON user_notifications(created_at DESC);

-- Trigger pour nettoyer les vieilles notifications (garder 30 jours)
CREATE TRIGGER IF NOT EXISTS cleanup_old_notifications
AFTER INSERT ON user_notifications
BEGIN
  DELETE FROM user_notifications
  WHERE created_at < datetime('now', '-30 days');
END;
