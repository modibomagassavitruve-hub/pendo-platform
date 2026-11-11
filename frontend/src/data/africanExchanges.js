/**
 * Configuration des Bourses Africaines pour le Frontend PENDO
 *
 * Données enrichies pour l'affichage des informations détaillées
 * sur chaque bourse africaine.
 */

export const AFRICAN_EXCHANGES = {
  // JSE - Johannesburg Stock Exchange
  jse: {
    id: 'jse',
    code: 'JSE',
    name: 'JSE All Share',
    fullName: 'JSE Limited (Johannesburg Stock Exchange)',
    country: 'Afrique du Sud',
    countryCode: 'ZA',
    flag: '🇿🇦',
    region: 'Afrique Australe',
    city: 'Sandton, Johannesburg',
    website: 'https://www.jse.co.za/',
    founded: 1887,

    regulator: {
      name: 'FSCA',
      fullName: 'Financial Sector Conduct Authority',
      website: 'https://www.fsca.co.za/'
    },

    marketCap: {
      display: '21 T ZAR',
      usdDisplay: '~$1.2 T',
      value: 1200000000000
    },
    listedCompanies: 435,
    rankAfrica: 1,

    tradingHours: {
      open: '09:00',
      close: '17:00',
      timezone: 'SAST (UTC+2)',
      utcOpen: '07:00',
      utcClose: '15:00'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'ZAR', symbol: 'R', name: 'Rand' },
    mechanism: 'Continu + Enchères',
    settlement: 'T+3',

    primaryIndex: { code: 'J203', name: 'FTSE/JSE All Share' },
    indices: [
      { code: 'J203', name: 'All Share', primary: true },
      { code: 'J200', name: 'Top 40' },
      { code: 'J201', name: 'Mid Cap' },
      { code: 'J202', name: 'Small Cap' }
    ],

    topSectors: ['Mines', 'Finance', 'Consommation', 'Télécoms', 'Industrie'],
    topCompanies: ['Anglo American', 'Naspers', 'Standard Bank', 'MTN', 'Sasol'],

    dataSources: {
      yahoo: { available: true, symbol: '^J203', suffix: '.JO' },
      afxKwayisi: { available: true },
      bloomberg: { available: true }
    },

    color: '#FFD700', // Or (mines)
    gradient: 'from-yellow-500 to-yellow-700'
  },

  // NGX - Nigerian Exchange
  nse_ng: {
    id: 'nse_ng',
    code: 'NGX',
    name: 'NGX All Share',
    fullName: 'Nigerian Exchange Group',
    country: 'Nigeria',
    countryCode: 'NG',
    flag: '🇳🇬',
    region: 'Afrique de l\'Ouest',
    city: 'Lagos',
    website: 'https://ngxgroup.com/',
    founded: 1961,

    regulator: {
      name: 'SEC Nigeria',
      fullName: 'Securities and Exchange Commission',
      website: 'https://sec.gov.ng/'
    },

    marketCap: {
      display: '95 T NGN',
      usdDisplay: '~$60 Mds',
      value: 60000000000
    },
    listedCompanies: 151,
    rankAfrica: 3,

    tradingHours: {
      open: '09:30',
      close: '14:30',
      timezone: 'WAT (UTC+1)',
      utcOpen: '08:30',
      utcClose: '13:30'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'NGN', symbol: '₦', name: 'Naira' },
    mechanism: 'Continu',
    settlement: 'T+2',
    priceLimit: '±10%',

    primaryIndex: { code: 'ASI', name: 'NGX All-Share Index' },
    indices: [
      { code: 'ASI', name: 'All-Share Index', primary: true },
      { code: 'NGX30', name: 'NGX 30' },
      { code: 'NGX-BANK', name: 'Banking' },
      { code: 'NGX-OG', name: 'Oil & Gas' }
    ],

    topSectors: ['Ciment', 'Télécoms', 'Pétrole & Gaz', 'Banques', 'Consommation'],
    topCompanies: ['Dangote Cement', 'Airtel Africa', 'Seplat', 'Zenith Bank', 'GTCO'],

    dataSources: {
      yahoo: { available: true, symbol: '^NGSE', limited: true },
      afxKwayisi: { available: true },
      officialApi: { available: true, url: 'https://marketdataapiv3.ngxgroup.com/' }
    },

    color: '#008751', // Vert Nigeria
    gradient: 'from-green-600 to-green-800'
  },

  // EGX - Egyptian Exchange
  egx: {
    id: 'egx',
    code: 'EGX',
    name: 'EGX 30',
    fullName: 'The Egyptian Exchange',
    country: 'Égypte',
    countryCode: 'EG',
    flag: '🇪🇬',
    region: 'Afrique du Nord',
    city: 'Le Caire',
    website: 'https://www.egx.com.eg/',
    founded: 1883,

    regulator: {
      name: 'FRA',
      fullName: 'Financial Regulatory Authority',
      website: 'https://www.fra.gov.eg/'
    },

    marketCap: {
      display: '2.29 T EGP',
      usdDisplay: '~$46 Mds',
      value: 46000000000
    },
    listedCompanies: 250,
    rankAfrica: 4,

    tradingHours: {
      open: '10:00',
      close: '14:15',
      timezone: 'EET (UTC+2)',
      utcOpen: '08:00',
      utcClose: '12:15'
    },
    tradingDays: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu'], // Différent!
    tradingNote: 'Fermé Vendredi-Samedi',

    currency: { code: 'EGP', symbol: 'E£', name: 'Livre égyptienne' },
    mechanism: 'Continu + Enchères',
    settlement: 'T+2',

    taxation: {
      capitalGains: 'Aucune',
      transactionTax: '0.001%'
    },

    primaryIndex: { code: 'EGX30', name: 'EGX 30' },
    indices: [
      { code: 'EGX30', name: 'EGX 30', primary: true },
      { code: 'EGX70', name: 'EGX 70' },
      { code: 'EGX100', name: 'EGX 100' }
    ],

    topSectors: ['Banques', 'Immobilier', 'Télécoms', 'Industrie', 'Énergie'],
    topCompanies: ['CIB', 'QNB Alahli', 'Telecom Egypt', 'Elsewedy Electric'],

    dataSources: {
      yahoo: { available: true, symbol: '^CASE30', suffix: '.CA' },
      afxKwayisi: { available: false },
      bloomberg: { available: true }
    },

    color: '#C8102E', // Rouge Égypte
    gradient: 'from-red-600 to-red-800'
  },

  // BRVM - Bourse Régionale
  brvm: {
    id: 'brvm',
    code: 'BRVM',
    name: 'BRVM Composite',
    fullName: 'Bourse Régionale des Valeurs Mobilières',
    country: 'UEMOA',
    countryCode: 'UEMOA',
    flag: '🌍',
    region: 'Afrique de l\'Ouest',
    city: 'Abidjan, Côte d\'Ivoire',
    website: 'https://www.brvm.org/',
    founded: 1996,

    memberCountries: [
      { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
      { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
      { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
      { code: 'ML', name: 'Mali', flag: '🇲🇱' },
      { code: 'BJ', name: 'Bénin', flag: '🇧🇯' },
      { code: 'TG', name: 'Togo', flag: '🇹🇬' },
      { code: 'NE', name: 'Niger', flag: '🇳🇪' },
      { code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼' }
    ],

    regulator: {
      name: 'AMF-UMOA',
      fullName: 'Autorité des Marchés Financiers de l\'UMOA',
      website: 'https://www.amf-umoa.org/',
      formerName: 'CREPMF (1996-2020)'
    },

    marketCap: {
      display: '10 T+ XOF',
      usdDisplay: '~$17 Mds',
      value: 17000000000
    },
    listedCompanies: 47,
    rankAfrica: 5,
    msciStatus: 'Frontier Market',

    tradingHours: {
      open: '09:45',
      close: '14:00',
      timezone: 'GMT (UTC+0)',
      utcOpen: '09:45',
      utcClose: '14:00',
      fixingTime: '10:45 GMT'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'XOF', symbol: 'FCFA', name: 'Franc CFA', peggedTo: 'EUR' },
    mechanism: 'Fixing unique',
    mechanismNote: 'Pas de cotation continue',
    settlement: 'T+3',

    primaryIndex: { code: 'BRVMC', name: 'BRVM Composite' },
    indices: [
      { code: 'BRVMC', name: 'Composite', primary: true },
      { code: 'BRVM10', name: 'BRVM 10' },
      { code: 'BRVM-PRES', name: 'Prestige' }
    ],

    topSectors: ['Télécoms', 'Banques', 'Distribution', 'Industrie', 'Loterie'],
    topCompanies: ['Orange CI', 'Coris Bank', 'SGBCI', 'SOLIBRA', 'LNB Bénin'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: true },
      rPackage: { available: true, name: 'BRVM', github: 'https://github.com/Koffi-Fredysessie/BRVM' }
    },

    color: '#FF6B00', // Orange UEMOA
    gradient: 'from-orange-500 to-orange-700'
  },

  // NSE Kenya - Nairobi Securities Exchange
  nse_ke: {
    id: 'nse_ke',
    code: 'NSE',
    name: 'NSE 20',
    fullName: 'Nairobi Securities Exchange PLC',
    country: 'Kenya',
    countryCode: 'KE',
    flag: '🇰🇪',
    region: 'Afrique de l\'Est',
    city: 'Nairobi',
    website: 'https://www.nse.co.ke/',
    founded: 1954,
    selfListed: 2014,

    regulator: {
      name: 'CMA',
      fullName: 'Capital Markets Authority of Kenya',
      website: 'https://www.cma.or.ke/'
    },

    marketCap: {
      display: '2.4 T KES',
      usdDisplay: '~$18 Mds',
      value: 18500000000
    },
    listedCompanies: 61,
    rankAfrica: 6,
    rankEastAfrica: 1,

    tradingHours: {
      open: '09:00',
      close: '15:00',
      timezone: 'EAT (UTC+3)',
      utcOpen: '06:00',
      utcClose: '12:00'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'KES', symbol: 'KSh', name: 'Shilling kényan' },
    mechanism: 'Continu (ATS)',
    settlement: 'T+3',

    primaryIndex: { code: 'NSE20', name: 'NSE 20 Share Index' },
    indices: [
      { code: 'NASI', name: 'All Share Index' },
      { code: 'NSE20', name: 'NSE 20', primary: true },
      { code: 'NSE25', name: 'NSE 25' }
    ],

    topSectors: ['Télécoms', 'Finance', 'Boissons', 'Construction', 'Banques'],
    topCompanies: ['Safaricom', 'Equity Group', 'KCB Group', 'EABL', 'Bamburi'],

    highlights: ['M-Pesa (Safaricom)', 'Leader Afrique de l\'Est'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: true },
      myStocks: { available: true, url: 'https://live.mystocks.co.ke/' }
    },

    color: '#006600', // Vert Kenya
    gradient: 'from-green-700 to-green-900'
  },

  // MASI - Casablanca Stock Exchange
  masi: {
    id: 'masi',
    code: 'CSE',
    name: 'MASI',
    fullName: 'Bourse de Casablanca',
    indexName: 'Moroccan All Shares Index',
    country: 'Maroc',
    countryCode: 'MA',
    flag: '🇲🇦',
    region: 'Afrique du Nord',
    city: 'Casablanca',
    website: 'https://www.casablanca-bourse.com/',
    founded: 1929,

    regulator: {
      name: 'AMMC',
      fullName: 'Autorité Marocaine du Marché des Capitaux',
      website: 'https://www.ammc.ma/'
    },

    marketCap: {
      display: '1.04 T MAD',
      usdDisplay: '~$116 Mds',
      value: 116000000000
    },
    listedCompanies: 78,
    brokerageFirms: 17,
    rankAfrica: 2,

    tradingHours: {
      open: '09:30',
      close: '15:40',
      timezone: 'WET/WEST (UTC+1)',
      utcOpen: '08:30',
      utcClose: '14:40'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'MAD', symbol: 'DH', name: 'Dirham' },
    mechanism: 'Hybride (Continu + Fixing)',
    settlement: 'T+3',
    priceLimit: '±10% (continu) / ±6% (fixing)',

    investorComposition: {
      retail: '<1%',
      foreign: '~30%',
      institutional: '~69%'
    },

    primaryIndex: { code: 'MASI', name: 'MASI' },
    indices: [
      { code: 'MASI', name: 'MASI', primary: true },
      { code: 'MASI20', name: 'MASI 20' },
      { code: 'MASI-ESG', name: 'MASI ESG' }
    ],

    topSectors: ['Banques', 'Télécoms', 'Immobilier', 'Ciment', 'Énergie'],
    topCompanies: ['Attijariwafa Bank', 'Maroc Telecom', 'BCP', 'LafargeHolcim', 'TAQA'],

    upcomingEvents: ['CAN 2025', 'Coupe du Monde 2030'],

    dataSources: {
      yahoo: { available: true, symbol: '^MASI', limited: true },
      afxKwayisi: { available: false },
      tradingView: { available: true, prefix: 'CSEMA:' }
    },

    color: '#C1272D', // Rouge Maroc
    gradient: 'from-red-700 to-red-900'
  },

  // ===========================================================================
  // NOUVELLES BOURSES - EXPANSION 2024
  // ===========================================================================

  // GSE - Ghana Stock Exchange
  gse: {
    id: 'gse',
    code: 'GSE',
    name: 'GSE Composite',
    fullName: 'Ghana Stock Exchange',
    country: 'Ghana',
    countryCode: 'GH',
    flag: '🇬🇭',
    region: 'Afrique de l\'Ouest',
    city: 'Accra',
    website: 'https://gse.com.gh',
    founded: 1989,

    regulator: {
      name: 'SEC Ghana',
      fullName: 'Securities and Exchange Commission',
      website: 'https://sec.gov.gh/'
    },

    marketCap: {
      display: '5.7 Mds GHS',
      usdDisplay: '~$5.7 Mds',
      value: 5700000000
    },
    listedCompanies: 42,
    rankAfrica: 7,

    tradingHours: {
      open: '10:00',
      close: '15:00',
      timezone: 'GMT (UTC+0)',
      utcOpen: '10:00',
      utcClose: '15:00'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'GHS', symbol: 'GH₵', name: 'Cedi ghanéen' },
    mechanism: 'Continu',
    settlement: 'T+3',

    primaryIndex: { code: 'GSE-CI', name: 'GSE Composite Index' },
    indices: [
      { code: 'GSE-CI', name: 'Composite Index', primary: true },
      { code: 'GSE-FSI', name: 'Financial Stocks Index' }
    ],

    topSectors: ['Télécoms', 'Banques', 'Énergie', 'Consommation'],
    topCompanies: ['MTN Ghana', 'GCB Bank', 'GOIL', 'Unilever Ghana'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: true },
      afxApi: { available: true }
    },

    color: '#CE1126', // Rouge Ghana
    gradient: 'from-red-600 to-yellow-500'
  },

  // BSE - Botswana Stock Exchange
  bse: {
    id: 'bse',
    code: 'BSE',
    name: 'BSE DCI',
    fullName: 'Botswana Stock Exchange',
    country: 'Botswana',
    countryCode: 'BW',
    flag: '🇧🇼',
    region: 'Afrique Australe',
    city: 'Gaborone',
    website: 'https://www.bse.co.bw',
    founded: 1989,

    regulator: {
      name: 'NBFIRA',
      fullName: 'Non-Bank Financial Institutions Regulatory Authority',
      website: 'https://www.nbfira.org.bw/'
    },

    marketCap: {
      display: '4.5 Mds USD',
      usdDisplay: '~$4.5 Mds',
      value: 4500000000
    },
    listedCompanies: 36,
    rankAfrica: 8,

    tradingHours: {
      open: '10:00',
      close: '14:00',
      timezone: 'CAT (UTC+2)',
      utcOpen: '08:00',
      utcClose: '12:00'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'BWP', symbol: 'P', name: 'Pula' },
    mechanism: 'Continu',
    settlement: 'T+3',

    primaryIndex: { code: 'DCI', name: 'Domestic Company Index' },
    indices: [
      { code: 'DCI', name: 'Domestic Company Index', primary: true },
      { code: 'FCI', name: 'Foreign Company Index' }
    ],

    topSectors: ['Banques', 'Consommation', 'Distribution'],
    topCompanies: ['Letshego Holdings', 'FNB Botswana', 'Choppies'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: true }
    },

    color: '#75AADB', // Bleu Botswana
    gradient: 'from-blue-400 to-blue-600'
  },

  // LuSE - Lusaka Stock Exchange
  luse: {
    id: 'luse',
    code: 'LuSE',
    name: 'LASI',
    fullName: 'Lusaka Securities Exchange',
    country: 'Zambie',
    countryCode: 'ZM',
    flag: '🇿🇲',
    region: 'Afrique Australe',
    city: 'Lusaka',
    website: 'https://www.luse.co.zm',
    founded: 1993,

    regulator: {
      name: 'SEC Zambia',
      fullName: 'Securities and Exchange Commission',
      website: 'https://www.seczambia.org.zm/'
    },

    marketCap: {
      display: '9.8 Mds USD',
      usdDisplay: '~$9.8 Mds',
      value: 9800000000
    },
    listedCompanies: 23,
    rankAfrica: 9,

    tradingHours: {
      open: '10:00',
      close: '14:00',
      timezone: 'CAT (UTC+2)',
      utcOpen: '08:00',
      utcClose: '12:00'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'ZMW', symbol: 'ZK', name: 'Kwacha zambien' },
    mechanism: 'Continu',
    settlement: 'T+3',

    primaryIndex: { code: 'LASI', name: 'LuSE All Share Index' },
    indices: [
      { code: 'LASI', name: 'All Share Index', primary: true }
    ],

    topSectors: ['Télécoms', 'Énergie', 'Consommation', 'Banques'],
    topCompanies: ['Airtel Zambia', 'Copperbelt Energy', 'Zambia Sugar'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: true }
    },

    color: '#DE2010', // Rouge Zambie
    gradient: 'from-red-600 to-orange-600'
  },

  // ZSE - Zimbabwe Stock Exchange
  zse: {
    id: 'zse',
    code: 'ZSE',
    name: 'ZSE All Share',
    fullName: 'Zimbabwe Stock Exchange',
    country: 'Zimbabwe',
    countryCode: 'ZW',
    flag: '🇿🇼',
    region: 'Afrique Australe',
    city: 'Harare',
    website: 'https://www.zse.co.zw',
    founded: 1946,

    regulator: {
      name: 'SECZ',
      fullName: 'Securities and Exchange Commission of Zimbabwe',
      website: 'https://www.seczim.co.zw/'
    },

    marketCap: {
      display: 'Variable',
      usdDisplay: '~Variable',
      value: 0,
      note: 'Nouvelle devise ZiG (2024)'
    },
    listedCompanies: 63,
    rankAfrica: 10,

    tradingHours: {
      open: '09:30',
      close: '13:00',
      timezone: 'CAT (UTC+2)',
      utcOpen: '07:30',
      utcClose: '11:00'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'ZiG', symbol: 'ZiG', name: 'Zimbabwe Gold' },
    mechanism: 'Continu',
    settlement: 'T+3',

    primaryIndex: { code: 'ZSE-ASI', name: 'ZSE All Share Index' },
    indices: [
      { code: 'ZSE-ASI', name: 'All Share Index', primary: true },
      { code: 'ZSE-T10', name: 'Top 10 Index' }
    ],

    topSectors: ['Consommation', 'Télécoms', 'Banques', 'Agriculture'],
    topCompanies: ['Delta Corporation', 'Econet Wireless', 'CBZ Holdings'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: true }
    },

    color: '#FCDC04', // Jaune Zimbabwe
    gradient: 'from-yellow-400 to-green-600'
  },

  // SEM - Stock Exchange of Mauritius
  sem: {
    id: 'sem',
    code: 'SEM',
    name: 'SEMDEX',
    fullName: 'Stock Exchange of Mauritius',
    country: 'Maurice',
    countryCode: 'MU',
    flag: '🇲🇺',
    region: 'Afrique Australe',
    city: 'Port Louis',
    website: 'https://www.stockexchangeofmauritius.com',
    founded: 1989,

    regulator: {
      name: 'FSC',
      fullName: 'Financial Services Commission',
      website: 'https://www.fscmauritius.org/'
    },

    marketCap: {
      display: '6.8 Mds USD',
      usdDisplay: '~$6.8 Mds',
      value: 6800000000
    },
    listedCompanies: 88,
    rankAfrica: 11,

    tradingHours: {
      open: '09:00',
      close: '13:30',
      timezone: 'MUT (UTC+4)',
      utcOpen: '05:00',
      utcClose: '09:30'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'MUR', symbol: '₨', name: 'Roupie mauricienne' },
    mechanism: 'Continu',
    settlement: 'T+3',

    primaryIndex: { code: 'SEMDEX', name: 'SEMDEX' },
    indices: [
      { code: 'SEMDEX', name: 'SEMDEX', primary: true },
      { code: 'SEM-10', name: 'SEM-10' }
    ],

    topSectors: ['Banques', 'Conglomérat', 'Tourisme'],
    topCompanies: ['MCB Group', 'Ciel Limited', 'SBM Holdings'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: false }
    },

    color: '#EA2839', // Rouge Maurice
    gradient: 'from-red-500 to-blue-700'
  },

  // DSE - Dar es Salaam Stock Exchange
  dse: {
    id: 'dse',
    code: 'DSE',
    name: 'DSE All Share',
    fullName: 'Dar es Salaam Stock Exchange',
    country: 'Tanzanie',
    countryCode: 'TZ',
    flag: '🇹🇿',
    region: 'Afrique de l\'Est',
    city: 'Dar es Salaam',
    website: 'https://www.dse.co.tz',
    founded: 1996,

    regulator: {
      name: 'CMSA',
      fullName: 'Capital Markets and Securities Authority',
      website: 'https://www.cmsa.go.tz/'
    },

    marketCap: {
      display: '6.3 Mds USD',
      usdDisplay: '~$6.3 Mds',
      value: 6300000000
    },
    listedCompanies: 28,
    rankAfrica: 12,

    tradingHours: {
      open: '10:00',
      close: '14:00',
      timezone: 'EAT (UTC+3)',
      utcOpen: '07:00',
      utcClose: '11:00'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'TZS', symbol: 'TSh', name: 'Shilling tanzanien' },
    mechanism: 'Continu',
    settlement: 'T+3',

    primaryIndex: { code: 'DSE-ASI', name: 'DSE All Share Index' },
    indices: [
      { code: 'DSE-ASI', name: 'All Share Index', primary: true },
      { code: 'TSI', name: 'Tanzania Share Index' }
    ],

    topSectors: ['Banques', 'Consommation', 'Services'],
    topCompanies: ['CRDB Bank', 'NMB Bank', 'Tanzania Breweries'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: false }
    },

    color: '#1EB53A', // Vert Tanzanie
    gradient: 'from-green-500 to-blue-600'
  },

  // USE - Uganda Securities Exchange
  use: {
    id: 'use',
    code: 'USE',
    name: 'USE All Share',
    fullName: 'Uganda Securities Exchange',
    country: 'Ouganda',
    countryCode: 'UG',
    flag: '🇺🇬',
    region: 'Afrique de l\'Est',
    city: 'Kampala',
    website: 'https://www.use.or.ug',
    founded: 1997,

    regulator: {
      name: 'CMA Uganda',
      fullName: 'Capital Markets Authority',
      website: 'https://www.cmauganda.co.ug/'
    },

    marketCap: {
      display: '7.5 Mds USD',
      usdDisplay: '~$7.5 Mds',
      value: 7500000000
    },
    listedCompanies: 17,
    rankAfrica: 13,

    tradingHours: {
      open: '09:30',
      close: '15:00',
      timezone: 'EAT (UTC+3)',
      utcOpen: '06:30',
      utcClose: '12:00'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'UGX', symbol: 'USh', name: 'Shilling ougandais' },
    mechanism: 'Continu',
    settlement: 'T+3',

    primaryIndex: { code: 'ALSI', name: 'USE All Share Index' },
    indices: [
      { code: 'ALSI', name: 'All Share Index', primary: true },
      { code: 'LCI', name: 'Local Company Index' }
    ],

    topSectors: ['Télécoms', 'Banques', 'Énergie', 'Consommation'],
    topCompanies: ['MTN Uganda', 'Stanbic Bank', 'Umeme Limited'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: true }
    },

    color: '#FCDC04', // Jaune Ouganda
    gradient: 'from-yellow-400 to-red-600'
  },

  // RSE - Rwanda Stock Exchange
  rse: {
    id: 'rse',
    code: 'RSE',
    name: 'RSE All Share',
    fullName: 'Rwanda Stock Exchange',
    country: 'Rwanda',
    countryCode: 'RW',
    flag: '🇷🇼',
    region: 'Afrique de l\'Est',
    city: 'Kigali',
    website: 'https://rse.rw',
    founded: 2005,

    regulator: {
      name: 'CMA Rwanda',
      fullName: 'Capital Market Authority',
      website: 'https://www.cma.rw/'
    },

    marketCap: {
      display: '4.8 Mds RWF',
      usdDisplay: '~$4 M',
      value: 4000000
    },
    listedCompanies: 10,
    rankAfrica: 14,

    tradingHours: {
      open: '09:00',
      close: '12:00',
      timezone: 'CAT (UTC+2)',
      utcOpen: '07:00',
      utcClose: '10:00'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'RWF', symbol: 'FRw', name: 'Franc rwandais' },
    mechanism: 'Continu',
    settlement: 'T+3',

    primaryIndex: { code: 'RSE-ASI', name: 'RSE All Share Index' },
    indices: [
      { code: 'RSE-ASI', name: 'All Share Index', primary: true },
      { code: 'RSE-RSI', name: 'Rwanda Share Index' }
    ],

    topSectors: ['Banques', 'Consommation', 'Télécoms'],
    topCompanies: ['Bank of Kigali', 'Bralirwa', 'MTN Rwanda'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: false }
    },

    color: '#00A1DE', // Bleu Rwanda
    gradient: 'from-blue-500 to-yellow-500'
  },

  // BVMT - Bourse de Tunis
  bvmt: {
    id: 'bvmt',
    code: 'BVMT',
    name: 'TUNINDEX',
    fullName: 'Bourse des Valeurs Mobilières de Tunis',
    country: 'Tunisie',
    countryCode: 'TN',
    flag: '🇹🇳',
    region: 'Afrique du Nord',
    city: 'Tunis',
    website: 'https://www.bvmt.com.tn',
    founded: 1969,

    regulator: {
      name: 'CMF',
      fullName: 'Conseil du Marché Financier',
      website: 'https://www.cmf.tn/'
    },

    marketCap: {
      display: '8 Mds USD',
      usdDisplay: '~$8 Mds',
      value: 8000000000
    },
    listedCompanies: 74,
    rankAfrica: 15,

    tradingHours: {
      open: '09:00',
      close: '14:00',
      timezone: 'CET (UTC+1)',
      utcOpen: '08:00',
      utcClose: '13:00'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'TND', symbol: 'د.ت', name: 'Dinar tunisien' },
    mechanism: 'Continu',
    settlement: 'T+3',

    primaryIndex: { code: 'TUNINDEX', name: 'TUNINDEX' },
    indices: [
      { code: 'TUNINDEX', name: 'TUNINDEX', primary: true },
      { code: 'TUNINDEX20', name: 'TUNINDEX 20' }
    ],

    topSectors: ['Banques', 'Consommation'],
    topCompanies: ['BIAT', 'BH Bank', 'Attijari Bank', 'SFBT'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: false }
    },

    color: '#E70013', // Rouge Tunisie
    gradient: 'from-red-600 to-red-800'
  },

  // NSX - Namibian Stock Exchange
  nsx: {
    id: 'nsx',
    code: 'NSX',
    name: 'NSX Overall',
    fullName: 'Namibia Securities Exchange',
    country: 'Namibie',
    countryCode: 'NA',
    flag: '🇳🇦',
    region: 'Afrique Australe',
    city: 'Windhoek',
    website: 'https://www.nsx.com.na',
    founded: 1992,

    marketCap: {
      display: '1.6 Mds USD',
      usdDisplay: '~$1.6 Mds',
      value: 1600000000
    },
    listedCompanies: 40,
    rankAfrica: 16,

    tradingHours: {
      open: '09:00',
      close: '17:00',
      timezone: 'CAT (UTC+2)',
      utcOpen: '07:00',
      utcClose: '15:00'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'NAD', symbol: 'N$', name: 'Dollar namibien' },
    mechanism: 'Continu',
    settlement: 'T+3',

    primaryIndex: { code: 'NSX-OI', name: 'NSX Overall Index' },
    indices: [
      { code: 'NSX-OI', name: 'Overall Index', primary: true }
    ],

    topSectors: ['Banques', 'Mines', 'Commerce'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: false }
    },

    color: '#003580', // Bleu Namibie
    gradient: 'from-blue-800 to-yellow-500'
  },

  // MSE - Malawi Stock Exchange
  mse: {
    id: 'mse',
    code: 'MSE',
    name: 'MSE All Share',
    fullName: 'Malawi Stock Exchange',
    country: 'Malawi',
    countryCode: 'MW',
    flag: '🇲🇼',
    region: 'Afrique Australe',
    city: 'Blantyre',
    website: 'https://www.mse.co.mw',
    founded: 1996,

    listedCompanies: 16,
    rankAfrica: 17,

    tradingHours: {
      open: '10:00',
      close: '12:00',
      timezone: 'CAT (UTC+2)',
      utcOpen: '08:00',
      utcClose: '10:00'
    },
    tradingDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],

    currency: { code: 'MWK', symbol: 'MK', name: 'Kwacha malawite' },
    mechanism: 'Fixing',
    settlement: 'T+3',

    primaryIndex: { code: 'MSE-ASI', name: 'MSE All Share Index' },
    indices: [
      { code: 'MSE-ASI', name: 'All Share Index', primary: true }
    ],

    topSectors: ['Banques', 'Télécoms', 'Consommation'],

    dataSources: {
      yahoo: { available: false },
      afxKwayisi: { available: false }
    },

    color: '#CE1126', // Rouge Malawi
    gradient: 'from-red-600 to-green-700'
  }
};

