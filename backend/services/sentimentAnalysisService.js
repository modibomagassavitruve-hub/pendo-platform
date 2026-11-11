const Database = require('better-sqlite3');
const path = require('path');

/**
 * Sentiment Analysis Service - Phase 4.2
 *
 * Analyse le sentiment de textes financiers (nouvelles, posts forum, etc.)
 *
 * Fonctionnalités:
 * - Analyse de sentiment (-1 à +1)
 * - Détection de mots-clés financiers
 * - Score de confiance
 * - Tracking historique du sentiment
 * - Agrégation par ticker/période
 */
class SentimentAnalysisService {
  constructor(dbPath = null) {
    const defaultPath = path.join(__dirname, '..', 'data', 'pendo.db');
    this.db = new Database(dbPath || defaultPath);
    this.initDatabase();
    this.initLexicon();
  }

  /**
   * Initialise les tables de la base de données
   */
  initDatabase() {
    // Table des analyses de sentiment
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sentiment_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT,
        source TEXT NOT NULL,
        source_url TEXT,
        text_content TEXT NOT NULL,
        sentiment_score REAL NOT NULL,
        sentiment_label TEXT NOT NULL,
        confidence REAL NOT NULL,
        keywords TEXT,
        entity_mentions TEXT,
        analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table d'agrégation du sentiment par ticker
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sentiment_aggregates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        period TEXT NOT NULL,
        avg_sentiment REAL NOT NULL,
        positive_count INTEGER DEFAULT 0,
        neutral_count INTEGER DEFAULT 0,
        negative_count INTEGER DEFAULT 0,
        total_count INTEGER DEFAULT 0,
        confidence REAL,
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ticker, period)
      )
    `);

    // Index
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sentiment_ticker ON sentiment_analyses(ticker);
      CREATE INDEX IF NOT EXISTS idx_sentiment_analyzed ON sentiment_analyses(analyzed_at);
      CREATE INDEX IF NOT EXISTS idx_aggregate_ticker ON sentiment_aggregates(ticker);
    `);
  }

  /**
   * Initialise le lexique de sentiment financier
   */
  initLexicon() {
    // Mots positifs dans le contexte financier
    this.positiveWords = new Set([
      'hausse', 'augmentation', 'croissance', 'profit', 'gain', 'bénéfice',
      'progression', 'amélioration', 'record', 'succès', 'performance',
      'dividende', 'rendement', 'opportunité', 'innovation', 'expansion',
      'solide', 'fort', 'robuste', 'excellent', 'positif', 'favorable',
      'momentum', 'rally', 'bull', 'optimiste', 'confiance',
      // Anglais
      'growth', 'profit', 'gain', 'increase', 'rise', 'up', 'surge',
      'strong', 'solid', 'excellent', 'positive', 'bullish', 'optimistic',
      'rally', 'momentum', 'outperform', 'beat', 'exceed'
    ]);

    // Mots négatifs dans le contexte financier
    this.negativeWords = new Set([
      'baisse', 'chute', 'diminution', 'perte', 'déficit', 'déclin',
      'récession', 'crise', 'risque', 'danger', 'menace', 'faible',
      'mauvais', 'négatif', 'défavorable', 'inquiétude', 'crainte',
      'corruption', 'fraude', 'faillite', 'liquidation', 'bear', 'pessimiste',
      // Anglais
      'loss', 'decline', 'fall', 'drop', 'down', 'decrease', 'weak',
      'poor', 'negative', 'bearish', 'pessimistic', 'risk', 'concern',
      'crisis', 'recession', 'bankruptcy', 'fraud', 'underperform', 'miss'
    ]);

    // Modificateurs d'intensité
    this.intensifiers = new Set([
      'très', 'extrêmement', 'fortement', 'significativement', 'vraiment',
      'very', 'extremely', 'significantly', 'highly', 'strongly'
    ]);

    this.diminishers = new Set([
      'peu', 'légèrement', 'faiblement', 'un peu', 'à peine',
      'slightly', 'somewhat', 'barely', 'hardly'
    ]);

    // Négations
    this.negations = new Set([
      'ne', 'pas', 'non', 'sans', 'jamais', 'aucun',
      'not', 'no', 'never', 'without', 'none'
    ]);

    // Mots-clés financiers importants
    this.financialKeywords = new Set([
      // Métriques
      'chiffre d\'affaires', 'ca', 'résultat', 'bénéfice', 'ebitda', 'eps',
      'p/e', 'roe', 'roa', 'dividende', 'yield', 'cash-flow',
      // Actions
      'action', 'titre', 'bourse', 'cotation', 'capitalisation',
      // Marché
      'marché', 'secteur', 'industrie', 'concurrence', 'part de marché',
      // Anglais
      'revenue', 'earnings', 'profit', 'margin', 'valuation',
      'stock', 'share', 'market', 'sector', 'industry'
    ]);
  }

  /**
   * Analyse le sentiment d'un texte
   */
  analyzeSentiment(text, ticker = null, source = 'manual', sourceUrl = null) {
    // Nettoyer et tokeniser
    const tokens = this.tokenize(text.toLowerCase());

    let score = 0;
    let wordCount = 0;
    const detectedKeywords = [];
    const entityMentions = [];

    // Analyse token par token avec contexte
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const prevToken = i > 0 ? tokens[i - 1] : null;
      const nextToken = i < tokens.length - 1 ? tokens[i + 1] : null;

      // Détecter mots-clés financiers
      if (this.financialKeywords.has(token)) {
        detectedKeywords.push(token);
      }

      // Analyse de sentiment
      let tokenScore = 0;

      if (this.positiveWords.has(token)) {
        tokenScore = 1;
        wordCount++;
      } else if (this.negativeWords.has(token)) {
        tokenScore = -1;
        wordCount++;
      } else {
        continue;
      }

      // Appliquer modificateurs
      if (prevToken) {
        // Intensificateurs
        if (this.intensifiers.has(prevToken)) {
          tokenScore *= 1.5;
        }
        // Diminuteurs
        if (this.diminishers.has(prevToken)) {
          tokenScore *= 0.5;
        }
        // Négations
        if (this.negations.has(prevToken)) {
          tokenScore *= -1;
        }
      }

      score += tokenScore;
    }

    // Calculer score moyen normalisé (-1 à +1)
    const sentimentScore = wordCount > 0 ? Math.max(-1, Math.min(1, score / wordCount)) : 0;

    // Déterminer label
    let sentimentLabel;
    if (sentimentScore > 0.1) {
      sentimentLabel = 'positive';
    } else if (sentimentScore < -0.1) {
      sentimentLabel = 'negative';
    } else {
      sentimentLabel = 'neutral';
    }

    // Calculer confiance basée sur le nombre de mots de sentiment
    const confidence = Math.min(1, wordCount / 10); // Max confiance à 10+ mots

    // Détecter mentions d'entités (tickers)
    const tickerPattern = /\b[A-Z]{3,5}\b/g;
    const matches = text.match(tickerPattern);
    if (matches) {
      matches.forEach(match => {
        if (!entityMentions.includes(match)) {
          entityMentions.push(match);
        }
      });
    }

    // Sauvegarder l'analyse
    const analysisId = this.saveAnalysis(
      ticker,
      source,
      sourceUrl,
      text,
      sentimentScore,
      sentimentLabel,
      confidence,
      detectedKeywords,
      entityMentions
    );

    return {
      id: analysisId,
      ticker,
      sentiment_score: sentimentScore,
      sentiment_label: sentimentLabel,
      confidence,
      keywords: detectedKeywords,
      entity_mentions: entityMentions,
      interpretation: this.interpretSentiment(sentimentScore),
      word_count: tokens.length,
      sentiment_word_count: wordCount
    };
  }

  /**
   * Tokenize le texte
   */
  tokenize(text) {
    // Supprimer ponctuation et split par espaces
    return text
      .replace(/[.,!?;:()"']/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Interprète le score de sentiment
   */
  interpretSentiment(score) {
    if (score > 0.5) {
      return 'Très positif - Signal d\'achat fort';
    } else if (score > 0.2) {
      return 'Positif - Signal d\'achat modéré';
    } else if (score > 0.1) {
      return 'Légèrement positif - Surveiller';
    } else if (score < -0.5) {
      return 'Très négatif - Signal de vente fort';
    } else if (score < -0.2) {
      return 'Négatif - Signal de vente modéré';
    } else if (score < -0.1) {
      return 'Légèrement négatif - Surveiller';
    } else {
      return 'Neutre - Pas de signal clair';
    }
  }

  /**
   * Sauvegarde une analyse
   */
  saveAnalysis(ticker, source, sourceUrl, textContent, sentimentScore, sentimentLabel, confidence, keywords, entityMentions) {
    const result = this.db.prepare(`
      INSERT INTO sentiment_analyses (
        ticker, source, source_url, text_content,
        sentiment_score, sentiment_label, confidence,
        keywords, entity_mentions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ticker,
      source,
      sourceUrl,
      textContent.substring(0, 5000), // Limite à 5000 caractères
      sentimentScore,
      sentimentLabel,
      confidence,
      JSON.stringify(keywords),
      JSON.stringify(entityMentions)
    );

    // Mettre à jour l'agrégat
    if (ticker) {
      this.updateAggregate(ticker, 'daily');
      this.updateAggregate(ticker, 'weekly');
    }

    return result.lastInsertRowid;
  }

  /**
   * Met à jour l'agrégat de sentiment
   */
  updateAggregate(ticker, period) {
    const periodStart = this.getPeriodStart(period);

    const stats = this.db.prepare(`
      SELECT
        AVG(sentiment_score) as avg_sentiment,
        SUM(CASE WHEN sentiment_label = 'positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN sentiment_label = 'neutral' THEN 1 ELSE 0 END) as neutral_count,
        SUM(CASE WHEN sentiment_label = 'negative' THEN 1 ELSE 0 END) as negative_count,
        COUNT(*) as total_count,
        AVG(confidence) as avg_confidence
      FROM sentiment_analyses
      WHERE ticker = ?
        AND analyzed_at >= ?
    `).get(ticker, periodStart);

    if (stats && stats.total_count > 0) {
      this.db.prepare(`
        INSERT OR REPLACE INTO sentiment_aggregates (
          ticker, period, avg_sentiment, positive_count, neutral_count, negative_count, total_count, confidence, calculated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        ticker,
        period,
        stats.avg_sentiment,
        stats.positive_count,
        stats.neutral_count,
        stats.negative_count,
        stats.total_count,
        stats.avg_confidence
      );
    }
  }

  /**
   * Obtient la date de début pour une période
   */
  getPeriodStart(period) {
    const now = new Date();
    const map = {
      'daily': 1,
      'weekly': 7,
      'monthly': 30
    };
    const days = map[period] || 1;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return start.toISOString().split('T')[0];
  }

  /**
   * Récupère les analyses pour un ticker
   */
  getAnalyses(ticker, limit = 50) {
    return this.db.prepare(`
      SELECT * FROM sentiment_analyses
      WHERE ticker = ?
      ORDER BY analyzed_at DESC
      LIMIT ?
    `).all(ticker, limit);
  }

  /**
   * Récupère l'agrégat de sentiment pour un ticker
   */
  getAggregate(ticker, period = 'daily') {
    return this.db.prepare(`
      SELECT * FROM sentiment_aggregates
      WHERE ticker = ? AND period = ?
    `).get(ticker, period);
  }

  /**
   * Analyse batch de plusieurs textes
   */
  analyzeBatch(texts, ticker = null, source = 'batch') {
    const results = [];

    for (const text of texts) {
      try {
        const analysis = this.analyzeSentiment(text, ticker, source);
        results.push(analysis);
      } catch (error) {
        results.push({
          error: error.message,
          text: text.substring(0, 100)
        });
      }
    }

    // Calculer sentiment agrégé
    const validResults = results.filter(r => !r.error);
    const avgSentiment = validResults.length > 0
      ? validResults.reduce((sum, r) => sum + r.sentiment_score, 0) / validResults.length
      : 0;

    return {
      total: texts.length,
      successful: validResults.length,
      failed: results.filter(r => r.error).length,
      avg_sentiment: avgSentiment,
      avg_sentiment_label: avgSentiment > 0.1 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral',
      results
    };
  }

  /**
   * Récupère le sentiment global par ticker
   */
  getMarketSentiment(limit = 10) {
    return this.db.prepare(`
      SELECT
        ticker,
        avg_sentiment,
        positive_count,
        neutral_count,
        negative_count,
        total_count,
        confidence,
        calculated_at
      FROM sentiment_aggregates
      WHERE period = 'daily'
      ORDER BY total_count DESC, avg_sentiment DESC
      LIMIT ?
    `).all(limit);
  }
}

module.exports = SentimentAnalysisService;
