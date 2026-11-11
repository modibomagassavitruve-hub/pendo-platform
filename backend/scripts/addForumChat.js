/**
 * PENDO - Migration : Ajout Forum et Chat
 * Usage: node scripts/addForumChat.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'pendo.db');

console.log('═'.repeat(50));
console.log('  PENDO - Migration Forum & Chat');
console.log('═'.repeat(50));

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
console.log('✅ DB connectée:', DB_PATH);

try {
  // Schéma Forum & Chat
  db.exec(`
    -- Forum: Catégories de discussion
    CREATE TABLE IF NOT EXISTS forum_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      position INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Forum: Posts/Topics
    CREATE TABLE IF NOT EXISTS forum_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      replies_count INTEGER DEFAULT 0,
      last_reply_at DATETIME,
      last_reply_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES forum_categories(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (last_reply_user_id) REFERENCES users(id)
    );

    -- Forum: Réponses/Commentaires
    CREATE TABLE IF NOT EXISTS forum_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_solution INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Forum: Likes sur les réponses
    CREATE TABLE IF NOT EXISTS forum_reply_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reply_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(reply_id, user_id),
      FOREIGN KEY (reply_id) REFERENCES forum_replies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Chat: Rooms/Conversations
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'public', -- public, private, direct
      created_by INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Chat: Membres des rooms
    CREATE TABLE IF NOT EXISTS chat_room_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member', -- admin, moderator, member
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_read_at DATETIME,
      UNIQUE(room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Chat: Messages
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text', -- text, image, file, system
      reply_to_id INTEGER,
      is_edited INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id)
    );

    -- Indices pour optimiser les performances
    CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category_id);
    CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);
    CREATE INDEX IF NOT EXISTS idx_forum_replies_user ON forum_replies(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
  `);

  console.log('✅ Tables Forum et Chat créées');

  // Insérer les catégories par défaut du forum
  const categories = [
    ['Analyses de marché', 'Discutez des analyses techniques et fondamentales', '📊', 1],
    ['Stratégies d\'investissement', 'Partagez vos stratégies et conseils', '💡', 2],
    ['Actualités', 'Dernières nouvelles des marchés africains', '📰', 3],
    ['Questions & Réponses', 'Posez vos questions, obtenez des réponses', '❓', 4],
    ['BRVM', 'Discussions spécifiques à la BRVM', '🇨🇮', 5],
    ['NGX', 'Discussions spécifiques à la Nigerian Stock Exchange', '🇳🇬', 6],
    ['JSE', 'Discussions spécifiques à la Johannesburg Stock Exchange', '🇿🇦', 7],
    ['Général', 'Discussions générales sur l\'investissement', '💬', 8],
  ];

  const insertCategory = db.prepare(
    'INSERT OR IGNORE INTO forum_categories (name, description, icon, position) VALUES (?, ?, ?, ?)'
  );

  categories.forEach(cat => {
    insertCategory.run(cat);
  });

  console.log('✅ Catégories du forum créées');

  // Créer une room de chat général
  const createGeneralRoom = db.prepare(`
    INSERT OR IGNORE INTO chat_rooms (id, name, description, type, created_by)
    VALUES (1, 'Général', 'Discussion générale sur les marchés', 'public', 1)
  `);

  try {
    createGeneralRoom.run();
    console.log('✅ Room de chat général créée');
  } catch (err) {
    console.log('ℹ️  Room de chat général existe déjà');
  }

  console.log('');
  console.log('✅ Migration terminée avec succès !');
  console.log('');
  console.log('📋 Résumé:');
  console.log('  - Tables Forum: forum_categories, forum_posts, forum_replies, forum_reply_likes');
  console.log('  - Tables Chat: chat_rooms, chat_room_members, chat_messages');
  console.log('  - 8 catégories de forum créées');
  console.log('  - 1 room de chat public créée');
  console.log('');

} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
} finally {
  db.close();
}
