/**
 * Script de test pour Backtesting Engine
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3005';
const TOKEN = process.env.TEST_TOKEN || ''; // générer avec tests/get-token.js

async function runBacktest() {
  try {
    console.log('🚀 Test Backtesting Engine - Phase 3.1\n');

    // Test 1: Info
    console.log('1️⃣ Test Info API...');
    const info = await axios.get(`${BASE_URL}/api/backtest/info`);
    console.log(`✅ ${info.data.name} v${info.data.version}`);
    console.log(`   Stratégies disponibles: ${info.data.strategies}\n`);

    // Test 2: Stratégies
    console.log('2️⃣ Test Stratégies disponibles...');
    const strategies = await axios.get(`${BASE_URL}/api/backtest/strategies`);
    console.log(`✅ ${strategies.data.count} stratégies:`);
    Object.keys(strategies.data.strategies).forEach(key => {
      const strat = strategies.data.strategies[key];
      console.log(`   - ${key}: ${strat.name}`);
    });
    console.log('');

    // Test 3: Vérifier données historiques
    console.log('3️⃣ Vérification données historiques...');
    const histData = await axios.get(`${BASE_URL}/api/historical/stats`);
    console.log(`✅ ${histData.data.data.total_tickers} tickers, ${histData.data.data.total_records} enregistrements`);
    console.log(`   Période: ${histData.data.data.oldest_date} → ${histData.data.data.newest_date}\n`);

    // Test 4: Exécuter backtest SMA Crossover
    console.log('4️⃣ Exécution backtest SMA Crossover sur AGL...');
    const backtestConfig = {
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
    };

    const backtest1 = await axios.post(
      `${BASE_URL}/api/backtest/run`,
      backtestConfig,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    console.log('✅ Backtest SMA Crossover terminé!');
    console.log(`   Backtest ID: ${backtest1.data.backtestId}`);
    console.log(`   Trades totaux: ${backtest1.data.summary.totalTrades}`);
    console.log(`   Rendement: ${backtest1.data.summary.totalReturnPct}%`);
    console.log(`   Win Rate: ${backtest1.data.summary.winRate}%`);
    console.log(`   Sharpe Ratio: ${backtest1.data.summary.sharpeRatio}`);
    console.log(`   Max Drawdown: ${backtest1.data.summary.maxDrawdownPct}%\n`);

    // Test 5: Exécuter backtest RSI
    console.log('5️⃣ Exécution backtest RSI Oversold sur MTN...');
    const backtest2 = await axios.post(
      `${BASE_URL}/api/backtest/run`,
      {
        name: 'Test RSI MTN',
        ticker: 'MTN',
        strategyType: 'rsi_oversold',
        strategyParams: { oversoldThreshold: 30, overboughtThreshold: 70 },
        startDate: '2021-01-04',
        endDate: '2025-12-31',
        initialCapital: 100000,
        commissionRate: 0.001
      },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    console.log('✅ Backtest RSI terminé!');
    console.log(`   Backtest ID: ${backtest2.data.backtestId}`);
    console.log(`   Trades totaux: ${backtest2.data.summary.totalTrades}`);
    console.log(`   Rendement: ${backtest2.data.summary.totalReturnPct}%`);
    console.log(`   Win Rate: ${backtest2.data.summary.winRate}%\n`);

    // Test 6: Exécuter backtest MACD
    console.log('6️⃣ Exécution backtest MACD Crossover sur NPN...');
    const backtest3 = await axios.post(
      `${BASE_URL}/api/backtest/run`,
      {
        name: 'Test MACD NPN',
        ticker: 'NPN',
        strategyType: 'macd_crossover',
        startDate: '2023-01-04',
        endDate: '2025-12-31',
        initialCapital: 100000
      },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    console.log('✅ Backtest MACD terminé!');
    console.log(`   Rendement: ${backtest3.data.summary.totalReturnPct}%\n`);

    // Test 7: Liste des backtests
    console.log('7️⃣ Récupération liste des backtests...');
    const list = await axios.get(
      `${BASE_URL}/api/backtest/user/list`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    console.log(`✅ ${list.data.count} backtests trouvés\n`);

    // Test 8: Récupérer détails du premier backtest
    console.log('8️⃣ Récupération détails backtest #1...');
    const details = await axios.get(
      `${BASE_URL}/api/backtest/${backtest1.data.backtestId}?details=true`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    console.log(`✅ Détails récupérés:`);
    console.log(`   Nom: ${details.data.backtest.name}`);
    console.log(`   Statut: ${details.data.backtest.status}`);
    console.log(`   Trades: ${details.data.backtest.trades?.length || 0}`);
    console.log(`   Points courbe équité: ${details.data.backtest.equityCurve?.length || 0}\n`);

    // Test 9: Récupérer uniquement les trades
    console.log('9️⃣ Récupération trades du backtest #1...');
    const trades = await axios.get(
      `${BASE_URL}/api/backtest/${backtest1.data.backtestId}/trades`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    console.log(`✅ ${trades.data.count} trades récupérés`);
    if (trades.data.trades.length > 0) {
      const firstTrade = trades.data.trades[0];
      console.log(`   Premier trade:`);
      console.log(`     Entrée: ${firstTrade.entry_date} @ ${firstTrade.entry_price}`);
      console.log(`     Sortie: ${firstTrade.exit_date} @ ${firstTrade.exit_price}`);
      console.log(`     P&L: ${firstTrade.pnl} (${firstTrade.pnl_pct}%)`);
      console.log(`     Raison: ${firstTrade.exit_reason}\n`);
    }

    // Test 10: Récupérer courbe d'équité
    console.log('🔟 Récupération courbe d\'équité...');
    const equity = await axios.get(
      `${BASE_URL}/api/backtest/${backtest1.data.backtestId}/equity`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    console.log(`✅ ${equity.data.count} points dans la courbe d'équité`);
    if (equity.data.equityCurve.length > 0) {
      const lastPoint = equity.data.equityCurve[equity.data.equityCurve.length - 1];
      console.log(`   Équité finale: ${lastPoint.equity.toFixed(2)} FCFA`);
      console.log(`   Cash final: ${lastPoint.cash.toFixed(2)} FCFA\n`);
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TOUS LES TESTS RÉUSSIS!');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📊 Résumé des 3 backtests:');
    console.log(`   1. SMA Crossover (AGL): ${backtest1.data.summary.totalReturnPct}% rendement`);
    console.log(`   2. RSI Oversold (MTN): ${backtest2.data.summary.totalReturnPct}% rendement`);
    console.log(`   3. MACD Crossover (NPN): ${backtest3.data.summary.totalReturnPct}% rendement`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('   Détails:', error.response.data.error);
    }
    process.exit(1);
  }
}

// Vérifier serveur
axios.get(`${BASE_URL}/api/markets`)
  .then(() => {
    console.log('✅ Serveur PENDO détecté\n');
    runBacktest();
  })
  .catch(() => {
    console.error('❌ Serveur PENDO non accessible sur', BASE_URL);
    console.error('   Assurez-vous que le serveur est démarré: PORT=3005 npm start');
    process.exit(1);
  });
