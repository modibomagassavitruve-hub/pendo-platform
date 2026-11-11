/**
 * Advanced Order Management Service
 * Support for Limit, Stop, Stop-Limit, and Trailing Stop orders
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database configuration
const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

class OrderManagementService {
  constructor() {
    this.checkInterval = null;
    this.initialized = false;
    this.initialize();
  }

  /**
   * Initialize database tables for advanced orders
   */
  initialize() {
    try {
      // Table principale pour les ordres
      db.exec(`
        CREATE TABLE IF NOT EXISTS advanced_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          portfolio_id INTEGER NOT NULL,
          ticker TEXT NOT NULL,
          order_type TEXT NOT NULL CHECK(order_type IN ('market', 'limit', 'stop', 'stop_limit', 'trailing_stop')),
          side TEXT NOT NULL CHECK(side IN ('buy', 'sell')),
          quantity REAL NOT NULL,
          limit_price REAL,
          stop_price REAL,
          trailing_amount REAL,
          trailing_percent REAL,
          current_high REAL,
          current_low REAL,
          time_in_force TEXT DEFAULT 'GTC' CHECK(time_in_force IN ('GTC', 'DAY', 'IOC', 'FOK')),
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partially_filled', 'filled', 'cancelled', 'expired', 'rejected')),
          filled_quantity REAL DEFAULT 0,
          average_fill_price REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          filled_at TEXT,
          cancelled_at TEXT,
          expires_at TEXT,
          notes TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
        );
      `);

      // Index pour optimiser les recherches
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_advanced_orders_status ON advanced_orders(status);
        CREATE INDEX IF NOT EXISTS idx_advanced_orders_ticker ON advanced_orders(ticker, status);
        CREATE INDEX IF NOT EXISTS idx_advanced_orders_user ON advanced_orders(user_id, status);
        CREATE INDEX IF NOT EXISTS idx_advanced_orders_type ON advanced_orders(order_type, status);
      `);

      // Table pour l'historique d'exécution partielle
      db.exec(`
        CREATE TABLE IF NOT EXISTS order_executions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          quantity REAL NOT NULL,
          price REAL NOT NULL,
          executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          commission REAL DEFAULT 0,
          notes TEXT,
          FOREIGN KEY (order_id) REFERENCES advanced_orders(id)
        );
      `);

      // Table pour les logs d'ordres
      db.exec(`
        CREATE TABLE IF NOT EXISTS order_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          old_status TEXT,
          new_status TEXT,
          message TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES advanced_orders(id)
        );
      `);

      this.initialized = true;
      console.log('✅ Advanced Order Management tables initialized');
    } catch (error) {
      console.error('❌ Error initializing order tables:', error.message);
    }
  }

  /**
   * Create a Limit Order
   * Buy/Sell at specific price or better
   */
  createLimitOrder(userId, portfolioId, ticker, side, quantity, limitPrice, timeInForce = 'GTC') {
    try {
      const stmt = db.prepare(`
        INSERT INTO advanced_orders (
          user_id, portfolio_id, ticker, order_type, side,
          quantity, limit_price, time_in_force
        ) VALUES (?, ?, ?, 'limit', ?, ?, ?, ?)
      `);

      const result = stmt.run(userId, portfolioId, ticker, side, quantity, limitPrice, timeInForce);

      this.logOrder(result.lastInsertRowid, 'created', null, 'pending', `Limit ${side} order created`);

      console.log(`📊 Limit Order créé: ${side.toUpperCase()} ${quantity} ${ticker} @ ${limitPrice}`);

      return {
        success: true,
        orderId: result.lastInsertRowid,
        orderType: 'limit',
        ticker,
        side,
        quantity,
        limitPrice,
        timeInForce
      };
    } catch (error) {
      console.error('Error creating limit order:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a Stop Order (Stop Market)
   * Becomes market order when stop price is reached
   */
  createStopOrder(userId, portfolioId, ticker, side, quantity, stopPrice, timeInForce = 'GTC') {
    try {
      const stmt = db.prepare(`
        INSERT INTO advanced_orders (
          user_id, portfolio_id, ticker, order_type, side,
          quantity, stop_price, time_in_force
        ) VALUES (?, ?, ?, 'stop', ?, ?, ?, ?)
      `);

      const result = stmt.run(userId, portfolioId, ticker, side, quantity, stopPrice, timeInForce);

      this.logOrder(result.lastInsertRowid, 'created', null, 'pending', `Stop ${side} order created`);

      console.log(`🛑 Stop Order créé: ${side.toUpperCase()} ${quantity} ${ticker} @ ${stopPrice}`);

      return {
        success: true,
        orderId: result.lastInsertRowid,
        orderType: 'stop',
        ticker,
        side,
        quantity,
        stopPrice,
        timeInForce
      };
    } catch (error) {
      console.error('Error creating stop order:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a Stop-Limit Order
   * Becomes limit order when stop price is reached
   */
  createStopLimitOrder(userId, portfolioId, ticker, side, quantity, stopPrice, limitPrice, timeInForce = 'GTC') {
    try {
      const stmt = db.prepare(`
        INSERT INTO advanced_orders (
          user_id, portfolio_id, ticker, order_type, side,
          quantity, stop_price, limit_price, time_in_force
        ) VALUES (?, ?, ?, 'stop_limit', ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(userId, portfolioId, ticker, side, quantity, stopPrice, limitPrice, timeInForce);

      this.logOrder(result.lastInsertRowid, 'created', null, 'pending', `Stop-Limit ${side} order created`);

      console.log(`🎯 Stop-Limit Order créé: ${side.toUpperCase()} ${quantity} ${ticker} Stop@${stopPrice} Limit@${limitPrice}`);

      return {
        success: true,
        orderId: result.lastInsertRowid,
        orderType: 'stop_limit',
        ticker,
        side,
        quantity,
        stopPrice,
        limitPrice,
        timeInForce
      };
    } catch (error) {
      console.error('Error creating stop-limit order:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a Trailing Stop Order
   * Stop price follows the market price by a fixed amount or percentage
   */
  createTrailingStopOrder(userId, portfolioId, ticker, side, quantity, trailingAmount = null, trailingPercent = null, timeInForce = 'GTC') {
    if (!trailingAmount && !trailingPercent) {
      return { success: false, error: 'Must provide either trailingAmount or trailingPercent' };
    }

    try {
      // Get current price to initialize trailing stop
      const currentPrice = this.getCurrentPrice(ticker);
      if (!currentPrice) {
        return { success: false, error: 'Could not get current price' };
      }

      // Calculate initial stop price
      let stopPrice;
      if (side === 'sell') {
        // For sell orders, trail below the high
        if (trailingAmount) {
          stopPrice = currentPrice - trailingAmount;
        } else {
          stopPrice = currentPrice * (1 - trailingPercent / 100);
        }
      } else {
        // For buy orders, trail above the low
        if (trailingAmount) {
          stopPrice = currentPrice + trailingAmount;
        } else {
          stopPrice = currentPrice * (1 + trailingPercent / 100);
        }
      }

      const stmt = db.prepare(`
        INSERT INTO advanced_orders (
          user_id, portfolio_id, ticker, order_type, side,
          quantity, stop_price, trailing_amount, trailing_percent,
          current_high, current_low, time_in_force
        ) VALUES (?, ?, ?, 'trailing_stop', ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        userId, portfolioId, ticker, side, quantity, stopPrice,
        trailingAmount, trailingPercent, currentPrice, currentPrice, timeInForce
      );

      this.logOrder(result.lastInsertRowid, 'created', null, 'pending', `Trailing Stop ${side} order created`);

      console.log(`📈 Trailing Stop Order créé: ${side.toUpperCase()} ${quantity} ${ticker} Trail=${trailingAmount || trailingPercent + '%'}`);

      return {
        success: true,
        orderId: result.lastInsertRowid,
        orderType: 'trailing_stop',
        ticker,
        side,
        quantity,
        initialStopPrice: stopPrice,
        trailingAmount,
        trailingPercent,
        timeInForce
      };
    } catch (error) {
      console.error('Error creating trailing stop order:', error.message);
      return { success: false, error: error.message };
    }
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
   * Check all pending orders and execute if conditions are met
   */
  checkOrders() {
    try {
      const pendingOrders = db.prepare(`
        SELECT * FROM advanced_orders
        WHERE status IN ('pending', 'partially_filled')
        ORDER BY created_at ASC
      `).all();

      if (pendingOrders.length === 0) {
        return { checked: 0, executed: 0 };
      }

      let executedCount = 0;

      pendingOrders.forEach(order => {
        const currentPrice = this.getCurrentPrice(order.ticker);
        if (!currentPrice) return;

        let shouldExecute = false;
        let executionPrice = currentPrice;

        switch (order.order_type) {
          case 'limit':
            shouldExecute = this.checkLimitOrder(order, currentPrice);
            executionPrice = order.limit_price;
            break;

          case 'stop':
            shouldExecute = this.checkStopOrder(order, currentPrice);
            executionPrice = currentPrice; // Market price
            break;

          case 'stop_limit':
            shouldExecute = this.checkStopLimitOrder(order, currentPrice);
            executionPrice = order.limit_price;
            break;

          case 'trailing_stop':
            const trailResult = this.checkTrailingStopOrder(order, currentPrice);
            shouldExecute = trailResult.shouldExecute;
            if (trailResult.updated) {
              // Update trailing stop price
              db.prepare(`
                UPDATE advanced_orders
                SET stop_price = ?, current_high = ?, current_low = ?, updated_at = datetime('now')
                WHERE id = ?
              `).run(trailResult.newStopPrice, trailResult.newHigh, trailResult.newLow, order.id);
            }
            executionPrice = currentPrice;
            break;
        }

        if (shouldExecute) {
          this.executeOrder(order, executionPrice);
          executedCount++;
        }
      });

      return {
        checked: pendingOrders.length,
        executed: executedCount
      };
    } catch (error) {
      console.error('Error checking orders:', error.message);
      return { checked: 0, executed: 0, error: error.message };
    }
  }

  /**
   * Check if limit order should be executed
   */
  checkLimitOrder(order, currentPrice) {
    if (order.side === 'buy') {
      // Buy limit: execute when market price <= limit price
      return currentPrice <= order.limit_price;
    } else {
      // Sell limit: execute when market price >= limit price
      return currentPrice >= order.limit_price;
    }
  }

  /**
   * Check if stop order should be executed
   */
  checkStopOrder(order, currentPrice) {
    if (order.side === 'sell') {
      // Sell stop: execute when price falls to or below stop price
      return currentPrice <= order.stop_price;
    } else {
      // Buy stop: execute when price rises to or above stop price
      return currentPrice >= order.stop_price;
    }
  }

  /**
   * Check if stop-limit order should be executed
   */
  checkStopLimitOrder(order, currentPrice) {
    // First check if stop is triggered
    const stopTriggered = this.checkStopOrder(order, currentPrice);
    if (!stopTriggered) return false;

    // Then check if limit conditions are met
    return this.checkLimitOrder(order, currentPrice);
  }

  /**
   * Check and update trailing stop order
   */
  checkTrailingStopOrder(order, currentPrice) {
    let newHigh = order.current_high;
    let newLow = order.current_low;
    let newStopPrice = order.stop_price;
    let updated = false;

    if (order.side === 'sell') {
      // For sell orders, trail below the high
      if (currentPrice > newHigh) {
        newHigh = currentPrice;
        if (order.trailing_amount) {
          newStopPrice = newHigh - order.trailing_amount;
        } else {
          newStopPrice = newHigh * (1 - order.trailing_percent / 100);
        }
        updated = true;
      }

      // Check if stop is hit
      const shouldExecute = currentPrice <= newStopPrice;
      return { shouldExecute, updated, newStopPrice, newHigh, newLow };

    } else {
      // For buy orders, trail above the low
      if (currentPrice < newLow) {
        newLow = currentPrice;
        if (order.trailing_amount) {
          newStopPrice = newLow + order.trailing_amount;
        } else {
          newStopPrice = newLow * (1 + order.trailing_percent / 100);
        }
        updated = true;
      }

      // Check if stop is hit
      const shouldExecute = currentPrice >= newStopPrice;
      return { shouldExecute, updated, newStopPrice, newHigh, newLow };
    }
  }

  /**
   * Execute an order
   */
  executeOrder(order, executionPrice) {
    try {
      db.transaction(() => {
        // Update order status
        db.prepare(`
          UPDATE advanced_orders
          SET status = 'filled',
              filled_quantity = quantity,
              average_fill_price = ?,
              filled_at = datetime('now'),
              updated_at = datetime('now')
          WHERE id = ?
        `).run(executionPrice, order.id);

        // Record execution
        db.prepare(`
          INSERT INTO order_executions (order_id, quantity, price)
          VALUES (?, ?, ?)
        `).run(order.id, order.quantity, executionPrice);

        // Log execution
        this.logOrder(order.id, 'executed', 'pending', 'filled', `Order executed at ${executionPrice}`);

        // Execute portfolio transaction
        const totalAmount = order.quantity * executionPrice;

        if (order.side === 'buy') {
          // Buy: add to position
          db.prepare(`
            INSERT INTO portfolio_transactions (portfolio_id, ticker, type, quantity, price, total, notes)
            VALUES (?, ?, 'buy', ?, ?, ?, ?)
          `).run(
            order.portfolio_id,
            order.ticker,
            order.quantity,
            executionPrice,
            totalAmount,
            `Auto ${order.order_type} order executed`
          );
        } else {
          // Sell: reduce position
          db.prepare(`
            INSERT INTO portfolio_transactions (portfolio_id, ticker, type, quantity, price, total, notes)
            VALUES (?, ?, 'sell', ?, ?, ?, ?)
          `).run(
            order.portfolio_id,
            order.ticker,
            order.quantity,
            executionPrice,
            totalAmount,
            `Auto ${order.order_type} order executed`
          );
        }

        console.log(`✅ Order #${order.id} EXECUTED: ${order.side.toUpperCase()} ${order.quantity} ${order.ticker} @ ${executionPrice}`);
      })();

      return { success: true };
    } catch (error) {
      console.error('Error executing order:', error.message);
      this.logOrder(order.id, 'execution_failed', order.status, order.status, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId, reason = 'User cancelled') {
    try {
      const result = db.prepare(`
        UPDATE advanced_orders
        SET status = 'cancelled',
            cancelled_at = datetime('now'),
            updated_at = datetime('now'),
            notes = ?
        WHERE id = ? AND status IN ('pending', 'partially_filled')
      `).run(reason, orderId);

      if (result.changes > 0) {
        this.logOrder(orderId, 'cancelled', 'pending', 'cancelled', reason);
        return { success: true, message: 'Order cancelled' };
      }

      return { success: false, message: 'Order not found or already executed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get orders for a user
   */
  getOrders(userId, portfolioId = null, status = null, orderType = null) {
    try {
      let query = 'SELECT * FROM advanced_orders WHERE user_id = ?';
      const params = [userId];

      if (portfolioId) {
        query += ' AND portfolio_id = ?';
        params.push(portfolioId);
      }

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      if (orderType) {
        query += ' AND order_type = ?';
        params.push(orderType);
      }

      query += ' ORDER BY created_at DESC';

      return db.prepare(query).all(...params);
    } catch (error) {
      console.error('Error getting orders:', error.message);
      return [];
    }
  }

  /**
   * Get order executions
   */
  getExecutions(orderId) {
    try {
      return db.prepare(`
        SELECT * FROM order_executions
        WHERE order_id = ?
        ORDER BY executed_at DESC
      `).all(orderId);
    } catch (error) {
      console.error('Error getting executions:', error.message);
      return [];
    }
  }

  /**
   * Log order action
   */
  logOrder(orderId, action, oldStatus, newStatus, message) {
    try {
      db.prepare(`
        INSERT INTO order_logs (order_id, action, old_status, new_status, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(orderId, action, oldStatus, newStatus, message);
    } catch (error) {
      console.error('Error logging order:', error.message);
    }
  }

  /**
   * Get order statistics
   */
  getStats(userId) {
    try {
      return db.prepare(`
        SELECT
          order_type,
          status,
          COUNT(*) as count,
          SUM(quantity) as total_quantity,
          AVG(average_fill_price) as avg_fill_price
        FROM advanced_orders
        WHERE user_id = ?
        GROUP BY order_type, status
      `).all(userId);
    } catch (error) {
      console.error('Error getting stats:', error.message);
      return [];
    }
  }

  /**
   * Start automatic order checking
   */
  start(intervalMs = 60000) {
    if (this.checkInterval) {
      console.log('⚠️  Order checking already running');
      return;
    }

    this.checkInterval = setInterval(() => {
      const result = this.checkOrders();
      if (result.executed > 0) {
        console.log(`🔔 ${result.executed} order(s) executed (checked ${result.checked})`);
      }
    }, intervalMs);

    console.log(`🚀 Advanced Order Management started (checking every ${intervalMs/1000}s)`);
  }

  /**
   * Stop automatic order checking
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏸️  Order checking stopped');
    }
  }
}

module.exports = OrderManagementService;
