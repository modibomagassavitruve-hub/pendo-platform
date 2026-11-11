/**
 * Stop Loss / Take Profit Service
 * Automatically monitor and execute SL/TP orders
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database configuration
const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

class StopLossService {
  constructor() {
    this.checkInterval = null;
    this.initialized = false;
    this.initialize();
  }

  /**
   * Initialize database tables for SL/TP orders
   */
  initialize() {
    try {
      // Table pour stocker les ordres SL/TP
      db.exec(`
        CREATE TABLE IF NOT EXISTS stop_loss_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          portfolio_id INTEGER NOT NULL,
          position_id INTEGER,
          ticker TEXT NOT NULL,
          order_type TEXT NOT NULL CHECK(order_type IN ('stop_loss', 'take_profit')),
          trigger_price REAL NOT NULL,
          quantity REAL NOT NULL,
          entry_price REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          triggered_at TEXT,
          executed_at TEXT,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'triggered', 'executed', 'cancelled', 'expired')),
          execution_price REAL,
          notes TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
        );
      `);

      // Index pour optimiser les recherches
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_stop_loss_status ON stop_loss_orders(status);
        CREATE INDEX IF NOT EXISTS idx_stop_loss_ticker ON stop_loss_orders(ticker, status);
        CREATE INDEX IF NOT EXISTS idx_stop_loss_user ON stop_loss_orders(user_id, status);
      `);

      // Table pour l'historique d'exécution
      db.exec(`
        CREATE TABLE IF NOT EXISTS stop_loss_executions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          ticker TEXT NOT NULL,
          order_type TEXT NOT NULL,
          trigger_price REAL NOT NULL,
          actual_price REAL NOT NULL,
          quantity REAL NOT NULL,
          profit_loss REAL,
          profit_loss_percent REAL,
          executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          FOREIGN KEY (order_id) REFERENCES stop_loss_orders(id)
        );
      `);

      this.initialized = true;
      console.log('✅ Stop Loss/Take Profit tables initialized');
    } catch (error) {
      console.error('❌ Error initializing SL/TP tables:', error.message);
    }
  }

  /**
   * Create a Stop Loss order
   * @param {number} userId - User ID
   * @param {number} portfolioId - Portfolio ID
   * @param {string} ticker - Stock ticker
   * @param {number} quantity - Quantity to sell
   * @param {number} stopPrice - Stop loss trigger price
   * @param {number} entryPrice - Original entry price (optional)
   */
  createStopLoss(userId, portfolioId, ticker, quantity, stopPrice, entryPrice = null) {
    try {
      const stmt = db.prepare(`
        INSERT INTO stop_loss_orders (
          user_id, portfolio_id, ticker, order_type,
          trigger_price, quantity, entry_price
        ) VALUES (?, ?, ?, 'stop_loss', ?, ?, ?)
      `);

      const result = stmt.run(userId, portfolioId, ticker, stopPrice, quantity, entryPrice);

      console.log(`📉 Stop Loss créé: ${ticker} @ ${stopPrice} (qty: ${quantity})`);

      return {
        success: true,
        orderId: result.lastInsertRowid,
        ticker,
        orderType: 'stop_loss',
        triggerPrice: stopPrice,
        quantity,
        entryPrice
      };
    } catch (error) {
      console.error('Error creating stop loss:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a Take Profit order
   * @param {number} userId - User ID
   * @param {number} portfolioId - Portfolio ID
   * @param {string} ticker - Stock ticker
   * @param {number} quantity - Quantity to sell
   * @param {number} profitPrice - Take profit trigger price
   * @param {number} entryPrice - Original entry price (optional)
   */
  createTakeProfit(userId, portfolioId, ticker, quantity, profitPrice, entryPrice = null) {
    try {
      const stmt = db.prepare(`
        INSERT INTO stop_loss_orders (
          user_id, portfolio_id, ticker, order_type,
          trigger_price, quantity, entry_price
        ) VALUES (?, ?, ?, 'take_profit', ?, ?, ?)
      `);

      const result = stmt.run(userId, portfolioId, ticker, profitPrice, quantity, entryPrice);

      console.log(`📈 Take Profit créé: ${ticker} @ ${profitPrice} (qty: ${quantity})`);

      return {
        success: true,
        orderId: result.lastInsertRowid,
        ticker,
        orderType: 'take_profit',
        triggerPrice: profitPrice,
        quantity,
        entryPrice
      };
    } catch (error) {
      console.error('Error creating take profit:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create both SL and TP orders for a position
   * @param {number} userId
   * @param {number} portfolioId
   * @param {string} ticker
   * @param {number} quantity
   * @param {number} entryPrice
   * @param {number} stopLossPercent - Percentage below entry (e.g., 5 for -5%)
   * @param {number} takeProfitPercent - Percentage above entry (e.g., 10 for +10%)
   */
  createBracketOrder(userId, portfolioId, ticker, quantity, entryPrice, stopLossPercent, takeProfitPercent) {
    const stopPrice = entryPrice * (1 - stopLossPercent / 100);
    const profitPrice = entryPrice * (1 + takeProfitPercent / 100);

    const sl = this.createStopLoss(userId, portfolioId, ticker, quantity, stopPrice, entryPrice);
    const tp = this.createTakeProfit(userId, portfolioId, ticker, quantity, profitPrice, entryPrice);

    return {
      success: sl.success && tp.success,
      stopLoss: sl,
      takeProfit: tp,
      bracket: {
        entry: entryPrice,
        stopLoss: stopPrice,
        takeProfit: profitPrice,
        riskRewardRatio: takeProfitPercent / stopLossPercent
      }
    };
  }

  /**
   * Get current stock price
   */
  getCurrentPrice(ticker) {
    try {
      const stock = db.prepare(`
        SELECT price FROM stocks WHERE UPPER(symbol) = UPPER(?) LIMIT 1
      `).get(ticker);

      return stock ? parseFloat(stock.price) : null;
    } catch (error) {
      console.error(`Error getting price for ${ticker}:`, error.message);
      return null;
    }
  }

  /**
   * Check all active orders and execute if triggered
   */
  checkOrders() {
    try {
      // Get all active SL/TP orders
      const activeOrders = db.prepare(`
        SELECT * FROM stop_loss_orders
        WHERE status = 'active'
        ORDER BY created_at ASC
      `).all();

      if (activeOrders.length === 0) {
        return { checked: 0, triggered: 0 };
      }

      let triggeredCount = 0;

      activeOrders.forEach(order => {
        const currentPrice = this.getCurrentPrice(order.ticker);

        if (!currentPrice) {
          return; // Skip if price not available
        }

        let shouldTrigger = false;

        // Check if trigger conditions are met
        if (order.order_type === 'stop_loss') {
          // Stop loss triggers when price falls to or below trigger price
          shouldTrigger = currentPrice <= order.trigger_price;
        } else if (order.order_type === 'take_profit') {
          // Take profit triggers when price rises to or above trigger price
          shouldTrigger = currentPrice >= order.trigger_price;
        }

        if (shouldTrigger) {
          this.executeOrder(order, currentPrice);
          triggeredCount++;
        }
      });

      return {
        checked: activeOrders.length,
        triggered: triggeredCount
      };
    } catch (error) {
      console.error('Error checking orders:', error.message);
      return { checked: 0, triggered: 0, error: error.message };
    }
  }

  /**
   * Execute a triggered order
   */
  executeOrder(order, executionPrice) {
    try {
      const db = new Database(dbPath);

      db.transaction(() => {
        // 1. Update order status
        db.prepare(`
          UPDATE stop_loss_orders
          SET status = 'executed',
              triggered_at = datetime('now'),
              executed_at = datetime('now'),
              execution_price = ?
          WHERE id = ?
        `).run(executionPrice, order.id);

        // 2. Calculate profit/loss
        let profitLoss = null;
        let profitLossPercent = null;

        if (order.entry_price) {
          profitLoss = (executionPrice - order.entry_price) * order.quantity;
          profitLossPercent = ((executionPrice - order.entry_price) / order.entry_price) * 100;
        }

        // 3. Record execution
        db.prepare(`
          INSERT INTO stop_loss_executions (
            order_id, ticker, order_type, trigger_price,
            actual_price, quantity, profit_loss, profit_loss_percent
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          order.id,
          order.ticker,
          order.order_type,
          order.trigger_price,
          executionPrice,
          order.quantity,
          profitLoss,
          profitLossPercent
        );

        // 4. Execute sell in portfolio (if position exists)
        const position = db.prepare(`
          SELECT * FROM portfolio_positions
          WHERE portfolio_id = ? AND ticker = ? AND quantity > 0
        `).get(order.portfolio_id, order.ticker);

        if (position) {
          // Update position
          const newQuantity = position.quantity - order.quantity;

          if (newQuantity <= 0) {
            // Close position completely
            db.prepare(`
              DELETE FROM portfolio_positions
              WHERE id = ?
            `).run(position.id);
          } else {
            // Reduce quantity
            db.prepare(`
              UPDATE portfolio_positions
              SET quantity = ?
              WHERE id = ?
            `).run(newQuantity, position.id);
          }

          // Record transaction
          db.prepare(`
            INSERT INTO portfolio_transactions (
              portfolio_id, ticker, type, quantity, price, total, notes
            ) VALUES (?, ?, 'sell', ?, ?, ?, ?)
          `).run(
            order.portfolio_id,
            order.ticker,
            order.quantity,
            executionPrice,
            order.quantity * executionPrice,
            `Auto ${order.order_type} exécuté`
          );
        }

        const icon = order.order_type === 'stop_loss' ? '🛑' : '💰';
        console.log(`${icon} ${order.order_type.toUpperCase()} EXECUTED: ${order.ticker} @ ${executionPrice} (qty: ${order.quantity})`);

        if (profitLoss !== null) {
          const sign = profitLoss >= 0 ? '+' : '';
          console.log(`   P/L: ${sign}${profitLoss.toFixed(2)} (${sign}${profitLossPercent.toFixed(2)}%)`);
        }
      })();

    } catch (error) {
      console.error('Error executing order:', error.message);
    }
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId) {
    try {
      const result = db.prepare(`
        UPDATE stop_loss_orders
        SET status = 'cancelled'
        WHERE id = ? AND status = 'active'
      `).run(orderId);

      return {
        success: result.changes > 0,
        message: result.changes > 0 ? 'Order cancelled' : 'Order not found or already executed'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get orders for a user/portfolio
   */
  getOrders(userId, portfolioId = null, status = null) {
    try {
      let query = 'SELECT * FROM stop_loss_orders WHERE user_id = ?';
      const params = [userId];

      if (portfolioId) {
        query += ' AND portfolio_id = ?';
        params.push(portfolioId);
      }

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      return db.prepare(query).all(...params);
    } catch (error) {
      console.error('Error getting orders:', error.message);
      return [];
    }
  }

  /**
   * Get execution history
   */
  getExecutions(userId, limit = 50) {
    try {
      const executions = db.prepare(`
        SELECT e.*, o.user_id, o.portfolio_id
        FROM stop_loss_executions e
        JOIN stop_loss_orders o ON e.order_id = o.id
        WHERE o.user_id = ?
        ORDER BY e.executed_at DESC
        LIMIT ?
      `).all(userId, limit);

      return executions;
    } catch (error) {
      console.error('Error getting executions:', error.message);
      return [];
    }
  }

  /**
   * Get statistics for a user
   */
  getStats(userId) {
    try {
      const stats = db.prepare(`
        SELECT
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_orders,
          COUNT(CASE WHEN status = 'executed' THEN 1 END) as executed_orders,
          COUNT(CASE WHEN order_type = 'stop_loss' THEN 1 END) as stop_loss_orders,
          COUNT(CASE WHEN order_type = 'take_profit' THEN 1 END) as take_profit_orders
        FROM stop_loss_orders
        WHERE user_id = ?
      `).get(userId);

      const executionStats = db.prepare(`
        SELECT
          COUNT(*) as total_executions,
          SUM(CASE WHEN profit_loss > 0 THEN 1 ELSE 0 END) as profitable,
          SUM(CASE WHEN profit_loss < 0 THEN 1 ELSE 0 END) as losses,
          SUM(profit_loss) as total_profit_loss,
          AVG(profit_loss) as avg_profit_loss,
          AVG(profit_loss_percent) as avg_profit_loss_percent
        FROM stop_loss_executions e
        JOIN stop_loss_orders o ON e.order_id = o.id
        WHERE o.user_id = ? AND e.profit_loss IS NOT NULL
      `).get(userId);

      return {
        ...stats,
        executions: executionStats
      };
    } catch (error) {
      console.error('Error getting stats:', error.message);
      return null;
    }
  }

  /**
   * Start automatic monitoring
   * @param {number} intervalMs - Check interval in milliseconds (default: 60000 = 1 minute)
   */
  start(intervalMs = 60000) {
    if (this.checkInterval) {
      console.log('⚠️  SL/TP monitoring already running');
      return;
    }

    this.checkInterval = setInterval(() => {
      const result = this.checkOrders();

      if (result.triggered > 0) {
        console.log(`🔔 ${result.triggered} order(s) triggered (checked ${result.checked})`);
      }
    }, intervalMs);

    console.log(`🚀 Stop Loss/Take Profit monitoring started (checking every ${intervalMs/1000}s)`);
  }

  /**
   * Stop automatic monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏸️  SL/TP monitoring stopped');
    }
  }
}

module.exports = StopLossService;
