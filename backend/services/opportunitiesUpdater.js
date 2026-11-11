/**
 * Service de mise à jour hebdomadaire des opportunités d'investissement
 *
 * Ce service scrape et met à jour les opportunités d'investissement
 * à partir de sources fiables:
 * - African Development Bank (AfDB)
 * - African Business Magazine
 * - IFC (International Finance Corporation)
 * - TechCrunch Africa
 * - Disrupt Africa
 *
 * Fréquence recommandée: Hebdomadaire (chaque lundi à 6h00)
 */

const Database = require('better-sqlite3');
const path = require('path');

class OpportunitiesUpdater {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.sources = [
      'African Development Bank',
      'African Business Magazine',
      'TechCrunch Africa',
      'Disrupt Africa',
      'IFC Projects Database',
      'West Africa Real Estate Review',
      'Africa Healthcare Report',
      'Mining Weekly Africa',
      'Commodities Africa',
      'EdTech Africa Review'
    ];
  }

  /**
   * Fonction principale de mise à jour
   */
  async updateOpportunities() {
    console.log('🚀 Démarrage de la mise à jour hebdomadaire des opportunités...');
    console.log(`📅 Date: ${new Date().toLocaleString('fr-FR')}`);

    const stats = {
      updated: 0,
      new: 0,
      deactivated: 0,
      errors: 0
    };

    try {
      // 1. Marquer les anciennes opportunités comme potentiellement obsolètes
      this.checkExpiredOpportunities(stats);

      // 2. Récupérer de nouvelles opportunités (simulation pour l'instant)
      // Dans une vraie implémentation, ceci ferait du web scraping
      await this.fetchNewOpportunities(stats);

      // 3. Mettre à jour les statistiques des opportunités existantes
      this.updateViewsAndSaves(stats);

      // 4. Nettoyer les opportunités fermées depuis longtemps
      this.cleanOldOpportunities(stats);

      console.log('\n✅ Mise à jour terminée avec succès!');
      console.log('📊 Statistiques:');
      console.log(`   - Opportunités mises à jour: ${stats.updated}`);
      console.log(`   - Nouvelles opportunités: ${stats.new}`);
      console.log(`   - Opportunités désactivées: ${stats.deactivated}`);
      console.log(`   - Erreurs: ${stats.errors}`);

      return stats;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      stats.errors++;
      throw error;
    }
  }

  /**
   * Vérifier et marquer les opportunités expirées
   */
  checkExpiredOpportunities(stats) {
    console.log('\n🔍 Vérification des opportunités expirées...');

    try {
      // Marquer comme closed les opportunités avec deadline dépassée
      const result = this.db.prepare(`
        UPDATE investment_opportunities
        SET status = 'closed', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'active'
        AND deadline IS NOT NULL
        AND deadline < date('now')
      `).run();

      stats.deactivated += result.changes;
      console.log(`   ✓ ${result.changes} opportunités expirées désactivées`);
    } catch (error) {
      console.error('   ✗ Erreur:', error.message);
      stats.errors++;
    }
  }

  /**
   * Récupérer de nouvelles opportunités
   * TODO: Implémenter le vrai web scraping
   */
  async fetchNewOpportunities(stats) {
    console.log('\n📥 Recherche de nouvelles opportunités...');

    // Pour l'instant, c'est une simulation
    // Dans une vraie implémentation, on ferait du web scraping ici

    console.log('   ℹ️  Web scraping non encore implémenté');
    console.log('   ℹ️  Les opportunités doivent être ajoutées manuellement pour l\'instant');

    // Exemple de structure pour le futur scraping:
    /*
    const newOpportunities = await Promise.all([
      this.scrapeAfDB(),
      this.scrapeAfricanBusiness(),
      this.scrapeTechCrunch(),
      this.scrapeIFC(),
    ]);

    for (const opp of newOpportunities.flat()) {
      this.insertOrUpdateOpportunity(opp, stats);
    }
    */
  }

  /**
   * Insérer ou mettre à jour une opportunité
   */
  insertOrUpdateOpportunity(opportunity, stats) {
    try {
      // Vérifier si l'opportunité existe déjà (par slug)
      const existing = this.db.prepare(
        'SELECT id FROM investment_opportunities WHERE slug = ?'
      ).get(opportunity.slug);

      if (existing) {
        // Mise à jour
        this.db.prepare(`
          UPDATE investment_opportunities
          SET
            title = ?,
            summary = ?,
            description = ?,
            min_investment = ?,
            max_investment = ?,
            expected_return_min = ?,
            expected_return_max = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE slug = ?
        `).run(
          opportunity.title,
          opportunity.summary,
          opportunity.description,
          opportunity.min_investment,
          opportunity.max_investment,
          opportunity.expected_return_min,
          opportunity.expected_return_max,
          opportunity.status || 'active',
          opportunity.slug
        );
        stats.updated++;
      } else {
        // Insertion
        this.db.prepare(`
          INSERT INTO investment_opportunities (
            title, slug, sector, subsector, country, country_name, region,
            summary, description, opportunity_type, min_investment, max_investment,
            expected_return_min, expected_return_max, investment_horizon,
            risk_level, company_name, company_size, stage, market_size_usd,
            source_name, source_url, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          opportunity.title,
          opportunity.slug,
          opportunity.sector,
          opportunity.subsector,
          opportunity.country,
          opportunity.country_name,
          opportunity.region,
          opportunity.summary,
          opportunity.description,
          opportunity.opportunity_type,
          opportunity.min_investment,
          opportunity.max_investment,
          opportunity.expected_return_min,
          opportunity.expected_return_max,
          opportunity.investment_horizon,
          opportunity.risk_level,
          opportunity.company_name,
          opportunity.company_size,
          opportunity.stage,
          opportunity.market_size_usd,
          opportunity.source_name,
          opportunity.source_url,
          opportunity.status || 'active'
        );
        stats.new++;
      }
    } catch (error) {
      console.error(`   ✗ Erreur pour ${opportunity.slug}:`, error.message);
      stats.errors++;
    }
  }

  /**
   * Mettre à jour les statistiques des opportunités
   */
  updateViewsAndSaves(stats) {
    console.log('\n📊 Mise à jour des statistiques...');

    try {
      // Marquer la date de mise à jour
      const result = this.db.prepare(`
        UPDATE investment_opportunities
        SET scraped_at = CURRENT_TIMESTAMP
        WHERE status = 'active'
      `).run();

      console.log(`   ✓ ${result.changes} opportunités actualisées`);
    } catch (error) {
      console.error('   ✗ Erreur:', error.message);
      stats.errors++;
    }
  }

  /**
   * Nettoyer les vieilles opportunités fermées
   */
  cleanOldOpportunities(stats) {
    console.log('\n🧹 Nettoyage des anciennes opportunités...');

    try {
      // Archiver les opportunités fermées depuis plus de 6 mois
      const result = this.db.prepare(`
        UPDATE investment_opportunities
        SET status = 'archived'
        WHERE status = 'closed'
        AND updated_at < date('now', '-6 months')
      `).run();

      if (result.changes > 0) {
        console.log(`   ✓ ${result.changes} opportunités archivées`);
      }
    } catch (error) {
      console.error('   ✗ Erreur:', error.message);
      stats.errors++;
    }
  }

  /**
   * Obtenir des statistiques sur la base de données
   */
  getStats() {
    const stats = {
      total: this.db.prepare('SELECT COUNT(*) as count FROM investment_opportunities').get().count,
      active: this.db.prepare('SELECT COUNT(*) as count FROM investment_opportunities WHERE status = ?').get('active').count,
      closed: this.db.prepare('SELECT COUNT(*) as count FROM investment_opportunities WHERE status = ?').get('closed').count,
      pending: this.db.prepare('SELECT COUNT(*) as count FROM investment_opportunities WHERE status = ?').get('pending').count,
      by_sector: this.db.prepare('SELECT sector, COUNT(*) as count FROM investment_opportunities WHERE status = ? GROUP BY sector').all('active'),
      by_country: this.db.prepare('SELECT country_name, COUNT(*) as count FROM investment_opportunities WHERE status = ? GROUP BY country_name').all('active'),
    };
    return stats;
  }

  close() {
    this.db.close();
  }
}

// Fonction pour exécuter manuellement
async function runUpdate() {
  const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
  const updater = new OpportunitiesUpdater(dbPath);

  try {
    await updater.updateOpportunities();

    console.log('\n📈 Statistiques de la base de données:');
    const stats = updater.getStats();
    console.log(`   Total: ${stats.total}`);
    console.log(`   Actives: ${stats.active}`);
    console.log(`   Fermées: ${stats.closed}`);
    console.log(`   En attente: ${stats.pending}`);
    console.log(`\n   Répartition par secteur:`);
    stats.by_sector.forEach(s => {
      console.log(`     - ${s.sector}: ${s.count}`);
    });
  } catch (error) {
    console.error('Échec de la mise à jour:', error);
    process.exit(1);
  } finally {
    updater.close();
  }
}

// Si exécuté directement
if (require.main === module) {
  runUpdate();
}

module.exports = OpportunitiesUpdater;
