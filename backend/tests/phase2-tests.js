/**
 * Tests de Phase 2 - PENDO
 *
 * Tests pour:
 * - Phase 2.1: Ordres avancés
 * - Phase 2.2: Données historiques
 * - Phase 2.3: Screener avancé
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TOKEN = process.env.TEST_TOKEN || ''; // générer avec tests/get-token.js

const tests = {
  passed: 0,
  failed: 0,
  results: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${name}`);
  if (details) console.log(`   ${details}`);

  tests.results.push({ name, passed, details });
  if (passed) tests.passed++;
  else tests.failed++;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// PHASE 2.1 - ORDRES AVANCÉS
// ============================================

async function testAdvancedOrders() {
  console.log('\n📊 PHASE 2.1 - Tests Ordres Avancés\n');

  // Test 1: Info endpoint
  try {
    const response = await axios.get(`${BASE_URL}/api/orders/info/types`);
    const hasTypes = response.data.orderTypes && response.data.orderTypes.length >= 4;
    logTest('Info types d\'ordres', hasTypes, `${response.data.orderTypes?.length || 0} types disponibles`);
  } catch (error) {
    logTest('Info types d\'ordres', false, error.message);
  }

  // Test 2: Créer Limit Order
  try {
    const response = await axios.post(
      `${BASE_URL}/api/orders/limit`,
      {
        portfolioId: 1,
        ticker: 'AGL',
        side: 'buy',
        quantity: 10,
        limitPrice: 400,
        timeInForce: 'GTC'
      },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    logTest('Créer Limit Order', response.data.success, `Order ID: ${response.data.orderId}`);
  } catch (error) {
    logTest('Créer Limit Order', false, error.response?.data?.message || error.message);
  }

  // Test 3: Créer Stop Order
  try {
    const response = await axios.post(
      `${BASE_URL}/api/orders/stop`,
      {
        portfolioId: 1,
        ticker: 'NPN',
        side: 'sell',
        quantity: 5,
        stopPrice: 2500,
        timeInForce: 'GTC'
      },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    logTest('Créer Stop Order', response.data.success, `Order ID: ${response.data.orderId}`);
  } catch (error) {
    logTest('Créer Stop Order', false, error.response?.data?.message || error.message);
  }

  // Test 4: Créer Trailing Stop
  try {
    const response = await axios.post(
      `${BASE_URL}/api/orders/trailing-stop`,
      {
        portfolioId: 1,
        ticker: 'MTN',
        side: 'sell',
        quantity: 8,
        trailingPercent: 5,
        timeInForce: 'GTC'
      },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    logTest('Créer Trailing Stop Order', response.data.success, `Order ID: ${response.data.orderId}`);
  } catch (error) {
    logTest('Créer Trailing Stop Order', false, error.response?.data?.message || error.message);
  }

  // Test 5: Liste des ordres
  try {
    const response = await axios.get(
      `${BASE_URL}/api/orders?status=pending`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    logTest('Liste ordres pending', response.data.success, `${response.data.count || 0} ordres trouvés`);
  } catch (error) {
    logTest('Liste ordres pending', false, error.message);
  }

  // Test 6: Statistiques utilisateur
  try {
    const response = await axios.get(
      `${BASE_URL}/api/orders/user/stats`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    logTest('Stats ordres utilisateur', response.data.success, `${response.data.stats?.totalOrders || 0} ordres total`);
  } catch (error) {
    logTest('Stats ordres utilisateur', false, error.message);
  }
}

// ============================================
// PHASE 2.2 - DONNÉES HISTORIQUES
// ============================================

async function testHistoricalData() {
  console.log('\n📈 PHASE 2.2 - Tests Données Historiques\n');

  // Test 1: Info endpoint
  try {
    const response = await axios.get(`${BASE_URL}/api/historical/info`);
    const hasEndpoints = response.data.endpoints && response.data.endpoints.length >= 9;
    logTest('Info API historique', hasEndpoints, `${response.data.endpoints?.length || 0} endpoints`);
  } catch (error) {
    logTest('Info API historique', false, error.message);
  }

  // Test 2: Stats globales
  try {
    const response = await axios.get(`${BASE_URL}/api/historical/stats`);
    const hasTickers = response.data.data?.total_tickers > 0;
    logTest('Stats globales', response.data.success, `${response.data.data?.total_tickers || 0} tickers, ${response.data.data?.total_records || 0} enregistrements`);
  } catch (error) {
    logTest('Stats globales', false, error.message);
  }

  // Test 3: Stats pour un ticker
  try {
    const response = await axios.get(`${BASE_URL}/api/historical/stats/AGL`);
    const hasData = response.data.data && response.data.data.total_days > 0;
    logTest('Stats ticker AGL', hasData, `${response.data.data?.total_days || 0} jours de données`);
  } catch (error) {
    logTest('Stats ticker AGL', false, error.response?.data?.message || error.message);
  }

  // Test 4: Récupérer données OHLCV
  try {
    const response = await axios.get(`${BASE_URL}/api/historical/data/AGL?limit=10`);
    const hasQuotes = response.data.data && response.data.data.length > 0;
    logTest('Données OHLCV', hasQuotes, `${response.data.count || 0} enregistrements`);
  } catch (error) {
    logTest('Données OHLCV', false, error.message);
  }

  // Test 5: Mappings de tickers
  try {
    const response = await axios.get(`${BASE_URL}/api/historical/mappings`);
    const hasMappings = response.data.data && response.data.data.length > 0;
    logTest('Mappings tickers', hasMappings, `${response.data.count || 0} mappings`);
  } catch (error) {
    logTest('Mappings tickers', false, error.message);
  }

  // Test 6: Historique fetch
  try {
    const response = await axios.get(`${BASE_URL}/api/historical/fetch-history?limit=5`);
    logTest('Historique fetch', response.data.success, `${response.data.count || 0} entrées`);
  } catch (error) {
    logTest('Historique fetch', false, error.message);
  }
}

// ============================================
// PHASE 2.3 - SCREENER AVANCÉ
// ============================================

async function testScreener() {
  console.log('\n🔍 PHASE 2.3 - Tests Screener Avancé\n');

  // Test 1: Info endpoint
  try {
    const response = await axios.get(`${BASE_URL}/api/screener/info`);
    const hasEndpoints = response.data.endpoints && response.data.endpoints.length >= 10;
    logTest('Info API screener', hasEndpoints, `${response.data.endpoints?.length || 0} endpoints`);
  } catch (error) {
    logTest('Info API screener', false, error.message);
  }

  // Test 2: Presets disponibles
  try {
    const response = await axios.get(`${BASE_URL}/api/screener/presets`);
    const presetsCount = Object.keys(response.data.presets || {}).length;
    const hasPresets = presetsCount >= 6;
    logTest('Presets screener', hasPresets, `${presetsCount} presets disponibles`);
  } catch (error) {
    logTest('Presets screener', false, error.message);
  }

  // Test 3: Exécuter preset momentum
  try {
    const response = await axios.post(`${BASE_URL}/api/screener/presets/momentum`);
    logTest('Preset momentum', response.data.success, `${response.data.count || 0} résultats`);
  } catch (error) {
    logTest('Preset momentum', false, error.message);
  }

  // Test 4: Scan personnalisé
  try {
    const response = await axios.post(
      `${BASE_URL}/api/screener/scan`,
      {
        priceMin: 100,
        priceMax: 1000,
        volumeMin: 50000,
        limit: 20
      }
    );
    logTest('Scan personnalisé', response.data.success, `${response.data.count || 0} résultats`);
  } catch (error) {
    logTest('Scan personnalisé', false, error.message);
  }

  // Test 5: Sauvegarder un scan
  try {
    const response = await axios.post(
      `${BASE_URL}/api/screener/save`,
      {
        name: 'Test Scan Phase 2',
        description: 'Scan de test pour validation',
        filters: { priceMin: 200, rsiMin: 40, rsiMax: 60 },
        isPublic: false
      },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    logTest('Sauvegarder scan', response.data.success, `Scan ID: ${response.data.scanId}`);
  } catch (error) {
    logTest('Sauvegarder scan', false, error.response?.data?.message || error.message);
  }

  // Test 6: Récupérer scans sauvegardés
  try {
    const response = await axios.get(
      `${BASE_URL}/api/screener/saved`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    logTest('Scans sauvegardés', response.data.success, `${response.data.count || 0} scans`);
  } catch (error) {
    logTest('Scans sauvegardés', false, error.message);
  }

  // Test 7: Créer une alerte
  try {
    const response = await axios.post(
      `${BASE_URL}/api/screener/alerts`,
      {
        ticker: 'AGL',
        alertType: 'price',
        condition: 'above',
        targetValue: 500,
        message: 'AGL franchit 500'
      },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    logTest('Créer alerte', response.data.success, `Alert ID: ${response.data.alertId}`);
  } catch (error) {
    logTest('Créer alerte', false, error.response?.data?.message || error.message);
  }

  // Test 8: Récupérer alertes
  try {
    const response = await axios.get(
      `${BASE_URL}/api/screener/alerts?status=active`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    logTest('Alertes actives', response.data.success, `${response.data.count || 0} alertes`);
  } catch (error) {
    logTest('Alertes actives', false, error.message);
  }
}

// ============================================
// TESTS D'INTÉGRATION
// ============================================

async function testIntegration() {
  console.log('\n🔗 Tests d\'Intégration Phase 2\n');

  // Test 1: Workflow complet - Screener → Données historiques → Ordre avancé
  try {
    // 1. Scanner pour trouver une opportunité
    const scanResponse = await axios.post(`${BASE_URL}/api/screener/presets/momentum`);

    // 2. Si résultat trouvé, récupérer données historiques
    let hasWorkflow = scanResponse.data.success;

    if (scanResponse.data.results && scanResponse.data.results.length > 0) {
      const ticker = scanResponse.data.results[0].ticker;

      // Récupérer données historiques
      const histResponse = await axios.get(`${BASE_URL}/api/historical/data/${ticker}?limit=10`);
      hasWorkflow = hasWorkflow && histResponse.data.success;

      // Créer ordre limit basé sur l'analyse
      const orderResponse = await axios.post(
        `${BASE_URL}/api/orders/limit`,
        {
          portfolioId: 1,
          ticker,
          side: 'buy',
          quantity: 10,
          limitPrice: scanResponse.data.results[0].price * 0.98, // -2%
          timeInForce: 'GTC'
        },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      hasWorkflow = hasWorkflow && orderResponse.data.success;
    }

    logTest('Workflow Screener→Historique→Ordre', hasWorkflow, 'Pipeline complet fonctionnel');
  } catch (error) {
    logTest('Workflow Screener→Historique→Ordre', false, error.message);
  }

  // Test 2: Performance - Screener avec données historiques
  try {
    const startTime = Date.now();
    await axios.post(`${BASE_URL}/api/screener/scan`, {
      rsiMin: 30,
      rsiMax: 70,
      limit: 20
    });
    const duration = Date.now() - startTime;
    const isPerformant = duration < 10000; // < 10 secondes
    logTest('Performance screener', isPerformant, `${duration}ms`);
  } catch (error) {
    logTest('Performance screener', false, error.message);
  }
}

// ============================================
// EXÉCUTION DES TESTS
// ============================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   PENDO - Tests Phase 2 Complets          ║');
  console.log('╚════════════════════════════════════════════╝');

  try {
    await testAdvancedOrders();
    await delay(1000);

    await testHistoricalData();
    await delay(1000);

    await testScreener();
    await delay(1000);

    await testIntegration();

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
  }

  // Résumé
  console.log('\n' + '═'.repeat(50));
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('═'.repeat(50));
  console.log(`✅ Tests réussis: ${tests.passed}`);
  console.log(`❌ Tests échoués: ${tests.failed}`);
  console.log(`📈 Taux de réussite: ${((tests.passed / (tests.passed + tests.failed)) * 100).toFixed(1)}%`);
  console.log('═'.repeat(50));

  // Détails des échecs
  const failures = tests.results.filter(t => !t.passed);
  if (failures.length > 0) {
    console.log('\n⚠️  Tests échoués:');
    failures.forEach(f => {
      console.log(`   - ${f.name}: ${f.details}`);
    });
  }

  console.log('\n✨ Tests terminés!\n');

  // Exit code
  process.exit(tests.failed > 0 ? 1 : 0);
}

// Vérifier que le serveur est démarré
axios.get(`${BASE_URL}/api/markets`)
  .then(() => {
    console.log('✅ Serveur PENDO détecté\n');
    runAllTests();
  })
  .catch(() => {
    console.error('❌ Serveur PENDO non accessible sur', BASE_URL);
    console.error('   Assurez-vous que le serveur est démarré: npm start');
    process.exit(1);
  });
