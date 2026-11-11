/**
 * PENDO - Broker Simulator Service
 * Simule un broker réel (SGI Afrique, Attijari, EDC Investment, etc.)
 * Pour testing, démos, et MVP avant partenariat broker officiel
 *
 * Simule:
 * - Exécution trades (market, limit, stop orders)
 * - Slippage réaliste
 * - Rejects (insufficient funds, market closed, etc.)
 * - Settlement T+3 BRVM
 * - Broker confirmations
 * - Custody management
 */

const Database = require('better-sqlite3');

class BrokerSimulatorService {
  constructor(db) {
    this.db = db || new Database('pendo.db');
    this.brokerName = 'PENDO Broker Simulator';
    this.brokerCode = 'PBS001';
    this.initializeTables();
  }

  /**
   * Initialiser les tables broker
   */
  initializeTables() {
    // Table 1: Broker Accounts (comptes de courtage)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS broker_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        broker_account_number TEXT UNIQUE NOT NULL,
        broker_name TEXT DEFAULT 'PENDO Broker Simulator',
        account_status TEXT DEFAULT 'active', -- 'active', 'suspended', 'closed'
        opened_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_broker_accounts_user ON broker_accounts(user_id);
    `);

    // Table 2: Trade Executions (exécutions de trades)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trade_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_id INTEGER,
        stock_symbol TEXT NOT NULL,
        trade_type TEXT NOT NULL, -- 'buy', 'sell'
        order_type TEXT NOT NULL, -- 'market', 'limit', 'stop', 'stop_limit'
        quantity REAL NOT NULL,
        requested_price REAL,
        executed_price REAL NOT NULL,
        total_amount REAL NOT NULL,
        commission REAL DEFAULT 0,
        fees REAL DEFAULT 0,
        slippage REAL DEFAULT 0,
        execution_status TEXT DEFAULT 'pending', -- 'pending', 'executed', 'partially_filled', 'rejected', 'cancelled'
        rejection_reason TEXT,
        broker_confirmation_id TEXT,
        exchange TEXT DEFAULT 'BRVM',
        trade_date TEXT NOT NULL,
        settlement_date TEXT NOT NULL, -- T+3
        executed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_trade_executions_user ON trade_executions(user_id);
      CREATE INDEX IF NOT EXISTS idx_trade_executions_symbol ON trade_executions(stock_symbol);
      CREATE INDEX IF NOT EXISTS idx_trade_executions_date ON trade_executions(trade_date);
    `);

