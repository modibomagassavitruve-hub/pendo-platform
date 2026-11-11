// Données de démonstration pour les bourses africaines
// baseValues mirrored from services/realTimeMarkets.js MARKET_CONFIG (updated 2026-04-04)

export const FALLBACK_MARKETS = [
  {
    id: 'jse',
    name: 'JSE All Share',
    country: 'Afrique du Sud',
    value: '116,123.00',
    rawValue: 116123,
    change: '+1.2%',
    changePercent: 1.2,
    positive: true,
    volume: '2.4B',
    source: 'Demo',
    currency: 'ZAR',
    exchange: 'Johannesburg Stock Exchange'
  },
  {
    id: 'masi',
    name: 'MASI',
    country: 'Maroc',
    value: '17,515.00',
    rawValue: 17515,
    change: '+0.8%',
    changePercent: 0.8,
    positive: true,
    volume: '156M',
    source: 'Demo',
    currency: 'MAD',
    exchange: 'Casablanca Stock Exchange'
  },
  {
    id: 'nse_ng',
    name: 'NGX All Share',
    country: 'Nigeria',
    value: '201,699.00',
    rawValue: 201699,
    change: '+2.1%',
    changePercent: 2.1,
    positive: true,
    volume: '1.2B',
    source: 'Demo',
    currency: 'NGN',
    exchange: 'Nigerian Exchange Group'
  },
  {
    id: 'egx',
    name: 'EGX 30',
    country: 'Égypte',
    value: '47,276.00',
    rawValue: 47276,
    change: '+1.5%',
    changePercent: 1.5,
    positive: true,
    volume: '890M',
    source: 'Demo',
    currency: 'EGP',
    exchange: 'Egyptian Exchange'
  },
  {
    id: 'nse_ke',
    name: 'NSE 20',
    country: 'Kenya',
    value: '199.00',
    rawValue: 199,
    change: '-0.3%',
    changePercent: -0.3,
    positive: false,
    volume: '45.2M',
    source: 'Demo',
    currency: 'KES',
    exchange: 'Nairobi Securities Exchange'
  },
  {
    id: 'brvm',
    name: 'BRVM Composite',
    country: 'UEMOA',
    value: '410.00',
    rawValue: 410,
    change: '+0.6%',
    changePercent: 0.6,
    positive: true,
    volume: '12.8M',
    source: 'Demo',
    currency: 'XOF',
    exchange: 'BRVM'
  },
  {
    id: 'gse',
    name: 'GSE Composite',
    country: 'Ghana',
    value: '13,041.00',
    rawValue: 13041,
    change: '+2.34%',
    changePercent: 2.34,
    positive: true,
    volume: 'N/A',
    source: 'Demo',
    currency: 'GHS',
    exchange: 'Ghana Stock Exchange'
  },
  {
    id: 'bse',
    name: 'BSE DCI',
    country: 'Botswana',
    value: '11,083.00',
    rawValue: 11083,
    change: '+0.95%',
    changePercent: 0.95,
    positive: true,
    volume: 'N/A',
    source: 'Demo',
    currency: 'BWP',
    exchange: 'Botswana Stock Exchange'
  },
  {
    id: 'luse',
    name: 'LASI',
    country: 'Zambie',
    value: '27,295.00',
    rawValue: 27295,
    change: '+1.12%',
    changePercent: 1.12,
    positive: true,
    volume: 'N/A',
    source: 'Demo',
    currency: 'ZMW',
    exchange: 'Lusaka Securities Exchange'
  },
  {
    id: 'zse',
    name: 'ZSE All Share',
    country: 'Zimbabwe',
    value: '359.00',
    rawValue: 359,
    change: '-0.45%',
    changePercent: -0.45,
    positive: false,
    volume: 'N/A',
    source: 'Demo',
    currency: 'ZWG',
    exchange: 'Zimbabwe Stock Exchange'
  },
  {
    id: 'sem',
    name: 'SEMDEX',
    country: 'Maurice',
    value: '2,487.00',
    rawValue: 2487,
    change: '+0.67%',
    changePercent: 0.67,
    positive: true,
    volume: 'N/A',
    source: 'Demo',
    currency: 'MUR',
    exchange: 'Stock Exchange of Mauritius'
  },
  {
    id: 'dse',
    name: 'DSEI',
    country: 'Tanzanie',
    value: '3,840.00',
    rawValue: 3840,
    change: '+0.89%',
    changePercent: 0.89,
    positive: true,
    volume: 'N/A',
    source: 'Demo',
    currency: 'TZS',
    exchange: 'Dar es Salaam Stock Exchange'
  },
  {
    id: 'use',
    name: 'USE All Share',
    country: 'Ouganda',
    value: '1,956.00',
    rawValue: 1956,
    change: '+1.23%',
    changePercent: 1.23,
    positive: true,
    volume: 'N/A',
    source: 'Demo',
    currency: 'UGX',
    exchange: 'Uganda Securities Exchange'
  },
  {
    id: 'rse',
    name: 'RSE All Share',
    country: 'Rwanda',
    value: '189.00',
    rawValue: 189,
    change: '+0.34%',
    changePercent: 0.34,
    positive: true,
    volume: 'N/A',
    source: 'Demo',
    currency: 'RWF',
    exchange: 'Rwanda Stock Exchange'
  },
  {
    id: 'bvmt',
    name: 'TUNINDEX',
    country: 'Tunisie',
    value: '15,380.00',
    rawValue: 15380,
    change: '-0.12%',
    changePercent: -0.12,
    positive: false,
    volume: 'N/A',
    source: 'Demo',
    currency: 'TND',
    exchange: 'Bourse de Tunis'
  },
  {
    id: 'nsx',
    name: 'NSX Overall',
    country: 'Namibie',
    value: '1,667.00',
    rawValue: 1667,
    change: '+0.56%',
    changePercent: 0.56,
    positive: true,
    volume: 'N/A',
    source: 'Demo',
    currency: 'NAD',
    exchange: 'Namibia Securities Exchange'
  },
  {
    id: 'mse',
    name: 'MSE All Share',
    country: 'Malawi',
    value: '574,588.00',
    rawValue: 574588,
    change: '+1.45%',
    changePercent: 1.45,
    positive: true,
    volume: 'N/A',
    source: 'Demo',
    currency: 'MWK',
    exchange: 'Malawi Stock Exchange'
  }
];

