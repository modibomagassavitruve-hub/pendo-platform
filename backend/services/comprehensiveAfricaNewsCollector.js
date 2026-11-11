/**
 * COLLECTEUR AUTOMATIQUE COMPLET D'ACTUALITÉS AFRICAINES
 *
 * Couvre TOUS les 54 pays africains et toutes les bourses
 * Sources multiples : RSS, APIs, scraping web
 * Exécution automatique quotidienne
 */

const https = require('https');
const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');

class ComprehensiveAfricaNewsCollector {
  constructor() {
    const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
    this.db = new Database(dbPath);

    // TOUTES les bourses africaines (23 bourses actives)
    this.africanStockExchanges = [
      // Afrique du Nord
      { id: 'egx', country: 'EG', name: 'Egyptian Exchange', rss: 'https://news.google.com/rss/search?q=egypt+stock+exchange+OR+EGX&hl=en-EG&gl=EG&ceid=EG:en' },
      { id: 'masi', country: 'MA', name: 'Casablanca Stock Exchange', rss: 'https://news.google.com/rss/search?q=casablanca+stock+exchange+OR+MASI&hl=en-MA&gl=MA&ceid=MA:en' },
      { id: 'tunis', country: 'TN', name: 'Tunis Stock Exchange', rss: 'https://news.google.com/rss/search?q=tunis+stock+exchange+OR+TUNINDEX&hl=en-TN&gl=TN&ceid=TN:en' },
      { id: 'algiers', country: 'DZ', name: 'Algiers Stock Exchange', rss: 'https://news.google.com/rss/search?q=algiers+stock+exchange&hl=en-DZ&gl=DZ&ceid=DZ:en' },

      // Afrique de l'Ouest
      { id: 'nse_ng', country: 'NG', name: 'Nigerian Exchange', rss: 'https://news.google.com/rss/search?q=nigerian+exchange+OR+NGX+OR+NSE+nigeria&hl=en-NG&gl=NG&ceid=NG:en' },
      { id: 'gse', country: 'GH', name: 'Ghana Stock Exchange', rss: 'https://news.google.com/rss/search?q=ghana+stock+exchange+OR+GSE&hl=en-GH&gl=GH&ceid=GH:en' },
      { id: 'brvm', country: 'CI', name: 'BRVM', rss: 'https://news.google.com/rss/search?q=BRVM+OR+bourse+regionale+valeurs+mobilieres&hl=fr-CI&gl=CI&ceid=CI:fr' },

      // Afrique de l'Est
      { id: 'nse_ke', country: 'KE', name: 'Nairobi Securities Exchange', rss: 'https://news.google.com/rss/search?q=nairobi+securities+exchange+OR+NSE+kenya&hl=en-KE&gl=KE&ceid=KE:en' },
      { id: 'dse', country: 'TZ', name: 'Dar es Salaam Stock Exchange', rss: 'https://news.google.com/rss/search?q=dar+es+salaam+stock+exchange+OR+DSE+tanzania&hl=en-TZ&gl=TZ&ceid=TZ:en' },
      { id: 'use', country: 'UG', name: 'Uganda Securities Exchange', rss: 'https://news.google.com/rss/search?q=uganda+securities+exchange+OR+USE&hl=en-UG&gl=UG&ceid=UG:en' },
      { id: 'rse', country: 'RW', name: 'Rwanda Stock Exchange', rss: 'https://news.google.com/rss/search?q=rwanda+stock+exchange+OR+RSE&hl=en-RW&gl=RW&ceid=RW:en' },

      // Afrique Australe
      { id: 'jse', country: 'ZA', name: 'Johannesburg Stock Exchange', rss: 'https://news.google.com/rss/search?q=johannesburg+stock+exchange+OR+JSE&hl=en-ZA&gl=ZA&ceid=ZA:en' },
      { id: 'bse', country: 'BW', name: 'Botswana Stock Exchange', rss: 'https://news.google.com/rss/search?q=botswana+stock+exchange+OR+BSE&hl=en-BW&gl=BW&ceid=BW:en' },
      { id: 'luse', country: 'ZM', name: 'Lusaka Stock Exchange', rss: 'https://news.google.com/rss/search?q=lusaka+stock+exchange+OR+LuSE&hl=en-ZM&gl=ZM&ceid=ZM:en' },
      { id: 'zse', country: 'ZW', name: 'Zimbabwe Stock Exchange', rss: 'https://news.google.com/rss/search?q=zimbabwe+stock+exchange+OR+ZSE&hl=en-ZW&gl=ZW&ceid=ZW:en' },
      { id: 'sem', country: 'MU', name: 'Stock Exchange of Mauritius', rss: 'https://news.google.com/rss/search?q=mauritius+stock+exchange+OR+SEM&hl=en-MU&gl=MU&ceid=MU:en' },
      { id: 'nsx', country: 'NA', name: 'Namibian Stock Exchange', rss: 'https://news.google.com/rss/search?q=namibian+stock+exchange+OR+NSX&hl=en-NA&gl=NA&ceid=NA:en' },
      { id: 'mse', country: 'MW', name: 'Malawi Stock Exchange', rss: 'https://news.google.com/rss/search?q=malawi+stock+exchange+OR+MSE&hl=en-MW&gl=MW&ceid=MW:en' },

      // Afrique Centrale
      { id: 'dsx', country: 'CD', name: 'Douala Stock Exchange', rss: 'https://news.google.com/rss/search?q=douala+stock+exchange+OR+DSX&hl=fr-CM&gl=CM&ceid=CM:fr' }
    ];

    // Sources d'actualités panafricaines générales
    this.generalAfricanSources = [
      { name: 'African Business', rss: 'https://news.google.com/rss/search?q=african+business+investment+OR+african+finance&hl=en&gl=ZA&ceid=ZA:en' },
      { name: 'Africa Finance', rss: 'https://news.google.com/rss/search?q=africa+finance+OR+african+markets&hl=en&gl=ZA&ceid=ZA:en' },
      { name: 'AfDB News', rss: 'https://news.google.com/rss/search?q=african+development+bank+OR+AfDB&hl=en&gl=ZA&ceid=ZA:en' },
      { name: 'African Markets', rss: 'https://news.google.com/rss/search?q=african+stock+markets+OR+african+equities&hl=en&gl=ZA&ceid=ZA:en' },
      { name: 'Pan-African Investment', rss: 'https://news.google.com/rss/search?q=pan-african+investment+OR+africa+ipo&hl=en&gl=ZA&ceid=ZA:en' }
    ];

    // Tous les pays africains (54 pays)
    this.allAfricanCountries = [
      { code: 'DZ', name: 'Algeria' }, { code: 'AO', name: 'Angola' }, { code: 'BJ', name: 'Benin' },
      { code: 'BW', name: 'Botswana' }, { code: 'BF', name: 'Burkina Faso' }, { code: 'BI', name: 'Burundi' },
      { code: 'CM', name: 'Cameroon' }, { code: 'CV', name: 'Cape Verde' }, { code: 'CF', name: 'Central African Republic' },
      { code: 'TD', name: 'Chad' }, { code: 'KM', name: 'Comoros' }, { code: 'CG', name: 'Congo' },
      { code: 'CD', name: 'DRC' }, { code: 'CI', name: 'Ivory Coast' }, { code: 'DJ', name: 'Djibouti' },
      { code: 'EG', name: 'Egypt' }, { code: 'GQ', name: 'Equatorial Guinea' }, { code: 'ER', name: 'Eritrea' },
      { code: 'ET', name: 'Ethiopia' }, { code: 'GA', name: 'Gabon' }, { code: 'GM', name: 'Gambia' },
      { code: 'GH', name: 'Ghana' }, { code: 'GN', name: 'Guinea' }, { code: 'GW', name: 'Guinea-Bissau' },
      { code: 'KE', name: 'Kenya' }, { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' },
      { code: 'LY', name: 'Libya' }, { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' },
      { code: 'ML', name: 'Mali' }, { code: 'MR', name: 'Mauritania' }, { code: 'MU', name: 'Mauritius' },
      { code: 'MA', name: 'Morocco' }, { code: 'MZ', name: 'Mozambique' }, { code: 'NA', name: 'Namibia' },
      { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' }, { code: 'RW', name: 'Rwanda' },
      { code: 'ST', name: 'Sao Tome' }, { code: 'SN', name: 'Senegal' }, { code: 'SC', name: 'Seychelles' },
      { code: 'SL', name: 'Sierra Leone' }, { code: 'SO', name: 'Somalia' }, { code: 'ZA', name: 'South Africa' },
      { code: 'SS', name: 'South Sudan' }, { code: 'SD', name: 'Sudan' }, { code: 'SZ', name: 'Eswatini' },
      { code: 'TZ', name: 'Tanzania' }, { code: 'TG', name: 'Togo' }, { code: 'TN', name: 'Tunisia' },
      { code: 'UG', name: 'Uganda' }, { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' }
    ];

    this.initDatabase();
  }

  initDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        summary TEXT,
        content TEXT,
        url TEXT UNIQUE,
        source TEXT,
        category TEXT,
        country TEXT,
        market_id TEXT,
        image_url TEXT,
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC);
      CREATE INDEX IF NOT EXISTS idx_news_country ON news(country);
      CREATE INDEX IF NOT EXISTS idx_news_market ON news(market_id);
    `);
  }

  /**
   * COLLECTE AUTOMATIQUE COMPLÈTE - Point d'entrée principal
   */
  async collectAllAfricanNews() {
    console.log('🌍 DÉMARRAGE COLLECTE COMPLÈTE ACTUALITÉS AFRICAINES');
    console.log('📅 Date:', new Date().toLocaleString('fr-FR'));
    console.log('━'.repeat(60));

    const stats = {
      totalCollected: 0,
      bySource: {},
      byCountry: {},
      byExchange: {},
      errors: []
    };

    try {
      // 1. Collecter depuis toutes les bourses africaines
      console.log('\n📊 Collecte depuis 19 bourses africaines...');
      await this.collectFromStockExchanges(stats);

      // 2. Collecter depuis les sources panafricaines
      console.log('\n🌐 Collecte depuis sources panafricaines...');
      await this.collectFromGeneralSources(stats);

      // 3. Collecter actualités économiques par pays
      console.log('\n🗺️  Collecte actualités économiques (54 pays)...');
      await this.collectEconomicNewsByCountry(stats);

      // 4. Collecter secteurs spécifiques
      console.log('\n💼 Collecte secteurs Finance, Tech, Énergie...');
      await this.collectBySector(stats);

      console.log('\n' + '━'.repeat(60));
      console.log('✅ COLLECTE TERMINÉE');
      console.log('📊 STATISTIQUES:');
      console.log(`   Total articles collectés: ${stats.totalCollected}`);
      console.log(`   Erreurs: ${stats.errors.length}`);

      if (Object.keys(stats.byExchange).length > 0) {
        console.log('\n📈 Par bourse:');
        Object.entries(stats.byExchange).forEach(([ex, count]) => {
          console.log(`   ${ex}: ${count} articles`);
        });
      }

      return stats;
    } catch (error) {
      console.error('❌ Erreur collecte:', error);
      throw error;
    }
  }

  /**
   * Collecter depuis toutes les bourses africaines
   */
  async collectFromStockExchanges(stats) {
    for (const exchange of this.africanStockExchanges) {
      try {
        console.log(`  📊 ${exchange.name} (${exchange.country})...`);
        const articles = await this.fetchRSSFeed(exchange.rss);

        const processedArticles = articles.map(a => ({
          ...a,
          market_id: exchange.id,
          country: exchange.country,
          source: exchange.name,
          category: this.categorizeArticle(a.title)
        }));

        const saved = this.saveArticles(processedArticles);
        stats.totalCollected += saved;
        stats.byExchange[exchange.id] = (stats.byExchange[exchange.id] || 0) + saved;

        if (saved > 0) {
          console.log(`     ✓ ${saved} nouveaux articles`);
        }

        // Pause pour éviter rate limiting
        await this.sleep(500);
      } catch (error) {
        stats.errors.push(`${exchange.name}: ${error.message}`);
      }
    }
  }

  /**
   * Collecter depuis sources panafricaines générales
   */
  async collectFromGeneralSources(stats) {
    for (const source of this.generalAfricanSources) {
      try {
        console.log(`  🌐 ${source.name}...`);
        const articles = await this.fetchRSSFeed(source.rss);

        const processedArticles = articles.map(a => ({
          ...a,
          source: source.name,
          category: this.categorizeArticle(a.title),
          country: this.detectCountry(a.title + ' ' + (a.summary || ''))
        }));

        const saved = this.saveArticles(processedArticles);
        stats.totalCollected += saved;
        stats.bySource[source.name] = (stats.bySource[source.name] || 0) + saved;

        if (saved > 0) {
          console.log(`     ✓ ${saved} nouveaux articles`);
        }

        await this.sleep(500);
      } catch (error) {
        stats.errors.push(`${source.name}: ${error.message}`);
      }
    }
  }

  /**
   * Collecter actualités économiques pour chaque pays africain
   */
  async collectEconomicNewsByCountry(stats) {
    // Collecter par groupes pour optimiser
    const batchSize = 10;
    for (let i = 0; i < this.allAfricanCountries.length; i += batchSize) {
      const batch = this.allAfricanCountries.slice(i, i + batchSize);

      await Promise.all(batch.map(async (country) => {
        try {
          const query = encodeURIComponent(`${country.name} economy OR ${country.name} investment OR ${country.name} business`);
          const rss = `https://news.google.com/rss/search?q=${query}&hl=en&gl=${country.code}&ceid=${country.code}:en`;

          const articles = await this.fetchRSSFeed(rss);
          const processedArticles = articles.map(a => ({
            ...a,
            country: country.code,
            source: 'Google News',
            category: this.categorizeArticle(a.title)
          }));

          const saved = this.saveArticles(processedArticles);
          if (saved > 0) {
            stats.totalCollected += saved;
            stats.byCountry[country.code] = (stats.byCountry[country.code] || 0) + saved;
            console.log(`     ✓ ${country.name}: ${saved} articles`);
          }
        } catch (error) {
          // Silent fail pour pays individuels
        }
      }));

      await this.sleep(1000);
    }
  }

  /**
   * Collecter par secteur spécifique
   */
  async collectBySector(stats) {
    const sectors = [
      { name: 'Banking', query: 'african+banking+OR+african+banks' },
      { name: 'Fintech', query: 'african+fintech+OR+mobile+money+africa' },
      { name: 'Energy', query: 'african+energy+OR+african+power' },
      { name: 'Mining', query: 'african+mining+OR+african+minerals' },
      { name: 'Tech', query: 'african+tech+OR+african+startups' },
      { name: 'Agriculture', query: 'african+agriculture+OR+african+agribusiness' }
    ];

    for (const sector of sectors) {
      try {
        const rss = `https://news.google.com/rss/search?q=${sector.query}&hl=en&gl=ZA&ceid=ZA:en`;
        const articles = await this.fetchRSSFeed(rss);

        const processedArticles = articles.map(a => ({
          ...a,
          category: sector.name,
          source: 'Google News',
          country: this.detectCountry(a.title + ' ' + (a.summary || ''))
        }));

        const saved = this.saveArticles(processedArticles);
        if (saved > 0) {
          console.log(`     ✓ ${sector.name}: ${saved} articles`);
          stats.totalCollected += saved;
        }

        await this.sleep(500);
      } catch (error) {
        stats.errors.push(`Sector ${sector.name}: ${error.message}`);
      }
    }
  }

  /**
   * Récupérer et parser un flux RSS
   */
  async fetchRSSFeed(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const req = protocol.get(url, (res) => {
        let data = '';

        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const articles = this.parseRSS(data);
            resolve(articles);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }

  /**
   * Parser XML RSS en articles
   */
  parseRSS(xml) {
    const articles = [];
    const itemRegex = /<item>(.*?)<\/item>/gs;
    const matches = xml.matchAll(itemRegex);

    for (const match of matches) {
      const item = match[1];

      const title = this.extractTag(item, 'title');
      const link = this.extractTag(item, 'link');
      const pubDate = this.extractTag(item, 'pubDate');
      const description = this.extractTag(item, 'description');

      if (title && link) {
        articles.push({
          title: this.cleanText(title),
          url: link,
          summary: description ? this.cleanText(description) : null,
          published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
        });
      }
    }

    return articles;
  }

  extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[(.*?)\\]\\]></${tag}>|<${tag}[^>]*>(.*?)</${tag}>`, 's');
    const match = xml.match(regex);
    return match ? (match[1] || match[2] || '').trim() : null;
  }

  cleanText(text) {
    return text
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Catégoriser un article selon son titre
   */
  categorizeArticle(title) {
    const titleLower = title.toLowerCase();

    if (titleLower.match(/bank|banking|financial/i)) return 'Banking';
    if (titleLower.match(/ipo|listing|stock|shares|equity/i)) return 'IPO';
    if (titleLower.match(/merger|acquisition|m&a/i)) return 'M&A';
    if (titleLower.match(/earnings|profit|revenue|results/i)) return 'Earnings';
    if (titleLower.match(/tech|digital|fintech|startup/i)) return 'Technology';
    if (titleLower.match(/oil|energy|mining|commodity/i)) return 'Commodities';
    if (titleLower.match(/regulation|policy|central bank/i)) return 'Regulation';

    return 'General';
  }

  /**
   * Détecter le pays mentionné dans un texte
   */
  detectCountry(text) {
    const textLower = text.toLowerCase();

    for (const country of this.allAfricanCountries) {
      if (textLower.includes(country.name.toLowerCase())) {
        return country.code;
      }
    }

    return null;
  }

  /**
   * Sauvegarder les articles en base de données
   */
  saveArticles(articles) {
    if (!articles || articles.length === 0) return 0;

    let saved = 0;
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO news (title, summary, content, url, source, category, country, market_id, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const article of articles) {
      try {
        const result = insert.run(
          article.title,
          article.summary || null,
          article.content || null,
          article.url,
          article.source,
          article.category || 'General',
          article.country || null,
          article.market_id || null,
          article.published_at
        );
        if (result.changes > 0) saved++;
      } catch (error) {
        // Ignorer doublons (UNIQUE constraint)
      }
    }

    return saved;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ComprehensiveAfricaNewsCollector;
