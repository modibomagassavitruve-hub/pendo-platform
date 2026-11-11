/**
 * Configuration complète des Bourses Africaines pour PENDO
 *
 * Ce fichier contient toutes les métadonnées détaillées pour les 6 principales
 * bourses africaines couvertes par la plateforme PENDO.
 *
 * @module config/africanExchanges
 * @version 2.0.0
 * @author PENDO Team
 */

// =============================================================================
// CONFIGURATION DES BOURSES
// =============================================================================

const AFRICAN_EXCHANGES = {
  // ---------------------------------------------------------------------------
  // 1. JSE - JOHANNESBURG STOCK EXCHANGE (Afrique du Sud)
  // ---------------------------------------------------------------------------
  jse: {
    id: 'jse',
    code: 'JSE',
    name: 'JSE All Share',
    fullName: 'JSE Limited (Johannesburg Stock Exchange)',
    country: 'Afrique du Sud',
    region: 'Afrique Australe',
    city: 'Sandton, Johannesburg',
    website: 'https://www.jse.co.za/',
    founded: 1887,

    // Régulation
    regulator: {
      name: 'FSCA - Financial Sector Conduct Authority',
      website: 'https://www.fsca.co.za/',
      model: 'Twin Peaks (FSCA + PA)'
    },

    // Capitalisation et statistiques
    marketCap: {
      value: 21000000000000, // ZAR
      currency: 'ZAR',
      usdValue: 1200000000000, // ~$1.2 trillion
      lastUpdate: '2024-12'
    },
    listedCompanies: 435,
    rankAfrica: 1,
    rankWorld: 'Top 20',

    // Horaires de trading
    tradingHours: {
      open: '09:00',
      close: '17:00',
      timezone: 'Africa/Johannesburg',
      utcOffset: '+02:00',
      dstObserved: false,
      lunchBreak: null, // Pas de pause déjeuner
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    // Mécanisme de cotation
    tradingMechanism: {
      type: 'continuous',
      auctions: ['opening', 'intraday', 'closing'],
      priceLimit: null, // Variable selon le titre
      settlementCycle: 'T+3',
      minLotSize: 1
    },

    // Devise
    currency: {
      code: 'ZAR',
      name: 'Rand sud-africain',
      symbol: 'R'
    },

    // Top secteurs
    topSectors: [
      { name: 'Ressources/Mines', companies: ['Anglo American', 'BHP', 'Glencore'] },
      { name: 'Services financiers', companies: ['Standard Bank', 'FirstRand', 'Absa', 'Nedbank', 'Capitec'] },
      { name: 'Biens de consommation', companies: ['Naspers', 'Richemont'] },
      { name: 'Télécommunications', companies: ['MTN Group', 'Vodacom'] },
      { name: 'Industrie', companies: ['Sasol'] }
    ],

    // Indices
    indices: [
      { code: 'J203', name: 'FTSE/JSE All Share', type: 'broad', primary: true },
      { code: 'J200', name: 'FTSE/JSE Top 40', type: 'blue-chip', primary: false },
      { code: 'J201', name: 'FTSE/JSE Mid Cap', type: 'mid-cap', primary: false },
      { code: 'J202', name: 'FTSE/JSE Small Cap', type: 'small-cap', primary: false },
      { code: 'J580', name: 'FTSE/JSE SA Financials', type: 'sector', primary: false }
    ],

    // Sources de données
    dataSources: {
      yahoo: {
        available: true,
        symbol: '^J203',
        suffix: '.JO',
        examples: ['MTN.JO', 'SOL.JO', 'NPN.JO'],
        delay: '15min'
      },
      bloomberg: {
        available: true,
        suffix: ':SJ',
        examples: ['JSE:SJ', 'MTN:SJ']
      },
      afxKwayisi: {
        available: true,
        path: '/jse',
        selector: 'J203'
      },
      officialApi: {
        available: true,
        type: 'commercial',
        provider: 'JSE Market Data',
        url: 'https://www.jse.co.za/market-data'
      }
    },

    // Format des symboles
    symbolFormat: {
      pattern: 'TICKER.JO',
      isinPrefix: 'ZA',
      examples: ['SOL.JO', 'MTN.JO', '^J203.JO']
    },

    active: true,
    priority: 1
  },

  // ---------------------------------------------------------------------------
  // 2. NGX - NIGERIAN EXCHANGE GROUP (Nigeria)
  // ---------------------------------------------------------------------------
  nse_ng: {
    id: 'nse_ng',
    code: 'NGX',
    name: 'NGX All Share',
    fullName: 'Nigerian Exchange Group',
    country: 'Nigeria',
    region: 'Afrique de l\'Ouest',
    city: 'Lagos',
    website: 'https://ngxgroup.com/',
    founded: 1961,

    regulator: {
      name: 'SEC Nigeria - Securities and Exchange Commission',
      website: 'https://sec.gov.ng/',
      subsidiary: 'NGX RegCo'
    },

    marketCap: {
      value: 95300000000000, // NGN
      currency: 'NGN',
      usdValue: 60000000000, // ~$60 milliards
      lastUpdate: '2024-12'
    },
    listedCompanies: 151,
    structure: {
      premiumBoard: 8,
      mainBoard: 133,
      growthBoard: 7,
      asem: 3
    },
    rankAfrica: 3,

    tradingHours: {
      open: '09:30',
      close: '14:30',
      proposedExtension: { open: '09:00', close: '17:00' },
      timezone: 'Africa/Lagos',
      utcOffset: '+01:00',
      dstObserved: false,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'continuous',
      priceLimit: '±10%',
      settlementCycle: 'T+2',
      minLotSize: 1
    },

    currency: {
      code: 'NGN',
      name: 'Naira nigérian',
      symbol: '₦'
    },

    topSectors: [
      { name: 'Ciment/Matériaux', companies: ['Dangote Cement'], marketShare: '16%' },
      { name: 'Télécommunications', companies: ['Airtel Africa'], marketShare: '15%' },
      { name: 'Pétrole & Gaz', companies: ['Seplat', 'Oando', 'Conoil'], performance2024: '+157%' },
      { name: 'Banques', companies: ['Zenith Bank', 'GTCO', 'Access', 'UBA'] },
      { name: 'Biens de consommation', companies: ['BUA Foods', 'Nestlé', 'Unilever'] }
    ],

    indices: [
      { code: 'ASI', name: 'NGX All-Share Index', type: 'broad', primary: true, baseValue: 100, baseDate: '1984-01' },
      { code: 'NGX30', name: 'NGX 30', type: 'blue-chip', primary: false },
      { code: 'NGX-BANK', name: 'NGX Banking', type: 'sector', primary: false },
      { code: 'NGX-OG', name: 'NGX Oil & Gas', type: 'sector', primary: false },
      { code: 'NGX-CG', name: 'NGX Consumer Goods', type: 'sector', primary: false },
      { code: 'NGX-IND', name: 'NGX Industrial', type: 'sector', primary: false }
    ],

    dataSources: {
      yahoo: {
        available: true,
        symbol: '^NGSE',
        coverage: 'limited',
        etf: 'NGE' // Global X MSCI Nigeria ETF
      },
      bloomberg: {
        available: true,
        suffix: ':NL',
        examples: ['NGXGROUP:NL']
      },
      afxKwayisi: {
        available: true,
        path: '/ngx',
        selector: 'ASI'
      },
      officialApi: {
        available: true,
        type: 'commercial',
        url: 'https://marketdataapiv3.ngxgroup.com/',
        format: ['JSON', 'XML'],
        contact: 'marketdata@ngxgroup.com'
      },
      rapidApi: {
        available: true,
        name: 'NGXEQTY API',
        url: 'https://rapidapi.com/foodstuffhub1/api/ngxeqty-api',
        dataRange: '2019-2022'
      }
    },

    symbolFormat: {
      pattern: 'TICKER',
      examples: ['DANGCEM', 'ZENITHBANK', 'MTNN', 'AIRTELAFRI'],
      isinPrefix: 'NG'
    },

    active: true,
    priority: 1
  },

  // ---------------------------------------------------------------------------
  // 3. EGX - EGYPTIAN EXCHANGE (Égypte)
  // ---------------------------------------------------------------------------
  egx: {
    id: 'egx',
    code: 'EGX',
    name: 'EGX 30',
    fullName: 'The Egyptian Exchange',
    country: 'Égypte',
    region: 'Afrique du Nord',
    city: 'Le Caire',
    website: 'https://www.egx.com.eg/',
    founded: 1883, // Alexandrie, fusionné avec Le Caire

    regulator: {
      name: 'FRA - Financial Regulatory Authority',
      website: 'https://www.fra.gov.eg/',
      depository: 'MCDR - Misr for Central Clearing, Depository and Registry'
    },

    marketCap: {
      value: 2290000000000, // EGP - Record décembre 2024
      currency: 'EGP',
      usdValue: 46000000000, // ~$46 milliards
      gdpRatio: '10.95%',
      lastUpdate: '2024-12-08'
    },
    listedCompanies: 250,
    newListings2024: 12,
    rankAfrica: 4,

    tradingHours: {
      open: '10:00',
      close: '14:15',
      timezone: 'Africa/Cairo',
      utcOffset: '+02:00',
      dstObserved: false,
      // ATTENTION: Jours de trading différents
      tradingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
    },

    tradingMechanism: {
      type: 'continuous',
      auctions: ['opening', 'closing'],
      priceLimit: 'variable',
      settlementCycle: 'T+2'
    },

    currency: {
      code: 'EGP',
      name: 'Livre égyptienne',
      symbol: 'E£'
    },

    taxation: {
      capitalGains: null, // Aucune taxe pour individus, entreprises, fonds
      dividends: 'applicable',
      transactionTax: '0.001%'
    },

    topSectors: [
      { name: 'Banques & Services financiers', companies: ['CIB', 'QNB Alahli'], count: 16 },
      { name: 'Immobilier & Construction', companies: [], marketShare: '13%', count: 8 },
      { name: 'Télécommunications', companies: ['Telecom Egypt'] },
      { name: 'Industrie', companies: ['Elsewedy Electric'] },
      { name: 'Énergie', companies: [] }
    ],

    indices: [
      { code: 'EGX30', name: 'EGX 30', type: 'blue-chip', primary: true, baseValue: 1000, baseDate: '1998-01' },
      { code: 'EGX70', name: 'EGX 70', type: 'mid-cap', primary: false },
      { code: 'EGX100', name: 'EGX 100', type: 'broad', primary: false },
      { code: 'EGX50EWI', name: 'EGX 50 EWI', type: 'equal-weight', primary: false }
    ],

    dataSources: {
      yahoo: {
        available: true,
        symbol: '^CASE30',
        suffix: '.CA',
        examples: ['COMI.CA', 'TMGH.CA']
      },
      bloomberg: {
        available: true,
        suffix: ':EY',
        indexSymbol: 'EGX30:IND'
      },
      tradingView: {
        available: true,
        prefix: 'EGX:',
        examples: ['EGX:EGX30']
      },
      afxKwayisi: {
        available: false
      },
      officialWebsite: {
        available: true,
        url: 'https://www.egx.com.eg/en/homepage.aspx'
      }
    },

    symbolFormat: {
      pattern: 'TICKER.CA',
      isinFormat: 'EGS + code',
      examples: ['COMI.CA', 'EGS38381C017.CA']
    },

    active: true,
    priority: 1
  },

  // ---------------------------------------------------------------------------
  // 4. BRVM - BOURSE RÉGIONALE DES VALEURS MOBILIÈRES (UEMOA)
  // ---------------------------------------------------------------------------
  brvm: {
    id: 'brvm',
    code: 'BRVM',
    name: 'BRVM Composite',
    fullName: 'Bourse Régionale des Valeurs Mobilières',
    country: 'UEMOA',
    region: 'Afrique de l\'Ouest',
    city: 'Abidjan, Côte d\'Ivoire',
    address: '18, Rue Joseph Anoma',
    phone: '+225 27 20 32 66 85',
    website: 'https://www.brvm.org/',
    founded: 1996, // Opérationnelle septembre 1998

    // Bourse régionale couvrant 8 pays
    memberCountries: [
      { code: 'BJ', name: 'Bénin' },
      { code: 'BF', name: 'Burkina Faso' },
      { code: 'CI', name: 'Côte d\'Ivoire' },
      { code: 'GW', name: 'Guinée-Bissau' },
      { code: 'ML', name: 'Mali' },
      { code: 'NE', name: 'Niger' },
      { code: 'SN', name: 'Sénégal' },
      { code: 'TG', name: 'Togo' }
    ],

    regulator: {
      name: 'AMF-UMOA (anciennement CREPMF)',
      fullName: 'Autorité des Marchés Financiers de l\'Union Monétaire Ouest Africaine',
      website: 'https://www.amf-umoa.org/',
      formerName: 'CREPMF (1996-2020)',
      depository: 'DC/BR - Dépositaire Central/Banque de Règlement'
    },

    marketCap: {
      value: 10000000000000, // XOF - Record 2024
      currency: 'XOF',
      usdValue: 17000000000, // ~$17 milliards
      gdpRatio: '15%', // PIB UEMOA
      targetGdpRatio: '30%', // Objectif marché émergent
      lastUpdate: '2024-12'
    },
    listedCompanies: 47,
    totalIntroductions: 22, // Depuis 1998
    rankAfrica: 5,
    msciStatus: 'Frontier Market', // Depuis novembre 2016

    tradingHours: {
      open: '09:45',
      close: '14:00',
      sessionGmt: { start: '08:30', end: '12:30' },
      fixingTime: '10:45', // GMT - Fixing unique
      timezone: 'Africa/Abidjan',
      utcOffset: '+00:00',
      dstObserved: false,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'fixing', // Fixing unique (pas de cotation continue)
      description: 'Marché centralisé dirigé par les ordres avec fixing unique',
      priceLimit: 'variable',
      settlementCycle: 'T+3'
    },

    currency: {
      code: 'XOF',
      name: 'Franc CFA BCEAO',
      symbol: 'FCFA',
      peggedTo: 'EUR',
      rate: 655.957 // XOF par EUR (fixe)
    },

    topSectors: [
      { name: 'Télécommunications', companies: ['Orange Côte d\'Ivoire'], capXof: 2634468000000 },
      { name: 'Banques', companies: ['Coris Bank International', 'SGBCI', 'BOA'], capXof: 316320000000 },
      { name: 'Distribution', companies: ['CFAO', 'Bernabé'] },
      { name: 'Industrie', companies: ['SOLIBRA', 'SMB'] },
      { name: 'Loterie', companies: ['LNB Bénin'] } // Nouvelle intro 2024
    ],

    indices: [
      { code: 'BRVMC', name: 'BRVM Composite', type: 'broad', primary: true },
      { code: 'BRVM10', name: 'BRVM 10', type: 'blue-chip', primary: false, description: '10 sociétés les plus actives' },
      { code: 'BRVM-PRES', name: 'BRVM Prestige', type: 'premium', primary: false },
      // Nouveaux indices sectoriels (janvier 2025)
      { code: 'BRVM-AGRI', name: 'BRVM Agriculture', type: 'sector', primary: false, since: '2025-01-02' },
      { code: 'BRVM-DIST', name: 'BRVM Distribution', type: 'sector', primary: false, since: '2025-01-02' },
      { code: 'BRVM-FIN', name: 'BRVM Finances', type: 'sector', primary: false, since: '2025-01-02' },
      { code: 'BRVM-IND', name: 'BRVM Industrie', type: 'sector', primary: false, since: '2025-01-02' },
      { code: 'BRVM-SP', name: 'BRVM Services Publics', type: 'sector', primary: false, since: '2025-01-02' },
      { code: 'BRVM-TRANS', name: 'BRVM Transport', type: 'sector', primary: false, since: '2025-01-02' },
      { code: 'BRVM-AUTRES', name: 'BRVM Autres', type: 'sector', primary: false, since: '2025-01-02' }
    ],

    dataSources: {
      yahoo: {
        available: false,
        note: 'BRVM non couvert par Yahoo Finance'
      },
      afxKwayisi: {
        available: true,
        path: '/brvm',
        selector: 'COMP'
      },
      officialWebsite: {
        available: true,
        url: 'https://www.brvm.org/',
        dataUrl: 'https://bfin.brvm.org/'
      },
      officialApi: {
        available: true,
        type: 'commercial',
        protocols: ['FIX', 'Web Services', 'Database'],
        url: 'https://www.brvm.org/fr/flux-en-temps-reel'
      },
      refinitiv: {
        available: true,
        since: 2018,
        note: 'Partenariat Thomson Reuters/Refinitiv'
      },
      rPackage: {
        available: true,
        name: 'BRVM',
        github: 'https://github.com/Koffi-Fredysessie/BRVM',
        functions: ['BRVM_get', 'BRVM_get1', 'BRVM_ticker_desc', 'BRVM_company_cap', 'BRVM_index_stock']
      },
      investingCom: {
        available: true,
        url: 'https://fr.investing.com/indices/brvm-composite'
      }
    },

    symbolFormat: {
      pattern: 'TICKER (4-5 chars)',
      examples: ['BICC', 'SNTS', 'SGBC', 'ONTBF', 'SIVC'],
      note: 'Pas de suffixe Yahoo Finance disponible'
    },

    active: true,
    priority: 1
  },

  // ---------------------------------------------------------------------------
  // 5. NSE - NAIROBI SECURITIES EXCHANGE (Kenya)
  // ---------------------------------------------------------------------------
  nse_ke: {
    id: 'nse_ke',
    code: 'NSE',
    name: 'NSE 20',
    fullName: 'Nairobi Securities Exchange PLC',
    country: 'Kenya',
    region: 'Afrique de l\'Est',
    city: 'Nairobi',
    website: 'https://www.nse.co.ke/',
    founded: 1954,
    selfListed: 2014, // Auto-cotation depuis 2014

    regulator: {
      name: 'CMA - Capital Markets Authority of Kenya',
      website: 'https://www.cma.or.ke/',
      established: 1989
    },

    marketCap: {
      value: 2417000000000, // KES - Juin 2025
      currency: 'KES',
      usdValue: 18500000000, // ~$18.5 milliards
      lastUpdate: '2025-06'
    },
    listedCompanies: 61,
    rankAfrica: 6,
    rankEastAfrica: 1,

    tradingHours: {
      open: '09:00',
      close: '15:00',
      officeHours: { open: '08:00', close: '17:00' },
      timezone: 'Africa/Nairobi',
      utcOffset: '+03:00',
      dstObserved: false,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'continuous',
      system: 'ATS - Automated Trading System',
      priceLimit: 'variable',
      settlementCycle: 'T+3'
    },

    currency: {
      code: 'KES',
      name: 'Shilling kényan',
      symbol: 'KSh'
    },

    marketSegments: [
      { name: 'Main Investment Market Segment (MIMS)', since: 2001 },
      { name: 'Alternative Investment Market Segment (AIMS)', since: 2001 },
      { name: 'Fixed Income Securities Market Segment (FISMS)', since: 2001 },
      { name: 'Growth Enterprise Market Segment (GEMS)', since: 2013 }
    ],

    topSectors: [
      { name: 'Télécommunications', companies: ['Safaricom'], note: 'M-Pesa leader' },
      { name: 'Services financiers', companies: ['Equity Group Holdings', 'KCB Group', 'Co-operative Bank', 'NCBA'] },
      { name: 'Boissons', companies: ['East African Breweries Limited (EABL)'] },
      { name: 'Ciment/Construction', companies: ['Bamburi Cement'] },
      { name: 'Banques', companies: ['Equity', 'KCB', 'NCBA'] }
    ],

    indices: [
      { code: 'NASI', name: 'NSE All Share Index', type: 'broad', primary: true, baseValue: 100, baseDate: '2008-01' },
      { code: 'NSE20', name: 'NSE 20 Share Index', type: 'price-weighted', primary: false, description: '20 meilleures performances' },
      { code: 'NSE25', name: 'NSE 25 Share Index', type: 'cap-weighted', primary: false },
      { code: 'FTSE-NSE15', name: 'FTSE NSE Kenya 15', type: 'liquidity', primary: false },
      { code: 'FTSE-NSE25', name: 'FTSE NSE Kenya 25', type: 'liquidity', primary: false }
    ],

    dataSources: {
      yahoo: {
        available: false,
        note: 'NSE Kenya non couvert par Yahoo Finance'
      },
      bloomberg: {
        available: true,
        indexSymbol: 'KNSMIDX:IND'
      },
      afxKwayisi: {
        available: true,
        path: '/nse',
        selector: 'NSE20'
      },
      myStocks: {
        available: true,
        url: 'https://live.mystocks.co.ke/',
        symbols: ['^N20I', '^NASI']
      },
      officialApi: {
        available: true,
        type: 'commercial',
        url: 'https://www.nse.co.ke/dataservices/'
      },
      investingCom: {
        available: true,
        url: 'https://www.investing.com/indices/kenya-nse-20'
      }
    },

    symbolFormat: {
      pattern: 'TICKER',
      examples: ['SCOM', 'EQTY', 'KCB', 'EABL'],
      myStocksIndex: '^N20I',
      isinPrefix: 'KE'
    },

    active: true,
    priority: 1
  },

  // ---------------------------------------------------------------------------
  // 6. CSE/MASI - CASABLANCA STOCK EXCHANGE (Maroc)
  // ---------------------------------------------------------------------------
  masi: {
    id: 'masi',
    code: 'CSE',
    name: 'MASI',
    fullName: 'Bourse de Casablanca / Casablanca Stock Exchange',
    indexName: 'Moroccan All Shares Index',
    country: 'Maroc',
    region: 'Afrique du Nord',
    city: 'Casablanca',
    website: 'https://www.casablanca-bourse.com/',
    founded: 1929,

    regulator: {
      name: 'AMMC - Autorité Marocaine du Marché des Capitaux',
      website: 'https://www.ammc.ma/',
      depository: 'Maroclear (depuis 1997)'
    },

    marketCap: {
      value: 1043000000000, // MAD
      currency: 'MAD',
      usdValue: 116000000000, // ~$116 milliards
      growth2024: '+20%',
      lastUpdate: '2025-08'
    },
    listedCompanies: 78,
    brokerageFirms: 17,
    rankAfrica: 2,
    rankMENA: 'Top performer',

    tradingHours: {
      open: '09:30',
      close: '15:40',
      timezone: 'Africa/Casablanca',
      utcOffset: '+01:00', // WET/WEST
      dstObserved: true,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'hybrid', // Continu + Fixing
      markets: ['Central Market', 'Block Trade Market'],
      continuousLimit: '±10%',
      auctionLimit: '±6%',
      dynamicLimit: '3%', // Suspension 5 min si mouvement de 3%
      icebergOrders: { available: true, minVisible: 500 },
      closingPrice: 'Matched price in closing auction or last traded price',
      settlementCycle: 'T+3'
    },

    currency: {
      code: 'MAD',
      name: 'Dirham marocain',
      symbol: 'DH'
    },

    investorComposition: {
      retail: '<1%',
      foreign: '~30%',
      institutional: '~69%'
    },

    upcomingEvents: [
      { name: 'CAN 2025', description: 'Coupe d\'Afrique des Nations' },
      { name: 'World Cup 2030', description: 'Coupe du Monde FIFA (co-organisation)' }
    ],

    topSectors: [
      { name: 'Banques', companies: ['Attijariwafa Bank', 'BCP', 'Bank of Africa'] },
      { name: 'Télécommunications', companies: ['Maroc Telecom (IAM)'] },
      { name: 'Immobilier', companies: ['Addoha', 'Alliances'] },
      { name: 'Ciment', companies: ['LafargeHolcim Maroc', 'Ciments du Maroc'] },
      { name: 'Énergie', companies: ['TAQA Morocco'] }
    ],

    indices: [
      { code: 'MASI', name: 'MASI - Moroccan All Shares Index', type: 'broad', primary: true, baseValue: 1000, baseDate: '1991-12-31' },
      { code: 'MASI20', name: 'MASI 20', type: 'blue-chip', primary: false },
      { code: 'MASI-ESG', name: 'MASI ESG', type: 'esg', primary: false },
      { code: 'MASI-MSC', name: 'MASI Mid & Small Cap', type: 'mid-small', primary: false },
      // Indices sectoriels
      { code: 'MASI-BANK', name: 'MASI Banks', type: 'sector', primary: false },
      { code: 'MASI-INS', name: 'MASI Insurance', type: 'sector', primary: false },
      { code: 'MASI-CONST', name: 'MASI Construction', type: 'sector', primary: false },
      { code: 'MASI-FOOD', name: 'MASI Food Producers', type: 'sector', primary: false },
      { code: 'MASI-BEV', name: 'MASI Beverages', type: 'sector', primary: false }
    ],

    derivatives: {
      available: true,
      since: '2025-05',
      products: ['MASI 20 Futures']
    },

    dataSources: {
      yahoo: {
        available: true,
        symbol: '^MASI',
        coverage: 'limited',
        note: 'Couverture actions individuelles limitée'
      },
      bloomberg: {
        available: true,
        suffix: ':MC'
      },
      tradingView: {
        available: true,
        prefix: 'CSEMA:',
        examples: ['CSEMA:MASI']
      },
      afxKwayisi: {
        available: false
      },
      officialWebsite: {
        available: true,
        url: 'https://www.casablanca-bourse.com/en',
        indexHistory: 'https://www.casablanca-bourse.com/en/index-history'
      },
      investingCom: {
        available: true,
        url: 'https://www.investing.com/indices/masi'
      },
      ceicData: {
        available: true,
        dataRange: 'Depuis 1993',
        type: 'commercial'
      }
    },

    symbolFormat: {
      pattern: 'TICKER',
      examples: ['IAM', 'ATW', 'BCP', 'SID'],
      tradingViewPrefix: 'CSEMA:',
      bloombergSuffix: ':MC'
    },

    active: true,
    priority: 1
  },

  // ===========================================================================
  // NOUVELLES BOURSES - PHASE D'EXPANSION
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // 7. GSE - GHANA STOCK EXCHANGE (Ghana)
  // ---------------------------------------------------------------------------
  gse: {
    id: 'gse',
    code: 'GSE',
    name: 'GSE Composite',
    fullName: 'Ghana Stock Exchange',
    country: 'Ghana',
    region: 'Afrique de l\'Ouest',
    city: 'Accra',
    website: 'https://gse.com.gh',
    founded: 1989,

    regulator: {
      name: 'SEC Ghana - Securities and Exchange Commission',
      website: 'https://sec.gov.gh/'
    },

    marketCap: {
      value: 5700000000, // USD
      currency: 'GHS',
      usdValue: 5700000000,
      lastUpdate: '2024-12'
    },
    listedCompanies: 42,
    rankAfrica: 7,
    priority: 2, // Haute priorité

    tradingHours: {
      open: '10:00',
      close: '15:00',
      preMarket: '09:30',
      timezone: 'Africa/Accra',
      utcOffset: '+00:00',
      dstObserved: false,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'continuous',
      settlementCycle: 'T+3'
    },

    currency: {
      code: 'GHS',
      name: 'Cedi ghanéen',
      symbol: 'GH₵'
    },

    topSectors: [
      { name: 'Télécommunications', companies: ['MTN Ghana'] },
      { name: 'Banques', companies: ['GCB Bank', 'Ecobank Ghana'] },
      { name: 'Énergie', companies: ['Ghana Oil Company (GOIL)'] },
      { name: 'Consommation', companies: ['Unilever Ghana'] }
    ],

    indices: [
      { code: 'GSE-CI', name: 'GSE Composite Index', type: 'broad', primary: true },
      { code: 'GSE-FSI', name: 'GSE Financial Stocks Index', type: 'sector', primary: false }
    ],

    dataSources: {
      afxKwayisi: {
        available: true,
        path: '/gse',
        selector: 'GSE-CI'
      },
      afxApi: {
        available: true,
        type: 'rest',
        baseUrl: 'https://dev.kwayisi.org/apis/gse',
        endpoints: {
          live: '/live',
          stock: '/live/{symbol}',
          equities: '/equities/{symbol}'
        }
      },
      africanMarkets: {
        available: true,
        url: 'https://www.african-markets.com/en/stock-markets/gse'
      },
      yahoo: {
        available: false
      }
    },

    symbolFormat: {
      pattern: 'TICKER',
      examples: ['MTNGH', 'GCB', 'GOIL', 'EGH', 'UNIL']
    },

    active: true
  },

  // ---------------------------------------------------------------------------
  // 8. BSE - BOTSWANA STOCK EXCHANGE (Botswana)
  // ---------------------------------------------------------------------------
  bse: {
    id: 'bse',
    code: 'BSE',
    name: 'BSE DCI',
    fullName: 'Botswana Stock Exchange',
    country: 'Botswana',
    region: 'Afrique Australe',
    city: 'Gaborone',
    website: 'https://www.bse.co.bw',
    founded: 1989,

    regulator: {
      name: 'NBFIRA - Non-Bank Financial Institutions Regulatory Authority',
      website: 'https://www.nbfira.org.bw/'
    },

    marketCap: {
      value: 4500000000, // USD
      currency: 'BWP',
      usdValue: 4500000000,
      lastUpdate: '2024-12'
    },
    listedCompanies: 36,
    rankAfrica: 8,
    priority: 2,

    tradingHours: {
      open: '10:00',
      close: '14:00',
      timezone: 'Africa/Gaborone',
      utcOffset: '+02:00',
      dstObserved: false,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'continuous',
      settlementCycle: 'T+3'
    },

    currency: {
      code: 'BWP',
      name: 'Pula botswanais',
      symbol: 'P'
    },

    topSectors: [
      { name: 'Banques', companies: ['Letshego Holdings', 'FNB Botswana', 'ABSA Botswana'] },
      { name: 'Consommation', companies: ['Sechaba Brewery'] },
      { name: 'Distribution', companies: ['Choppies Enterprises'] }
    ],

    indices: [
      { code: 'BSE-DCI', name: 'Domestic Company Index', type: 'domestic', primary: true },
      { code: 'BSE-FCI', name: 'Foreign Company Index', type: 'foreign', primary: false },
      { code: 'BSE-ACI', name: 'All Company Index', type: 'broad', primary: false }
    ],

    dataSources: {
      afxKwayisi: {
        available: true,
        path: '/bse',
        selector: 'DCI'
      },
      africanMarkets: {
        available: true,
        url: 'https://www.african-markets.com/en/stock-markets/bse'
      },
      investingCom: {
        available: true,
        symbol: 'DCIBT'
      },
      yahoo: {
        available: false
      }
    },

    symbolFormat: {
      pattern: 'TICKER',
      examples: ['LETSHEGO', 'FNBB', 'SECHABA', 'CHOPPIES', 'ABSA']
    },

    active: true
  },

  // ---------------------------------------------------------------------------
  // 9. LUSE - LUSAKA STOCK EXCHANGE (Zambie)
  // ---------------------------------------------------------------------------
  luse: {
    id: 'luse',
    code: 'LuSE',
    name: 'LASI',
    fullName: 'Lusaka Securities Exchange',
    country: 'Zambie',
    region: 'Afrique Australe',
    city: 'Lusaka',
    website: 'https://www.luse.co.zm',
    founded: 1993,

    regulator: {
      name: 'SEC Zambia - Securities and Exchange Commission',
      website: 'https://www.seczambia.org.zm/'
    },

    marketCap: {
      value: 9800000000, // USD
      currency: 'ZMW',
      usdValue: 9800000000,
      lastUpdate: '2024-12'
    },
    listedCompanies: 23,
    rankAfrica: 9,
    priority: 2,

    tradingHours: {
      open: '10:00',
      close: '14:00',
      timezone: 'Africa/Lusaka',
      utcOffset: '+02:00',
      dstObserved: false,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'continuous',
      settlementCycle: 'T+3'
    },

    currency: {
      code: 'ZMW',
      name: 'Kwacha zambien',
      symbol: 'ZK'
    },

    topSectors: [
      { name: 'Télécommunications', companies: ['Airtel Networks Zambia'] },
      { name: 'Énergie', companies: ['Copperbelt Energy Corporation'] },
      { name: 'Consommation', companies: ['BAT Zambia', 'Zambia Sugar'] },
      { name: 'Banques', companies: ['Zanaco'] }
    ],

    indices: [
      { code: 'LASI', name: 'LuSE All Share Index', type: 'broad', primary: true }
    ],

    dataSources: {
      afxKwayisi: {
        available: true,
        path: '/luse',
        selector: 'LASI'
      },
      africanMarkets: {
        available: true,
        url: 'https://www.african-markets.com/en/stock-markets/luse'
      },
      officialWebsite: {
        available: true,
        url: 'https://www.luse.co.zm/trading/market-data/'
      },
      yahoo: {
        available: false
      }
    },

    symbolFormat: {
      pattern: 'TICKER.LUSE',
      examples: ['ATEL.LUSE', 'CECZ.LUSE', 'BATZ.LUSE', 'ZANACO.LUSE']
    },

    active: true
  },

  // ---------------------------------------------------------------------------
  // 10. ZSE - ZIMBABWE STOCK EXCHANGE (Zimbabwe)
  // ---------------------------------------------------------------------------
  zse: {
    id: 'zse',
    code: 'ZSE',
    name: 'ZSE All Share',
    fullName: 'Zimbabwe Stock Exchange',
    country: 'Zimbabwe',
    region: 'Afrique Australe',
    city: 'Harare',
    website: 'https://www.zse.co.zw',
    founded: 1946,

    regulator: {
      name: 'SECZ - Securities and Exchange Commission of Zimbabwe',
      website: 'https://www.seczim.co.zw/'
    },

    marketCap: {
      value: 'variable', // En raison de l'inflation
      currency: 'ZiG',
      note: 'Nouvelle devise ZiG (Zimbabwe Gold) en 2024',
      lastUpdate: '2024-12'
    },
    listedCompanies: 63,
    rankAfrica: 10,
    priority: 2,

    tradingHours: {
      open: '09:30',
      close: '13:00',
      preOpen: '09:00',
      postClose: '14:30',
      timezone: 'Africa/Harare',
      utcOffset: '+02:00',
      dstObserved: false,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'continuous',
      settlementCycle: 'T+3'
    },

    currency: {
      code: 'ZiG',
      name: 'Zimbabwe Gold',
      symbol: 'ZiG',
      note: 'Anciennement ZWL - Nouveau système monétaire 2024'
    },

    topSectors: [
      { name: 'Consommation', companies: ['Delta Corporation', 'Innscor Africa'] },
      { name: 'Télécommunications', companies: ['Econet Wireless'] },
      { name: 'Banques', companies: ['CBZ Holdings'] },
      { name: 'Agriculture', companies: ['Seed Co Limited'] }
    ],

    indices: [
      { code: 'ZSE-ASI', name: 'ZSE All Share Index', type: 'broad', primary: true },
      { code: 'ZSE-T10', name: 'ZSE Top 10 Index', type: 'blue-chip', primary: false },
      { code: 'NEWINDZI', name: 'ZSE Industrial Index', type: 'sector', primary: false }
    ],

    dataSources: {
      afxKwayisi: {
        available: true,
        path: '/zse',
        selector: 'ZSE-ASI'
      },
      africanMarkets: {
        available: true,
        url: 'https://www.african-markets.com/en/stock-markets/zse'
      },
      investingCom: {
        available: true,
        symbol: 'NEWINDZI'
      },
      yahoo: {
        available: false
      }
    },

    symbolFormat: {
      pattern: 'TICKER.XZIM',
      examples: ['DELTA.XZIM', 'ECONET.XZIM', 'INNSCOR.XZIM', 'CBZ.XZIM']
    },

    active: true
  },

  // ---------------------------------------------------------------------------
  // 11. SEM - STOCK EXCHANGE OF MAURITIUS (Maurice)
  // ---------------------------------------------------------------------------
  sem: {
    id: 'sem',
    code: 'SEM',
    name: 'SEMDEX',
    fullName: 'Stock Exchange of Mauritius',
    country: 'Maurice',
    region: 'Afrique Australe',
    city: 'Port Louis',
    website: 'https://www.stockexchangeofmauritius.com',
    founded: 1989,

    regulator: {
      name: 'FSC - Financial Services Commission',
      website: 'https://www.fscmauritius.org/'
    },

    marketCap: {
      value: 6800000000, // USD
      currency: 'MUR',
      usdValue: 6800000000,
      lastUpdate: '2024-12'
    },
    listedCompanies: 88, // 40 Official + 48 DEM
    rankAfrica: 11,
    priority: 2,

    tradingHours: {
      open: '09:00',
      close: '13:30',
      timezone: 'Indian/Mauritius',
      utcOffset: '+04:00',
      dstObserved: false,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'continuous',
      markets: ['Official Market', 'Development & Enterprise Market (DEM)'],
      settlementCycle: 'T+3'
    },

    currency: {
      code: 'MUR',
      name: 'Roupie mauricienne',
      symbol: '₨'
    },

    topSectors: [
      { name: 'Banques', companies: ['MCB Group', 'SBM Holdings'] },
      { name: 'Conglomérat', companies: ['Ciel Limited', 'IBL Ltd'] },
      { name: 'Tourisme', companies: ['New Mauritius Hotels'] }
    ],

    indices: [
      { code: 'SEMDEX', name: 'SEMDEX', type: 'broad', primary: true },
      { code: 'SEM-10', name: 'SEM-10', type: 'blue-chip', primary: false },
      { code: 'SEMTRI', name: 'SEM Total Return Index', type: 'total-return', primary: false },
      { code: 'SEM-ASI', name: 'SEM All Share Index', type: 'broad', primary: false }
    ],

    dataSources: {
      officialWebsite: {
        available: true,
        url: 'https://www.stockexchangeofmauritius.com/products-market-data/indices'
      },
      africanMarkets: {
        available: true,
        url: 'https://www.african-markets.com/en/stock-markets/sem'
      },
      tradingEconomics: {
        available: true,
        symbol: 'SEMDEX'
      },
      yahoo: {
        available: false
      }
    },

    symbolFormat: {
      pattern: 'TICKER',
      examples: ['MCB', 'CIEL', 'SBM', 'IBL', 'NMH']
    },

    active: true
  },

  // ---------------------------------------------------------------------------
  // 12. DSE - DAR ES SALAAM STOCK EXCHANGE (Tanzanie)
  // ---------------------------------------------------------------------------
  dse: {
    id: 'dse',
    code: 'DSE',
    name: 'DSE All Share',
    fullName: 'Dar es Salaam Stock Exchange',
    country: 'Tanzanie',
    region: 'Afrique de l\'Est',
    city: 'Dar es Salaam',
    website: 'https://www.dse.co.tz',
    founded: 1996,

    regulator: {
      name: 'CMSA - Capital Markets and Securities Authority',
      website: 'https://www.cmsa.go.tz/'
    },

    marketCap: {
      value: 6300000000, // USD
      currency: 'TZS',
      usdValue: 6300000000,
      lastUpdate: '2024-12'
    },
    listedCompanies: 28, // 22 locales + 6 cross-listées
    rankAfrica: 12,
    priority: 3,

    tradingHours: {
      open: '10:00',
      close: '14:00',
      timezone: 'Africa/Dar_es_Salaam',
      utcOffset: '+03:00',
      dstObserved: false,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'continuous',
      settlementCycle: 'T+3'
    },

    currency: {
      code: 'TZS',
      name: 'Shilling tanzanien',
      symbol: 'TSh'
    },

    topSectors: [
      { name: 'Banques', companies: ['CRDB Bank', 'NMB Bank'] },
      { name: 'Consommation', companies: ['Tanzania Breweries', 'TCC'] },
      { name: 'Services', companies: ['DSE'] }
    ],

    indices: [
      { code: 'DSE-ASI', name: 'DSE All Share Index', type: 'broad', primary: true },
      { code: 'TSI', name: 'Tanzania Share Index', type: 'domestic', primary: false }
    ],

    dataSources: {
      africanMarkets: {
        available: true,
        url: 'https://www.african-markets.com/en/stock-markets/dse'
      },
      tanzaniaInvest: {
        available: true,
        url: 'https://www.tanzaniainvest.com/dse'
      },
      afxKwayisi: {
        available: false, // Limité
        note: 'Couverture partielle'
      },
      yahoo: {
        available: false
      }
    },

    symbolFormat: {
      pattern: 'TICKER.DSE',
      examples: ['CRDB.DSE', 'NMB.DSE', 'TBL.DSE', 'TCC.DSE']
    },

    active: true
  },

  // ---------------------------------------------------------------------------
  // 13. USE - UGANDA SECURITIES EXCHANGE (Ouganda)
  // ---------------------------------------------------------------------------
  use: {
    id: 'use',
    code: 'USE',
    name: 'USE All Share',
    fullName: 'Uganda Securities Exchange',
    country: 'Ouganda',
    region: 'Afrique de l\'Est',
    city: 'Kampala',
    website: 'https://www.use.or.ug',
    founded: 1997,

    regulator: {
      name: 'CMA Uganda - Capital Markets Authority',
      website: 'https://www.cmauganda.co.ug/'
    },

    marketCap: {
      value: 7500000000, // USD
      currency: 'UGX',
      usdValue: 7500000000,
      lastUpdate: '2024-12'
    },
    listedCompanies: 17, // 8 locales + 9 cross-listées Kenya
    rankAfrica: 13,
    priority: 3,

    tradingHours: {
      open: '09:30',
      close: '15:00',
      timezone: 'Africa/Kampala',
      utcOffset: '+03:00',
      dstObserved: false,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'continuous',
      settlementCycle: 'T+3'
    },

    currency: {
      code: 'UGX',
      name: 'Shilling ougandais',
      symbol: 'USh'
    },

    topSectors: [
      { name: 'Télécommunications', companies: ['MTN Uganda'] },
      { name: 'Banques', companies: ['Stanbic Bank Uganda', 'DFCU Group'] },
      { name: 'Énergie', companies: ['Umeme Limited'] },
      { name: 'Consommation', companies: ['BAT Uganda'] }
    ],

    indices: [
      { code: 'ALSI', name: 'USE All Share Index', type: 'broad', primary: true },
      { code: 'LCI', name: 'USE Local Company Index', type: 'domestic', primary: false }
    ],

    dataSources: {
      afxKwayisi: {
        available: true,
        path: '/use',
        selector: 'ALSI'
      },
      africanMarkets: {
        available: true,
        url: 'https://www.african-markets.com/en/stock-markets/use'
      },
      tradingEconomics: {
        available: true,
        symbol: 'ALSIUG'
      },
      yahoo: {
        available: false
      }
    },

    symbolFormat: {
      pattern: 'TICKER',
      examples: ['MTN', 'SBIC', 'UMEME', 'BATU', 'DFCU']
    },

    active: true
  },

  // ---------------------------------------------------------------------------
  // 14. RSE - RWANDA STOCK EXCHANGE (Rwanda)
  // ---------------------------------------------------------------------------
  rse: {
    id: 'rse',
    code: 'RSE',
    name: 'RSE All Share',
    fullName: 'Rwanda Stock Exchange',
    country: 'Rwanda',
    region: 'Afrique de l\'Est',
    city: 'Kigali',
    website: 'https://rse.rw',
    founded: 2005,

    regulator: {
      name: 'CMA Rwanda - Capital Market Authority',
      website: 'https://www.cma.rw/'
    },

    marketCap: {
      value: 4800000000, // RWF
      currency: 'RWF',
      usdValue: 4000000, // ~$4 millions
      lastUpdate: '2024-12'
    },
    listedCompanies: 10,
    rankAfrica: 14,
    priority: 3,

    tradingHours: {
      open: '09:00',
      close: '12:00',
      timezone: 'Africa/Kigali',
      utcOffset: '+02:00',
      dstObserved: false,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'continuous',
      settlementCycle: 'T+3'
    },

    currency: {
      code: 'RWF',
      name: 'Franc rwandais',
      symbol: 'FRw'
    },

    topSectors: [
      { name: 'Banques', companies: ['Bank of Kigali', 'I&M Bank Rwanda'] },
      { name: 'Consommation', companies: ['Bralirwa', 'Cimerwa'] },
      { name: 'Télécommunications', companies: ['MTN Rwanda'] }
    ],

    indices: [
      { code: 'RSE-ASI', name: 'RSE All Share Index', type: 'broad', primary: true },
      { code: 'RSE-RSI', name: 'RSE Rwanda Share Index', type: 'domestic', primary: false }
    ],

    dataSources: {
      africanMarkets: {
        available: true,
        url: 'https://www.african-markets.com/en/stock-markets/rse'
      },
      officialWebsite: {
        available: true,
        url: 'https://rse.rw/market-statistics/daily-market-prices/'
      },
      yahoo: {
        available: false
      }
    },

    symbolFormat: {
      pattern: 'TICKER.RSE',
      examples: ['BOK.RSE', 'BLR.RSE', 'CMR.RSE', 'MTNR.RSE']
    },

    active: true
  },

  // ---------------------------------------------------------------------------
  // 15. BVMT - BOURSE DE TUNIS (Tunisie)
  // ---------------------------------------------------------------------------
  bvmt: {
    id: 'bvmt',
    code: 'BVMT',
    name: 'TUNINDEX',
    fullName: 'Bourse des Valeurs Mobilières de Tunis',
    country: 'Tunisie',
    region: 'Afrique du Nord',
    city: 'Tunis',
    website: 'https://www.bvmt.com.tn',
    founded: 1969,

    regulator: {
      name: 'CMF - Conseil du Marché Financier',
      website: 'https://www.cmf.tn/'
    },

    marketCap: {
      value: 8000000000, // USD
      currency: 'TND',
      usdValue: 8000000000,
      lastUpdate: '2024-12'
    },
    listedCompanies: 74,
    rankAfrica: 15,
    priority: 3,

    tradingHours: {
      open: '09:00',
      close: '14:00',
      timezone: 'Africa/Tunis',
      utcOffset: '+01:00',
      dstObserved: true,
      tradingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },

    tradingMechanism: {
      type: 'continuous',
      settlementCycle: 'T+3'
    },

    currency: {
      code: 'TND',
      name: 'Dinar tunisien',
      symbol: 'د.ت'
    },

    topSectors: [
      { name: 'Banques', companies: ['BIAT', 'BH Bank', 'Attijari Bank', 'Amen Bank'] },
      { name: 'Consommation', companies: ['SFBT'] }
    ],

    indices: [
      { code: 'TUNINDEX', name: 'TUNINDEX', type: 'broad', primary: true },
      { code: 'TUNINDEX20', name: 'TUNINDEX 20', type: 'blue-chip', primary: false }
    ],

    dataSources: {
      africanMarkets: {
        available: true,
        url: 'https://www.african-markets.com/en/stock-markets/bvmt'
      },
      ilboursa: {
        available: true,
        url: 'https://www.ilboursa.com/marches/aaz'
      },
      tradingEconomics: {
        available: true,
        symbol: 'TUNINDEX'
      },
      yahoo: {
        available: false
      }
    },

    symbolFormat: {
      pattern: 'TICKER',
      examples: ['BIAT', 'BH', 'SFBT', 'TJARI', 'AB']
    },

    active: true
  },

  // ---------------------------------------------------------------------------
  // BOURSES PRIORITÉ BASSE (Données limitées)
  // ---------------------------------------------------------------------------

  // 16. NSX - NAMIBIAN STOCK EXCHANGE (Namibie)
  nsx: {
    id: 'nsx',
    code: 'NSX',
    name: 'NSX Overall',
    fullName: 'Namibia Securities Exchange',
    country: 'Namibie',
    region: 'Afrique Australe',
    city: 'Windhoek',
    website: 'https://www.nsx.com.na',
    founded: 1992,
    marketCap: { value: 1600000000, currency: 'NAD', usdValue: 1600000000 },
    listedCompanies: 40,
    priority: 4,
    tradingHours: { open: '09:00', close: '17:00', timezone: 'Africa/Windhoek', utcOffset: '+02:00' },
    currency: { code: 'NAD', name: 'Dollar namibien', symbol: 'N$' },
    indices: [{ code: 'NSX-OI', name: 'NSX Overall Index', type: 'broad', primary: true }],
    dataSources: {
      africanMarkets: { available: true, url: 'https://www.african-markets.com/en/stock-markets/nsx' },
      yahoo: { available: false }
    },
    active: true
  },

  // 17. MSE - MALAWI STOCK EXCHANGE (Malawi)
  mse: {
    id: 'mse',
    code: 'MSE',
    name: 'MSE All Share',
    fullName: 'Malawi Stock Exchange',
    country: 'Malawi',
    region: 'Afrique Australe',
    city: 'Blantyre',
    website: 'https://www.mse.co.mw',
    founded: 1996,
    listedCompanies: 16,
    priority: 4,
    tradingHours: { open: '10:00', close: '12:00', timezone: 'Africa/Blantyre', utcOffset: '+02:00' },
    currency: { code: 'MWK', name: 'Kwacha malawite', symbol: 'MK' },
    indices: [{ code: 'MSE-ASI', name: 'MSE All Share Index', type: 'broad', primary: true }],
    dataSources: {
      africanMarkets: { available: true, url: 'https://www.african-markets.com/en/stock-markets/mse' },
      yahoo: { available: false }
    },
    active: true
  },

  // 18. ESX - ESWATINI STOCK EXCHANGE (Eswatini)
  esx: {
    id: 'esx',
    code: 'ESX',
    name: 'ESX All Share',
    fullName: 'Eswatini Stock Exchange',
    country: 'Eswatini',
    region: 'Afrique Australe',
    city: 'Mbabane',
    website: 'https://www.ssx.org.sz',
    listedCompanies: 10,
    priority: 5,
    currency: { code: 'SZL', name: 'Lilangeni', symbol: 'L' },
    indices: [{ code: 'ESX-ASI', name: 'ESX All Share Index', type: 'broad', primary: true }],
    dataSources: { limited: true },
    active: false // Données très limitées
  },

  // 19. BVMAC - BOURSE DES VALEURS MOBILIÈRES D'AFRIQUE CENTRALE (CEMAC)
  bvmac: {
    id: 'bvmac',
    code: 'BVMAC',
    name: 'BVMAC Composite',
    fullName: 'Bourse des Valeurs Mobilières d\'Afrique Centrale',
    country: 'CEMAC',
    region: 'Afrique Centrale',
    city: 'Libreville, Gabon',
    website: 'https://www.bvmac.com',
    memberCountries: ['Cameroun', 'Congo', 'Gabon', 'Guinée Équatoriale', 'RCA', 'Tchad'],
    priority: 5,
    currency: { code: 'XAF', name: 'Franc CFA BEAC', symbol: 'FCFA' },
    indices: [{ code: 'BVMAC-C', name: 'BVMAC Composite', type: 'broad', primary: true }],
    dataSources: { limited: true },
    active: false
  },

  // 20. BODIVA - BOLSA DE DÍVIDA E VALORES DE ANGOLA (Angola)
  bodiva: {
    id: 'bodiva',
    code: 'BODIVA',
    name: 'BODIVA',
    fullName: 'Bolsa de Dívida e Valores de Angola',
    country: 'Angola',
    region: 'Afrique Australe',
    city: 'Luanda',
    website: 'https://www.bodiva.ao',
    priority: 5,
    currency: { code: 'AOA', name: 'Kwanza angolais', symbol: 'Kz' },
    dataSources: { limited: true },
    active: false
  },

  // 21. ESX-ETH - ETHIOPIAN SECURITIES EXCHANGE (Éthiopie)
  esxeth: {
    id: 'esxeth',
    code: 'ESX-ETH',
    name: 'ESX Index',
    fullName: 'Ethiopian Securities Exchange',
    country: 'Éthiopie',
    region: 'Afrique de l\'Est',
    city: 'Addis Ababa',
    website: 'https://www.esx.et',
    founded: 2025,
    priority: 5,
    currency: { code: 'ETB', name: 'Birr éthiopien', symbol: 'Br' },
    note: 'Nouvelle bourse lancée en 2025',
    dataSources: { developing: true },
    active: false
  }
};

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Récupère la configuration d'une bourse par son ID
 * @param {string} exchangeId - ID de la bourse (jse, nse_ng, etc.)
 * @returns {Object|null}
 */
function getExchange(exchangeId) {
  return AFRICAN_EXCHANGES[exchangeId] || null;
}

/**
 * Récupère toutes les bourses
 * @returns {Object}
 */
function getAllExchanges() {
  return AFRICAN_EXCHANGES;
}

/**
 * Récupère la liste des IDs de bourses
 * @returns {string[]}
 */
function getExchangeIds() {
  return Object.keys(AFRICAN_EXCHANGES);
}

/**
 * Récupère les bourses par région
 * @param {string} region - Nom de la région
 * @returns {Object[]}
 */
function getExchangesByRegion(region) {
  return Object.values(AFRICAN_EXCHANGES).filter(e => e.region === region);
}

/**
 * Récupère les indices principaux de toutes les bourses
 * @returns {Object[]}
 */
function getPrimaryIndices() {
  const indices = [];
  for (const exchange of Object.values(AFRICAN_EXCHANGES)) {
    const primary = exchange.indices.find(i => i.primary);
    if (primary) {
      indices.push({
        ...primary,
        exchangeId: exchange.id,
        exchangeName: exchange.name,
        country: exchange.country
      });
    }
  }
  return indices;
}

/**
 * Récupère les sources de données disponibles pour une bourse
 * @param {string} exchangeId - ID de la bourse
 * @returns {Object|null}
 */
function getDataSources(exchangeId) {
  const exchange = AFRICAN_EXCHANGES[exchangeId];
  return exchange ? exchange.dataSources : null;
}

/**
 * Vérifie si une source de données est disponible pour une bourse
 * @param {string} exchangeId - ID de la bourse
 * @param {string} sourceName - Nom de la source (yahoo, afxKwayisi, etc.)
 * @returns {boolean}
 */
function isSourceAvailable(exchangeId, sourceName) {
  const sources = getDataSources(exchangeId);
  return sources && sources[sourceName] && sources[sourceName].available;
}

/**
 * Récupère le symbole Yahoo Finance pour une bourse
 * @param {string} exchangeId - ID de la bourse
 * @returns {string|null}
 */
function getYahooSymbol(exchangeId) {
  const exchange = AFRICAN_EXCHANGES[exchangeId];
  if (!exchange || !exchange.dataSources.yahoo.available) return null;
  return exchange.dataSources.yahoo.symbol;
}

/**
 * Récupère les horaires de trading formatés
 * @param {string} exchangeId - ID de la bourse
 * @returns {Object|null}
 */
function getTradingHours(exchangeId) {
  const exchange = AFRICAN_EXCHANGES[exchangeId];
  if (!exchange) return null;

  const hours = exchange.tradingHours;
  return {
    local: `${hours.open} - ${hours.close}`,
    timezone: hours.timezone,
    utc: `${hours.utcOffset}`,
    tradingDays: hours.tradingDays,
    note: exchange.id === 'egx' ? 'Dimanche-Jeudi (pas Vendredi-Samedi)' : null
  };
}

/**
 * Récupère un tableau comparatif des bourses
 * @returns {Object[]}
 */
function getComparisonTable() {
  return Object.values(AFRICAN_EXCHANGES).map(e => ({
    id: e.id,
    code: e.code,
    name: e.name,
    country: e.country,
    marketCapUsd: e.marketCap.usdValue,
    listedCompanies: e.listedCompanies,
    currency: e.currency.code,
    tradingHours: `${e.tradingHours.open}-${e.tradingHours.close}`,
    tradingDays: e.tradingDays || e.tradingHours.tradingDays,
    mechanism: e.tradingMechanism.type,
    rankAfrica: e.rankAfrica,
    yahooAvailable: e.dataSources.yahoo?.available || false,
    afxAvailable: e.dataSources.afxKwayisi?.available || false
  }));
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  AFRICAN_EXCHANGES,
  getExchange,
  getAllExchanges,
  getExchangeIds,
  getExchangesByRegion,
  getPrimaryIndices,
  getDataSources,
  isSourceAvailable,
  getYahooSymbol,
  getTradingHours,
  getComparisonTable
};
