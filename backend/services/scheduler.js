/**
 * Service de planification automatique pour PENDO
 *
 * - Génération d'opportunités : Quotidien à 6h00
 * - Mise à jour des actualités : Toutes les heures
 */

const cron = require('node-cron');
const ComprehensiveAfricaOpportunitiesCollector = require('./comprehensiveAfricaOpportunitiesCollector');
const { updateNews } = require('./newsService');

class Scheduler {
  constructor() {
    this.jobs = {};
  }

  /**
   * Démarrer tous les jobs planifiés
   */
  start() {
    console.log('\n⏰ DÉMARRAGE DU PLANIFICATEUR AUTOMATIQUE');
    console.log('━'.repeat(60));

    // 1. Génération initiale au démarrage
    this.runInitialGeneration();

    // 2. Planifier les opportunités (quotidien à 6h00)
    this.scheduleOpportunities();

    // 3. Planifier les actualités (toutes les heures)
    this.scheduleNews();

    console.log('━'.repeat(60));
    console.log('✅ Planificateur démarré avec succès\n');
  }

  /**
   * Génération initiale au démarrage du serveur
   */
  async runInitialGeneration() {
    console.log('\n🚀 Génération initiale au démarrage...\n');

    // Générer opportunités si la base est vide ou ancienne
    try {
      const Database = require('better-sqlite3');
      const path = require('path');
      const db = new Database(path.join(__dirname, '..', 'data', 'pendo.db'));

      const count = db.prepare('SELECT COUNT(*) as count FROM investment_opportunities').get().count;
      db.close();

      if (count < 100) {
        console.log('   📊 Base de données contient peu d\'opportunités, génération initiale...');
        await this.generateOpportunities();
      } else {
        console.log(`   ✓ Base de données OK (${count} opportunités)`);
      }
    } catch (error) {
      console.error('   ✗ Erreur lors de la vérification initiale:', error.message);
    }

    // Mettre à jour les actualités
    try {
      console.log('   📰 Mise à jour initiale des actualités...');
      await updateNews();
      console.log('   ✓ Actualités mises à jour');
    } catch (error) {
      console.error('   ✗ Erreur actualités:', error.message);
    }
  }

  /**
   * Planifier la génération quotidienne d'opportunités
   */
  scheduleOpportunities() {
    // Cron: tous les jours à 6h00
    this.jobs.opportunities = cron.schedule('0 6 * * *', async () => {
      console.log('\n💼 [CRON] Génération quotidienne des opportunités');
      console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
      await this.generateOpportunities();
    }, {
      scheduled: true,
      timezone: "Africa/Abidjan" // UTC+0 pour l'Afrique de l'Ouest
    });

    console.log('   ✅ Opportunités planifiées : Quotidien à 6h00 (Africa/Abidjan)');
  }

  /**
   * Planifier la mise à jour horaire des actualités
   */
  scheduleNews() {
    // Cron: toutes les heures à la minute 0
    this.jobs.news = cron.schedule('0 * * * *', async () => {
      console.log('\n📰 [CRON] Mise à jour horaire des actualités');
      console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
      await this.updateNewsData();
    }, {
      scheduled: true,
      timezone: "Africa/Abidjan"
    });

    console.log('   ✅ Actualités planifiées : Toutes les heures');
  }

  /**
   * Générer de nouvelles opportunités
   */
  async generateOpportunities() {
    try {
      const startTime = Date.now();
      console.log('   ⏳ Génération en cours...');

      const collector = new ComprehensiveAfricaOpportunitiesCollector();
      const stats = await collector.collectAllAfricanOpportunities();

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ✅ Génération terminée en ${duration}s`);
      console.log(`   📊 ${stats.totalGenerated} nouvelles opportunités générées`);

      return stats;
    } catch (error) {
      console.error('   ❌ Erreur génération opportunités:', error.message);
      throw error;
    }
  }

  /**
   * Mettre à jour les actualités
   */
  async updateNewsData() {
    try {
      const startTime = Date.now();
      console.log('   ⏳ Récupération des actualités...');

      const count = await updateNews();

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ✅ Actualités mises à jour en ${duration}s`);
      console.log(`   📰 ${count} actualités disponibles`);

      return count;
    } catch (error) {
      console.error('   ❌ Erreur mise à jour actualités:', error.message);
      throw error;
    }
  }

  /**
   * Arrêter tous les jobs planifiés
   */
  stop() {
    console.log('\n⏸️  Arrêt du planificateur...');

    Object.entries(this.jobs).forEach(([name, job]) => {
      if (job) {
        job.stop();
        console.log(`   ✓ Job "${name}" arrêté`);
      }
    });

    this.jobs = {};
    console.log('✅ Planificateur arrêté\n');
  }

  /**
   * Obtenir le statut des jobs
   */
  getStatus() {
    return {
      opportunities: this.jobs.opportunities ? 'Actif (quotidien à 6h00)' : 'Inactif',
      news: this.jobs.news ? 'Actif (toutes les heures)' : 'Inactif',
      jobCount: Object.keys(this.jobs).length
    };
  }

  /**
   * Forcer la génération manuelle
   */
  async forceGenerateOpportunities() {
    console.log('\n🔧 Génération manuelle forcée des opportunités');
    return await this.generateOpportunities();
  }

  /**
   * Forcer la mise à jour manuelle
   */
  async forceUpdateNews() {
    console.log('\n🔧 Mise à jour manuelle forcée des actualités');
    return await this.updateNewsData();
  }
}

// Singleton
let schedulerInstance = null;

function getScheduler() {
  if (!schedulerInstance) {
    schedulerInstance = new Scheduler();
  }
  return schedulerInstance;
}

module.exports = getScheduler();
