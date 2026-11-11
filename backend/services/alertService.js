/**
 * Service de gestion des alertes de prix
 * Vérifie périodiquement les alertes et déclenche des notifications
 * Compatible SQLite et PostgreSQL via dbWrapper
 */

class AlertService {
  constructor(dbWrapper) {
    this.dbWrapper = dbWrapper;
    this.checkInterval = null;
  }

  /**
   * Démarrer le service de vérification des alertes
   */
  start(intervalMs = 60000) { // Vérifier toutes les minutes par défaut
    console.log('🔔 Service d\'alertes démarré');

    // Vérifier immédiatement
    this.checkAlerts();

    // Puis vérifier périodiquement
    this.checkInterval = setInterval(() => {
      this.checkAlerts();
    }, intervalMs);
  }

  /**
   * Arrêter le service
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🔔 Service d\'alertes arrêté');
    }
  }

  /**
   * Vérifier toutes les alertes actives
   */
  async checkAlerts() {
    try {
      // Récupérer toutes les alertes actives
      const alerts = await this.dbWrapper.all(`
        SELECT
          a.id,
          a.user_id,
          a.ticker,
          a.alert_type,
          a.target_value,
          s.price as current_price,
          s.name as stock_name,
          u.email as user_email
        FROM user_price_alerts a
        LEFT JOIN stocks s ON a.ticker = s.symbol
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.is_active = 1 AND s.price IS NOT NULL
      `);

      let triggeredCount = 0;

      for (const alert of alerts) {
        if (this.shouldTriggerAlert(alert)) {
          await this.triggerAlert(alert);
          triggeredCount++;
        }
      }

      if (triggeredCount > 0) {
        console.log(`🔔 ${triggeredCount} alertes déclenchées`);
      }
    } catch (error) {
      console.error('Erreur vérification alertes:', error);
    }
  }

  /**
   * Déterminer si une alerte doit être déclenchée
   */
  shouldTriggerAlert(alert) {
    const { alert_type, target_value, current_price } = alert;

    switch (alert_type) {
      case 'price_above':
        return current_price >= target_value;
      case 'price_below':
        return current_price <= target_value;
      case 'price_change_up':
        // Changement de prix en hausse de X%
        // On devrait stocker le prix de référence, simplifié ici
        return false;
      case 'price_change_down':
        // Changement de prix en baisse de X%
        return false;
      default:
        return false;
    }
  }

  /**
   * Déclencher une alerte
   */
  async triggerAlert(alert) {
    try {
      // Créer une notification
      await this.dbWrapper.run(`
        INSERT INTO user_notifications (user_id, type, title, message, ticker)
        VALUES (?, ?, ?, ?, ?)
      `, [
        alert.user_id,
        'price_alert',
        `Alerte ${alert.ticker}`,
        `Le prix de ${alert.stock_name} (${alert.ticker}) est maintenant ${alert.current_price}`,
        alert.ticker
      ]);

      // Désactiver l'alerte
      await this.dbWrapper.run(`
        UPDATE user_price_alerts
        SET is_active = 0, triggered_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [alert.id]);

      console.log(`🔔 Alerte déclenchée: ${alert.ticker} pour utilisateur ${alert.user_id}`);
    } catch (error) {
      console.error('Erreur déclenchement alerte:', error);
    }
  }
}

module.exports = AlertService;
