/**
 * PENDO - Service Client Money Segregation & Settlement
 * Séparation des fonds clients selon réglementation CREPMF
 * Settlement tracking T+3 BRVM
 * Corporate actions automation (dividendes, splits)
 */

const Database = require('better-sqlite3');

class ClientMoneyService {
  constructor(db) {
    this.db = db || new Database('pendo.db');
    this.initializeTables();
  }

  /**
   * Initialiser les tables de segregation et settlement
   */
  initializeTables() {
    // Table 1: Client Money Accounts (comptes ségrégés)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS client_money_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        account_type TEXT NOT NULL, -- 'client_cash', 'client_securities', 'pendo_operational'
        currency TEXT DEFAULT 'XOF',
        balance REAL DEFAULT 0,
        available_balance REAL DEFAULT 0,
        pending_deposits REAL DEFAULT 0,
        pending_withdrawals REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_client_money_user ON client_money_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_client_money_type ON client_money_accounts(account_type);
    `);

    // Table 2: Client Money Movements (mouvements de fonds)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS client_money_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'trade_buy', 'trade_sell', 'dividend', 'fee'
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'XOF',
        from_account TEXT,
        to_account TEXT,
        status TEXT DEFAULT 'pending', -- 'pending', 'cleared', 'settled', 'failed'
        reference TEXT,
        description TEXT,
        related_transaction_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        settled_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_movements_user ON client_money_movements(user_id);
      CREATE INDEX IF NOT EXISTS idx_movements_status ON client_money_movements(status);
      CREATE INDEX IF NOT EXISTS idx_movements_type ON client_money_movements(movement_type);
    `);