// Liste ordonnée par capitalisation (17 bourses actives)
export const EXCHANGES_BY_MARKET_CAP = [
  'jse',    // $1.2T - 1er
  'masi',   // $116B - 2ème
  'nse_ng', // $60B  - 3ème
  'egx',    // $46B  - 4ème
  'nse_ke', // $18B  - 5ème
  'brvm',   // $17B  - 6ème
  'luse',   // $9.8B - 7ème
  'bvmt',   // $8B   - 8ème
  'use',    // $7.5B - 9ème
  'sem',    // $6.8B - 10ème
  'dse',    // $6.3B - 11ème
  'gse',    // $5.7B - 12ème
  'bse',    // $4.5B - 13ème
  'rse',    // $4M   - 14ème
  'nsx',    // $1.6B - 15ème
  'zse',    // Variable - 16ème
  'mse'     // N/A - 17ème
];

// Régions (17 bourses actives)
export const REGIONS = {
  'Afrique Australe': ['jse', 'bse', 'luse', 'zse', 'sem', 'nsx', 'mse'],
  'Afrique de l\'Ouest': ['nse_ng', 'brvm', 'gse'],
  'Afrique du Nord': ['egx', 'masi', 'bvmt'],
  'Afrique de l\'Est': ['nse_ke', 'dse', 'use', 'rse']
};

