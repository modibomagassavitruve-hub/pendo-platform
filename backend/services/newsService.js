const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
let db;

try {
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      url TEXT,
      source TEXT,
      category TEXT,
      country TEXT,
      market_id TEXT,
      image_url TEXT,
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch(e) {
  console.error('News DB error:', e.message);
}

// Générer un contenu détaillé basé sur le titre de l'article
function generateArticleContent(article) {
  const title = article.title || '';
  const source = article.source || 'Source';
  const market = article.market_id?.toUpperCase() || '';
  const country = article.country || '';
  
  // Données contextuelles par marché
  const marketData = {
    'jse': { name: 'JSE (Johannesburg Stock Exchange)', currency: 'ZAR', country: 'Afrique du Sud', companies: ['Naspers', 'Anglo American', 'Standard Bank', 'FirstRand', 'MTN Group'] },
    'nse_ng': { name: 'NGX (Nigerian Exchange)', currency: 'NGN', country: 'Nigeria', companies: ['Dangote Cement', 'MTN Nigeria', 'Zenith Bank', 'GTBank', 'BUA Cement'] },
    'egx': { name: 'EGX (Egyptian Exchange)', currency: 'EGP', country: 'Égypte', companies: ['Commercial International Bank', 'Talaat Moustafa', 'Eastern Company', 'EFG Hermes'] },
    'masi': { name: 'Bourse de Casablanca', currency: 'MAD', country: 'Maroc', companies: ['Attijariwafa Bank', 'BCP', 'Maroc Telecom', 'Lafarge Holcim Maroc'] },
    'brvm': { name: 'BRVM', currency: 'XOF', country: 'UEMOA', companies: ['Sonatel', 'Orange CI', 'Société Générale CI', 'Ecobank'] },
    'gse': { name: 'GSE (Ghana Stock Exchange)', currency: 'GHS', country: 'Ghana', companies: ['MTN Ghana', 'GCB Bank', 'Ecobank Ghana', 'Cal Bank'] },
    'nse_ke': { name: 'NSE (Nairobi Securities Exchange)', currency: 'KES', country: 'Kenya', companies: ['Safaricom', 'Equity Bank', 'KCB Group', 'East African Breweries'] }
  };

  const mktInfo = marketData[article.market_id] || { name: 'Marché africain', currency: 'USD', country: 'Afrique', companies: ['Diverses entreprises'] };
  
  // Analyser le titre pour générer un contenu pertinent
  const titleLower = title.toLowerCase();
  let content = '';
  
  // Détection du type d'article
  if (titleLower.includes('gain') || titleLower.includes('rise') || titleLower.includes('surge') || titleLower.includes('climb') || titleLower.includes('soar') || titleLower.includes('up') || titleLower.includes('hausse') || titleLower.includes('green')) {
    content = generateBullishContent(article, mktInfo);
  } else if (titleLower.includes('fall') || titleLower.includes('drop') || titleLower.includes('decline') || titleLower.includes('slip') || titleLower.includes('down') || titleLower.includes('baisse') || titleLower.includes('red')) {
    content = generateBearishContent(article, mktInfo);
  } else if (titleLower.includes('bank') || titleLower.includes('financial')) {
    content = generateBankingContent(article, mktInfo);
  } else if (titleLower.includes('oil') || titleLower.includes('energy') || titleLower.includes('mining')) {
    content = generateCommoditiesContent(article, mktInfo);
  } else if (titleLower.includes('tech') || titleLower.includes('telecom') || titleLower.includes('digital')) {
    content = generateTechContent(article, mktInfo);
  } else if (titleLower.includes('ipo') || titleLower.includes('listing')) {
    content = generateIPOContent(article, mktInfo);
  } else if (titleLower.includes('appoint') || titleLower.includes('ceo') || titleLower.includes('president')) {
    content = generateCorporateContent(article, mktInfo);
  } else {
    content = generateGeneralContent(article, mktInfo);
  }
  
  return content;
}

function generateBullishContent(article, mktInfo) {
  const percentGain = (Math.random() * 3 + 0.5).toFixed(2);
  const volume = Math.floor(Math.random() * 500 + 100);
  const companies = mktInfo.companies.slice(0, 3).join(', ');
  
  return `Le ${mktInfo.name} a enregistré une séance positive aujourd'hui, avec une progression notable des principaux indices.

**Analyse du marché**

Les investisseurs ont réagi favorablement aux dernières nouvelles économiques, propulsant le marché vers de nouveaux sommets. Le volume des transactions a atteint ${volume} millions ${mktInfo.currency}, soit une augmentation significative par rapport à la moyenne des dernières semaines.

**Valeurs en hausse**

Les principales valeurs qui ont tiré le marché vers le haut incluent ${companies}. Ces entreprises ont bénéficié d'un regain d'intérêt de la part des investisseurs institutionnels et internationaux.

**Perspectives**

Les analystes restent optimistes quant à l'évolution du marché à court terme. Les fondamentaux économiques de ${mktInfo.country} continuent de s'améliorer, soutenant ainsi la confiance des investisseurs.

**Contexte régional**

Cette performance s'inscrit dans un contexte de dynamisme général des marchés africains, qui attirent de plus en plus l'attention des investisseurs mondiaux à la recherche de diversification et de rendements attractifs.

**Recommandations**

Les experts du marché suggèrent de maintenir une exposition aux valeurs de qualité tout en restant attentifs aux opportunités de valorisation qui pourraient émerger dans les secteurs en croissance.`;
}

function generateBearishContent(article, mktInfo) {
  const percentLoss = (Math.random() * 2 + 0.3).toFixed(2);
  const companies = mktInfo.companies.slice(0, 2).join(' et ');
  
  return `Le ${mktInfo.name} a clôturé en territoire négatif aujourd'hui, reflétant les incertitudes qui pèsent sur les marchés mondiaux.

**Analyse de la séance**

La prudence a dominé les échanges tout au long de la journée, les investisseurs préférant sécuriser leurs positions face aux incertitudes économiques. Les volumes sont restés modérés, témoignant d'un attentisme généralisé.

**Secteurs sous pression**

Les valeurs les plus touchées incluent ${companies}, qui ont subi des prises de bénéfices après leurs récentes performances. Le secteur financier a particulièrement souffert des anticipations de resserrement des conditions de crédit.

**Facteurs explicatifs**

Plusieurs éléments ont contribué à cette correction :
- Les tensions sur les marchés internationaux
- Les préoccupations concernant l'inflation
- L'attentisme avant les prochaines annonces de politique monétaire

**Perspectives à court terme**

Malgré cette séance difficile, les analystes considèrent cette correction comme technique et maintiennent leurs perspectives positives pour ${mktInfo.country} à moyen terme.

**Conseils aux investisseurs**

Les périodes de volatilité peuvent représenter des opportunités d'entrée pour les investisseurs ayant un horizon de placement à long terme.`;
}

function generateBankingContent(article, mktInfo) {
  return `Le secteur bancaire du ${mktInfo.name} est au centre de l'attention des investisseurs cette semaine.

**Performance du secteur financier**

Les valeurs bancaires ont dominé les échanges, avec des volumes particulièrement soutenus sur les principales institutions financières de ${mktInfo.country}. Cette dynamique reflète la confiance croissante dans la solidité du système bancaire africain.

**Résultats et perspectives**

Les banques de la région continuent d'afficher des indicateurs de rentabilité robustes :
- Croissance des revenus nets d'intérêts
- Amélioration des ratios de solvabilité
- Expansion des services bancaires digitaux

**Transformation digitale**

Le secteur bancaire africain poursuit sa transformation numérique accélérée. Les services de mobile banking et de paiement digital connaissent une croissance exponentielle, ouvrant de nouvelles sources de revenus pour les établissements traditionnels.

**Environnement réglementaire**

Les régulateurs continuent de renforcer le cadre prudentiel, ce qui améliore la stabilité du secteur et renforce la confiance des investisseurs internationaux.

**Opportunités d'investissement**

Les analystes recommandent une surpondération du secteur bancaire africain, qui offre des valorisations attractives comparées aux marchés développés.`;
}

function generateCommoditiesContent(article, mktInfo) {
  return `Les valeurs liées aux matières premières sont en mouvement sur le ${mktInfo.name}.

**Contexte des marchés des commodités**

Les cours des matières premières sur les marchés internationaux continuent d'influencer fortement les bourses africaines, le continent étant un acteur majeur dans la production de nombreuses ressources naturelles.

**Impact sur les marchés locaux**

Les entreprises minières et énergétiques cotées sur les bourses africaines bénéficient directement des variations des cours mondiaux. Cette exposition aux commodités représente à la fois une opportunité et un facteur de risque pour les investisseurs.

**Secteur minier**

L'industrie minière africaine reste un pilier de nombreuses économies du continent. Les investissements dans les infrastructures minières continuent de croître, soutenus par la demande mondiale pour les métaux stratégiques.

**Transition énergétique**

Le continent africain se positionne également comme un acteur clé de la transition énergétique mondiale, avec d'importants gisements de minerais essentiels aux technologies vertes.

**Recommandations sectorielles**

Les analystes suggèrent une approche sélective, privilégiant les entreprises ayant diversifié leurs activités et disposant de bilans solides.`;
}

function generateTechContent(article, mktInfo) {
  return `Le secteur technologique africain continue sa progression sur le ${mktInfo.name}.

**Dynamique du secteur tech**

Les valeurs technologiques et télécoms africaines connaissent un engouement croissant de la part des investisseurs. La digitalisation rapide du continent crée des opportunités de croissance exceptionnelles.

**Mobile et fintech**

L'Afrique est leader mondial dans l'adoption des services financiers mobiles. Les entreprises de fintech africaines attirent des investissements records, transformant l'accès aux services financiers pour des millions de personnes.

**Télécommunications**

Les opérateurs télécoms africains continuent d'investir massivement dans l'infrastructure réseau pour répondre à la demande croissante de connectivité. La 4G se généralise et les premiers déploiements 5G sont en cours dans plusieurs pays.

**Startups et innovation**

L'écosystème startup africain est en pleine effervescence, avec des levées de fonds record et l'émergence de licornes locales. Les hubs technologiques de Lagos, Nairobi, Le Caire et Johannesburg rivalisent d'innovation.

**Perspectives d'investissement**

Le secteur tech africain offre un potentiel de croissance significatif pour les investisseurs patients, malgré les risques inhérents aux marchés émergents.`;
}

function generateIPOContent(article, mktInfo) {
  return `Une nouvelle introduction en bourse anime le ${mktInfo.name}.

**Contexte de l'IPO**

Le marché des introductions en bourse en Afrique connaît un regain de dynamisme, reflétant la maturité croissante des marchés financiers du continent et l'appétit des investisseurs pour les nouvelles opportunités.

**Détails de l'opération**

Cette introduction en bourse représente une étape importante pour le développement du marché de ${mktInfo.country}. Elle témoigne de la confiance des entreprises locales dans les marchés de capitaux africains.

**Intérêt des investisseurs**

Les investisseurs institutionnels locaux et internationaux ont manifesté un vif intérêt pour cette opération. La demande devrait être soutenue, compte tenu de l'attractivité du secteur d'activité concerné.

**Impact sur le marché**

Cette nouvelle cotation contribuera à :
- Augmenter la profondeur du marché
- Diversifier les opportunités d'investissement
- Renforcer la visibilité internationale de la bourse

**Perspectives**

Les analystes anticipent d'autres introductions en bourse dans les mois à venir, le contexte économique et boursier étant favorable à ce type d'opérations.`;
}

function generateCorporateContent(article, mktInfo) {
  return `Un changement majeur de gouvernance intervient sur le ${mktInfo.name}.

**Annonce de nomination**

Les entreprises cotées africaines continuent de renforcer leur gouvernance, attirant des talents de premier plan pour diriger leurs opérations. Cette tendance reflète la professionnalisation croissante du secteur privé africain.

**Impact sur l'entreprise**

Les changements de direction sont généralement perçus positivement par les marchés lorsqu'ils s'accompagnent d'une vision stratégique claire et d'une expérience avérée dans le secteur.

**Réaction du marché**

Les investisseurs surveillent attentivement ces évolutions de gouvernance, qui peuvent signaler de nouvelles orientations stratégiques et des opportunités de création de valeur.

**Contexte de gouvernance en Afrique**

La gouvernance d'entreprise en Afrique s'améliore continuellement, avec l'adoption de standards internationaux et une transparence accrue. Cette évolution renforce la confiance des investisseurs étrangers.

**Perspectives**

Les entreprises africaines bien gouvernées continuent d'attirer les capitaux, démontrant que la qualité du management reste un facteur clé de succès sur les marchés émergents.`;
}

function generateGeneralContent(article, mktInfo) {
  const companies = mktInfo.companies.join(', ');
  
  return `L'actualité des marchés africains reste soutenue avec les derniers développements sur le ${mktInfo.name}.

**Synthèse de la séance**

Les marchés financiers de ${mktInfo.country} ont connu une séance active, avec des mouvements notables sur plusieurs valeurs phares. Les investisseurs restent attentifs aux développements économiques locaux et internationaux.

**Principales valeurs suivies**

Les entreprises les plus échangées incluent ${companies}. Ces sociétés représentent les secteurs clés de l'économie et constituent le cœur de la capitalisation boursière locale.

**Contexte économique**

L'environnement macroéconomique de ${mktInfo.country} continue d'évoluer, avec des indicateurs qui témoignent de la résilience de l'économie africaine face aux défis mondiaux.

**Flux d'investissement**

Les marchés africains continuent d'attirer l'attention des investisseurs internationaux, qui y voient des opportunités de diversification et de rendement dans un contexte de taux bas dans les économies développées.

**Perspectives**

Les analystes maintiennent une vue constructive sur les marchés africains à moyen terme, tout en recommandant une approche sélective et diversifiée.

**À surveiller**

Les prochaines publications de résultats d'entreprises et les décisions de politique monétaire des banques centrales africaines seront des catalyseurs importants pour l'évolution des marchés.`;
}

function getNews(options = {}) {
  const limit = options.limit || 20;
  const marketId = options.market_id;
  
  if (!db) return getDemoNews();
  
  try {
    let query = 'SELECT * FROM news';
    const params = [];
    
    if (marketId) {
      query += ' WHERE market_id = ?';
      params.push(marketId);
    }
    
    query += ' ORDER BY published_at DESC LIMIT ?';
    params.push(limit);
    
    const rows = db.prepare(query).all(...params);
    return rows.length > 0 ? rows : getDemoNews();
  } catch(e) {
    console.error('[News] getNews error:', e.message);
    return getDemoNews();
  }
}

function getArticleById(id) {
  if (!db) return null;
  
  try {
    return db.prepare('SELECT * FROM news WHERE id = ?').get(id);
  } catch(e) {
    return null;
  }
}

async function getArticleWithContent(id) {
  let article = getArticleById(id);
  
  // Si pas trouvé en base, chercher dans les news de démo
  if (!article) {
    const demoNews = getDemoNews();
    article = demoNews.find(a => a.id === id);
  }
  
  if (!article) return null;
  
  // Si pas de contenu, générer un contenu détaillé
  if (!article.content || article.content.length < 100) {
    article.content = generateArticleContent(article);
    
    // Sauvegarder si possible
    if (db && article.id) {
      try {
        db.prepare('UPDATE news SET content = ? WHERE id = ?').run(article.content, article.id);
      } catch(e) {}
    }
  }
  
  return article;
}

function saveNews(articles) {
  if (!db || !articles || articles.length === 0) return 0;
  
  let saved = 0;
  const insert = db.prepare(`
    INSERT OR IGNORE INTO news (title, summary, content, url, source, category, country, market_id, image_url, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const article of articles) {
    try {
      // Générer le contenu si pas présent
      const content = article.content || generateArticleContent(article);
      
      const result = insert.run(
        article.title,
        article.summary || null,
        content,
        article.url || null,
        article.source,
        article.category || 'General',
        article.country || null,
        article.market_id || null,
        article.image_url || null,
        article.published_at
      );
      if (result.changes > 0) saved++;
    } catch(e) {}
  }

  return saved;
}

function getDemoNews() {
  return [
    {
      id: 1,
      title: "JSE All Share atteint un nouveau sommet historique",
      summary: "L'indice principal de la bourse de Johannesburg a progressé de 1.2% aujourd'hui.",
      source: "PENDO Finance",
      category: "Market Update",
      country: "ZA",
      market_id: "jse",
      published_at: new Date().toISOString()
    },
    {
      id: 2,
      title: "Le secteur bancaire nigérian propulse le NGX",
      summary: "Les valeurs bancaires ont dominé la séance sur la bourse de Lagos.",
      source: "PENDO Finance",
      category: "Banking",
      country: "NG",
      market_id: "nse_ng",
      published_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 3,
      title: "L'EGX 30 rebondit après les annonces d'investissements",
      summary: "La bourse égyptienne a réagi positivement aux annonces de nouveaux projets.",
      source: "PENDO Finance",
      category: "Investment",
      country: "EG",
      market_id: "egx",
      published_at: new Date(Date.now() - 7200000).toISOString()
    }
  ];
}

async function updateNews() {
  console.log('[News] Updating news...');
  const existing = getNews({ limit: 1 });
  if (existing.length === 0) {
    const demoNews = getDemoNews();
    saveNews(demoNews);
  }
  return getNews().length;
}

function scheduleNewsUpdate(minutes) {
  console.log('[News] Scheduled every', minutes, 'minutes');
  updateNews();
  setInterval(updateNews, minutes * 60 * 1000);
}

module.exports = { 
  getNews, 
  getArticleById,
  getArticleWithContent,
  updateNews, 
  scheduleNewsUpdate, 
  saveNews,
  getDemoNews,
  generateArticleContent
};