    // Table 3: Custody Positions (positions en garde/custody)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS custody_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        stock_symbol TEXT NOT NULL,
        quantity REAL NOT NULL,
        average_cost REAL NOT NULL,
        total_cost REAL NOT NULL,
        custodian TEXT DEFAULT 'PENDO Broker Simulator',
        last_updated TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, stock_symbol)
      );
      CREATE INDEX IF NOT EXISTS idx_custody_user_symbol ON custody_positions(user_id, stock_symbol);
    `);

    // Table 4: Market Data (prix marché simulés)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS simulated_market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stock_symbol TEXT NOT NULL,
        bid_price REAL NOT NULL,
        ask_price REAL NOT NULL,
        last_price REAL NOT NULL,
        spread REAL NOT NULL,
        volume INTEGER DEFAULT 0,
        timestamp TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON simulated_market_data(stock_symbol);
    `);

    // Table 5: Broker Configuration
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS broker_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_key TEXT UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Insérer configuration par défaut
    this.initializeConfig();

    console.log('✅ Tables Broker Simulator initialisées');
  }

  /**
   * Initialiser configuration broker
   */
  initializeConfig() {
    const configs = [
      { key: 'commission_rate', value: '0.001', description: 'Commission rate (0.1%)' },
      { key: 'min_commission', value: '5000', description: 'Minimum commission 5,000 FCFA' },
      { key: 'slippage_pct', value: '0.0005', description: 'Slippage 0.05%' },
      { key: 'market_open', value: '08:00', description: 'Market open time UTC' },
      { key: 'market_close', value: '16:30', description: 'Market close time UTC' },
      { key: 'settlement_days', value: '3', description: 'T+3 settlement' },
      { key: 'max_order_size', value: '10000000', description: 'Max order 10M FCFA' },
      { key: 'rejection_rate', value: '0.02', description: 'Random rejection 2%' }
    ];

    for (const config of configs) {
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO broker_config (config_key, config_value, description)
          VALUES (?, ?, ?)
        `).run(config.key, config.value, config.description);
      } catch (error) {
        // Ignore duplicates
      }
    }
  }

  /**
   * Créer compte broker pour utilisateur
   */
  createBrokerAccount(userId) {
    try {
      // Vérifier si compte existe déjà
      const existing = this.db.prepare(`
        SELECT * FROM broker_accounts WHERE user_id = ?
      `).get(userId);

      if (existing) {
        return {
          brokerAccountId: existing.id,
          brokerAccountNumber: existing.broker_account_number,
          status: 'existing'
        };
      }

      // Générer numéro de compte unique
      const accountNumber = `PBS${userId.toString().padStart(8, '0')}`;

      const result = this.db.prepare(`
        INSERT INTO broker_accounts (user_id, broker_account_number, broker_name)
        VALUES (?, ?, ?)
      `).run(userId, accountNumber, this.brokerName);

      return {
        brokerAccountId: result.lastInsertRowid,
        brokerAccountNumber: accountNumber,
        brokerName: this.brokerName,
        status: 'created'
      };
    } catch (error) {
      console.error('Erreur création compte broker:', error);
      throw error;
    }
  }

  /**
   * Obtenir prix marché actuel (simulé)
   */
  getMarketPrice(stockSymbol) {
    try {
      // Essayer d'obtenir depuis base de données réelle
      const stock = this.db.prepare(`
        SELECT current_price FROM stocks WHERE symbol = ?
      `).get(stockSymbol);

      if (!stock || !stock.current_price) {
        throw new Error(`Stock ${stockSymbol} introuvable`);
      }

      const lastPrice = stock.current_price;

      // Simuler spread bid/ask (0.1% typical BRVM)
      const spreadPct = 0.001;
      const spread = lastPrice * spreadPct;
      const bidPrice = lastPrice - spread / 2;
      const askPrice = lastPrice + spread / 2;

      return {
        symbol: stockSymbol,
        bidPrice,
        askPrice,
        lastPrice,
        spread,
        spreadPct
      };
    } catch (error) {
      console.error('Erreur récupération prix marché:', error);
      throw error;
    }
  }

  /**
   * Vérifier si marché est ouvert
   */
  isMarketOpen() {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();

    // BRVM: Lundi-Vendredi, 08:00-16:30 UTC (09:00-17:30 GMT+1 Abidjan)
    const isWeekday = day >= 1 && day <= 5;
    const isOpenHours = hour >= 8 && hour < 16;

    return isWeekday && isOpenHours;
  }

  /**
   * Calculer slippage réaliste
   */
  calculateSlippage(orderType, requestedPrice, marketPrice, quantity) {
    // Market orders: slippage basé sur spread et volume
    if (orderType === 'market') {
      const slippageConfig = parseFloat(this.getConfig('slippage_pct'));
      const slippage = marketPrice * slippageConfig;
      return slippage;
    }

    // Limit orders: pas de slippage (exécuté au prix limite ou mieux)
    return 0;
  }

  /**
   * Calculer commissions
   */
  calculateCommission(totalAmount) {
    const commissionRate = parseFloat(this.getConfig('commission_rate'));
    const minCommission = parseFloat(this.getConfig('min_commission'));

    const commission = Math.max(totalAmount * commissionRate, minCommission);
    return commission;
  }

  /**
   * Exécuter un trade (BUY ou SELL)
   */
  async executeTrade(userId, tradeParams) {
    try {
      const {
        stockSymbol,
        tradeType, // 'buy' or 'sell'
        orderType = 'market', // 'market', 'limit', 'stop', 'stop_limit'
        quantity,
        requestedPrice = null,
        orderId = null
      } = tradeParams;

      // Validation
      if (!stockSymbol || !tradeType || !quantity) {
        throw new Error('stockSymbol, tradeType et quantity requis');
      }

      if (quantity <= 0) {
        throw new Error('Quantity doit être > 0');
      }

      // Vérifier compte broker existe
      let brokerAccount = this.db.prepare(`
        SELECT * FROM broker_accounts WHERE user_id = ?
      `).get(userId);

      if (!brokerAccount) {
        const created = this.createBrokerAccount(userId);
        brokerAccount = this.db.prepare(`
          SELECT * FROM broker_accounts WHERE id = ?
        `).get(created.brokerAccountId);
      }

      // Vérifier si marché ouvert
      if (!this.isMarketOpen()) {
        return this.rejectTrade(userId, tradeParams, 'Market closed');
      }

      // Obtenir prix marché
      const marketData = this.getMarketPrice(stockSymbol);

      // Déterminer prix d'exécution
      let executedPrice;
      if (orderType === 'market') {
        // Market order: exécuté au ask (buy) ou bid (sell)
        executedPrice = tradeType === 'buy' ? marketData.askPrice : marketData.bidPrice;

        // Ajouter slippage
        const slippage = this.calculateSlippage(orderType, null, executedPrice, quantity);
        executedPrice += tradeType === 'buy' ? slippage : -slippage;
      } else if (orderType === 'limit') {
        // Limit order: exécuté au prix demandé si marché l'atteint
        if (!requestedPrice) {
          throw new Error('requestedPrice requis pour limit order');
        }

        // Simuler: 80% chance d'exécution si prix raisonnable
        const maxDeviation = marketData.lastPrice * 0.02; // 2% de déviation max
        const priceOk = Math.abs(requestedPrice - marketData.lastPrice) <= maxDeviation;
        const executed = priceOk && Math.random() > 0.2;

        if (!executed) {
          return this.rejectTrade(userId, tradeParams, 'Limit price not reached');
        }

        executedPrice = requestedPrice;
      } else {
        // Stop/Stop-limit: simplifier pour simulation
        executedPrice = requestedPrice || marketData.lastPrice;
      }

      // Calculer montant total
      const totalAmount = executedPrice * quantity;

      // Vérifier taille ordre max
      const maxOrderSize = parseFloat(this.getConfig('max_order_size'));
      if (totalAmount > maxOrderSize) {
        return this.rejectTrade(userId, tradeParams, 'Order size exceeds maximum');
      }

      // Calculer commission
      const commission = this.calculateCommission(totalAmount);
      const fees = commission * 0.1; // 10% de la commission en fees divers

      // Slippage pour le rapport
      const slippage = orderType === 'market'
        ? executedPrice - marketData.lastPrice
        : 0;

      // Simuler rejection aléatoire (2% des trades)
      const rejectionRate = parseFloat(this.getConfig('rejection_rate'));
      if (Math.random() < rejectionRate) {
        const reasons = [
          'Insufficient liquidity',
          'Price deviation too high',
          'System error',
          'Compliance check required'
        ];
        const reason = reasons[Math.floor(Math.random() * reasons.length)];
        return this.rejectTrade(userId, tradeParams, reason);
      }

      // Calculer dates
      const tradeDate = new Date().toISOString().split('T')[0];
      const settlementDays = parseInt(this.getConfig('settlement_days'));
      const settlementDate = new Date();
      settlementDate.setDate(settlementDate.getDate() + settlementDays);
      const settlementDateStr = settlementDate.toISOString().split('T')[0];

      // Générer broker confirmation ID
      const confirmationId = `${this.brokerCode}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Exécuter trade
      const execution = this.db.prepare(`
        INSERT INTO trade_executions (
          user_id, order_id, stock_symbol, trade_type, order_type,
          quantity, requested_price, executed_price, total_amount,
          commission, fees, slippage, execution_status,
          broker_confirmation_id, trade_date, settlement_date,
          executed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        userId, orderId, stockSymbol, tradeType, orderType,
        quantity, requestedPrice, executedPrice, totalAmount,
        commission, fees, slippage, 'executed',
        confirmationId, tradeDate, settlementDateStr
      );

      // Mettre à jour custody positions
      if (tradeType === 'buy') {
        this.updateCustodyBuy(userId, stockSymbol, quantity, executedPrice);
      } else {
        this.updateCustodySell(userId, stockSymbol, quantity);
      }

      // Mettre à jour user_stocks (pour compatibilité)
      this.updateUserStocks(userId, stockSymbol, tradeType, quantity, executedPrice);

      return {
        executionId: execution.lastInsertRowid,
        status: 'executed',
        brokerConfirmationId: confirmationId,
        stockSymbol,
        tradeType,
        quantity,
        executedPrice,
        totalAmount,
        commission,
        fees,
        slippage,
        tradeDate,
        settlementDate: settlementDateStr,
        message: `Trade executed successfully via ${this.brokerName}`
      };

    } catch (error) {
      console.error('Erreur exécution trade:', error);
      throw error;
    }
  }

  /**
   * Rejeter un trade
   */
  rejectTrade(userId, tradeParams, reason) {
    const { stockSymbol, tradeType, orderType, quantity, requestedPrice, orderId } = tradeParams;

    const rejection = this.db.prepare(`
      INSERT INTO trade_executions (
        user_id, order_id, stock_symbol, trade_type, order_type,
        quantity, requested_price, execution_status, rejection_reason
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'rejected', ?)
    `).run(
      userId, orderId, stockSymbol, tradeType, orderType,
      quantity, requestedPrice, reason
    );

    return {
      executionId: rejection.lastInsertRowid,
      status: 'rejected',
      reason,
      message: `Trade rejected: ${reason}`
    };
  }

  /**
   * Mettre à jour custody position (buy)
   */
  updateCustodyBuy(userId, stockSymbol, quantity, price) {
    try {
      const existing = this.db.prepare(`
        SELECT * FROM custody_positions
        WHERE user_id = ? AND stock_symbol = ?
      `).get(userId, stockSymbol);

      if (existing) {
        // Mettre à jour position existante (average cost)
        const newQuantity = existing.quantity + quantity;
        const newTotalCost = existing.total_cost + (quantity * price);
        const newAverageCost = newTotalCost / newQuantity;

        this.db.prepare(`
          UPDATE custody_positions
          SET quantity = ?,
              average_cost = ?,
              total_cost = ?,
              last_updated = datetime('now')
          WHERE user_id = ? AND stock_symbol = ?
        `).run(newQuantity, newAverageCost, newTotalCost, userId, stockSymbol);
      } else {
        // Créer nouvelle position
        this.db.prepare(`
          INSERT INTO custody_positions (user_id, stock_symbol, quantity, average_cost, total_cost)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, stockSymbol, quantity, price, quantity * price);
      }
    } catch (error) {
      console.error('Erreur mise à jour custody (buy):', error);
      throw error;
    }
  }

  /**
   * Mettre à jour custody position (sell)
   */
  updateCustodySell(userId, stockSymbol, quantity) {
    try {
      const existing = this.db.prepare(`
        SELECT * FROM custody_positions
        WHERE user_id = ? AND stock_symbol = ?
      `).get(userId, stockSymbol);

      if (!existing) {
        throw new Error(`Aucune position custody pour ${stockSymbol}`);
      }

      if (existing.quantity < quantity) {
        throw new Error(`Quantité insuffisante: ${existing.quantity} disponible, ${quantity} demandé`);
      }

      const newQuantity = existing.quantity - quantity;

      if (newQuantity === 0) {
        // Supprimer position si quantité = 0
        this.db.prepare(`
          DELETE FROM custody_positions
          WHERE user_id = ? AND stock_symbol = ?
        `).run(userId, stockSymbol);
      } else {
        // Mettre à jour quantité
        const newTotalCost = newQuantity * existing.average_cost;

        this.db.prepare(`
          UPDATE custody_positions
          SET quantity = ?,
              total_cost = ?,
              last_updated = datetime('now')
          WHERE user_id = ? AND stock_symbol = ?
        `).run(newQuantity, newTotalCost, userId, stockSymbol);
      }
    } catch (error) {
      console.error('Erreur mise à jour custody (sell):', error);
      throw error;
    }
  }

  /**
   * Mettre à jour user_stocks (pour compatibilité)
   */
  updateUserStocks(userId, stockSymbol, tradeType, quantity, price) {
    try {
      if (tradeType === 'buy') {
        const existing = this.db.prepare(`
          SELECT * FROM user_stocks WHERE user_id = ? AND stock_symbol = ?
        `).get(userId, stockSymbol);

        if (existing) {
          this.db.prepare(`
            UPDATE user_stocks
            SET quantity = quantity + ?,
                average_price = (average_price * quantity + ? * ?) / (quantity + ?)
            WHERE user_id = ? AND stock_symbol = ?
          `).run(quantity, price, quantity, quantity, userId, stockSymbol);
        } else {
          this.db.prepare(`
            INSERT INTO user_stocks (user_id, stock_symbol, quantity, purchase_price, average_price, purchase_date)
            VALUES (?, ?, ?, ?, ?, date('now'))
          `).run(userId, stockSymbol, quantity, price, price);
        }
      } else if (tradeType === 'sell') {
        this.db.prepare(`
          UPDATE user_stocks
          SET quantity = quantity - ?
          WHERE user_id = ? AND stock_symbol = ?
        `).run(quantity, userId, stockSymbol);

        // Supprimer si quantité = 0
        this.db.prepare(`
          DELETE FROM user_stocks
          WHERE user_id = ? AND stock_symbol = ? AND quantity <= 0
        `).run(userId, stockSymbol);
      }
    } catch (error) {
      console.error('Erreur mise à jour user_stocks:', error);
      // Non-fatal, continue
    }
  }

  /**
   * Obtenir custody positions d'un utilisateur
   */
  getCustodyPositions(userId) {
    try {
      const positions = this.db.prepare(`
        SELECT
          cp.*,
          s.name,
          s.current_price,
          (cp.quantity * s.current_price) as current_value,
          (cp.quantity * s.current_price - cp.total_cost) as unrealized_pnl,
          ((cp.quantity * s.current_price - cp.total_cost) / cp.total_cost * 100) as unrealized_pnl_pct
        FROM custody_positions cp
        JOIN stocks s ON cp.stock_symbol = s.symbol
        WHERE cp.user_id = ?
        ORDER BY current_value DESC
      `).all(userId);

      return positions;
    } catch (error) {
      console.error('Erreur récupération custody positions:', error);
      throw error;
    }
  }

  /**
   * Obtenir historique exécutions
   */
  getExecutionHistory(userId, limit = 50) {
    try {
      const executions = this.db.prepare(`
        SELECT
          te.*,
          s.name as stock_name
        FROM trade_executions te
        LEFT JOIN stocks s ON te.stock_symbol = s.symbol
        WHERE te.user_id = ?
        ORDER BY te.created_at DESC
        LIMIT ?
      `).all(userId, limit);

      return executions;
    } catch (error) {
      console.error('Erreur récupération execution history:', error);
      throw error;
    }
  }

  /**
   * Obtenir configuration
   */
  getConfig(key) {
    try {
      const config = this.db.prepare(`
        SELECT config_value FROM broker_config WHERE config_key = ?
      `).get(key);

      return config ? config.config_value : null;
    } catch (error) {
      console.error('Erreur récupération config:', error);
      return null;
    }
  }

  /**
   * Statistiques broker
   */
  getBrokerStats() {
    try {
      const stats = {
        totalAccounts: this.db.prepare(`SELECT COUNT(*) as count FROM broker_accounts`).get().count,
        activeAccounts: this.db.prepare(`SELECT COUNT(*) as count FROM broker_accounts WHERE account_status = 'active'`).get().count,
        totalExecutions: this.db.prepare(`SELECT COUNT(*) as count FROM trade_executions WHERE execution_status = 'executed'`).get().count,
        totalRejections: this.db.prepare(`SELECT COUNT(*) as count FROM trade_executions WHERE execution_status = 'rejected'`).get().count,
        totalVolume: this.db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM trade_executions WHERE execution_status = 'executed'`).get().total,
        totalCommissions: this.db.prepare(`SELECT COALESCE(SUM(commission), 0) as total FROM trade_executions WHERE execution_status = 'executed'`).get().total,
        custodyPositions: this.db.prepare(`SELECT COUNT(*) as count FROM custody_positions`).get().count
      };

      return stats;
    } catch (error) {
      console.error('Erreur récupération broker stats:', error);
      throw error;
    }
  }
}

module.exports = BrokerSimulatorService;