// Disponibilité des sources (17 bourses actives)
export const DATA_SOURCE_MATRIX = {
  yahoo: ['jse', 'nse_ng', 'egx', 'masi'],
  afxKwayisi: ['jse', 'nse_ng', 'brvm', 'nse_ke', 'gse', 'bse', 'luse', 'zse', 'use'],
  bloomberg: ['jse', 'egx', 'masi', 'nse_ng']
};

// Horaires de trading en UTC pour comparaison facile (17 bourses actives)
export const TRADING_HOURS_UTC = {
  sem: { open: '05:00', close: '09:30' },  // Premier à ouvrir (Maurice UTC+4)
  nse_ke: { open: '06:00', close: '12:00' },
  use: { open: '06:30', close: '12:00' },
  jse: { open: '07:00', close: '15:00' },
  nsx: { open: '07:00', close: '15:00' },
  rse: { open: '07:00', close: '10:00' },
  dse: { open: '07:00', close: '11:00' },
  zse: { open: '07:30', close: '11:00' },
  bse: { open: '08:00', close: '12:00' },
  luse: { open: '08:00', close: '12:00' },
  mse: { open: '08:00', close: '10:00' },
  bvmt: { open: '08:00', close: '13:00' },
  egx: { open: '08:00', close: '12:15' },
  nse_ng: { open: '08:30', close: '13:30' },
  masi: { open: '08:30', close: '14:40' },
  brvm: { open: '09:45', close: '14:00' },
  gse: { open: '10:00', close: '15:00' }   // Dernier à ouvrir
};

