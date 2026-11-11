/**
 * Script de population des données historiques
 *
 * Usage:
 *   node scripts/populateHistoricalData.js [options]
 *
 * Options:
 *   --years=5        Nombre d'années à récupérer (défaut: 5)
 *   --tickers=A,B,C  Tickers spécifiques (défaut: tous les mappings)
 *   --delay=2000     Délai entre requêtes en ms (défaut: 2000)
 */

const HistoricalDataService = require('../services/historicalDataService');

// Parse les arguments de la ligne de commande
function parseArgs() {
  const args = {
    years: 5,
    tickers: null,
    delay: 2000
  };

  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--years=')) {
      args.years = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--tickers=')) {
      args.tickers = arg.split('=')[1].split(',').map(t => t.trim().toUpperCase());
    } else if (arg.startsWith('--delay=')) {
      args.delay = parseInt(arg.split('=')[1]);
    }
  });

  return args;
}

async function main() {
  const args = parseArgs();
  const service = new HistoricalDataService();

  console.log('\n📊 PENDO - Collecte de Données Historiques');
  console.log('==========================================\n');
  console.log(`⚙️  Configuration:`);
  console.log(`   - Années: ${args.years}`);
  console.log(`   - Délai: ${args.delay}ms entre chaque ticker`);

  // Déterminer les tickers à traiter
  let tickers;
  if (args.tickers) {
    tickers = args.tickers;
    console.log(`   - Tickers: ${tickers.join(', ')}`);
  } else {
    const mappings = service.getAllMappings();
    tickers = mappings.map(m => m.pendo_ticker);
    console.log(`   - Tickers: Tous (${tickers.length})`);
  }

  console.log('\n🚀 Début de la collecte...\n');

  const startTime = Date.now();

  // Collecter les données
  const results = await service.fetchMultipleTickers(tickers, args.years, args.delay);

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  // Résumé
  console.log('\n' + '='.repeat(50));
  console.log('📋 RÉSUMÉ DE LA COLLECTE');
  console.log('='.repeat(50) + '\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalRecords = results.reduce((sum, r) => sum + (r.recordsFetched || 0), 0);

  console.log(`✅ Succès: ${successful.length}/${results.length}`);
  console.log(`❌ Échecs: ${failed.length}/${results.length}`);
  console.log(`📊 Total enregistrements: ${totalRecords.toLocaleString()}`);
  console.log(`⏱️  Durée: ${duration}s\n`);

  if (successful.length > 0) {
    console.log('Tickers réussis:');
    successful.forEach(r => {
      console.log(`  ✓ ${r.ticker}: ${r.recordsFetched.toLocaleString()} enregistrements`);
    });
  }

  if (failed.length > 0) {
    console.log('\n⚠️  Tickers échoués:');
    failed.forEach(r => {
      console.log(`  ✗ ${r.ticker}: ${r.message}`);
    });
  }

  // Statistiques globales
  console.log('\n' + '='.repeat(50));
  console.log('📈 STATISTIQUES DE LA BASE DE DONNÉES');
  console.log('='.repeat(50) + '\n');

  const stats = service.getGlobalStats();

  console.log(`Total tickers: ${stats.total_tickers}`);
  console.log(`Total enregistrements: ${stats.total_records.toLocaleString()}`);
  console.log(`Date la plus ancienne: ${stats.oldest_date}`);
  console.log(`Date la plus récente: ${stats.newest_date}\n`);

  console.log('Par ticker:');
  stats.tickers.forEach(t => {
    const years = ((new Date(t.end_date) - new Date(t.start_date)) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
    console.log(`  ${t.ticker.padEnd(6)} - ${t.records.toString().padStart(5)} enregistrements (${years} ans)`);
  });

  console.log('\n✨ Collecte terminée!\n');

  process.exit(0);
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Erreur non gérée:', error.message);
  console.error(error.stack);
  process.exit(1);
});

// Exécuter
main().catch(error => {
  console.error('\n❌ Erreur fatale:', error.message);
  console.error(error.stack);
  process.exit(1);
});
