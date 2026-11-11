/**
 * Routes API pour les actualités financières
 * Agrégation de flux RSS des principaux médias financiers africains
 */
const express = require('express');
const Parser = require('rss-parser');
const fetch = require('node-fetch');
const { scrapeArticle } = require('../utils/articleScraper');
const { translateArray, translateObject, getLanguageFromRequest } = require('../utils/translationHelper');
const { translateNewArticlesAsync } = require('../utils/autoTranslate');
const { deduplicateArticles } = require('../utils/newsDedup');

module.exports = function(db) {
  const router = express.Router();
  const parser = new Parser({
    customFields: {
      item: [
        ['media:content', 'media'],
        ['media:thumbnail', 'thumbnail'],
        ['content:encoded', 'content:encoded'],
        ['description', 'description']
      ]
    }
  });

  // Sources RSS des médias financiers africains
  const RSS_SOURCES = [
    {
      url: 'https://www.reuters.com/news/archive/africaNews',
      market: 'africa',
      country: 'AF',
      source: 'Reuters Africa',
      category: 'Market Update'
    },
    {
      url: 'https://www.businesslive.co.za/feed/',
      market: 'jse',
      country: 'ZA',
      source: 'Business Day (SA)',
      category: 'Market Update'
    },
    {
      url: 'https://www.moneyweb.co.za/feed/',
      market: 'jse',
      country: 'ZA',
      source: 'Moneyweb',
      category: 'Market Update'
    },
    {
      url: 'https://businessday.ng/feed/',
      market: 'nse_ng',
      country: 'NG',
      source: 'BusinessDay Nigeria',
      category: 'Market Update'
    },
    {
      url: 'https://www.africanews.com/api/rss/business.xml',
      market: 'africa',
      country: 'AF',
      source: 'Africanews',
      category: 'Market Update'
    },
    {
      url: 'https://allafrica.com/tools/headlines/rss/business/headlines.rss',
      market: 'africa',
      country: 'AF',
      source: 'AllAfrica',
      category: 'Market Update'
    }
  ];

  /**
   * GET /api/news/latest
   * Récupérer les dernières actualités
   */
  router.get('/latest', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 30;
      const marketFilter = req.query.market || null;
      const lang = getLanguageFromRequest(req);
      // La dédup peut être désactivée explicitement avec ?dedupe=false (debug/admin)
      const dedupeEnabled = req.query.dedupe !== 'false';
      // On récupère plus d'articles bruts que demandé car le clustering va en
      // fusionner une partie : on veut ~`limit` sujets distincts en sortie,
      // pas `limit` lignes brutes potentiellement redondantes.
      const rawLimit = dedupeEnabled ? Math.min(limit * 3, 150) : limit;

      let query = 'SELECT * FROM news WHERE 1=1';
      const params = [];

      if (marketFilter) {
        query += ' AND market_id = ?';
        params.push(marketFilter);
      }

      query += ' ORDER BY published_at DESC LIMIT ?';
      params.push(rawLimit);

      // Utiliser db.all() du dbWrapper (async)
      let articles = [];
      if (db.all) {
        articles = await db.all(query, params);
      } else if (db.prepare) {
        articles = db.prepare(query).all(...params);
      }

      articles = articles || [];

      // Déduplication NLP : fusionne les articles quasi-identiques (même
      // événement couvert par plusieurs médias) avant traduction/envoi.
      if (dedupeEnabled) {
        articles = deduplicateArticles(articles).slice(0, limit);
      } else {
        articles = articles.slice(0, limit);
      }

      // Appliquer les traductions si la langue n'est pas le français
      articles = translateArray(articles, lang);

      res.json({
        success: true,
        data: articles,
        count: articles.length
      });
    } catch (error) {
      console.error('Erreur récupération actualités:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/news/refresh
   * Actualiser les flux RSS
   */
  router.post('/refresh', async (req, res) => {
    try {
      let totalNew = 0;
      const newArticleIds = [];

      for (const source of RSS_SOURCES) {
        try {
          const feed = await parser.parseURL(source.url);

          for (const item of feed.items.slice(0, 10)) {
            // Vérifier si l'article existe déjà
            let exists = null;
            if (db.get) {
              exists = await db.get('SELECT id FROM news WHERE url = ?', [item.link]);
            } else if (db.prepare) {
              exists = db.prepare('SELECT id FROM news WHERE url = ?').get(item.link);
            }

            if (!exists) {
              const title = item.title || 'Sans titre';
              const summary = item.contentSnippet || item.summary || '';
              const content = item.content || item['content:encoded'] || item.description || '';
              const imageUrl = item.media?.$ ? item.media.$.url : (item.thumbnail ? item.thumbnail.url : null);
              const category = categorizeArticle(title, summary);
              const summaryToSave = summary && summary.length > 20 ? summary.substring(0, 500) : null;
              const contentToSave = content && content.length > 50 ? content.substring(0, 5000) : null;

              let result;
              if (db.run) {
                result = await db.run(`
                  INSERT INTO news (title, summary, content, url, source, market_id, country, category, image_url, published_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [title, summaryToSave, contentToSave, item.link, source.source, source.market, source.country, category, imageUrl, item.pubDate || new Date().toISOString()]);
              } else if (db.prepare) {
                result = db.prepare(`
                  INSERT INTO news (title, summary, content, url, source, market_id, country, category, image_url, published_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(title, summaryToSave, contentToSave, item.link, source.source, source.market, source.country, category, imageUrl, item.pubDate || new Date().toISOString());
              }

              if (result?.lastInsertRowid) {
                newArticleIds.push(result.lastInsertRowid);
              }
              totalNew++;
            }
          }
        } catch (err) {
          console.error(`Erreur parsing RSS ${source.source}:`, err.message);
        }
      }

      if (newArticleIds.length > 0) {
        translateNewArticlesAsync(db, newArticleIds);
      }

      res.json({
        success: true,
        message: `${totalNew} nouveaux articles ajoutés`,
        newCount: totalNew,
        translationQueued: newArticleIds.length
      });
    } catch (error) {
      console.error('Erreur refresh actualités:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/news/:id
   * Récupérer un article spécifique
   */
  router.get('/:id', async (req, res) => {
    try {
      const lang = getLanguageFromRequest(req);
      let article = null;

      if (db.get) {
        article = await db.get('SELECT * FROM news WHERE id = ?', [req.params.id]);
      } else if (db.prepare) {
        article = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
      }

      if (!article) {
        return res.status(404).json({ success: false, error: 'Article non trouvé' });
      }

      article = translateObject(article, lang);
      res.json({ success: true, data: article });
    } catch (error) {
      console.error('Erreur récupération article:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/news/market/:marketId
   * Récupérer les actualités d'un marché spécifique
   */
  router.get('/market/:marketId', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const lang = getLanguageFromRequest(req);
      const dedupeEnabled = req.query.dedupe !== 'false';
      const rawLimit = dedupeEnabled ? Math.min(limit * 3, 150) : limit;
      let articles = [];

      if (db.all) {
        articles = await db.all(`
          SELECT * FROM news
          WHERE market_id = ?
          ORDER BY published_at DESC
          LIMIT ?
        `, [req.params.marketId, rawLimit]);
      } else if (db.prepare) {
        articles = db.prepare(`
          SELECT * FROM news
          WHERE market_id = ?
          ORDER BY published_at DESC
          LIMIT ?
        `).all(req.params.marketId, rawLimit);
      }

      articles = articles || [];
      articles = dedupeEnabled
        ? deduplicateArticles(articles).slice(0, limit)
        : articles.slice(0, limit);

      articles = translateArray(articles, lang);
      res.json({ success: true, data: articles });
    } catch (error) {
      console.error('Erreur récupération actualités marché:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/news/scrape/:id
   * Scraper le contenu complet d'un article
   */
  router.post('/scrape/:id', async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const lang = getLanguageFromRequest(req);

      let article = null;
      if (db.get) {
        article = await db.get('SELECT * FROM news WHERE id = ?', [articleId]);
      } else if (db.prepare) {
        article = db.prepare('SELECT * FROM news WHERE id = ?').get(articleId);
      }

      if (!article) {
        return res.status(404).json({ success: false, error: 'Article non trouvé' });
      }

      if (article.content && article.content.length > 500) {
        return res.json({
          success: true,
          message: 'Article déjà scrapé',
          data: translateObject(article, lang),
          scraped: false
        });
      }

      console.log(`Scraping article ${articleId}: ${article.url}`);
      const scraped = await scrapeArticle(article.url);

      if (!scraped.content || scraped.error) {
        return res.json({
          success: false,
          error: scraped.error || 'Impossible d\'extraire le contenu',
          data: translateObject(article, lang)
        });
      }

      if (db.run) {
        await db.run('UPDATE news SET content = ? WHERE id = ?', [scraped.content, articleId]);
      } else if (db.prepare) {
        db.prepare('UPDATE news SET content = ? WHERE id = ?').run(scraped.content, articleId);
      }

      let updatedArticle = null;
      if (db.get) {
        updatedArticle = await db.get('SELECT * FROM news WHERE id = ?', [articleId]);
      } else if (db.prepare) {
        updatedArticle = db.prepare('SELECT * FROM news WHERE id = ?').get(articleId);
      }

      res.json({
        success: true,
        message: 'Contenu scrapé avec succès',
        data: translateObject(updatedArticle, lang),
        scraped: true,
        contentLength: scraped.content.length
      });
    } catch (error) {
      console.error('Erreur scraping article:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/news/scrape-all
   * Scraper tous les articles sans contenu
   */
  router.post('/scrape-all', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;

      let articles = [];
      if (db.all) {
        articles = await db.all(`
          SELECT * FROM news
          WHERE content IS NULL OR length(content) < 500
          ORDER BY published_at DESC
          LIMIT ?
        `, [limit]);
      } else if (db.prepare) {
        articles = db.prepare(`
          SELECT * FROM news
          WHERE content IS NULL OR length(content) < 500
          ORDER BY published_at DESC
          LIMIT ?
        `).all(limit);
      }

      let scrapedCount = 0;
      let failedCount = 0;
      const results = [];

      for (const article of (articles || [])) {
        try {
          console.log(`Scraping: ${article.title}`);
          const scraped = await scrapeArticle(article.url);

          if (scraped.content && !scraped.error) {
            if (db.run) {
              await db.run('UPDATE news SET content = ? WHERE id = ?', [scraped.content, article.id]);
            } else if (db.prepare) {
              db.prepare('UPDATE news SET content = ? WHERE id = ?').run(scraped.content, article.id);
            }

            scrapedCount++;
            results.push({ id: article.id, title: article.title, success: true, contentLength: scraped.content.length });
          } else {
            failedCount++;
            results.push({ id: article.id, title: article.title, success: false, error: scraped.error });
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          failedCount++;
          results.push({ id: article.id, title: article.title, success: false, error: error.message });
        }
      }

      res.json({
        success: true,
        message: `${scrapedCount} articles scrapés, ${failedCount} échecs`,
        scrapedCount,
        failedCount,
        results
      });
    } catch (error) {
      console.error('Erreur scraping batch:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/news/translate
   * Traduire les articles non traduits
   */
  router.post('/translate', async (req, res) => {
    const { translateUntranslatedNews, PRIORITY_LANGUAGES, ALL_SUPPORTED_LANGUAGES } = require('../utils/autoTranslate');

    try {
      const limit = parseInt(req.query.limit) || 20;
      const allLangs = req.query.all === 'true';
      const languages = allLangs ? ALL_SUPPORTED_LANGUAGES : PRIORITY_LANGUAGES;

      console.log(`[API] Démarrage traduction de ${limit} articles en ${languages.join(', ')}...`);

      const result = await translateUntranslatedNews(db, limit, languages);

      res.json({
        success: true,
        ...result,
        languages
      });
    } catch (error) {
      console.error('Erreur traduction batch:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};

/**
 * Catégoriser automatiquement un article selon son contenu
 */
function categorizeArticle(title, summary) {
  const text = (title + ' ' + summary).toLowerCase();

  if (text.match(/\b(ipo|initial public offering|introduction en bourse)\b/i)) {
    return 'IPO';
  }
  if (text.match(/\b(merger|acquisition|m&a|fusion|rachat)\b/i)) {
    return 'M&A';
  }
  if (text.match(/\b(earnings|résultats|bénéfice|profit|revenue|chiffre d'affaires)\b/i)) {
    return 'Earnings';
  }
  if (text.match(/\b(bank|banking|banque|crédit)\b/i)) {
    return 'Banking';
  }
  if (text.match(/\b(tech|technology|digital|fintech|technologie)\b/i)) {
    return 'Technology';
  }
  if (text.match(/\b(gold|oil|commodity|commodities|pétrole|or|matières premières)\b/i)) {
    return 'Commodities';
  }
  if (text.match(/\b(regulation|regulatory|réglementation|régulation)\b/i)) {
    return 'Regulation';
  }

  return 'Market Update';
}