/**
 * Récupère les infos d'une bourse
 */
export function getExchange(id) {
  return AFRICAN_EXCHANGES[id] || null;
}

/**
 * Récupère toutes les bourses
 */
export function getAllExchanges() {
  return Object.values(AFRICAN_EXCHANGES);
}

/**
 * Récupère les bourses par région
 */
export function getExchangesByRegion(region) {
  const ids = REGIONS[region] || [];
  return ids.map(id => AFRICAN_EXCHANGES[id]);
}

/**
 * Vérifie si une bourse est ouverte (approximatif)
 */
export function isMarketOpen(exchangeId) {
  const exchange = AFRICAN_EXCHANGES[exchangeId];
  if (!exchange) return false;

  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const currentTime = utcHours * 60 + utcMinutes;

  const hours = TRADING_HOURS_UTC[exchangeId];
  if (!hours) return false;

  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;

  // Vérifier le jour de la semaine
  const dayOfWeek = now.getUTCDay();

  // EGX: Dimanche-Jeudi (0, 1, 2, 3, 4)
  if (exchangeId === 'egx') {
    if (dayOfWeek === 5 || dayOfWeek === 6) return false; // Vendredi ou Samedi
  } else {
    // Autres: Lundi-Vendredi (1, 2, 3, 4, 5)
    if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Dimanche ou Samedi
  }

  return currentTime >= openTime && currentTime <= closeTime;
}

export default AFRICAN_EXCHANGES;
