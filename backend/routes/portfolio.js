/**
 * Routes API pour le portefeuille utilisateur
 */
const express = require('express');
const { validateTransaction, validateAlert, validatePagination } = require('../middleware/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { createLimiter, exportLimiter } = require('../middleware/rateLimiter');

module.exports = function(db, authMiddleware) {
  const router = express.Router();

  /**
   * GET /api/portfolio/summary
   * Résumé du portefeuille de l'utilisateur
   */
  router.get('/summary', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;

      // Obtenir le portfolio
      let portfolio = db.prepare('SELECT * FROM portfolios WHERE user_id = ?').get(userId);

      if (!portfolio) {
        // Créer un portfolio par défaut
        const result = db.prepare(`
          INSERT INTO portfolios (user_id, name, initial_balance, current_balance)
          VALUES (?, ?, ?, ?)
        `).run(userId, 'Mon Portefeuille', 1000000, 1000000); // 1M XOF par défaut

        portfolio = db.prepare('SELECT * FROM portfolios WHERE id = ?').get(result.lastInsertRowid);
      }

      // Obtenir les holdings
      const holdings = db.prepare(`
        SELECT
          h.*,
          s.name as stock_name,
          s.sector,
          s.price as current_price,
          s.change_percent as daily_change,
          (h.quantity * s.price) as current_value,
          (h.quantity * h.average_price) as total_cost,
          ((s.price - h.average_price) / h.average_price * 100) as gain_loss_percent,
          (h.quantity * (s.price - h.average_price)) as gain_loss
        FROM portfolio_holdings h
        LEFT JOIN stocks s ON h.market_id = s.symbol
        WHERE h.portfolio_id = ?
      `).all(portfolio.id);

      // Calculer les totaux
      let totalValue = 0;
      let totalCost = 0;
      let totalGainLoss = 0;

      holdings.forEach(h => {
        totalValue += h.current_value || 0;
        totalCost += h.total_cost || 0;
        totalGainLoss += h.gain_loss || 0;
      });

      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost * 100) : 0;

      res.json({
        success: true,
        data: {
          portfolio,
          holdings,
          summary: {
            totalValue,
            totalCost,
            totalGainLoss,
            totalGainLossPercent,
            cashBalance: portfolio.current_balance || 0,
            numberOfHoldings: holdings.length,
            portfolioValue: totalValue + (portfolio.current_balance || 0)
          }
        }
      });
    } catch (error) {
      console.error('Erreur récupération portfolio:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/portfolio/transaction
   * Ajouter une transaction
   */
  router.post('/transaction', authMiddleware, createLimiter, validateTransaction, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { ticker, type, quantity, price, date, fees = 0, notes = '' } = req.body;

    // Obtenir le portfolio
    let portfolio = db.prepare('SELECT * FROM portfolios WHERE user_id = ?').get(userId);

    if (!portfolio) {
      const result = db.prepare(`
        INSERT INTO portfolios (user_id, name, initial_balance, current_balance)
        VALUES (?, ?, ?, ?)
      `).run(userId, 'Mon Portefeuille', 1000000, 1000000);
      portfolio = db.prepare('SELECT * FROM portfolios WHERE id = ?').get(result.lastInsertRowid);
    }

    const totalAmount = quantity * price;
    const netAmount = type === 'buy' ? totalAmount + fees : totalAmount - fees;

    // Vérifier le solde pour les achats
    if (type === 'buy' && portfolio.current_balance < netAmount) {
      throw new AppError('Solde insuffisant', 400);
    }

    // Enregistrer la transaction
    db.prepare(`
      INSERT INTO user_transactions (
        user_id, portfolio_id, ticker, transaction_type,
        quantity, price, total_amount, fees, net_amount,
        transaction_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, portfolio.id, ticker, type,
      quantity, price, totalAmount, fees, netAmount,
      date || new Date().toISOString().split('T')[0], notes
    );

    // Mettre à jour le holding et le solde
    if (type === 'buy') {
      updateHoldingAfterBuy(db, portfolio.id, ticker, quantity, price);
      db.prepare('UPDATE portfolios SET current_balance = current_balance - ? WHERE id = ?')
        .run(netAmount, portfolio.id);
    } else if (type === 'sell') {
      updateHoldingAfterSell(db, portfolio.id, ticker, quantity);
      db.prepare('UPDATE portfolios SET current_balance = current_balance + ? WHERE id = ?')
        .run(netAmount, portfolio.id);
    }

    res.json({ success: true, message: 'Transaction enregistrée' });
  }));

  /**
   * GET /api/portfolio/transactions
   * Historique des transactions
   */
  router.get('/transactions', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 50;

      const transactions = db.prepare(`
        SELECT * FROM user_transactions
        WHERE user_id = ?
        ORDER BY transaction_date DESC, created_at DESC
        LIMIT ?
      `).all(userId, limit);

      res.json({ success: true, data: transactions });
    } catch (error) {
      console.error('Erreur transactions:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/portfolio/performance
   * Performance historique
   */
  router.get('/performance', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;
      const days = parseInt(req.query.days) || 30;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const history = db.prepare(`
        SELECT * FROM user_portfolio_history
        WHERE user_id = ? AND date >= ?
        ORDER BY date ASC
      `).all(userId, startDate.toISOString().split('T')[0]);

      res.json({ success: true, data: history });
    } catch (error) {
      console.error('Erreur performance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/portfolio/watchlist
   * Ajouter à la watchlist
   */
  router.post('/watchlist', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;
      const { ticker, targetPrice, notes } = req.body;

      if (!ticker) {
        return res.status(400).json({ success: false, error: 'Ticker requis' });
      }

      db.prepare(`
        INSERT INTO user_stock_watchlist (user_id, ticker, target_price, notes)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, ticker) DO UPDATE SET
          target_price = ?, notes = ?, added_at = CURRENT_TIMESTAMP
      `).run(userId, ticker, targetPrice || null, notes || '', targetPrice || null, notes || '');

      res.json({ success: true, message: 'Ajouté à la watchlist' });
    } catch (error) {
      console.error('Erreur watchlist:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/portfolio/watchlist
   * Obtenir la watchlist
   */
  router.get('/watchlist', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;

      const watchlist = db.prepare(`
        SELECT
          w.*,
          s.name as stock_name,
          s.price as current_price,
          s.change_percent as daily_change,
          CASE
            WHEN w.target_price IS NOT NULL THEN
              ((s.price - w.target_price) / w.target_price * 100)
            ELSE NULL
          END as distance_to_target
        FROM user_stock_watchlist w
        LEFT JOIN stocks s ON w.ticker = s.symbol
        WHERE w.user_id = ?
        ORDER BY w.added_at DESC
      `).all(userId);

      res.json({ success: true, data: watchlist });
    } catch (error) {
      console.error('Erreur watchlist:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /api/portfolio/watchlist/:ticker
   * Retirer de la watchlist
   */
  router.delete('/watchlist/:ticker', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;
      const { ticker } = req.params;

      db.prepare('DELETE FROM user_stock_watchlist WHERE user_id = ? AND ticker = ?')
        .run(userId, ticker);

      res.json({ success: true, message: 'Retiré de la watchlist' });
    } catch (error) {
      console.error('Erreur watchlist:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/portfolio/alerts
   * Créer une alerte de prix
   */
  router.post('/alerts', authMiddleware, createLimiter, validateAlert, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { ticker, alertType, targetValue } = req.body;

    db.prepare(`
      INSERT INTO user_price_alerts (user_id, ticker, alert_type, target_value)
      VALUES (?, ?, ?, ?)
    `).run(userId, ticker, alertType, targetValue);

    res.json({ success: true, message: 'Alerte créée' });
  }));

  /**
   * GET /api/portfolio/alerts
   * Obtenir les alertes
   */
  router.get('/alerts', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;
      const activeOnly = req.query.active !== 'false';

      let query = 'SELECT * FROM user_price_alerts WHERE user_id = ?';
      if (activeOnly) {
        query += ' AND is_active = 1';
      }
      query += ' ORDER BY created_at DESC';

      const alerts = db.prepare(query).all(userId);

      res.json({ success: true, data: alerts });
    } catch (error) {
      console.error('Erreur alertes:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /api/portfolio/alerts/:id
   * Supprimer une alerte
   */
  router.delete('/alerts/:id', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;
      const alertId = req.params.id;

      db.prepare('DELETE FROM user_price_alerts WHERE id = ? AND user_id = ?')
        .run(alertId, userId);

      res.json({ success: true, message: 'Alerte supprimée' });
    } catch (error) {
      console.error('Erreur suppression alerte:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/portfolio/goals
   * Créer un objectif d'investissement
   */
  router.post('/goals', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;
      const { goalName, targetAmount, targetDate, goalType, priority, notes } = req.body;

      if (!goalName || !targetAmount) {
        return res.status(400).json({
          success: false,
          error: 'Nom et montant cible requis'
        });
      }

      const result = db.prepare(`
        INSERT INTO user_investment_goals (
          user_id, goal_name, target_amount, target_date, goal_type, priority, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, goalName, targetAmount, targetDate || null, goalType || 'wealth',
        priority || 'medium', notes || '');

      res.json({ success: true, goalId: result.lastInsertRowid });
    } catch (error) {
      console.error('Erreur objectif:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/portfolio/goals
   * Obtenir les objectifs
   */
  router.get('/goals', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;

      const goals = db.prepare(`
        SELECT * FROM user_investment_goals
        WHERE user_id = ? AND status = 'active'
        ORDER BY priority DESC, target_date ASC
      `).all(userId);

      res.json({ success: true, data: goals });
    } catch (error) {
      console.error('Erreur objectifs:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};

// Helper functions
function updateHoldingAfterBuy(db, portfolioId, ticker, quantity, price) {
  const existing = db.prepare(`
    SELECT * FROM portfolio_holdings WHERE portfolio_id = ? AND market_id = ?
  `).get(portfolioId, ticker);

  if (existing) {
    const totalQuantity = existing.quantity + quantity;
    const totalCost = (existing.quantity * existing.average_price) + (quantity * price);
    const newAvgPrice = totalCost / totalQuantity;

    db.prepare(`
      UPDATE portfolio_holdings
      SET quantity = ?, average_price = ?
      WHERE id = ?
    `).run(totalQuantity, newAvgPrice, existing.id);
  } else {
    db.prepare(`
      INSERT INTO portfolio_holdings (portfolio_id, market_id, symbol, quantity, average_price)
      VALUES (?, ?, ?, ?, ?)
    `).run(portfolioId, ticker, ticker, quantity, price);
  }
}

function updateHoldingAfterSell(db, portfolioId, ticker, quantity) {
  const existing = db.prepare(`
    SELECT * FROM portfolio_holdings WHERE portfolio_id = ? AND market_id = ?
  `).get(portfolioId, ticker);

  if (!existing) {
    throw new Error('Vous ne possédez pas cette action');
  }

  if (existing.quantity < quantity) {
    throw new Error('Quantité insuffisante');
  }

  const newQuantity = existing.quantity - quantity;

  if (newQuantity === 0) {
    db.prepare('DELETE FROM portfolio_holdings WHERE id = ?').run(existing.id);
  } else {
    db.prepare('UPDATE portfolio_holdings SET quantity = ? WHERE id = ?')
      .run(newQuantity, existing.id);
  }
}