// Secteurs d'opportunités d'investissement en Afrique
export const OPPORTUNITIES_SECTORS = [
  {
    sector: 'Immobilier',
    icon: 'Building2',
    color: 'bg-blue-500',
    gradient: 'from-blue-500 to-blue-700',
    description: 'Projets résidentiels et commerciaux',
    markets: ['Égypte', 'Maroc', 'Kenya', 'Nigeria'],
    growth: '+15%',
    trend: 'up'
  },
  {
    sector: 'Finance',
    icon: 'BarChart3',
    color: 'bg-green-500',
    gradient: 'from-green-500 to-green-700',
    description: 'Startups fintech et microfinance',
    markets: ['Nigeria', 'Kenya', 'Afrique du Sud', 'Égypte'],
    growth: '+28%',
    trend: 'up'
  },
  {
    sector: 'Santé',
    icon: 'Heart',
    color: 'bg-red-500',
    gradient: 'from-red-500 to-red-700',
    description: 'Cliniques et healthtech',
    markets: ['Kenya', 'Nigeria', 'Afrique du Sud'],
    growth: '+18%',
    trend: 'up'
  },
  {
    sector: 'Tech',
    icon: 'Cpu',
    color: 'bg-purple-500',
    gradient: 'from-purple-500 to-purple-700',
    description: 'Startups et infrastructure digitale',
    markets: ['Nigeria', 'Kenya', 'Égypte', 'Afrique du Sud'],
    growth: '+35%',
    trend: 'up'
  },
  {
    sector: 'Énergie',
    icon: 'Zap',
    color: 'bg-yellow-500',
    gradient: 'from-yellow-500 to-yellow-700',
    description: 'Solaire et renouvelables',
    markets: ['Maroc', 'Égypte', 'Kenya', 'Afrique du Sud'],
    growth: '+22%',
    trend: 'up'
  },
  {
    sector: 'Mines',
    icon: 'Mountain',
    color: 'bg-gray-600',
    gradient: 'from-gray-600 to-gray-800',
    description: 'Exploration et métaux précieux',
    markets: ['Afrique du Sud', 'Côte d\'Ivoire', 'Ghana'],
    growth: '+12%',
    trend: 'up'
  },
  {
    sector: 'Tourisme',
    icon: 'Palmtree',
    color: 'bg-teal-500',
    gradient: 'from-teal-500 to-teal-700',
    description: 'Hôtellerie et écolodges',
    markets: ['Maroc', 'Égypte', 'Kenya', 'Sénégal'],
    growth: '+20%',
    trend: 'up',
    events: ['CAN 2025', 'Coupe du Monde 2030']
  },
  {
    sector: 'Consommation',
    icon: 'ShoppingBag',
    color: 'bg-orange-500',
    gradient: 'from-orange-500 to-orange-700',
    description: 'Distribution et agrobusiness',
    markets: ['Nigeria', 'Égypte', 'Kenya', 'Côte d\'Ivoire'],
    growth: '+16%',
    trend: 'up'
  }
];

