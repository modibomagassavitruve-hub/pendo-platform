/**
 * Script pour ajouter les tables du forum et du chat
 * À exécuter avec: node scripts/addSocialTables.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

console.log('🔧 Ajout des tables pour le forum et le chat...\n');

try {
  // ============================================
  // TABLES FORUM
  // ============================================

  // Catégories du forum
  db.exec(`
    CREATE TABLE IF NOT EXISTS forum_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Table forum_categories créée');

  // Fils de discussion
  db.exec(`
    CREATE TABLE IF NOT EXISTS forum_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      replies_count INTEGER DEFAULT 0,
      last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES forum_categories(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('✅ Table forum_threads créée');

  // Réponses aux fils de discussion
  db.exec(`
    CREATE TABLE IF NOT EXISTS forum_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      is_edited INTEGER DEFAULT 0,
      edited_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES forum_threads(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('✅ Table forum_posts créée');

  // Likes sur les posts
  db.exec(`
    CREATE TABLE IF NOT EXISTS forum_post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES forum_posts(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(post_id, user_id)
    )
  `);
  console.log('✅ Table forum_post_likes créée');

  // ============================================
  // TABLES CHAT
  // ============================================

  // Conversations
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'private',
      name TEXT,
      created_by INTEGER NOT NULL,
      last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  console.log('✅ Table chat_conversations créée');

  // Participants aux conversations
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      last_read_at DATETIME,
      is_active INTEGER DEFAULT 1,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(conversation_id, user_id)
    )
  `);
  console.log('✅ Table chat_participants créée');

  // Messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      is_edited INTEGER DEFAULT 0,
      edited_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  console.log('✅ Table chat_messages créée');

  // Réactions aux messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_message_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES chat_messages(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(message_id, user_id, emoji)
    )
  `);
  console.log('✅ Table chat_message_reactions créée');

  // ============================================
  // TABLES RELATIONS UTILISATEURS
  // ============================================

  // Blocages d'utilisateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_id INTEGER NOT NULL,
      blocked_id INTEGER NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (blocker_id) REFERENCES users(id),
      FOREIGN KEY (blocked_id) REFERENCES users(id),
      UNIQUE(blocker_id, blocked_id)
    )
  `);
  console.log('✅ Table user_blocks créée');

  // Signalements
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      reported_user_id INTEGER,
      reported_post_id INTEGER,
      reported_message_id INTEGER,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reporter_id) REFERENCES users(id),
      FOREIGN KEY (reported_user_id) REFERENCES users(id),
      FOREIGN KEY (reported_post_id) REFERENCES forum_posts(id),
      FOREIGN KEY (reported_message_id) REFERENCES chat_messages(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )
  `);
  console.log('✅ Table user_reports créée');

  // ============================================
  // INDEX POUR PERFORMANCES
  // ============================================

  db.exec(`CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_forum_threads_user ON forum_threads(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_forum_threads_activity ON forum_threads(last_activity_at DESC)`);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON forum_posts(thread_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at DESC)`);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC)`);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation ON chat_participants(conversation_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id)`);

  console.log('✅ Index créés');

  // ============================================
  // DONNÉES INITIALES
  // ============================================

  // Catégories du forum par défaut
  const categories = [
    { name: 'Discussions générales', description: 'Discussions sur les marchés financiers africains', icon: '💬', order: 1 },
    { name: 'Analyses et stratégies', description: 'Partagez vos analyses et stratégies d\'investissement', icon: '📊', order: 2 },
    { name: 'Actualités', description: 'Discussions sur les actualités financières', icon: '📰', order: 3 },
    { name: 'Questions et réponses', description: 'Posez vos questions sur l\'investissement', icon: '❓', order: 4 },
    { name: 'Opportunités', description: 'Partagez et discutez des opportunités d\'investissement', icon: '💎', order: 5 }
  ];

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO forum_categories (name, description, icon, order_index)
    VALUES (?, ?, ?, ?)
  `);

  categories.forEach(cat => {
    insertCategory.run(cat.name, cat.description, cat.icon, cat.order);
  });

  console.log('✅ Catégories du forum initialisées');

  console.log('\n✅ Migration terminée avec succès !');
  console.log('\n📊 Résumé des tables créées:');
  console.log('   - Forum: 4 tables (categories, threads, posts, likes)');
  console.log('   - Chat: 4 tables (conversations, participants, messages, reactions)');
  console.log('   - Relations: 2 tables (blocks, reports)');
  console.log('   - Total: 10 nouvelles tables\n');

} catch (error) {
  console.error('❌ Erreur lors de la migration:', error.message);
  process.exit(1);
} finally {
  db.close();
}