    // Table 3: Settlement Schedule (calendrier de règlement T+3)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settlement_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        transaction_type TEXT NOT NULL, -- 'stock_buy', 'stock_sell', 'bond_buy', 'bond_sell'
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'XOF',
        trade_date TEXT NOT NULL,
        settlement_date TEXT NOT NULL, -- T+3 pour BRVM
        status TEXT DEFAULT 'pending', -- 'pending', 'settled', 'failed', 'cancelled'
        stock_symbol TEXT,
        quantity REAL,
        price REAL,
        settlement_instructions TEXT,
        broker_confirmation TEXT,
        settled_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_settlement_user ON settlement_schedule(user_id);
      CREATE INDEX IF NOT EXISTS idx_settlement_date ON settlement_schedule(settlement_date);
      CREATE INDEX IF NOT EXISTS idx_settlement_status ON settlement_schedule(status);
    `);

    // Table 4: Daily Reconciliation (réconciliation quotidienne)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_reconciliation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reconciliation_date TEXT NOT NULL UNIQUE,
        total_client_cash REAL DEFAULT 0,
        total_client_securities_value REAL DEFAULT 0,
        total_pendo_operational REAL DEFAULT 0,
        total_pending_settlements REAL DEFAULT 0,
        total_pending_deposits REAL DEFAULT 0,
        total_pending_withdrawals REAL DEFAULT 0,
        discrepancies REAL DEFAULT 0,
        discrepancy_details TEXT,
        status TEXT DEFAULT 'pending', -- 'pending', 'reconciled', 'discrepancy_found'
        reconciled_by INTEGER,
        reconciled_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (reconciled_by) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_recon_date ON daily_reconciliation(reconciliation_date);
    `);

    // Table 5: Corporate Actions (dividendes, splits, bonus shares)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS corporate_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stock_symbol TEXT NOT NULL,
        action_type TEXT NOT NULL, -- 'dividend', 'split', 'reverse_split', 'bonus_shares', 'rights_issue'
        announcement_date TEXT NOT NULL,
        ex_date TEXT NOT NULL,
        record_date TEXT NOT NULL,
        payment_date TEXT,
        details TEXT, -- JSON: { ratio, amount, currency, etc. }
        status TEXT DEFAULT 'announced', -- 'announced', 'processed', 'paid', 'cancelled'
        processed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_corporate_symbol ON corporate_actions(stock_symbol);
      CREATE INDEX IF NOT EXISTS idx_corporate_exdate ON corporate_actions(ex_date);
    `);

    // Table 6: Dividend Payments (paiements dividendes)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dividend_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        corporate_action_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        stock_symbol TEXT NOT NULL,
        shares_held REAL NOT NULL,
        dividend_per_share REAL NOT NULL,
        gross_amount REAL NOT NULL,
        tax_withheld REAL DEFAULT 0,
        net_amount REAL NOT NULL,
        currency TEXT DEFAULT 'XOF',
        payment_date TEXT,
        status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed'
        paid_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (corporate_action_id) REFERENCES corporate_actions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_dividend_user ON dividend_payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_dividend_action ON dividend_payments(corporate_action_id);
    `);

    // Table 7: Stock Splits Log
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stock_splits_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        corporate_action_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        stock_symbol TEXT NOT NULL,
        shares_before REAL NOT NULL,
        shares_after REAL NOT NULL,
        split_ratio TEXT NOT NULL, -- '2:1', '3:2', etc.
        ex_date TEXT NOT NULL,
        processed_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (corporate_action_id) REFERENCES corporate_actions(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_splits_user ON stock_splits_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_splits_symbol ON stock_splits_log(stock_symbol);
    `);

    console.log('✅ Tables Client Money Segregation & Settlement initialisées');
  }

  /**
   * Créer compte ségrégé pour un utilisateur
   */
  createClientAccount(userId, accountType = 'client_cash') {
    try {
      const existing = this.db.prepare(`
        SELECT id FROM client_money_accounts
        WHERE user_id = ? AND account_type = ?
      `).get(userId, accountType);

      if (existing) {
        return existing.id;
      }

      const result = this.db.prepare(`
        INSERT INTO client_money_accounts (user_id, account_type, balance, available_balance)
        VALUES (?, ?, 0, 0)
      `).run(userId, accountType);

      return result.lastInsertRowid;
    } catch (error) {
      console.error('Erreur création compte client:', error);
      throw error;
    }
  }

  /**
   * Déposer des fonds (client → compte ségrégé)
   */
  depositFunds(userId, amount, reference, description = 'Dépôt client') {
    try {
      if (amount <= 0) {
        throw new Error('Montant doit être > 0');
      }

      // Créer mouvement
      const movement = this.db.prepare(`
        INSERT INTO client_money_movements (
          user_id, movement_type, amount, from_account, to_account,
          status, reference, description
        )
        VALUES (?, 'deposit', ?, 'external', 'client_cash', 'pending', ?, ?)
      `).run(userId, amount, reference, description);

      // Mettre à jour pending_deposits
      this.db.prepare(`
        UPDATE client_money_accounts
        SET pending_deposits = pending_deposits + ?,
            updated_at = datetime('now')
        WHERE user_id = ? AND account_type = 'client_cash'
      `).run(amount, userId);

      return {
        movementId: movement.lastInsertRowid,
        userId,
        amount,
        status: 'pending',
        message: 'Dépôt en attente de confirmation'
      };
    } catch (error) {
      console.error('Erreur dépôt fonds:', error);
      throw error;
    }
  }

  /**
   * Confirmer un dépôt (passage pending → cleared)
   */
  confirmDeposit(movementId) {
    try {
      const movement = this.db.prepare(`
        SELECT * FROM client_money_movements WHERE id = ?
      `).get(movementId);

      if (!movement) {
        throw new Error('Mouvement introuvable');
      }

      if (movement.status !== 'pending') {
        throw new Error('Mouvement déjà traité');
      }

      this.db.transaction(() => {
        // Mettre à jour mouvement
        this.db.prepare(`
          UPDATE client_money_movements
          SET status = 'cleared', settled_at = datetime('now')
          WHERE id = ?
        `).run(movementId);

        // Créditer le compte et retirer de pending
        this.db.prepare(`
          UPDATE client_money_accounts
          SET balance = balance + ?,
              available_balance = available_balance + ?,
              pending_deposits = pending_deposits - ?,
              updated_at = datetime('now')
          WHERE user_id = ? AND account_type = 'client_cash'
        `).run(movement.amount, movement.amount, movement.amount, movement.user_id);
      })();

      return {
        movementId,
        status: 'cleared',
        message: 'Dépôt confirmé et crédité'
      };
    } catch (error) {
      console.error('Erreur confirmation dépôt:', error);
      throw error;
    }
  }

  /**
   * Retirer des fonds (compte ségrégé → client)
   */
  withdrawFunds(userId, amount, reference, description = 'Retrait client') {
    try {
      if (amount <= 0) {
        throw new Error('Montant doit être > 0');
      }

      // Vérifier solde disponible
      const account = this.db.prepare(`
        SELECT * FROM client_money_accounts
        WHERE user_id = ? AND account_type = 'client_cash'
      `).get(userId);

      if (!account || account.available_balance < amount) {
        throw new Error('Solde insuffisant');
      }

      this.db.transaction(() => {
        // Créer mouvement
        this.db.prepare(`
          INSERT INTO client_money_movements (
            user_id, movement_type, amount, from_account, to_account,
            status, reference, description
          )
          VALUES (?, 'withdrawal', ?, 'client_cash', 'external', 'pending', ?, ?)
        `).run(userId, amount, reference, description);

        // Bloquer le montant (retirer de available_balance)
        this.db.prepare(`
          UPDATE client_money_accounts
          SET available_balance = available_balance - ?,
              pending_withdrawals = pending_withdrawals + ?,
              updated_at = datetime('now')
          WHERE user_id = ? AND account_type = 'client_cash'
        `).run(amount, amount, userId);
      })();

      return {
        userId,
        amount,
        status: 'pending',
        message: 'Retrait en attente de traitement'
      };
    } catch (error) {
      console.error('Erreur retrait fonds:', error);
      throw error;
    }
  }

  /**
   * Confirmer un retrait (débit effectif)
   */
  confirmWithdrawal(movementId) {
    try {
      const movement = this.db.prepare(`
        SELECT * FROM client_money_movements WHERE id = ?
      `).get(movementId);

      if (!movement) {
        throw new Error('Mouvement introuvable');
      }

      if (movement.status !== 'pending') {
        throw new Error('Mouvement déjà traité');
      }

      this.db.transaction(() => {
        // Mettre à jour mouvement
        this.db.prepare(`
          UPDATE client_money_movements
          SET status = 'settled', settled_at = datetime('now')
          WHERE id = ?
        `).run(movementId);

        // Débiter le compte
        this.db.prepare(`
          UPDATE client_money_accounts
          SET balance = balance - ?,
              pending_withdrawals = pending_withdrawals - ?,
              updated_at = datetime('now')
          WHERE user_id = ? AND account_type = 'client_cash'
        `).run(movement.amount, movement.amount, movement.user_id);
      })();

      return {
        movementId,
        status: 'settled',
        message: 'Retrait confirmé et débité'
      };
    } catch (error) {
      console.error('Erreur confirmation retrait:', error);
      throw error;
    }
  }

  /**
   * Créer une entrée settlement pour un trade (T+3 BRVM)
   */
  createSettlement(transactionId, userId, transactionType, amount, stockSymbol, quantity, price) {
    try {
      const tradeDate = new Date().toISOString().split('T')[0];

      // BRVM: T+3 settlement
      const settlementDate = new Date();
      settlementDate.setDate(settlementDate.getDate() + 3);
      const settlementDateStr = settlementDate.toISOString().split('T')[0];

      const result = this.db.prepare(`
        INSERT INTO settlement_schedule (
          transaction_id, user_id, transaction_type, amount, trade_date,
          settlement_date, stock_symbol, quantity, price, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(transactionId, userId, transactionType, amount, tradeDate, settlementDateStr, stockSymbol, quantity, price);

      // Si achat (buy): bloquer le montant
      if (transactionType === 'stock_buy' || transactionType === 'bond_buy') {
        this.db.prepare(`
          UPDATE client_money_accounts
          SET available_balance = available_balance - ?,
              updated_at = datetime('now')
          WHERE user_id = ? AND account_type = 'client_cash'
        `).run(amount, userId);
      }

      return {
        settlementId: result.lastInsertRowid,
        tradeDate,
        settlementDate: settlementDateStr,
        status: 'pending',
        daysToSettlement: 3
      };
    } catch (error) {
      console.error('Erreur création settlement:', error);
      throw error;
    }
  }

  /**
   * Traiter les settlements arrivés à échéance (T+3)
   */
  processSettlements() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const pendingSettlements = this.db.prepare(`
        SELECT * FROM settlement_schedule
        WHERE settlement_date <= ? AND status = 'pending'
        ORDER BY settlement_date ASC
      `).all(today);

      const results = {
        processed: 0,
        failed: 0,
        details: []
      };

      for (const settlement of pendingSettlements) {
        try {
          this.db.transaction(() => {
            // Marquer comme settled
            this.db.prepare(`
              UPDATE settlement_schedule
              SET status = 'settled', settled_at = datetime('now')
              WHERE id = ?
            `).run(settlement.id);

            // Si achat: débiter balance
            if (settlement.transaction_type === 'stock_buy' || settlement.transaction_type === 'bond_buy') {
              this.db.prepare(`
                UPDATE client_money_accounts
                SET balance = balance - ?,
                    updated_at = datetime('now')
                WHERE user_id = ? AND account_type = 'client_cash'
              `).run(settlement.amount, settlement.user_id);

              // Enregistrer mouvement
              this.db.prepare(`
                INSERT INTO client_money_movements (
                  user_id, movement_type, amount, from_account, to_account,
                  status, description, related_transaction_id
                )
                VALUES (?, 'trade_buy', ?, 'client_cash', 'client_securities', 'settled', ?, ?)
              `).run(
                settlement.user_id,
                settlement.amount,
                `Settlement ${settlement.stock_symbol} - ${settlement.quantity} shares`,
                settlement.transaction_id
              );
            }

            // Si vente: créditer balance et available_balance
            if (settlement.transaction_type === 'stock_sell' || settlement.transaction_type === 'bond_sell') {
              this.db.prepare(`
                UPDATE client_money_accounts
                SET balance = balance + ?,
                    available_balance = available_balance + ?,
                    updated_at = datetime('now')
                WHERE user_id = ? AND account_type = 'client_cash'
              `).run(settlement.amount, settlement.amount, settlement.user_id);

              // Enregistrer mouvement
              this.db.prepare(`
                INSERT INTO client_money_movements (
                  user_id, movement_type, amount, from_account, to_account,
                  status, description, related_transaction_id
                )
                VALUES (?, 'trade_sell', ?, 'client_securities', 'client_cash', 'settled', ?, ?)
              `).run(
                settlement.user_id,
                settlement.amount,
                `Settlement ${settlement.stock_symbol} - ${settlement.quantity} shares`,
                settlement.transaction_id
              );
            }
          })();

          results.processed++;
          results.details.push({
            settlementId: settlement.id,
            userId: settlement.user_id,
            status: 'success'
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            settlementId: settlement.id,
            userId: settlement.user_id,
            status: 'failed',
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Erreur traitement settlements:', error);
      throw error;
    }
  }

  /**
   * Réconciliation quotidienne
   */
  dailyReconciliation(date = null) {
    try {
      const reconDate = date || new Date().toISOString().split('T')[0];

      // Calculer totaux
      const clientCash = this.db.prepare(`
        SELECT COALESCE(SUM(balance), 0) as total
        FROM client_money_accounts
        WHERE account_type = 'client_cash'
      `).get().total;

      const clientSecurities = this.db.prepare(`
        SELECT COALESCE(SUM(balance), 0) as total
        FROM client_money_accounts
        WHERE account_type = 'client_securities'
      `).get().total;

      const pendoOperational = this.db.prepare(`
        SELECT COALESCE(SUM(balance), 0) as total
        FROM client_money_accounts
        WHERE account_type = 'pendo_operational'
      `).get().total;

      const pendingSettlements = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM settlement_schedule
        WHERE status = 'pending'
      `).get().total;

      const pendingDeposits = this.db.prepare(`
        SELECT COALESCE(SUM(pending_deposits), 0) as total
        FROM client_money_accounts
        WHERE account_type = 'client_cash'
      `).get().total;

      const pendingWithdrawals = this.db.prepare(`
        SELECT COALESCE(SUM(pending_withdrawals), 0) as total
        FROM client_money_accounts
        WHERE account_type = 'client_cash'
      `).get().total;

      // Vérifier discrepancies
      const expectedTotal = clientCash + clientSecurities + pendingDeposits;
      const actualTotal = clientCash + clientSecurities;
      const discrepancy = Math.abs(expectedTotal - actualTotal);

      const status = discrepancy < 0.01 ? 'reconciled' : 'discrepancy_found';

      // Enregistrer reconciliation
      const result = this.db.prepare(`
        INSERT INTO daily_reconciliation (
          reconciliation_date, total_client_cash, total_client_securities_value,
          total_pendo_operational, total_pending_settlements, total_pending_deposits,
          total_pending_withdrawals, discrepancies, status, reconciled_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        reconDate,
        clientCash,
        clientSecurities,
        pendoOperational,
        pendingSettlements,
        pendingDeposits,
        pendingWithdrawals,
        discrepancy,
        status
      );

      return {
        reconciliationId: result.lastInsertRowid,
        date: reconDate,
        totals: {
          clientCash,
          clientSecurities,
          pendoOperational,
          pendingSettlements,
          pendingDeposits,
          pendingWithdrawals
        },
        discrepancy,
        status,
        message: status === 'reconciled'
          ? 'Réconciliation réussie - Aucune différence'
          : `Discrepancy trouvée: ${discrepancy.toFixed(2)} XOF`
      };
    } catch (error) {
      console.error('Erreur réconciliation:', error);
      throw error;
    }
  }

  /**
   * Annoncer une corporate action (dividende, split, etc.)
   */
  announceCorporateAction(stockSymbol, actionType, announcementDate, exDate, recordDate, paymentDate, details) {
    try {
      const result = this.db.prepare(`
        INSERT INTO corporate_actions (
          stock_symbol, action_type, announcement_date, ex_date,
          record_date, payment_date, details, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'announced')
      `).run(stockSymbol, actionType, announcementDate, exDate, recordDate, paymentDate, JSON.stringify(details));

      return {
        corporateActionId: result.lastInsertRowid,
        stockSymbol,
        actionType,
        exDate,
        status: 'announced'
      };
    } catch (error) {
      console.error('Erreur annonce corporate action:', error);
      throw error;
    }
  }

  /**
   * Traiter un dividende (paiement automatique à tous les détenteurs)
   */
  processDividend(corporateActionId) {
    try {
      const action = this.db.prepare(`
        SELECT * FROM corporate_actions WHERE id = ?
      `).get(corporateActionId);

      if (!action) {
        throw new Error('Corporate action introuvable');
      }

      if (action.action_type !== 'dividend') {
        throw new Error('Type action incorrect - attendu: dividend');
      }

      const details = JSON.parse(action.details);
      const dividendPerShare = details.amountPerShare || 0;
      const taxRate = details.taxRate || 0.10; // 10% tax par défaut

      // Récupérer tous les détenteurs à la record date
      const holders = this.db.prepare(`
        SELECT user_id, SUM(quantity) as shares_held
        FROM user_stocks
        WHERE stock_symbol = ? AND purchase_date <= ?
        GROUP BY user_id
      `).all(action.stock_symbol, action.record_date);

      const results = {
        processed: 0,
        totalGross: 0,
        totalNet: 0,
        totalTax: 0,
        payments: []
      };

      this.db.transaction(() => {
        for (const holder of holders) {
          const grossAmount = holder.shares_held * dividendPerShare;
          const taxWithheld = grossAmount * taxRate;
          const netAmount = grossAmount - taxWithheld;

          // Créer paiement dividende
          this.db.prepare(`
            INSERT INTO dividend_payments (
              corporate_action_id, user_id, stock_symbol, shares_held,
              dividend_per_share, gross_amount, tax_withheld, net_amount,
              currency, payment_date, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'XOF', ?, 'pending')
          `).run(
            corporateActionId,
            holder.user_id,
            action.stock_symbol,
            holder.shares_held,
            dividendPerShare,
            grossAmount,
            taxWithheld,
            netAmount,
            action.payment_date
          );

          // Créditer le compte client
          this.db.prepare(`
            UPDATE client_money_accounts
            SET balance = balance + ?,
                available_balance = available_balance + ?,
                updated_at = datetime('now')
            WHERE user_id = ? AND account_type = 'client_cash'
          `).run(netAmount, netAmount, holder.user_id);

          // Enregistrer mouvement
          this.db.prepare(`
            INSERT INTO client_money_movements (
              user_id, movement_type, amount, from_account, to_account,
              status, description
            )
            VALUES (?, 'dividend', ?, 'external', 'client_cash', 'settled', ?)
          `).run(
            holder.user_id,
            netAmount,
            `Dividende ${action.stock_symbol} - ${holder.shares_held} actions @ ${dividendPerShare} XOF`
          );

          results.processed++;
          results.totalGross += grossAmount;
          results.totalNet += netAmount;
          results.totalTax += taxWithheld;
          results.payments.push({
            userId: holder.user_id,
            shares: holder.shares_held,
            grossAmount,
            netAmount
          });
        }

        // Marquer corporate action comme traitée
        this.db.prepare(`
          UPDATE corporate_actions
          SET status = 'processed', processed_at = datetime('now')
          WHERE id = ?
        `).run(corporateActionId);
      })();

      return results;
    } catch (error) {
      console.error('Erreur traitement dividende:', error);
      throw error;
    }
  }

  /**
   * Traiter un stock split (ex: 2:1)
   */
  processStockSplit(corporateActionId) {
    try {
      const action = this.db.prepare(`
        SELECT * FROM corporate_actions WHERE id = ?
      `).get(corporateActionId);

      if (!action) {
        throw new Error('Corporate action introuvable');
      }

      if (action.action_type !== 'split' && action.action_type !== 'reverse_split') {
        throw new Error('Type action incorrect - attendu: split ou reverse_split');
      }

      const details = JSON.parse(action.details);
      const splitRatio = details.ratio; // ex: '2:1' = 2 nouvelles pour 1 ancienne
      const [newShares, oldShares] = splitRatio.split(':').map(Number);
      const multiplier = newShares / oldShares;

      // Récupérer tous les détenteurs
      const holders = this.db.prepare(`
        SELECT id, user_id, quantity
        FROM user_stocks
        WHERE stock_symbol = ?
      `).all(action.stock_symbol);

      const results = {
        processed: 0,
        totalSharesBefore: 0,
        totalSharesAfter: 0,
        splits: []
      };

      this.db.transaction(() => {
        for (const holder of holders) {
          const sharesBefore = holder.quantity;
          const sharesAfter = sharesBefore * multiplier;

          // Mettre à jour quantité
          this.db.prepare(`
            UPDATE user_stocks
            SET quantity = ?
            WHERE id = ?
          `).run(sharesAfter, holder.id);

          // Logger le split
          this.db.prepare(`
            INSERT INTO stock_splits_log (
              corporate_action_id, user_id, stock_symbol,
              shares_before, shares_after, split_ratio, ex_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            corporateActionId,
            holder.user_id,
            action.stock_symbol,
            sharesBefore,
            sharesAfter,
            splitRatio,
            action.ex_date
          );

          results.processed++;
          results.totalSharesBefore += sharesBefore;
          results.totalSharesAfter += sharesAfter;
          results.splits.push({
            userId: holder.user_id,
            sharesBefore,
            sharesAfter
          });
        }

        // Marquer corporate action comme traitée
        this.db.prepare(`
          UPDATE corporate_actions
          SET status = 'processed', processed_at = datetime('now')
          WHERE id = ?
        `).run(corporateActionId);
      })();

      return results;
    } catch (error) {
      console.error('Erreur traitement stock split:', error);
      throw error;
    }
  }

  /**
   * Obtenir balance compte client
   */
  getClientBalance(userId) {
    try {
      const cash = this.db.prepare(`
        SELECT * FROM client_money_accounts
        WHERE user_id = ? AND account_type = 'client_cash'
      `).get(userId);

      const securities = this.db.prepare(`
        SELECT * FROM client_money_accounts
        WHERE user_id = ? AND account_type = 'client_securities'
      `).get(userId);

      return {
        cash: cash || { balance: 0, available_balance: 0 },
        securities: securities || { balance: 0, available_balance: 0 }
      };
    } catch (error) {
      console.error('Erreur récupération balance:', error);
      throw error;
    }
  }

  /**
   * Obtenir historique mouvements
   */
  getMovementsHistory(userId, limit = 50) {
    try {
      const movements = this.db.prepare(`
        SELECT * FROM client_money_movements
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(userId, limit);

      return movements;
    } catch (error) {
      console.error('Erreur récupération mouvements:', error);
      throw error;
    }
  }

  /**
   * Obtenir settlements en attente pour un utilisateur
   */
  getPendingSettlements(userId) {
    try {
      const settlements = this.db.prepare(`
        SELECT * FROM settlement_schedule
        WHERE user_id = ? AND status = 'pending'
        ORDER BY settlement_date ASC
      `).all(userId);

      return settlements;
    } catch (error) {
      console.error('Erreur récupération settlements:', error);
      throw error;
    }
  }
}

module.exports = ClientMoneyService;
