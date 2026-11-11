/**
 * Script de mise à jour des données historiques
 * Met à jour uniquement les nouvelles données (depuis la dernière mise à jour)
 *
 * Usage:
 *   node scripts/updateHistoricalData.js [tickers]
 *
 * Exemples:
 *   node scripts/updateHistoricalData.js              # Tous les tickers
 *   node scripts/updateHistoricalData.js SNTS DANO    # Tickers spécifiques
 */

const HistoricalDataService = require('../services/historicalDataService');

async function main() {
  const service = new HistoricalDataService();

  console.log('\n🔄 PENDO - Mise à Jour des Données Historiques');
  console.log('==============================================\n');

  // Déterminer les tickers à mettre à jour
  let tickers;
  if (process.argv.length > 2) {
    tickers = process.argv.slice(2).map(t => t.toUpperCase());
    console.log(`Tickers: ${tickers.join(', ')}\n`);
  } else {
    const mappings = service.getAllMappings();
    tickers = mappings.map(m => m.pendo_ticker);
    console.log(`Mise à jour de tous les tickers (${tickers.length})\n`);
  }

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    console.log(`[${i + 1}/${tickers.length}] ${ticker}...`);

    const result = await service.updateData(ticker);
    results.push(result);

    if (result.success) {
      if (result.recordsFetched > 0) {
        console.log(`  ✅ ${result.recordsFetched} nouveaux enregistrements`);
      } else {
        console.log(`  ✓ Déjà à jour`);
      }
    } else {
      console.log(`  ❌ ${result.message}`);
    }

    // Délai pour éviter rate limiting
    if (i < tickers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  // Résumé
  console.log('\n' + '='.repeat(50));
  console.log('📋 RÉSUMÉ');
  console.log('='.repeat(50) + '\n');

  const successful = results.filter(r => r.success);
  const updated = results.filter(r => r.success && r.recordsFetched > 0);
  const alreadyUpToDate = results.filter(r => r.success && r.recordsFetched === 0);
  const failed = results.filter(r => !r.success);
  const totalNewRecords = results.reduce((sum, r) => sum + (r.recordsFetched || 0), 0);

  console.log(`✅ Succès: ${successful.length}/${results.length}`);
  console.log(`🔄 Mis à jour: ${updated.length}`);
  console.log(`✓ Déjà à jour: ${alreadyUpToDate.length}`);
  console.log(`❌ Échecs: ${failed.length}`);
  console.log(`📊 Nouveaux enregistrements: ${totalNewRecords.toLocaleString()}`);
  console.log(`⏱️  Durée: ${duration}s\n`);

  if (failed.length > 0) {
    console.log('⚠️  Échecs:');
    failed.forEach(r => {
      console.log(`  ✗ ${r.ticker}: ${r.message}`);
    });
    console.log('');
  }

  console.log('✨ Mise à jour terminée!\n');

  process.exit(0);
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Erreur non gérée:', error.message);
  process.exit(1);
});

main().catch(error => {
  console.error('\n❌ Erreur fatale:', error.message);
  process.exit(1);
});
