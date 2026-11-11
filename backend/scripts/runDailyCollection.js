#!/usr/bin/env node

/**
 * SCRIPT DE COLLECTE AUTOMATIQUE QUOTIDIENNE
 *
 * Exécute la collecte complète des actualités et opportunités africaines
 * À lancer via cron ou scheduler
 *
 * Usage:
 *   node scripts/runDailyCollection.js
 *
 * Cron (tous les jours à 6h00):
 *   0 6 * * * cd /path/to/pendo-backend && node scripts/runDailyCollection.js
 */

const ComprehensiveAfricaNewsCollector = require('../services/comprehensiveAfricaNewsCollector');
const ComprehensiveAfricaOpportunitiesCollector = require('../services/comprehensiveAfricaOpportunitiesCollector');

async function runDailyCollection() {
  console.log('\n' + '='.repeat(70));
  console.log('🌍 COLLECTE AUTOMATIQUE QUOTIDIENNE - PENDO AFRICA');
  console.log('='.repeat(70));
  console.log(`📅 ${new Date().toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`);
  console.log('='.repeat(70) + '\n');

  const startTime = Date.now();

  try {
    // 1. COLLECTER LES ACTUALITÉS
    console.log('📰 ÉTAPE 1/2: Collecte actualités africaines\n');
    const newsCollector = new ComprehensiveAfricaNewsCollector();
    const newsStats = await newsCollector.collectAllAfricanNews();

    console.log('\n' + '-'.repeat(70) + '\n');

    // 2. COLLECTER LES OPPORTUNITÉS
    console.log('💼 ÉTAPE 2/2: Génération opportunités africaines\n');
    const oppsCollector = new ComprehensiveAfricaOpportunitiesCollector();
    const oppsStats = await oppsCollector.collectAllAfricanOpportunities();

    // RÉSUMÉ FINAL
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(70));
    console.log('✅ COLLECTE QUOTIDIENNE TERMINÉE AVEC SUCCÈS');
    console.log('='.repeat(70));
    console.log('\n📊 RÉSUMÉ GLOBAL:\n');
    console.log(`   📰 Actualités collectées: ${newsStats.totalCollected}`);
    console.log(`      └─ Bourses couvertes: ${Object.keys(newsStats.byExchange).length}`);
    console.log(`      └─ Pays couverts: ${Object.keys(newsStats.byCountry).length}`);
    console.log(`      └─ Erreurs: ${newsStats.errors.length}`);
    console.log('');
    console.log(`   💼 Opportunités générées: ${oppsStats.totalGenerated}`);
    console.log(`      └─ Pays couverts: ${Object.keys(oppsStats.byCountry).length}/54`);
    console.log(`      └─ Secteurs couverts: ${Object.keys(oppsStats.bySector).length}`);
    console.log('');
    console.log(`   ⏱️  Durée totale: ${duration}s`);
    console.log(`   📅 Prochaine exécution: Demain à 06:00`);
    console.log('\n' + '='.repeat(70) + '\n');

    // Log pour monitoring
    logToFile({
      timestamp: new Date().toISOString(),
      success: true,
      newsCollected: newsStats.totalCollected,
      opportunitiesGenerated: oppsStats.totalGenerated,
      duration: duration,
      errors: newsStats.errors
    });

    process.exit(0);

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ ERREUR LORS DE LA COLLECTE');
    console.error('='.repeat(70));
    console.error('\n', error);
    console.error('\n' + '='.repeat(70) + '\n');

    logToFile({
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message,
      stack: error.stack
    });

    process.exit(1);
  }
}

function logToFile(data) {
  const fs = require('fs');
  const path = require('path');
  const logDir = path.join(__dirname, '..', 'logs');
  const logFile = path.join(logDir, 'daily-collection.log');

  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logEntry = JSON.stringify(data) + '\n';
    fs.appendFileSync(logFile, logEntry);
  } catch (err) {
    console.error('Erreur écriture log:', err);
  }
}

// Exécuter
runDailyCollection();
