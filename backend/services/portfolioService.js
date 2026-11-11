const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
let db;

try {
  db = new Database(dbPath);
  
  // Tables pour le portefeuille
  db.exec(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT 'default',
      name TEXT DEFAULT 'Mon Portefeuille',
      initial_balance REAL DEFAULT 100000,
      current_balance REAL DEFAULT 100000,
      currency TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portfolio_holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER,
      market_id TEXT NOT NULL,
      symbol TEXT,
      quantity REAL NOT NULL,
      average_price REAL NOT NULL,
      current_price REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
    );

    CREATE TABLE IF NOT EXISTS portfolio_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER,
      type TEXT NOT NULL,
      market_id TEXT NOT NULL,
      symbol TEXT,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      fees REAL DEFAULT 0,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT 'default',
      market_id TEXT NOT NULL,
      symbol TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, market_id)
    );
  `);
  
  console.log('✅ Tables portefeuille créées');
} catch(e) {
  console.error('Portfolio DB error:', e.message);
}

// Prix simulés des marchés
const MARKET_PRICES = {
  jse: { price: 78243, name: 'JSE All Share', currency: 'ZAR' },
  egx: { price: 27500, name: 'EGX 30', currency: 'EGP' },
  nse_ng: { price: 98234, name: 'NGX All Share', currency: 'NGN' },
  masi: { price: 13200, name: 'MASI', currency: 'MAD' },
  brvm: { price: 234, name: 'BRVM Composite', currency: 'XOF' },
  gse: { price: 3150, name: 'GSE Composite', currency: 'GHS' },
  nse_ke: { price: 108, name: 'NSE 20', currency: 'KES' },
  bse_bw: { price: 8234, name: 'BSE DCI', currency: 'BWP' },
  sem: { price: 2156, name: 'SEMDEX', currency: 'MUR' },
  tunindex: { price: 9456, name: 'TUNINDEX', currency: 'TND' },
};

// Obtenir le prix actuel avec variation aléatoire
function getCurrentPrice(marketId) {
  const base = MARKET_PRICES[marketId]?.price || 1000;
  const variation = (Math.random() - 0.5) * 0.02; // ±1%
  return +(base * (1 + variation)).toFixed(2);
}

// Créer un portefeuille
function createPortfolio(userId = 'default', initialBalance = 100000) {
  if (!db) return null;
  
  try {
    const existing = db.prepare('SELECT * FROM portfolios WHERE user_id = ?').get(userId);
    if (existing) return existing;
    
    const result = db.prepare(`
      INSERT INTO portfolios (user_id, initial_balance, current_balance)
      VALUES (?, ?, ?)
    `).run(userId, initialBalance, initialBalance);
    
    return db.prepare('SELECT * FROM portfolios WHERE id = ?').get(result.lastInsertRowid);
  } catch(e) {
    console.error('Create portfolio error:', e.message);
    return null;
  }
}

// Obtenir le portefeuille
function getPortfolio(userId = 'default') {
  if (!db) return null;
  
  try {
    let portfolio = db.prepare('SELECT * FROM portfolios WHERE user_id = ?').get(userId);
    
    if (!portfolio) {
      portfolio = createPortfolio(userId);
    }
    
    // Récupérer les holdings
    const holdings = db.prepare(`
      SELECT * FROM portfolio_holdings WHERE portfolio_id = ?
    `).all(portfolio.id);
    
    // Mettre à jour les prix actuels
    let totalValue = portfolio.current_balance;
    const updatedHoldings = holdings.map(h => {
      const currentPrice = getCurrentPrice(h.market_id);
      const marketValue = h.quantity * currentPrice;
      const profit = marketValue - (h.quantity * h.average_price);
      const profitPercent = ((currentPrice - h.average_price) / h.average_price * 100);
      totalValue += marketValue;
      
      return {
        ...h,
        current_price: currentPrice,
        market_value: +marketValue.toFixed(2),
        profit: +profit.toFixed(2),
        profit_percent: +profitPercent.toFixed(2),
        market_info: MARKET_PRICES[h.market_id] || {}
      };
    });
    
    // Calculer la performance
    const totalProfit = totalValue - portfolio.initial_balance;
    const totalProfitPercent = (totalProfit / portfolio.initial_balance * 100);
    
    return {
      ...portfolio,
      holdings: updatedHoldings,
      total_value: +totalValue.toFixed(2),
      total_profit: +totalProfit.toFixed(2),
      total_profit_percent: +totalProfitPercent.toFixed(2),
      holdings_count: updatedHoldings.length
    };
  } catch(e) {
    console.error('Get portfolio error:', e.message);
    return null;
  }
}

// Acheter
function buyMarket(userId = 'default', marketId, quantity) {
  if (!db) return { success: false, error: 'DB non disponible' };
  
  try {
    const portfolio = getPortfolio(userId);
    if (!portfolio) return { success: false, error: 'Portefeuille non trouvé' };
    
    const price = getCurrentPrice(marketId);
    const total = quantity * price;
    const fees = total * 0.001; // 0.1% frais
    const totalWithFees = total + fees;
    
    if (totalWithFees > portfolio.current_balance) {
      return { success: false, error: 'Solde insuffisant', required: totalWithFees, available: portfolio.current_balance };
    }
    
    // Mettre à jour le solde
    db.prepare('UPDATE portfolios SET current_balance = current_balance - ? WHERE id = ?')
      .run(totalWithFees, portfolio.id);
    
    // Ajouter ou mettre à jour le holding
    const existingHolding = db.prepare(
      'SELECT * FROM portfolio_holdings WHERE portfolio_id = ? AND market_id = ?'
    ).get(portfolio.id, marketId);
    
    if (existingHolding) {
      const newQuantity = existingHolding.quantity + quantity;
      const newAvgPrice = ((existingHolding.quantity * existingHolding.average_price) + total) / newQuantity;
      
      db.prepare(`
        UPDATE portfolio_holdings SET quantity = ?, average_price = ?, current_price = ?
        WHERE id = ?
      `).run(newQuantity, newAvgPrice, price, existingHolding.id);
    } else {
      db.prepare(`
        INSERT INTO portfolio_holdings (portfolio_id, market_id, quantity, average_price, current_price)
        VALUES (?, ?, ?, ?, ?)
      `).run(portfolio.id, marketId, quantity, price, price);
    }
    
    // Enregistrer la transaction
    db.prepare(`
      INSERT INTO portfolio_transactions (portfolio_id, type, market_id, quantity, price, total, fees)
      VALUES (?, 'BUY', ?, ?, ?, ?, ?)
    `).run(portfolio.id, marketId, quantity, price, total, fees);
    
    return {
      success: true,
      message: `Achat de ${quantity} ${marketId.toUpperCase()} à ${price}`,
      transaction: { type: 'BUY', marketId, quantity, price, total, fees }
    };
  } catch(e) {
    console.error('Buy error:', e.message);
    return { success: false, error: e.message };
  }
}

// Vendre
function sellMarket(userId = 'default', marketId, quantity) {
  if (!db) return { success: false, error: 'DB non disponible' };
  
  try {
    const portfolio = getPortfolio(userId);
    if (!portfolio) return { success: false, error: 'Portefeuille non trouvé' };
    
    const holding = portfolio.holdings.find(h => h.market_id === marketId);
    if (!holding) return { success: false, error: 'Vous ne possédez pas cet actif' };
    if (holding.quantity < quantity) return { success: false, error: 'Quantité insuffisante', available: holding.quantity };
    
    const price = getCurrentPrice(marketId);
    const total = quantity * price;
    const fees = total * 0.001;
    const totalAfterFees = total - fees;
    
    // Mettre à jour le solde
    db.prepare('UPDATE portfolios SET current_balance = current_balance + ? WHERE id = ?')
      .run(totalAfterFees, portfolio.id);
    
    // Mettre à jour ou supprimer le holding
    const newQuantity = holding.quantity - quantity;
    if (newQuantity <= 0) {
      db.prepare('DELETE FROM portfolio_holdings WHERE id = ?').run(holding.id);
    } else {
      db.prepare('UPDATE portfolio_holdings SET quantity = ?, current_price = ? WHERE id = ?')
        .run(newQuantity, price, holding.id);
    }
    
    // Enregistrer la transaction
    db.prepare(`
      INSERT INTO portfolio_transactions (portfolio_id, type, market_id, quantity, price, total, fees)
      VALUES (?, 'SELL', ?, ?, ?, ?, ?)
    `).run(portfolio.id, marketId, quantity, price, total, fees);
    
    const profit = (price - holding.average_price) * quantity;
    
    return {
      success: true,
      message: `Vente de ${quantity} ${marketId.toUpperCase()} à ${price}`,
      transaction: { type: 'SELL', marketId, quantity, price, total, fees, profit: +profit.toFixed(2) }
    };
  } catch(e) {
    console.error('Sell error:', e.message);
    return { success: false, error: e.message };
  }
}

// Historique des transactions
function getTransactions(userId = 'default', limit = 50) {
  if (!db) return [];
  
  try {
    const portfolio = db.prepare('SELECT id FROM portfolios WHERE user_id = ?').get(userId);
    if (!portfolio) return [];
    
    return db.prepare(`
      SELECT * FROM portfolio_transactions 
      WHERE portfolio_id = ? 
      ORDER BY executed_at DESC 
      LIMIT ?
    `).all(portfolio.id, limit);
  } catch(e) {
    return [];
  }
}

// Réinitialiser le portefeuille
function resetPortfolio(userId = 'default') {
  if (!db) return false;
  
  try {
    const portfolio = db.prepare('SELECT id FROM portfolios WHERE user_id = ?').get(userId);
    if (portfolio) {
      db.prepare('DELETE FROM portfolio_holdings WHERE portfolio_id = ?').run(portfolio.id);
      db.prepare('DELETE FROM portfolio_transactions WHERE portfolio_id = ?').run(portfolio.id);
      db.prepare('UPDATE portfolios SET current_balance = initial_balance WHERE id = ?').run(portfolio.id);
    }
    return true;
  } catch(e) {
    return false;
  }
}

// Watchlist
function getWatchlist(userId = 'default') {
  if (!db) return [];
  try {
    const items = db.prepare('SELECT * FROM watchlist WHERE user_id = ? ORDER BY added_at DESC').all(userId);
    return items.map(item => ({
      ...item,
      current_price: getCurrentPrice(item.market_id),
      market_info: MARKET_PRICES[item.market_id] || {}
    }));
  } catch(e) {
    return [];
  }
}

function addToWatchlist(userId = 'default', marketId) {
  if (!db) return false;
  try {
    db.prepare('INSERT OR IGNORE INTO watchlist (user_id, market_id) VALUES (?, ?)').run(userId, marketId);
    return true;
  } catch(e) {
    return false;
  }
}

function removeFromWatchlist(userId = 'default', marketId) {
  if (!db) return false;
  try {
    db.prepare('DELETE FROM watchlist WHERE user_id = ? AND market_id = ?').run(userId, marketId);
    return true;
  } catch(e) {
    return false;
  }
}

module.exports = {
  createPortfolio,
  getPortfolio,
  buyMarket,
  sellMarket,
  getTransactions,
  resetPortfolio,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getCurrentPrice,
  MARKET_PRICES
};
