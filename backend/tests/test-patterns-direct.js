/**
 * Test direct du Pattern Recognition Service
 */

const PatternRecognitionService = require('../services/patternRecognitionService');

async function runTests() {
  console.log('🔍 Test Direct Pattern Recognition - Phase 3.2\n');

  const patternService = new PatternRecognitionService();

  try {
    // Test 1: Détection patterns sur AGL
    console.log('1️⃣ Détection patterns sur AGL...');
    const aglPatterns = await patternService.detectAllPatterns('AGL', 100);

    console.log(`✅ ${aglPatterns.totalPatterns} patterns détectés sur AGL`);
    console.log(`   Reversal: ${aglPatterns.patterns.filter(p => p.pattern_type === 'reversal').length}`);
    console.log(`   Continuation: ${aglPatterns.patterns.filter(p => p.pattern_type === 'continuation').length}`);
    console.log(`   Signaux Buy: ${aglPatterns.patterns.filter(p => p.signal === 'buy').length}`);
    console.log(`   Signaux Sell: ${aglPatterns.patterns.filter(p => p.signal === 'sell').length}`);
    console.log(`   Signaux Watch: ${aglPatterns.patterns.filter(p => p.signal === 'watch').length}\n`);

    // Afficher les 3 meilleurs patterns
    if (aglPatterns.patterns.length > 0) {
      console.log('   Top 3 patterns (par confiance):');
      aglPatterns.patterns.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.pattern_name} (${(p.confidence * 100).toFixed(0)}%)`);
        console.log(`      Signal: ${p.signal.toUpperCase()}`);
        console.log(`      Période: ${p.start_date} → ${p.end_date}`);
        if (p.target_price) {
          console.log(`      Objectif: ${p.target_price.toFixed(2)}`);
        }
        if (p.stop_loss) {
          console.log(`      Stop-Loss: ${p.stop_loss.toFixed(2)}`);
        }
      });
      console.log('');
    }

    // Test 2: Support/Résistance sur NPN
    console.log('2️⃣ Détection Support/Résistance sur NPN...');
    const npnLevels = patternService.detectSupportResistance('NPN', 100, 2);

    const supports = npnLevels.filter(l => l.level_type === 'support');
    const resistances = npnLevels.filter(l => l.level_type === 'resistance');

    console.log(`✅ ${npnLevels.length} niveaux S/R détectés`);
    console.log(`   Supports: ${supports.length}`);
    console.log(`   Résistances: ${resistances.length}\n`);

    if (supports.length > 0) {
      console.log('   Top 3 Supports (par force):');
      supports.slice(0, 3).forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.price.toFixed(2)} (Force: ${(s.strength * 100).toFixed(0)}%, ${s.touches} touches)`);
      });
      console.log('');
    }

    if (resistances.length > 0) {
      console.log('   Top 3 Résistances (par force):');
      resistances.slice(0, 3).forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.price.toFixed(2)} (Force: ${(r.strength * 100).toFixed(0)}%, ${r.touches} touches)`);
      });
      console.log('');
    }

    // Test 3: Patterns sur MTN
    console.log('3️⃣ Détection patterns sur MTN...');
    const mtnPatterns = await patternService.detectAllPatterns('MTN', 100);

    console.log(`✅ ${mtnPatterns.totalPatterns} patterns détectés sur MTN\n`);

    // Test 4: Patterns sur SHP
    console.log('4️⃣ Détection patterns sur SHP...');
    const shpPatterns = await patternService.detectAllPatterns('SHP', 100);

    console.log(`✅ ${shpPatterns.totalPatterns} patterns détectés sur SHP\n`);

    // Test 5: Récupération patterns sauvegardés
    console.log('5️⃣ Récupération patterns sauvegardés...');
    const savedPatterns = patternService.getPatterns('AGL', 10);

    console.log(`✅ ${savedPatterns.length} patterns sauvegardés récupérés pour AGL\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TOUS LES TESTS RÉUSSIS!');
    console.log('═══════════════════════════════════════════════════');

    // Résumé global
    const totalPatterns = aglPatterns.totalPatterns + mtnPatterns.totalPatterns + shpPatterns.totalPatterns;
    const allPatterns = [
      ...aglPatterns.patterns,
      ...mtnPatterns.patterns,
      ...shpPatterns.patterns
    ];

    console.log('\n📊 Résumé global:');
    console.log(`┌────────────────────────────────────┬─────────┐`);
    console.log(`│ Ticker                             │ Patterns│`);
    console.log(`├────────────────────────────────────┼─────────┤`);
    console.log(`│ AGL                                │ ${String(aglPatterns.totalPatterns).padStart(7)} │`);
    console.log(`│ NPN (S/R seulement)                │ ${String(npnLevels.length).padStart(7)} │`);
    console.log(`│ MTN                                │ ${String(mtnPatterns.totalPatterns).padStart(7)} │`);
    console.log(`│ SHP                                │ ${String(shpPatterns.totalPatterns).padStart(7)} │`);
    console.log(`├────────────────────────────────────┼─────────┤`);
    console.log(`│ TOTAL                              │ ${String(totalPatterns + npnLevels.length).padStart(7)} │`);
    console.log(`└────────────────────────────────────┴─────────┘`);

    // Patterns les plus fréquents
    const patternCounts = {};
    allPatterns.forEach(p => {
      patternCounts[p.pattern_name] = (patternCounts[p.pattern_name] || 0) + 1;
    });

    console.log('\n🏆 Patterns les plus fréquents:');
    Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([name, count], i) => {
        console.log(`   ${i + 1}. ${name}: ${count}x`);
      });

    // Signaux d'action
    const buySignals = allPatterns.filter(p => p.signal === 'buy');
    const sellSignals = allPatterns.filter(p => p.signal === 'sell');

    console.log('\n📈 Signaux d\'action:');
    console.log(`   🟢 BUY signals: ${buySignals.length}`);
    console.log(`   🔴 SELL signals: ${sellSignals.length}`);
    console.log(`   ⚪ WATCH signals: ${allPatterns.filter(p => p.signal === 'watch').length}`);

    if (buySignals.length > 0) {
      console.log('\n   Meilleur signal BUY:');
      const best = buySignals.sort((a, b) => b.confidence - a.confidence)[0];
      console.log(`   ${best.ticker}: ${best.pattern_name} (${(best.confidence * 100).toFixed(0)}% confiance)`);
    }

    if (sellSignals.length > 0) {
      console.log('\n   Meilleur signal SELL:');
      const best = sellSignals.sort((a, b) => b.confidence - a.confidence)[0];
      console.log(`   ${best.ticker}: ${best.pattern_name} (${(best.confidence * 100).toFixed(0)}% confiance)`);
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