// Comparatif des bourses africaines
export const EXCHANGES_COMPARISON = [
  {
    id: 'jse',
    name: 'JSE',
    country: 'Afrique du Sud',
    flag: '🇿🇦',
    marketCapUsd: '$1.2T',
    rank: 1,
    companies: 435,
    currency: 'ZAR',
    hours: '09:00-17:00',
    mechanism: 'Continu',
    yahooAvailable: true
  },
  {
    id: 'masi',
    name: 'CSE/MASI',
    country: 'Maroc',
    flag: '🇲🇦',
    marketCapUsd: '$116B',
    rank: 2,
    companies: 78,
    currency: 'MAD',
    hours: '09:30-15:40',
    mechanism: 'Hybride',
    yahooAvailable: true
  },
  {
    id: 'nse_ng',
    name: 'NGX',
    country: 'Nigeria',
    flag: '🇳🇬',
    marketCapUsd: '$60B',
    rank: 3,
    companies: 151,
    currency: 'NGN',
    hours: '09:30-14:30',
    mechanism: 'Continu',
    yahooAvailable: true
  },
  {
    id: 'egx',
    name: 'EGX',
    country: 'Égypte',
    flag: '🇪🇬',
    marketCapUsd: '$46B',
    rank: 4,
    companies: 250,
    currency: 'EGP',
    hours: '10:00-14:15',
    mechanism: 'Continu',
    yahooAvailable: true,
    note: 'Dim-Jeu'
  },
  {
    id: 'nse_ke',
    name: 'NSE',
    country: 'Kenya',
    flag: '🇰🇪',
    marketCapUsd: '$18B',
    rank: 5,
    companies: 61,
    currency: 'KES',
    hours: '09:00-15:00',
    mechanism: 'Continu',
    yahooAvailable: false
  },
  {
    id: 'brvm',
    name: 'BRVM',
    country: 'UEMOA (8 pays)',
    flag: '🌍',
    marketCapUsd: '$17B',
    rank: 6,
    companies: 47,
    currency: 'XOF',
    hours: '09:45-14:00',
    mechanism: 'Fixing',
    yahooAvailable: false
  }
];

// Sources de données pour les développeurs
export const DATA_SOURCES = {
  free: [
    {
      name: 'AFX Kwayisi',
      url: 'https://afx.kwayisi.org/',
      coverage: ['JSE', 'NGX', 'NSE Kenya', 'BRVM'],
      type: 'Web scraping',
      delay: 'EOD'
    },
    {
      name: 'Yahoo Finance',
      url: 'https://finance.yahoo.com/',
      coverage: ['JSE (.JO)', 'EGX (.CA)', 'MASI (^MASI)'],
      type: 'API non-officielle',
      delay: '15min'
    },
    {
      name: 'Investing.com',
      url: 'https://www.investing.com/',
      coverage: ['Toutes les bourses'],
      type: 'Web',
      delay: 'Retardé'
    }
  ],
  official: [
    {
      name: 'NGX API',
      url: 'https://marketdataapiv3.ngxgroup.com/',
      coverage: ['NGX'],
      type: 'REST API',
      pricing: 'Commercial'
    },
    {
      name: 'JSE Market Data',
      url: 'https://www.jse.co.za/market-data',
      coverage: ['JSE'],
      type: 'Commercial',
      pricing: 'Commercial'
    }
  ],
  packages: [
    {
      name: 'BRVM (R Package)',
      url: 'https://github.com/Koffi-Fredysessie/BRVM',
      coverage: ['BRVM'],
      type: 'R Package',
      pricing: 'Gratuit'
    },
    {
      name: 'afrimarket (Python)',
      url: 'https://github.com/ambroseikpele/afrimarket',
      coverage: ['NGX', 'NSE Kenya'],
      type: 'Python Package',
      pricing: 'Gratuit'
    }
  ]
};
