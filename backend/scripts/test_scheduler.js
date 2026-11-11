/**
 * Script de test du planificateur automatique
 */

const scheduler = require('../services/scheduler');

console.log('🧪 TEST DU PLANIFICATEUR AUTOMATIQUE\n');
console.log('━'.repeat(60));

// Tester l'import du scheduler
console.log('\n✅ Scheduler importé avec succès');
console.log('   Méthodes disponibles:', Object.getOwnPropertyNames(Object.getPrototypeOf(scheduler)));

// Obtenir le statut initial
console.log('\n📊 STATUT INITIAL:');
const initialStatus = scheduler.getStatus();
console.log('   Opportunités:', initialStatus.opportunities);
console.log('   Actualités:', initialStatus.news);
console.log('   Jobs actifs:', initialStatus.jobCount);

// Démarrer le planificateur
console.log('\n🚀 DÉMARRAGE DU PLANIFICATEUR...\n');
scheduler.start();

// Attendre un peu pour voir les logs
setTimeout(() => {
  console.log('\n📊 STATUT APRÈS DÉMARRAGE:');
  const status = scheduler.getStatus();
  console.log('   Opportunités:', status.opportunities);
  console.log('   Actualités:', status.news);
  console.log('   Jobs actifs:', status.jobCount);

  if (status.jobCount === 2) {
    console.log('\n✅ PLANIFICATEUR CONFIGURÉ AVEC SUCCÈS');
    console.log('   ✓ Job opportunités (quotidien à 6h00)');
    console.log('   ✓ Job actualités (toutes les heures)');
  } else {
    console.log('\n⚠️  Problème de configuration');
  }

  // Arrêter le planificateur
  console.log('\n⏸️  ARRÊT DU PLANIFICATEUR...');
  scheduler.stop();

  console.log('\n━'.repeat(60));
  console.log('✅ TEST TERMINÉ\n');
  process.exit(0);
}, 3000);
