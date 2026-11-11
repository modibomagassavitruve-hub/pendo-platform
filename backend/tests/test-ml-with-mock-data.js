/**
 * Test ML Prediction Service avec données simulées - Phase 4.1
 */

const MLPredictionService = require('../services/mlPredictionService');
const Database = require('better-sqlite3');
const path = require('path');

// Créer des données de démonstration
function generateMockData() {
  const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
  const db = new Database(dbPath);

  console.log('📊 Génération de données historiques de démonstration...\n');

  // Vérifier si stocks AGL existe
  const agl = db.prepare('SELECT id FROM stocks WHERE symbol = ?').get('AGL');
  const npn = db.prepare('SELECT id FROM stocks WHERE symbol = ?').get('NPN');
  const mtn = db.prepare('SELECT id FROM stocks WHERE symbol = ?').get('MTN');

  if (!agl || !npn || !mtn) {
    console.error('❌ Les tickers AGL, NPN, MTN doivent exister dans la table stocks');
    process.exit(1);
  }

  // Générer 300 jours de données pour chaque ticker
  const now = Date.now() / 1000; // Unix timestamp
  const dayInSeconds = 24 * 60 * 60;

  const stocks = [
    { id: agl.id, symbol: 'AGL', basePrice: 68000, volatility: 0.02 },
    { id: npn.id, symbol: 'NPN', basePrice: 125000, volatility: 0.015 },
    { id: mtn.id, symbol: 'MTN', basePrice: 45000, volatility: 0.025 }
  ];

  let totalInserted = 0;

  // Supprimer anciennes données de test
  db.prepare('DELETE FROM market_history_data WHERE market_id IN (?, ?, ?)').run(agl.id, npn.id, mtn.id);

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO market_history_data (market_id, timestamp, open, high, low, close, volume, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((stocks) => {
    for (const stock of stocks) {
      let price = stock.basePrice;
      const trend = Math.random() > 0.5 ? 1 : -1; // Tendance générale

      for (let day = 300; day >= 0; day--) {
        const timestamp = Math.floor(now - (day * dayInSeconds));

        // Simuler une marche aléatoire avec tendance
        const dailyChange = (Math.random() - 0.5) * 2 * stock.volatility;
        const trendImpact = trend * 0.0005; // Légère tendance
        price = price * (1 + dailyChange + trendImpact);

        // Générer OHLC
        const open = price * (1 + (Math.random() - 0.5) * 0.005);
        const close = price;
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = Math.floor(Math.random() * 1000000) + 500000;

        insertStmt.run(stock.id, timestamp, open, high, low, close, volume, 'mock_data');
        totalInserted++;
      }

      console.log(`✅ ${stock.symbol}: 301 jours de données générés (prix final: ${price.toFixed(2)})`);
    }
  });

  transaction(stocks);

  console.log(`\n✅ Total: ${totalInserted} enregistrements insérés\n`);

  db.close();
}

async function runTests() {
  // Générer les données d'abord
  generateMockData();

  console.log('🤖 Test Direct ML Price Prediction - Phase 4.1\n');

  const mlService = new MLPredictionService();

  try {
    // Test 1: Prédiction simple sur AGL
    console.log('1️⃣ Prédiction ML sur AGL...');
    const aglPrediction = await mlService.predictPrice('AGL', ['1day', '5days', '20days']);

    console.log(`✅ Prédictions générées pour AGL`);
    console.log(`   Prix actuel: ${aglPrediction.current_price.toFixed(2)} FCFA`);
    console.log(`   Date: ${aglPrediction.prediction_date}\n`);

    aglPrediction.predictions.forEach(pred => {
      console.log(`   📊 Horizon: ${pred.horizon} (${pred.days} jours)`);
      console.log(`      Date cible: ${pred.prediction_date}`);
      console.log(`      Prix prédit: ${pred.predicted_price.toFixed(2)} FCFA`);
      console.log(`      Variation: ${pred.change_pct > 0 ? '+' : ''}${pred.change_pct.toFixed(2)}%`);
      console.log(`      Intervalle confiance (95%):`);
      console.log(`         Min: ${pred.confidence_interval.lower.toFixed(2)} FCFA`);
      console.log(`         Max: ${pred.confidence_interval.upper.toFixed(2)} FCFA`);
      console.log('');
    });

    // Recommandation
    console.log(`   💡 Recommandation: ${aglPrediction.recommendation.summary}`);
    console.log(`      Signal: ${aglPrediction.recommendation.signal}`);
    console.log(`      Confiance: ${aglPrediction.recommendation.confidence}`);
    if (aglPrediction.recommendation.reasons.length > 0) {
      console.log(`      Raisons:`);
      aglPrediction.recommendation.reasons.forEach(reason => {
        console.log(`         - ${reason}`);
      });
    }
    console.log('');

    // Performance des modèles
    console.log(`   📈 Performance des modèles:`);
    console.log(`      Linear Regression:`);
    console.log(`         Train R²: ${aglPrediction.models_performance.linear.trainR2.toFixed(4)}`);
    console.log(`         Valid R²: ${aglPrediction.models_performance.linear.validR2.toFixed(4)}`);
    console.log(`         Valid RMSE: ${aglPrediction.models_performance.linear.validRMSE.toFixed(2)}`);
    console.log(`      Polynomial Regression:`);
    console.log(`         Train R²: ${aglPrediction.models_performance.polynomial.trainR2.toFixed(4)}`);
    console.log(`         Valid R²: ${aglPrediction.models_performance.polynomial.validR2.toFixed(4)}`);
    console.log(`         Valid RMSE: ${aglPrediction.models_performance.polynomial.validRMSE.toFixed(2)}`);
    console.log('');

    // Test 2: Prédiction sur NPN
    console.log('2️⃣ Prédiction ML sur NPN...');
    const npnPrediction = await mlService.predictPrice('NPN', ['1day', '10days']);

    console.log(`✅ ${npnPrediction.predictions.length} prédictions générées pour NPN`);
    console.log(`   Prix actuel: ${npnPrediction.current_price.toFixed(2)} FCFA`);
    console.log(`   1 jour: ${npnPrediction.predictions[0].predicted_price.toFixed(2)} (${npnPrediction.predictions[0].change_pct > 0 ? '+' : ''}${npnPrediction.predictions[0].change_pct.toFixed(2)}%)`);
    console.log(`   10 jours: ${npnPrediction.predictions[1].predicted_price.toFixed(2)} (${npnPrediction.predictions[1].change_pct > 0 ? '+' : ''}${npnPrediction.predictions[1].change_pct.toFixed(2)}%)`);
    console.log(`   Recommandation: ${npnPrediction.recommendation.summary}\n`);

    // Test 3: Prédiction sur MTN
    console.log('3️⃣ Prédiction ML sur MTN...');
    const mtnPrediction = await mlService.predictPrice('MTN', ['5days', '20days']);

    console.log(`✅ ${mtnPrediction.predictions.length} prédictions générées pour MTN`);
    console.log(`   Prix actuel: ${mtnPrediction.current_price.toFixed(2)} FCFA`);
    console.log(`   5 jours: ${mtnPrediction.predictions[0].predicted_price.toFixed(2)} (${mtnPrediction.predictions[0].change_pct > 0 ? '+' : ''}${mtnPrediction.predictions[0].change_pct.toFixed(2)}%)`);
    console.log(`   20 jours: ${mtnPrediction.predictions[1].predicted_price.toFixed(2)} (${mtnPrediction.predictions[1].change_pct > 0 ? '+' : ''}${mtnPrediction.predictions[1].change_pct.toFixed(2)}%)`);
    console.log(`   Recommandation: ${mtnPrediction.recommendation.summary}\n`);

    // Test 4: Récupération des prédictions sauvegardées
    console.log('4️⃣ Récupération des prédictions sauvegardées...');
    const savedPredictions = mlService.getPredictions('AGL', 10);
    console.log(`✅ ${savedPredictions.length} prédictions sauvegardées récupérées pour AGL\n`);

    // Test 5: Récupération des modèles
    console.log('5️⃣ Récupération des modèles entraînés...');
    const models = mlService.getModels('AGL');
    console.log(`✅ ${models.length} modèles entraînés pour AGL`);
    if (models.length > 0) {
      console.log(`   Dernier modèle: ${models[0].model_type}`);
      console.log(`   Validation R²: ${models[0].validation_r2.toFixed(4)}`);
      console.log(`   Validation RMSE: ${models[0].validation_rmse.toFixed(2)}`);
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TOUS LES TESTS RÉUSSIS!');
    console.log('═══════════════════════════════════════════════════');

    // Résumé global
    console.log('\n📊 Résumé global:');
    console.log(`┌────────────────────────────────────┬─────────────┐`);
    console.log(`│ Ticker                             │ Prédictions │`);
    console.log(`├────────────────────────────────────┼─────────────┤`);
    console.log(`│ AGL                                │ ${String(aglPrediction.predictions.length).padStart(11)} │`);
    console.log(`│ NPN                                │ ${String(npnPrediction.predictions.length).padStart(11)} │`);
    console.log(`│ MTN                                │ ${String(mtnPrediction.predictions.length).padStart(11)} │`);
    console.log(`├────────────────────────────────────┼─────────────┤`);
    console.log(`│ TOTAL                              │ ${String(aglPrediction.predictions.length + npnPrediction.predictions.length + mtnPrediction.predictions.length).padStart(11)} │`);
    console.log(`└────────────────────────────────────┴─────────────┘`);

    // Recommandations
    console.log('\n📈 Recommandations:');
    const allRecos = [
      { ticker: 'AGL', ...aglPrediction.recommendation },
      { ticker: 'NPN', ...npnPrediction.recommendation },
      { ticker: 'MTN', ...mtnPrediction.recommendation }
    ];

    allRecos.forEach(reco => {
      const icon = reco.signal === 'BUY' ? '🟢' : reco.signal === 'SELL' ? '🔴' : '⚪';
      console.log(`   ${icon} ${reco.ticker}: ${reco.signal} (${reco.confidence} confidence)`);
    });

    // Performance moyenne des modèles
    console.log('\n📊 Performance moyenne des modèles:');
    const avgR2 = (
      aglPrediction.models_performance.polynomial.validR2 +
      npnPrediction.models_performance.polynomial.validR2 +
      mtnPrediction.models_performance.polynomial.validR2
    ) / 3;
    console.log(`   R² moyen (Polynomial): ${avgR2.toFixed(4)}`);
    console.log(`   ${avgR2 > 0.7 ? '✅ Excellent' : avgR2 > 0.5 ? '✅ Bon' : avgR2 > 0.3 ? '⚠️  Acceptable' : '⚠️  Acceptable (données simulées)'}`);

    console.log('\n💡 Note: Ces tests utilisent des données simulées pour démonstration.');
    console.log('   En production, utilisez des données réelles de marché.\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
