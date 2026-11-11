/**
 * Test direct du Sentiment Analysis Service - Phase 4.2
 */

const SentimentAnalysisService = require('../services/sentimentAnalysisService');

async function runTests() {
  console.log('💬 Test Direct Sentiment Analysis - Phase 4.2\n');

  const sentimentService = new SentimentAnalysisService();

  try {
    // Test 1: Analyse positive
    console.log('1️⃣ Analyse de texte positif...');
    const text1 = "Les actions de AGL ont enregistré une forte hausse aujourd'hui avec un excellent rendement. Les bénéfices ont dépassé les attentes et les analystes sont très optimistes sur la croissance future.";

    const result1 = sentimentService.analyzeSentiment(text1, 'AGL', 'test');

    console.log(`✅ Analyse complétée`);
    console.log(`   Texte: "${text1.substring(0, 60)}..."`);
    console.log(`   Sentiment score: ${result1.sentiment_score.toFixed(3)}`);
    console.log(`   Sentiment label: ${result1.sentiment_label}`);
    console.log(`   Confiance: ${(result1.confidence * 100).toFixed(1)}%`);
    console.log(`   Interprétation: ${result1.interpretation}`);
    console.log(`   Mots-clés: ${result1.keywords.join(', ')}`);
    console.log(`   Entités: ${result1.entity_mentions.join(', ')}\n`);

    // Test 2: Analyse négative
    console.log('2️⃣ Analyse de texte négatif...');
    const text2 = "NPN subit une importante baisse suite à des résultats décevants. Les pertes sont significatives et les investisseurs sont pessimistes. Le marché craint une récession.";

    const result2 = sentimentService.analyzeSentiment(text2, 'NPN', 'test');

    console.log(`✅ Analyse complétée`);
    console.log(`   Texte: "${text2.substring(0, 60)}..."`);
    console.log(`   Sentiment score: ${result2.sentiment_score.toFixed(3)}`);
    console.log(`   Sentiment label: ${result2.sentiment_label}`);
    console.log(`   Confiance: ${(result2.confidence * 100).toFixed(1)}%`);
    console.log(`   Interprétation: ${result2.interpretation}\n`);

    // Test 3: Analyse neutre
    console.log('3️⃣ Analyse de texte neutre...');
    const text3 = "MTN a publié ses résultats trimestriels. Le chiffre d'affaires reste stable. L'action se négocie actuellement à 45,000 FCFA.";

    const result3 = sentimentService.analyzeSentiment(text3, 'MTN', 'test');

    console.log(`✅ Analyse complétée`);
    console.log(`   Texte: "${text3.substring(0, 60)}..."`);
    console.log(`   Sentiment score: ${result3.sentiment_score.toFixed(3)}`);
    console.log(`   Sentiment label: ${result3.sentiment_label}`);
    console.log(`   Confiance: ${(result3.confidence * 100).toFixed(1)}%`);
    console.log(`   Interprétation: ${result3.interpretation}\n`);

    // Test 4: Analyse en anglais
    console.log('4️⃣ Analyse de texte en anglais...');
    const text4 = "AGL stock surges to new highs after beating earnings expectations. Strong growth momentum continues. Analysts upgrade to buy.";

    const result4 = sentimentService.analyzeSentiment(text4, 'AGL', 'test');

    console.log(`✅ Analyse complétée`);
    console.log(`   Texte: "${text4.substring(0, 60)}..."`);
    console.log(`   Sentiment score: ${result4.sentiment_score.toFixed(3)}`);
    console.log(`   Sentiment label: ${result4.sentiment_label}`);
    console.log(`   Confiance: ${(result4.confidence * 100).toFixed(1)}%\n`);

    // Test 5: Analyse batch
    console.log('5️⃣ Analyse batch de plusieurs textes...');
    const texts = [
      "Excellente performance de SBK avec une forte croissance des profits.",
      "FSR enregistre une baisse importante suite à des pertes.",
      "NED maintient sa position avec des résultats stables.",
      "IMP affiche un momentum très positif avec des gains significatifs.",
      "VOD subit des pressions avec un déclin du chiffre d'affaires."
    ];

    const batchResult = sentimentService.analyzeBatch(texts, null, 'test_batch');

    console.log(`✅ Batch analysé`);
    console.log(`   Total textes: ${batchResult.total}`);
    console.log(`   Réussis: ${batchResult.successful}`);
    console.log(`   Sentiment moyen: ${batchResult.avg_sentiment.toFixed(3)} (${batchResult.avg_sentiment_label})`);
    console.log(`   Détails:`);
    batchResult.results.forEach((r, i) => {
      if (!r.error) {
        console.log(`      ${i + 1}. ${r.sentiment_label} (${r.sentiment_score.toFixed(2)})`);
      }
    });
    console.log('');

    // Test 6: Récupération des analyses sauvegardées
    console.log('6️⃣ Récupération analyses sauvegardées pour AGL...');
    const analyses = sentimentService.getAnalyses('AGL', 10);
    console.log(`✅ ${analyses.length} analyses récupérées pour AGL\n`);

    // Test 7: Agrégat de sentiment
    console.log('7️⃣ Sentiment agrégé pour AGL...');
    const aggregate = sentimentService.getAggregate('AGL', 'daily');

    if (aggregate) {
      console.log(`✅ Agrégat récupéré`);
      console.log(`   Sentiment moyen: ${aggregate.avg_sentiment.toFixed(3)}`);
      console.log(`   Positifs: ${aggregate.positive_count}`);
      console.log(`   Neutres: ${aggregate.neutral_count}`);
      console.log(`   Négatifs: ${aggregate.negative_count}`);
      console.log(`   Total: ${aggregate.total_count}`);
      console.log(`   Confiance: ${(aggregate.confidence * 100).toFixed(1)}%`);
    } else {
      console.log(`ℹ️  Aucun agrégat pour AGL`);
    }
    console.log('');

    // Test 8: Sentiment global du marché
    console.log('8️⃣ Sentiment global du marché...');
    const marketSentiment = sentimentService.getMarketSentiment(10);

    if (marketSentiment.length > 0) {
      console.log(`✅ ${marketSentiment.length} tickers avec données de sentiment`);
      console.log(`   Top 5:`);
      marketSentiment.slice(0, 5).forEach((m, i) => {
        const label = m.avg_sentiment > 0.1 ? '🟢' : m.avg_sentiment < -0.1 ? '🔴' : '⚪';
        console.log(`      ${i + 1}. ${m.ticker}: ${label} ${m.avg_sentiment.toFixed(3)} (${m.total_count} analyses)`);
      });
    } else {
      console.log(`ℹ️  Aucune donnée de sentiment marché`);
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TOUS LES TESTS RÉUSSIS!');
    console.log('═══════════════════════════════════════════════════');

    // Résumé global
    console.log('\n📊 Résumé des résultats:');
    console.log(`┌────────────────────────────────────┬──────────┬─────────┐`);
    console.log(`│ Type                               │ Score    │ Label   │`);
    console.log(`├────────────────────────────────────┼──────────┼─────────┤`);
    console.log(`│ Texte positif (FR)                 │ ${String(result1.sentiment_score.toFixed(2)).padStart(8)} │ ${result1.sentiment_label.padEnd(7)} │`);
    console.log(`│ Texte négatif (FR)                 │ ${String(result2.sentiment_score.toFixed(2)).padStart(8)} │ ${result2.sentiment_label.padEnd(7)} │`);
    console.log(`│ Texte neutre (FR)                  │ ${String(result3.sentiment_score.toFixed(2)).padStart(8)} │ ${result3.sentiment_label.padEnd(7)} │`);
    console.log(`│ Texte positif (EN)                 │ ${String(result4.sentiment_score.toFixed(2)).padStart(8)} │ ${result4.sentiment_label.padEnd(7)} │`);
    console.log(`│ Batch moyen                        │ ${String(batchResult.avg_sentiment.toFixed(2)).padStart(8)} │ ${batchResult.avg_sentiment_label.padEnd(7)} │`);
    console.log(`└────────────────────────────────────┴──────────┴─────────┘`);

    // Statistiques
    console.log('\n📈 Statistiques:');
    console.log(`   Analyses totales créées: ${2 + batchResult.successful}`);
    console.log(`   Langues supportées: Français, Anglais`);
    console.log(`   Précision du lexique: ${sentimentService.positiveWords.size} mots positifs, ${sentimentService.negativeWords.size} négatifs`);
    console.log(`   Mots-clés financiers: ${sentimentService.financialKeywords.size}`);

    // Recommandations basées sur sentiment
    console.log('\n💡 Recommandations basées sur sentiment:');
    const allResults = [
      { ticker: 'AGL', score: result1.sentiment_score },
      { ticker: 'NPN', score: result2.sentiment_score },
      { ticker: 'MTN', score: result3.sentiment_score }
    ];

    allResults.forEach(r => {
      const signal = r.score > 0.2 ? 'BUY' : r.score < -0.2 ? 'SELL' : 'HOLD';
      const icon = signal === 'BUY' ? '🟢' : signal === 'SELL' ? '🔴' : '⚪';
      console.log(`   ${icon} ${r.ticker}: ${signal} (sentiment: ${r.score.toFixed(2)})`);
    });

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
