/**
 * Module de scraping d'articles de presse
 * Extrait le contenu complet des articles depuis leurs URLs
 */
const fetch = require('node-fetch');
const cheerio = require('cheerio');

/**
 * Scraper le contenu d'un article depuis son URL
 * @param {string} url - L'URL de l'article
 * @returns {Promise<{title: string, content: string, author: string|null}>}
 */
async function scrapeArticle(url) {
  try {
    // Récupérer la page HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Stratégies d'extraction par source
    const extractors = {
      // BusinessDay Nigeria
      'businessday.ng': () => extractBusinessDayNG($),

      // Moneyweb (South Africa)
      'moneyweb.co.za': () => extractMoneyweb($),

      // Business Live (South Africa)
      'businesslive.co.za': () => extractBusinessLive($),

      // Africanews
      'africanews.com': () => extractAfricanews($),

      // AllAfrica
      'allafrica.com': () => extractAllAfrica($),

      // Generic extractor (fallback)
      'default': () => extractGeneric($)
    };

    // Détecter la source depuis l'URL
    const domain = new URL(url).hostname.replace('www.', '');
    const extractor = extractors[domain] || extractors['default'];

    return extractor();
  } catch (error) {
    console.error(`Erreur scraping ${url}:`, error.message);
    return {
      title: null,
      content: null,
      author: null,
      error: error.message
    };
  }
}

/**
 * Extractor pour BusinessDay Nigeria
 */
function extractBusinessDayNG($) {
  const title = $('h1.entry-title').text().trim() || $('h1').first().text().trim();
  const author = $('.author-name').text().trim() || null;

  // Récupérer tous les paragraphes de l'article
  const paragraphs = [];
  $('.entry-content p, .article-content p, .post-content p').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20 && !text.includes('Read also:')) {
      paragraphs.push(text);
    }
  });

  return {
    title,
    content: paragraphs.join('\n\n'),
    author
  };
}

/**
 * Extractor pour Moneyweb
 */
function extractMoneyweb($) {
  const title = $('h1.article-title').text().trim() || $('h1').first().text().trim();
  const author = $('.article-author').text().trim() || null;

  const paragraphs = [];
  $('.article-body p, .entry-content p').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20) {
      paragraphs.push(text);
    }
  });

  return {
    title,
    content: paragraphs.join('\n\n'),
    author
  };
}

/**
 * Extractor pour Business Live
 */
function extractBusinessLive($) {
  const title = $('h1.article-title').text().trim() || $('h1').first().text().trim();
  const author = $('.article-author-name').text().trim() || null;

  const paragraphs = [];
  $('.article-widget-text p, article p').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20) {
      paragraphs.push(text);
    }
  });

  return {
    title,
    content: paragraphs.join('\n\n'),
    author
  };
}

/**
 * Extractor pour Africanews
 */
function extractAfricanews($) {
  const title = $('h1').first().text().trim();
  const author = $('.author-name').text().trim() || null;

  const paragraphs = [];
  $('article p, .article-content p').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20) {
      paragraphs.push(text);
    }
  });

  return {
    title,
    content: paragraphs.join('\n\n'),
    author
  };
}

/**
 * Extractor pour AllAfrica
 */
function extractAllAfrica($) {
  const title = $('h1.story-title').text().trim() || $('h1').first().text().trim();
  const author = $('.story-author').text().trim() || null;

  const paragraphs = [];
  $('.story-body p, .article-body p').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20) {
      paragraphs.push(text);
    }
  });

  return {
    title,
    content: paragraphs.join('\n\n'),
    author
  };
}

/**
 * Extractor générique (fallback)
 * Utilise des heuristiques pour trouver le contenu principal
 */
function extractGeneric($) {
  // Essayer différents sélecteurs communs pour le titre
  const title =
    $('h1.entry-title').text().trim() ||
    $('h1.article-title').text().trim() ||
    $('h1.post-title').text().trim() ||
    $('h1').first().text().trim() ||
    $('title').text().trim();

  // Essayer différents sélecteurs pour l'auteur
  const author =
    $('.author-name').text().trim() ||
    $('.author').text().trim() ||
    $('[rel="author"]').text().trim() ||
    null;

  // Sélecteurs communs pour le contenu de l'article
  const contentSelectors = [
    'article p',
    '.article-content p',
    '.entry-content p',
    '.post-content p',
    '.story-body p',
    'main p',
    '.content p'
  ];

  const paragraphs = [];

  for (const selector of contentSelectors) {
    $(selector).each((i, el) => {
      const text = $(el).text().trim();
      // Filtrer les paragraphes trop courts ou qui sont des liens/boutons
      if (text && text.length > 30 && !$(el).find('a').length > 0) {
        paragraphs.push(text);
      }
    });

    // Si on a trouvé du contenu substantiel, on arrête
    if (paragraphs.length > 3) break;
  }

  // Nettoyer et limiter le contenu
  const content = paragraphs
    .slice(0, 50) // Max 50 paragraphes
    .join('\n\n')
    .substring(0, 10000); // Max 10000 caractères

  return {
    title,
    content,
    author
  };
}

/**
 * Nettoyer le texte extrait
 */
function cleanText(text) {
  if (!text) return '';

  return text
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .replace(/\n{3,}/g, '\n\n') // Max 2 sauts de ligne consécutifs
    .trim();
}

module.exports = {
  scrapeArticle
};
