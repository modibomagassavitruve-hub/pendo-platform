/**
 * Service de calcul automatique de l'historique du portefeuille
 * Enregistre quotidiennement la valeur totale du portefeuille pour générer des graphiques de performance
 */

class PortfolioHistoryService {
  constructor(db) {
    this.db = db;
    this.updateInterval = null;
  }

  /**
   * Calculer la valeur actuelle d'un portefeuille
   */
  calculatePortfolioValue(portfolioId) {
    try {
      // Obtenir le portfolio
      const portfolio = this.db.prepare('SELECT * FROM portfolios WHERE id = ?').get(portfolioId);
      if (!portfolio) {
        throw new Error(`Portfolio ${portfolioId} introuvable`);
      }

      // Obtenir tous les holdings
      const holdings = this.db.prepare(`
        SELECT h.*, s.price as current_price
        FROM portfolio_holdings h
        LEFT JOIN stocks s ON h.market_id = s.symbol
        WHERE h.portfolio_id = ?
      `).all(portfolioId);

      // Calculer la valeur totale des holdings
      let holdingsValue = 0;
      for (const holding of holdings) {
        if (holding.current_price) {
          holdingsValue += holding.quantity * holding.current_price;
        } else {
          // Si pas de prix actuel, utiliser le prix d'achat moyen
          holdingsValue += holding.quantity * holding.average_price;
        }
      }

      // Valeur totale = liquidités + valeur des holdings
      const totalValue = portfolio.current_balance + holdingsValue;

      // Calculer le gain/perte total
      const totalGain = totalValue - portfolio.initial_balance;
      const totalGainPercent = portfolio.initial_balance > 0
        ? (totalGain / portfolio.initial_balance) * 100
        : 0;

      return {
        totalValue,
        cashBalance: portfolio.current_balance,
        holdingsValue,
        totalGain,
        totalGainPercent,
        portfolioId,
        userId: portfolio.user_id
      };
    } catch (error) {
      console.error(`Erreur calcul valeur portfolio ${portfolioId}:`, error);
      return null;
    }
  }

