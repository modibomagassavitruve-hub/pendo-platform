const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
let db;

try {
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'default',
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      market_id TEXT,
      data TEXT,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'default',
      market_id TEXT NOT NULL,
      condition TEXT NOT NULL,
      target_price REAL NOT NULL,
      current_price REAL,
      triggered INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Tables notifications créées');
} catch(e) {
  console.error('Notifications DB error:', e.message);
}

// Types de notifications
const NOTIFICATION_TYPES = {
  PRICE_ALERT: 'price_alert',
  MARKET_NEWS: 'market_news',
  PORTFOLIO_UPDATE: 'portfolio_update',
  MARKET_OPEN: 'market_open',
  MARKET_CLOSE: 'market_close',
  SIGNIFICANT_CHANGE: 'significant_change'
};

// Créer une notification
function createNotification(userId = 'default', type, title, message, marketId = null, data = null) {
  if (!db) return null;
  
  try {
    const result = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, market_id, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, type, title, message, marketId, JSON.stringify(data));
    
    return { id: result.lastInsertRowid, type, title, message, marketId, data };
  } catch(e) {
    console.error('Create notification error:', e.message);
    return null;
  }
}

// Obtenir les notifications
function getNotifications(userId = 'default', limit = 50, unreadOnly = false) {
  if (!db) return [];
  
  try {
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    if (unreadOnly) query += ' AND read = 0';
    query += ' ORDER BY created_at DESC LIMIT ?';
    
    const notifications = db.prepare(query).all(userId, limit);
    return notifications.map(n => ({
      ...n,
      data: n.data ? JSON.parse(n.data) : null
    }));
  } catch(e) {
    return [];
  }
}

// Marquer comme lu
function markAsRead(notificationId) {
  if (!db) return false;
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(notificationId);
    return true;
  } catch(e) {
    return false;
  }
}

// Marquer toutes comme lues
function markAllAsRead(userId = 'default') {
  if (!db) return false;
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
    return true;
  } catch(e) {
    return false;
  }
}

// Compter les non lues
function getUnreadCount(userId = 'default') {
  if (!db) return 0;
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0').get(userId);
    return result?.count || 0;
  } catch(e) {
    return 0;
  }
}

// Créer une alerte de prix
function createPriceAlert(userId = 'default', marketId, condition, targetPrice, currentPrice) {
  if (!db) return null;
  
  try {
    const result = db.prepare(`
      INSERT INTO price_alerts (user_id, market_id, condition, target_price, current_price)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, marketId, condition, targetPrice, currentPrice);
    
    return { id: result.lastInsertRowid, marketId, condition, targetPrice };
  } catch(e) {
    console.error('Create alert error:', e.message);
    return null;
  }
}

// Obtenir les alertes
function getPriceAlerts(userId = 'default') {
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM price_alerts WHERE user_id = ? AND triggered = 0 ORDER BY created_at DESC').all(userId);
  } catch(e) {
    return [];
  }
}

// Supprimer une alerte
function deletePriceAlert(alertId) {
  if (!db) return false;
  try {
    db.prepare('DELETE FROM price_alerts WHERE id = ?').run(alertId);
    return true;
  } catch(e) {
    return false;
  }
}

// Vérifier les alertes (appelé périodiquement)
function checkPriceAlerts(marketPrices) {
  if (!db) return [];
  
  const triggered = [];
  
  try {
    const alerts = db.prepare('SELECT * FROM price_alerts WHERE triggered = 0').all();
    
    for (const alert of alerts) {
      const currentPrice = marketPrices[alert.market_id];
      if (!currentPrice) continue;
      
      let shouldTrigger = false;
      
      if (alert.condition === 'above' && currentPrice >= alert.target_price) {
        shouldTrigger = true;
      } else if (alert.condition === 'below' && currentPrice <= alert.target_price) {
        shouldTrigger = true;
      }
      
      if (shouldTrigger) {
        // Marquer comme déclenchée
        db.prepare('UPDATE price_alerts SET triggered = 1 WHERE id = ?').run(alert.id);
        
        // Créer une notification
        const title = `🔔 Alerte Prix: ${alert.market_id.toUpperCase()}`;
        const message = `Le prix a ${alert.condition === 'above' ? 'dépassé' : 'atteint'} ${alert.target_price}. Prix actuel: ${currentPrice}`;
        
        createNotification(alert.user_id, NOTIFICATION_TYPES.PRICE_ALERT, title, message, alert.market_id, {
          targetPrice: alert.target_price,
          currentPrice,
          condition: alert.condition
        });
        
        triggered.push(alert);
      }
    }
  } catch(e) {
    console.error('Check alerts error:', e.message);
  }
  
  return triggered;
}

// Générer des notifications de démonstration
function generateDemoNotifications(userId = 'default') {
  const demos = [
    { type: NOTIFICATION_TYPES.SIGNIFICANT_CHANGE, title: '📈 JSE en forte hausse', message: 'Le JSE All Share a gagné +2.5% aujourd\'hui', market_id: 'jse' },
    { type: NOTIFICATION_TYPES.MARKET_NEWS, title: '📰 Nouvelle importante', message: 'La Banque Centrale du Nigeria annonce une baisse des taux', market_id: 'nse_ng' },
    { type: NOTIFICATION_TYPES.PORTFOLIO_UPDATE, title: '💼 Portefeuille', message: 'Votre position JSE est en profit de +5%', market_id: 'jse' },
    { type: NOTIFICATION_TYPES.MARKET_OPEN, title: '🔔 Marché ouvert', message: 'La bourse de Casablanca vient d\'ouvrir', market_id: 'masi' },
  ];
  
  demos.forEach(n => createNotification(userId, n.type, n.title, n.message, n.market_id));
}

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  createPriceAlert,
  getPriceAlerts,
  deletePriceAlert,
  checkPriceAlerts,
  generateDemoNotifications
};
