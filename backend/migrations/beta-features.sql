-- Tables pour la phase bêta de PENDO

-- Table pour les codes d'accès bêta
CREATE TABLE IF NOT EXISTS beta_access_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  email TEXT,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  expires_at DATETIME,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Table pour suivre qui utilise les codes
CREATE TABLE IF NOT EXISTS beta_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  access_code_id INTEGER,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (access_code_id) REFERENCES beta_access_codes(id)
);

-- Table pour les feedbacks
CREATE TABLE IF NOT EXISTS user_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  email TEXT,
  type TEXT NOT NULL CHECK(type IN ('bug', 'feature', 'improvement', 'other')),
  category TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rating INTEGER CHECK(rating BETWEEN 1 AND 5),
  page_url TEXT,
  browser_info TEXT,
  screenshot_url TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewing', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  resolved_by INTEGER,
  admin_notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table pour les analytics d'utilisation
CREATE TABLE IF NOT EXISTS usage_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  page_url TEXT,
  component TEXT,
  action_data TEXT,
  duration_seconds INTEGER,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table pour les sessions utilisateur
CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  session_id TEXT UNIQUE NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  duration_seconds INTEGER,
  pages_visited INTEGER DEFAULT 0,
  actions_count INTEGER DEFAULT 0,
  device_info TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table pour suivre les features utilisées
CREATE TABLE IF NOT EXISTS feature_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  feature_name TEXT NOT NULL,
  feature_category TEXT,
  usage_count INTEGER DEFAULT 1,
  last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  first_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, feature_name)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_beta_codes_active ON beta_access_codes(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON user_feedback(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON user_feedback(status, priority);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON usage_analytics(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON usage_analytics(event_type, event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON feature_usage(user_id, last_used_at);

-- Insérer quelques codes bêta initiaux
INSERT OR IGNORE INTO beta_access_codes (code, max_uses, notes) VALUES
  ('PENDO-BETA-2026', 50, 'Code général pour les premiers testeurs'),
  ('PENDO-FAMILY-01', 10, 'Code pour la famille et les proches'),
  ('PENDO-FRIENDS-01', 20, 'Code pour les amis'),
  ('PENDO-VIP-2026', 5, 'Code VIP accès illimité');