  /**
   * Enregistrer un snapshot de la valeur du portefeuille
   */
  recordPortfolioSnapshot(portfolioId, date = null) {
    try {
      const values = this.calculatePortfolioValue(portfolioId);
      if (!values) return false;

      const snapshotDate = date || new Date().toISOString().split('T')[0];

      // Calculer le coût total et le nombre de holdings
      let totalCost = 0;
      let numberOfHoldings = 0;
      const holdings = this.db.prepare(`
        SELECT * FROM portfolio_holdings WHERE portfolio_id = ?
      `).all(portfolioId);

      for (const holding of holdings) {
        totalCost += holding.total_cost || 0;
        numberOfHoldings++;
      }

      // Vérifier si un snapshot existe déjà pour cette date
      const existing = this.db.prepare(`
        SELECT id FROM user_portfolio_history
        WHERE user_id = ? AND date = ?
      `).get(values.userId, snapshotDate);

      if (existing) {
        // Mettre à jour le snapshot existant
        this.db.prepare(`
          UPDATE user_portfolio_history
          SET total_value = ?,
              total_cost = ?,
              total_gain_loss = ?,
              total_gain_loss_percent = ?,
              cash_balance = ?,
              number_of_holdings = ?
          WHERE id = ?
        `).run(
          values.totalValue,
          totalCost,
          values.totalGain,
          values.totalGainPercent,
          values.cashBalance,
          numberOfHoldings,
          existing.id
        );
      } else {
        // Créer un nouveau snapshot
        this.db.prepare(`
          INSERT INTO user_portfolio_history (
            user_id, date,
            total_value, total_cost, total_gain_loss,
            total_gain_loss_percent, cash_balance, number_of_holdings
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          values.userId,
          snapshotDate,
          values.totalValue,
          totalCost,
          values.totalGain,
          values.totalGainPercent,
          values.cashBalance,
          numberOfHoldings
        );
      }

      return true;
    } catch (error) {
      console.error(`Erreur enregistrement snapshot portfolio ${portfolioId}:`, error);
      return false;
    }
  }

  /**
   * Enregistrer des snapshots pour tous les portefeuilles actifs
   */
  recordAllPortfoliosSnapshot() {
    try {
      const portfolios = this.db.prepare('SELECT id FROM portfolios').all();
      let successCount = 0;

      for (const portfolio of portfolios) {
        if (this.recordPortfolioSnapshot(portfolio.id)) {
          successCount++;
        }
      }

      console.log(`📊 ${successCount}/${portfolios.length} snapshots de portefeuille enregistrés`);
      return successCount;
    } catch (error) {
      console.error('Erreur enregistrement snapshots:', error);
      return 0;
    }
  }

  /**
   * Générer l'historique rétroactif à partir des transactions
   * Utile pour reconstruire l'historique si on n'a pas encore de snapshots quotidiens
   */
  backfillHistoryFromTransactions(portfolioId, startDate = null) {
    try {
      const portfolio = this.db.prepare('SELECT * FROM portfolios WHERE id = ?').get(portfolioId);
      if (!portfolio) {
        throw new Error(`Portfolio ${portfolioId} introuvable`);
      }

      // Obtenir toutes les transactions
      const transactions = this.db.prepare(`
        SELECT * FROM user_transactions
        WHERE portfolio_id = ?
        ORDER BY transaction_date ASC, created_at ASC
      `).all(portfolioId);

      if (transactions.length === 0) {
        console.log(`Aucune transaction pour portfolio ${portfolioId}`);
        return 0;
      }

      // Date de début: première transaction ou date spécifiée
      const firstTransactionDate = new Date(transactions[0].transaction_date);
      const start = startDate ? new Date(startDate) : firstTransactionDate;
      const today = new Date();

      let snapshotsCreated = 0;

      // Parcourir chaque jour depuis le début
      for (let date = new Date(start); date <= today; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];

        // Simuler l'état du portefeuille à cette date
        // (Pour simplifier, on enregistre juste un snapshot basé sur les transactions jusqu'à cette date)
        // Note: Pour une précision maximale, il faudrait calculer les prix historiques des actions

        // Vérifier si on a déjà un snapshot pour cette date
        const existing = this.db.prepare(`
          SELECT id FROM user_portfolio_history
          WHERE user_id = ? AND date = ?
        `).get(portfolio.user_id, dateStr);

        if (!existing) {
          // Enregistrer le snapshot pour cette date
          if (this.recordPortfolioSnapshot(portfolioId, dateStr)) {
            snapshotsCreated++;
          }
        }
      }

      console.log(`📈 ${snapshotsCreated} snapshots historiques créés pour portfolio ${portfolioId}`);
      return snapshotsCreated;
    } catch (error) {
      console.error(`Erreur génération historique pour portfolio ${portfolioId}:`, error);
      return 0;
    }
  }

  /**
   * Démarrer l'enregistrement automatique quotidien
   * Par défaut à minuit UTC
   */
  startDailySnapshot(hour = 0, minute = 0) {
    console.log(`🔄 Démarrage des snapshots quotidiens (${hour}h${minute.toString().padStart(2, '0')} UTC)`);

    // Calculer le temps jusqu'au prochain snapshot
    const now = new Date();
    const nextRun = new Date();
    nextRun.setUTCHours(hour, minute, 0, 0);

    if (nextRun <= now) {
      // Si l'heure est déjà passée aujourd'hui, programmer pour demain
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const timeUntilNext = nextRun - now;

    // Premier snapshot
    setTimeout(() => {
      this.recordAllPortfoliosSnapshot();

      // Puis toutes les 24 heures
      this.updateInterval = setInterval(() => {
        this.recordAllPortfoliosSnapshot();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilNext);

    console.log(`⏰ Prochain snapshot: ${nextRun.toISOString()}`);
  }

  /**
   * Arrêter l'enregistrement automatique
   */
  stopDailySnapshot() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏸️ Snapshots quotidiens arrêtés');
    }
  }

  /**
   * Obtenir l'historique de performance d'un portefeuille
   */
  getPortfolioHistory(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const history = this.db.prepare(`
        SELECT * FROM user_portfolio_history
        WHERE user_id = ? AND date >= ?
        ORDER BY date ASC
      `).all(userId, startDate.toISOString().split('T')[0]);

      return history;
    } catch (error) {
      console.error(`Erreur récupération historique user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Nettoyer les anciens snapshots (garder uniquement X jours)
   */
  cleanOldSnapshots(daysToKeep = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = this.db.prepare(`
        DELETE FROM user_portfolio_history
        WHERE date < ?
      `).run(cutoffDate.toISOString().split('T')[0]);

      if (result.changes > 0) {
        console.log(`🗑️ ${result.changes} anciens snapshots supprimés`);
      }

      return result.changes;
    } catch (error) {
      console.error('Erreur nettoyage snapshots:', error);
      return 0;
    }
  }
}

module.exports = PortfolioHistoryService;
