/**
 * Test direct du Backtesting Engine (sans passer par l'API)
 */

const BacktestingService = require('../services/backtestingService');

async function runTests() {
  console.log('🚀 Test Direct Backtesting Engine - Phase 3.1\n');

  const backtestingService = new BacktestingService();

  try {
    // Test 1: Stratégies disponibles
    console.log('1️⃣ Stratégies disponibles...');
    const strategies = backtestingService.getAvailableStrategies();
    console.log(`✅ ${Object.keys(strategies).length} stratégies:`);
    Object.keys(strategies).forEach(key => {
      console.log(`   - ${key}: ${strategies[key].name}`);
    });
    console.log('');

    // Test 2: Backtest SMA Crossover sur AGL
    console.log('2️⃣ Exécution backtest SMA Crossover sur AGL...');
    const backtest1 = await backtestingService.runBacktest({
      userId: 1,
      name: 'Test SMA Crossover AGL',
      description: 'Backtest stratégie SMA 20/50 sur AGL',
      ticker: 'AGL',
      strategyType: 'sma_crossover',
      strategyParams: { shortPeriod: 20, longPeriod: 50 },
      startDate: '2023-01-04',
      endDate: '2025-12-31',
      initialCapital: 100000,
      commissionRate: 0.001,
      stopLoss: 5,
      takeProfit: 10
    });

    console.log('✅ Backtest SMA Crossover terminé!');
    console.log(`   Backtest ID: ${backtest1.backtestId}`);
    console.log(`   Trades totaux: ${backtest1.metrics.totalTrades}`);
    console.log(`   Rendement: ${backtest1.metrics.totalReturnPct}%`);
    console.log(`   Rendement annualisé: ${backtest1.metrics.annualizedReturn}%`);
    console.log(`   Win Rate: ${backtest1.metrics.winRate}%`);
    console.log(`   Sharpe Ratio: ${backtest1.metrics.sharpeRatio}`);
    console.log(`   Max Drawdown: ${backtest1.metrics.maxDrawdownPct}%`);
    console.log(`   Profit Factor: ${backtest1.metrics.profitFactor}`);
    console.log(`   Buy & Hold: ${backtest1.metrics.buyAndHoldReturn}%`);
    console.log(`   Alpha: ${backtest1.metrics.alpha}%\n`);

    // Afficher quelques trades
    if (backtest1.trades.length > 0) {
      console.log('   Premier trade:');
      const t = backtest1.trades[0];
      console.log(`     ${t.entryDate}: Achat ${t.quantity} @ ${t.entryPrice}`);
      console.log(`     ${t.exitDate}: Vente @ ${t.exitPrice}`);
      console.log(`     P&L: ${t.pnl.toFixed(2)} (${t.pnlPct.toFixed(2)}%)`);
      console.log(`     Raison: ${t.exitReason}\n`);
    }

    // Test 3: Backtest RSI sur MTN
    console.log('3️⃣ Exécution backtest RSI Oversold sur MTN...');
    const backtest2 = await backtestingService.runBacktest({
      userId: 1,
      name: 'Test RSI MTN',
      ticker: 'MTN',
      strategyType: 'rsi_oversold',
      strategyParams: { oversoldThreshold: 30, overboughtThreshold: 70 },
      startDate: '2021-01-04',
      endDate: '2025-12-31',
      initialCapital: 100000,
      commissionRate: 0.001
    });

    console.log('✅ Backtest RSI terminé!');
    console.log(`   Backtest ID: ${backtest2.backtestId}`);
    console.log(`   Trades totaux: ${backtest2.metrics.totalTrades}`);
    console.log(`   Rendement: ${backtest2.metrics.totalReturnPct}%`);
    console.log(`   Win Rate: ${backtest2.metrics.winRate}%`);
    console.log(`   Alpha: ${backtest2.metrics.alpha}%\n`);

    // Test 4: Backtest MACD sur NPN
    console.log('4️⃣ Exécution backtest MACD Crossover sur NPN...');
    const backtest3 = await backtestingService.runBacktest({
      userId: 1,
      name: 'Test MACD NPN',
      ticker: 'NPN',
      strategyType: 'macd_crossover',
      startDate: '2023-01-04',
      endDate: '2025-12-31',
      initialCapital: 100000
    });

    console.log('✅ Backtest MACD terminé!');
    console.log(`   Rendement: ${backtest3.metrics.totalReturnPct}%`);
    console.log(`   Trades: ${backtest3.metrics.totalTrades}\n`);

    // Test 5: Backtest Golden Cross
    console.log('5️⃣ Exécution backtest Golden Cross sur SHP...');
    const backtest4 = await backtestingService.runBacktest({
      userId: 1,
      name: 'Test Golden Cross SHP',
      ticker: 'SHP',
      strategyType: 'golden_cross',
      startDate: '2021-01-04',
      endDate: '2025-12-31',
      initialCapital: 100000
    });

    console.log('✅ Backtest Golden Cross terminé!');
    console.log(`   Rendement: ${backtest4.metrics.totalReturnPct}%\n`);

    // Test 6: Récupérer backtest par ID
    console.log('6️⃣ Récupération backtest par ID...');
    const retrieved = backtestingService.getBacktest(backtest1.backtestId, true);
    console.log(`✅ Backtest récupéré:`);
    console.log(`   Nom: ${retrieved.name}`);
    console.log(`   Statut: ${retrieved.status}`);
    console.log(`   Trades: ${retrieved.trades.length}`);
    console.log(`   Points courbe équité: ${retrieved.equityCurve.length}\n`);

    // Test 7: Liste des backtests utilisateur
    console.log('7️⃣ Liste des backtests utilisateur...');
    const userBacktests = backtestingService.getUserBacktests(1, 10);
    console.log(`✅ ${userBacktests.length} backtests trouvés\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TOUS LES TESTS RÉUSSIS!');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📊 Résumé comparatif des stratégies:');
    console.log(`┌─────────────────────────────┬─────────┬────────┬────────────┬───────┐`);
    console.log(`│ Stratégie                   │ Ticker  │ Trades │ Rendement  │ Alpha │`);
    console.log(`├─────────────────────────────┼─────────┼────────┼────────────┼───────┤`);
    console.log(`│ SMA Crossover 20/50         │ AGL     │ ${String(backtest1.metrics.totalTrades).padStart(6)} │ ${String(backtest1.metrics.totalReturnPct + '%').padStart(9)} │ ${String(backtest1.metrics.alpha.toFixed(2) + '%').padStart(5)} │`);
    console.log(`│ RSI Oversold/Overbought     │ MTN     │ ${String(backtest2.metrics.totalTrades).padStart(6)} │ ${String(backtest2.metrics.totalReturnPct + '%').padStart(9)} │ ${String(backtest2.metrics.alpha.toFixed(2) + '%').padStart(5)} │`);
    console.log(`│ MACD Crossover              │ NPN     │ ${String(backtest3.metrics.totalTrades).padStart(6)} │ ${String(backtest3.metrics.totalReturnPct + '%').padStart(9)} │ ${String(backtest3.metrics.alpha.toFixed(2) + '%').padStart(5)} │`);
    console.log(`│ Golden Cross (SMA50/200)    │ SHP     │ ${String(backtest4.metrics.totalTrades).padStart(6)} │ ${String(backtest4.metrics.totalReturnPct + '%').padStart(9)} │ ${String(backtest4.metrics.alpha.toFixed(2) + '%').padStart(5)} │`);
    console.log(`└─────────────────────────────┴─────────┴────────┴────────────┴───────┘`);
    console.log('\n💡 Alpha = Rendement stratégie - Buy & Hold');
    console.log('   Alpha positif = La stratégie bat le buy & hold');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
