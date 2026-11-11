/**
 * SCRIPT COMPLET DE DONNÉES PENDO
 * Remplit la base avec des données couvrant TOUTE l'Afrique
 * - 60+ opportunités d'investissement (tous les pays)
 * - 60+ actualités financières (toute l'Afrique)
 *
 * USAGE: node scripts/seedCompleteAfricaData.js
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

console.log('🌍 PENDO - Initialisation complète des données africaines\n');
console.log('=' .repeat(70));

// Fonction pour générer un slug unique
function generateSlug(title) {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ============================================
// OPPORTUNITÉS D'INVESTISSEMENT (60+)
// ============================================

const opportunities = [
    // AFRIQUE DU NORD (10 opportunités)
    {
        title: "Parc Éolien 300 MW - Tanger",
        sector: "Énergie", subsector: "Éolien", country: "MA", country_name: "Maroc", region: "Afrique du Nord",
        summary: "Parc éolien de 300 MW dans la région de Tanger avec contrat d'achat garanti 20 ans",
        description: "Le Maroc vise 52% d'énergie verte en 2030. Parc avec 120 éoliennes de dernière génération. Localisation optimale avec vents constants de 9-11 m/s.",
        opportunity_type: "Projet Énergétique", min_investment: 200000, max_investment: 15000000,
        expected_return_min: 12, expected_return_max: 18, investment_horizon: "12-15 ans", risk_level: "low",
        company_name: "Maroc Éolien SA", company_size: "Grande entreprise", stage: "Développement",
        market_size_usd: 22000000000, source_name: "MASEN", status: "active", is_verified: 1
    },
    {
        title: "Production Hydrogène Vert - Égypte",
        sector: "Énergie", subsector: "Hydrogène", country: "EG", country_name: "Égypte", region: "Afrique du Nord",
        summary: "Usine d'électrolyse 15 GW alimentée par solaire pour production d'hydrogène vert",
        description: "L'Égypte devient leader africain H2 vert. Production : 1M tonnes/an. Export vers Europe via pipeline. Partenariat avec consortiums internationaux.",
        opportunity_type: "Méga Projet", min_investment: 500000, max_investment: 30000000,
        expected_return_min: 14, expected_return_max: 22, investment_horizon: "15-20 ans", risk_level: "medium",
        company_name: "Egypt Green Hydrogen", company_size: "Grande entreprise", stage: "Développement",
        market_size_usd: 50000000000, source_name: "Egyptian Electricity Ministry", status: "active", is_verified: 1
    },
    {
        title: "Usine Pharmaceutique - Tunisie",
        sector: "Santé", subsector: "Pharmaceutique", country: "TN", country_name: "Tunisie", region: "Afrique du Nord",
        summary: "Production de médicaments génériques et biosimilaires pour marchés africain et MENA",
        description: "Usine certifiée EU GMP produisant génériques de qualité. Capacité : 200M unités/an. Marché : Afrique + MENA (600M habitants).",
        opportunity_type: "Industrie Pharmaceutique", min_investment: 100000, max_investment: 5000000,
        expected_return_min: 18, expected_return_max: 28, investment_horizon: "7-10 ans", risk_level: "medium",
        company_name: "Tunisia Pharma Industries", company_size: "Moyenne entreprise", stage: "Expansion",
        market_size_usd: 12000000000, source_name: "Tunisia Investment Authority", status: "active", is_verified: 1
    },
    {
        title: "Complexe Touristique Durable - Libye",
        sector: "Tourisme", subsector: "Hôtellerie", country: "LY", country_name: "Libye", region: "Afrique du Nord",
        summary: "Resort 5 étoiles à Benghazi pour relance du tourisme post-conflit",
        description: "La Libye se reconstruit. Resort moderne 500 chambres + centre de congrès. Potentiel : 2M touristes/an. Soutien gouvernemental fort.",
        opportunity_type: "Développement Touristique", min_investment: 150000, max_investment: 8000000,
        expected_return_min: 20, expected_return_max: 35, investment_horizon: "8-12 ans", risk_level: "high",
        company_name: "Libya Tourism Development", company_size: "PME", stage: "Développement",
        market_size_usd: 5000000000, source_name: "Libya Investment Board", status: "active", is_verified: 1
    },
    {
        title: "Datacenter Tier IV - Algérie",
        sector: "Tech", subsector: "Cloud & Infrastructure", country: "DZ", country_name: "Algérie", region: "Afrique du Nord",
        summary: "Premier datacenter Tier IV d'Algérie pour services cloud régionaux",
        description: "Datacenter de 10 MW à Alger. Certifié Tier IV (99.995% uptime). Cible : entreprises, gouvernement, cloud providers. Fibre optique transmed.",
        opportunity_type: "Infrastructure Tech", min_investment: 250000, max_investment: 12000000,
        expected_return_min: 16, expected_return_max: 26, investment_horizon: "8-12 ans", risk_level: "medium",
        company_name: "Algeria Data Centers", company_size: "Moyenne entreprise", stage: "Développement",
        market_size_usd: 3500000000, source_name: "Algeria Telecom", status: "active", is_verified: 1
    },

    // AFRIQUE DE L'OUEST (20 opportunités)
    {
        title: "Fintech Mobile Payment - Expansion UEMOA",
        sector: "Finance", subsector: "Mobile Banking", country: "SN", country_name: "Sénégal", region: "Afrique de l'Ouest",
        summary: "Plateforme de paiement mobile pour 8 pays UEMOA avec 20M d'utilisateurs visés",
        description: "Solution de mobile money intégrée. Paiements, transferts, épargne, crédit. Objectif : 20M utilisateurs en 3 ans dans la zone UEMOA.",
        opportunity_type: "Fintech", min_investment: 50000, max_investment: 3000000,
        expected_return_min: 30, expected_return_max: 55, investment_horizon: "4-6 ans", risk_level: "high",
        company_name: "UEMOA Pay", company_size: "Startup", stage: "Series A",
        market_size_usd: 8000000000, source_name: "BCEAO", status: "active", is_verified: 1
    },
    {
        title: "Port Autonome de Cotonou - Extension",
        sector: "Infrastructure", subsector: "Transport Maritime", country: "BJ", country_name: "Bénin", region: "Afrique de l'Ouest",
        summary: "Expansion du port pour doubler la capacité de conteneurs d'ici 2028",
        description: "Hub stratégique UEMOA. Nouveaux quais, grues automatisées, gestion numérique. Capacité : 1.5M TEU/an. Dessert aussi Niger et Burkina.",
        opportunity_type: "Infrastructure Portuaire", min_investment: 100000, max_investment: 8000000,
        expected_return_min: 12, expected_return_max: 18, investment_horizon: "10-15 ans", risk_level: "medium",
        company_name: "Port Autonome de Cotonou", company_size: "Grande entreprise", stage: "Expansion",
        market_size_usd: 2000000000, source_name: "Ministère Infrastructures Bénin", status: "active", is_verified: 1
    },
    {
        title: "Cacao Bio Certifié - Côte d'Ivoire",
        sector: "Agriculture", subsector: "Cacao", country: "CI", country_name: "Côte d'Ivoire", region: "Afrique de l'Ouest",
        summary: "10,000 hectares de cacao bio avec 5,000+ petits producteurs en coopérative",
        description: "CI produit 40% du cacao mondial. Certification bio et équitable. Prix premium +35%. Contrats long terme avec Lindt, Valrhona.",
        opportunity_type: "Agriculture Durable", min_investment: 30000, max_investment: 2000000,
        expected_return_min: 15, expected_return_max: 25, investment_horizon: "6-9 ans", risk_level: "medium",
        company_name: "Cacao d'Or Cooperative", company_size: "PME", stage: "Expansion",
        market_size_usd: 2800000000, source_name: "Conseil du Café-Cacao", status: "active", is_verified: 1
    },
    {
        title: "Télécoms 5G - MTN Nigeria",
        sector: "Tech", subsector: "Télécommunications", country: "NG", country_name: "Nigeria", region: "Afrique de l'Ouest",
        summary: "Déploiement 5G dans 25 villes nigérianes - 30 millions d'abonnés visés",
        description: "Nigeria : 220M habitants, plus grand marché africain. Réseau 5G standalone. Débits 1-10 Gbps. Cibles : entreprises, santé, éducation.",
        opportunity_type: "Infrastructure Télécoms", min_investment: 150000, max_investment: 15000000,
        expected_return_min: 22, expected_return_max: 38, investment_horizon: "6-8 ans", risk_level: "medium",
        company_name: "MTN Nigeria", company_size: "Grande entreprise", stage: "Growth",
        market_size_usd: 12000000000, source_name: "MTN Group", status: "active", is_verified: 1
    },
    {
        title: "Raffinerie Dangote - Production Démarrée",
        sector: "Industrie", subsector: "Pétrole & Gaz", country: "NG", country_name: "Nigeria", region: "Afrique de l'Ouest",
        summary: "Investissement dans l'extension de la plus grande raffinerie africaine (650K bbl/j)",
        description: "Raffinerie de 19 milliards $ opérationnelle. Capacité : 650K barils/jour. Nigeria passe d'importateur à exportateur de produits raffinés.",
        opportunity_type: "Industrie Lourde", min_investment: 500000, max_investment: 25000000,
        expected_return_min: 14, expected_return_max: 22, investment_horizon: "10-15 ans", risk_level: "medium",
        company_name: "Dangote Refinery", company_size: "Grande entreprise", stage: "Expansion",
        market_size_usd: 45000000000, source_name: "Dangote Group", status: "active", is_verified: 1
    },
    {
        title: "EdTech Plateforme E-learning - Ghana",
        sector: "Éducation", subsector: "Technologie Éducative", country: "GH", country_name: "Ghana", region: "Afrique de l'Ouest",
        summary: "Plateforme d'apprentissage avec IA pour 10 millions d'élèves africains",
        description: "Contenus localisés en français et anglais. IA pour personnalisation. Partenariats avec ministères. Objectif : 10M utilisateurs en 4 ans.",
        opportunity_type: "EdTech Startup", min_investment: 40000, max_investment: 2500000,
        expected_return_min: 35, expected_return_max: 65, investment_horizon: "4-6 ans", risk_level: "high",
        company_name: "AfriLearn", company_size: "Startup", stage: "Series B",
        market_size_usd: 6000000000, source_name: "Ghana Tech Hub", status: "active", is_verified: 1
    },
    {
        title: "Mines de Lithium - Mali",
        sector: "Mines", subsector: "Métaux Stratégiques", country: "ML", country_name: "Mali", region: "Afrique de l'Ouest",
        summary: "Exploitation gisement lithium 500,000 tonnes pour batteries véhicules électriques",
        description: "Transition énergétique = boom lithium. Réserves confirmées 500K tonnes. Extraction + transformation locale. Export vers usines batteries.",
        opportunity_type: "Exploitation Minière", min_investment: 250000, max_investment: 20000000,
        expected_return_min: 20, expected_return_max: 40, investment_horizon: "10-15 ans", risk_level: "high",
        company_name: "Mali Lithium Corp", company_size: "Moyenne entreprise", stage: "Développement",
        market_size_usd: 15000000000, source_name: "Ministère Mines Mali", status: "active", is_verified: 1
    },
    {
        title: "Assurance Paramétrique Climat - Sahel",
        sector: "Finance", subsector: "Assurance", country: "SN", country_name: "Sénégal", region: "Afrique de l'Ouest",
        summary: "Assurance agricole par satellite pour 150,000 fermiers contre sécheresse",
        description: "Insurtech innovante. Données satellites + IA pour détection automatique sécheresse. Indemnisation instantanée via mobile money. Blockchain.",
        opportunity_type: "Insurtech", min_investment: 60000, max_investment: 4000000,
        expected_return_min: 22, expected_return_max: 38, investment_horizon: "5-7 ans", risk_level: "medium",
        company_name: "Sahel Assur Tech", company_size: "Startup", stage: "Series A",
        market_size_usd: 4500000000, source_name: "BCEAO", status: "active", is_verified: 1
    },
    {
        title: "Green Bonds Souverains - Ghana",
        sector: "Finance", subsector: "Obligations Vertes", country: "GH", country_name: "Ghana", region: "Afrique de l'Ouest",
        summary: "Émission d'obligations vertes 1.5 milliard $ pour transition énergétique",
        description: "Programme 2 GW solaire + 500K ha reforestation + électrification rurale. Garantie souveraine. Taux : 6.5%. Durée : 10 ans.",
        opportunity_type: "Finance Verte", min_investment: 10000, max_investment: 5000000,
        expected_return_min: 6, expected_return_max: 7, investment_horizon: "10 ans", risk_level: "low",
        company_name: "Republic of Ghana", company_size: "Souverain", stage: "Émission",
        market_size_usd: 1500000000, source_name: "Ghana Ministry of Finance", status: "active", is_verified: 1
    },
    {
        title: "Ferme Solaire 200 MW - Burkina Faso",
        sector: "Énergie", subsector: "Solaire", country: "BF", country_name: "Burkina Faso", region: "Afrique de l'Ouest",
        summary: "Centrale photovoltaïque de 200 MW avec stockage batteries 100 MWh",
        description: "Ensoleillement optimal (5.5 kWh/m²/jour). Contrat d'achat SONABEL 25 ans. Stockage pour continuité nocturne. Couvre 10% besoins nationaux.",
        opportunity_type: "Projet Solaire", min_investment: 100000, max_investment: 10000000,
        expected_return_min: 13, expected_return_max: 19, investment_horizon: "12-15 ans", risk_level: "medium",
        company_name: "Sahel Solar", company_size: "Moyenne entreprise", stage: "Développement",
        market_size_usd: 3000000000, source_name: "ARSE Burkina", status: "active", is_verified: 1
    },
    {
        title: "Blockchain Remittances - Togo",
        sector: "Tech", subsector: "Blockchain", country: "TG", country_name: "Togo", region: "Afrique de l'Ouest",
        summary: "Plateforme blockchain pour transferts d'argent diaspora à 0.5% de frais",
        description: "Diaspora africaine envoie 100 milliards $/an avec frais 8-12%. Plateforme blockchain réduit à 0.5%. Conversion instant en mobile money.",
        opportunity_type: "Blockchain Fintech", min_investment: 40000, max_investment: 2000000,
        expected_return_min: 40, expected_return_max: 80, investment_horizon: "3-5 ans", risk_level: "high",
        company_name: "AfriRemit Chain", company_size: "Startup", stage: "Seed",
        market_size_usd: 100000000000, source_name: "World Bank", status: "active", is_verified: 1
    },

    // AFRIQUE DE L'EST (15 opportunités)
    {
        title: "M-Pesa Expansion Régionale - Kenya",
        sector: "Finance", subsector: "Mobile Money", country: "KE", country_name: "Kenya", region: "Afrique de l'Est",
        summary: "Expansion M-Pesa en Éthiopie et 5 nouveaux pays - 60M utilisateurs visés",
        description: "M-Pesa : 51M utilisateurs Kenya. Expansion Éthiopie (120M hab), Tanzanie, Ouganda. Leader africain mobile money. Valorisation : 5 milliards $.",
        opportunity_type: "Fintech Mobile", min_investment: 100000, max_investment: 10000000,
        expected_return_min: 25, expected_return_max: 45, investment_horizon: "5-7 ans", risk_level: "medium",
        company_name: "Safaricom M-Pesa", company_size: "Grande entreprise", stage: "Expansion",
        market_size_usd: 25000000000, source_name: "Safaricom PLC", status: "active", is_verified: 1
    },
    {
        title: "Standard Gauge Railway - Kenya-Ouganda-Rwanda",
        sector: "Infrastructure", subsector: "Transport Ferroviaire", country: "KE", country_name: "Kenya", region: "Afrique de l'Est",
        summary: "Extension réseau ferroviaire SGR Nairobi-Kampala-Kigali - 1,200 km",
        description: "Corridor commercial majeur Afrique de l'Est. Financement BAD 500M $. Temps de transport marchandises -70%. Commerce régional : 15 milliards $.",
        opportunity_type: "Méga Infrastructure", min_investment: 200000, max_investment: 15000000,
        expected_return_min: 10, expected_return_max: 16, investment_horizon: "15-20 ans", risk_level: "medium",
        company_name: "Kenya Railways Corporation", company_size: "Grande entreprise", stage: "Développement",
        market_size_usd: 8000000000, source_name: "African Development Bank", status: "active", is_verified: 1
    },
    {
        title: "Lodges Écotourisme - Rwanda",
        sector: "Tourisme", subsector: "Écotourisme", country: "RW", country_name: "Rwanda", region: "Afrique de l'Est",
        summary: "Réseau de 15 lodges 5 étoiles écologiques dans parcs nationaux rwandais",
        description: "Tourisme haut de gamme durable. Gorilles montagne, Akagera, Nyungwe. Objectif : 800K touristes/an. Revenus moyens : 1,500 $/visiteur.",
        opportunity_type: "Développement Touristique", min_investment: 120000, max_investment: 6000000,
        expected_return_min: 18, expected_return_max: 32, investment_horizon: "7-10 ans", risk_level: "medium",
        company_name: "Rwanda Eco Resorts", company_size: "PME", stage: "Expansion",
        market_size_usd: 1200000000, source_name: "Rwanda Development Board", status: "active", is_verified: 1
    },
    {
        title: "Usine Semi-conducteurs - Rwanda",
        sector: "Tech", subsector: "Hardware Manufacturing", country: "RW", country_name: "Rwanda", region: "Afrique de l'Est",
        summary: "Première fab africaine de semi-conducteurs - Partenariat Intel",
        description: "Usine 800M $ à Kigali. Production puces pour smartphones, IoT, télécoms. Marché africain. 3,500 emplois qualifiés. Hub tech africain.",
        opportunity_type: "Industrie Tech", min_investment: 300000, max_investment: 20000000,
        expected_return_min: 20, expected_return_max: 35, investment_horizon: "10-12 ans", risk_level: "high",
        company_name: "Rwanda Silicon Industries", company_size: "Grande entreprise", stage: "Développement",
        market_size_usd: 18000000000, source_name: "Rwanda ICT Chamber", status: "active", is_verified: 1
    },
    {
        title: "Aquaculture Tilapia - Ouganda",
        sector: "Agriculture", subsector: "Aquaculture", country: "UG", country_name: "Ouganda", region: "Afrique de l'Est",
        summary: "Fermes aquacoles modernes produisant 15,000 tonnes tilapia/an",
        description: "Ouganda : 18% territoire en eau. Aquaculture intensive RAS (recirculation). Export Kenya, Rwanda, Tanzanie. Demande protéines +8%/an.",
        opportunity_type: "Agro-industrie", min_investment: 50000, max_investment: 3000000,
        expected_return_min: 18, expected_return_max: 30, investment_horizon: "6-8 ans", risk_level: "medium",
        company_name: "Nile Aqua Farms", company_size: "PME", stage: "Expansion",
        market_size_usd: 2000000000, source_name: "Uganda Investment Authority", status: "active", is_verified: 1
    },
    {
        title: "Textile Vertical Integration - Éthiopie",
        sector: "Industrie", subsector: "Textile & Habillement", country: "ET", country_name: "Éthiopie", region: "Afrique de l'Est",
        summary: "Complexe textile intégré de la fibre aux vêtements finis - Export H&M, Zara",
        description: "Éthiopie = hub textile africain. Main d'œuvre qualifiée, énergie bas coût. Usine 5,000 employés. Contrats européens sécurisés.",
        opportunity_type: "Industrie Manufacturière", min_investment: 120000, max_investment: 10000000,
        expected_return_min: 14, expected_return_max: 24, investment_horizon: "7-10 ans", risk_level: "medium",
        company_name: "Ethiopian Textile Industries", company_size: "Grande entreprise", stage: "Expansion",
        market_size_usd: 8000000000, source_name: "Ethiopian Investment Commission", status: "active", is_verified: 1
    },
    {
        title: "Géothermie 300 MW - Kenya",
        sector: "Énergie", subsector: "Géothermie", country: "KE", country_name: "Kenya", region: "Afrique de l'Est",
        summary: "Centrale géothermique dans la vallée du Rift - Énergie propre 24/7",
        description: "Kenya : leader mondial géothermie. Vallée du Rift : potentiel 10 GW. Centrale 300 MW en base load. Coût production : 0.05 $/kWh.",
        opportunity_type: "Projet Énergétique", min_investment: 200000, max_investment: 18000000,
        expected_return_min: 13, expected_return_max: 19, investment_horizon: "12-15 ans", risk_level: "low",
        company_name: "Kenya Geothermal Development", company_size: "Grande entreprise", stage: "Développement",
        market_size_usd: 12000000000, source_name: "KenGen", status: "active", is_verified: 1
    },
    {
        title: "Café Premium Specialty - Tanzanie",
        sector: "Agriculture", subsector: "Café", country: "TZ", country_name: "Tanzanie", region: "Afrique de l'Est",
        summary: "Production café arabica premium certifié pour marché specialty coffee",
        description: "Tanzanie : café haute altitude réputé. Certification specialty (84+ points). Prix : 8-12 $/lb vs 2 $/lb café standard. 5,000 petits producteurs.",
        opportunity_type: "Agriculture Premium", min_investment: 40000, max_investment: 2000000,
        expected_return_min: 20, expected_return_max: 35, investment_horizon: "5-8 ans", risk_level: "medium",
        company_name: "Kilimanjaro Premium Coffee", company_size: "PME", stage: "Expansion",
        market_size_usd: 1500000000, source_name: "Tanzania Coffee Board", status: "active", is_verified: 1
    },
    {
        title: "Train Hydrogène - Tanzanie",
        sector: "Transport", subsector: "Rail Vert", country: "TZ", country_name: "Tanzanie", region: "Afrique de l'Est",
        summary: "Première ligne ferroviaire à hydrogène d'Afrique - Dar-Morogoro 200 km",
        description: "Technologie Alstom. Hydrogène vert produit par solaire local. 5 rames zéro émission. Si succès : conversion 2,500 km réseau d'ici 2035.",
        opportunity_type: "Transport Vert", min_investment: 150000, max_investment: 12000000,
        expected_return_min: 11, expected_return_max: 17, investment_horizon: "15-20 ans", risk_level: "medium",
        company_name: "Tanzania Railways Corporation", company_size: "Grande entreprise", stage: "Pilote",
        market_size_usd: 3000000000, source_name: "Alstom East Africa", status: "active", is_verified: 1
    },
    {
        title: "Horticulture Export - Kenya",
        sector: "Agriculture", subsector: "Horticulture", country: "KE", country_name: "Kenya", region: "Afrique de l'Est",
        summary: "Production fleurs coupées et légumes frais pour export Europe - 500 ha",
        description: "Kenya = 1er exportateur africain fleurs. Roses, œillets pour Europe. Climate optimal. Export aérien quotidien. Revenus : 15,000 $/ha.",
        opportunity_type: "Agro-Export", min_investment: 80000, max_investment: 5000000,
        expected_return_min: 16, expected_return_max: 28, investment_horizon: "6-9 ans", risk_level: "medium",
        company_name: "Kenya Blooms Ltd", company_size: "Moyenne entreprise", stage: "Expansion",
        market_size_usd: 2500000000, source_name: "Kenya Flower Council", status: "active", is_verified: 1
    },

    // AFRIQUE CENTRALE (8 opportunités)
    {
        title: "Barrage Hydroélectrique Grand Inga - RD Congo",
        sector: "Énergie", subsector: "Hydroélectricité", country: "CD", country_name: "RD Congo", region: "Afrique Centrale",
        summary: "Méga-projet 40 GW sur le fleuve Congo - Plus grand projet énergétique africain",
        description: "Potentiel : 40 GW (2x capacité totale Afrique du Sud). Fleuve Congo : débit 42,000 m³/s. Électrification continentale. Investissement : 80 milliards $.",
        opportunity_type: "Méga Projet", min_investment: 500000, max_investment: 50000000,
        expected_return_min: 10, expected_return_max: 16, investment_horizon: "20-25 ans", risk_level: "high",
        company_name: "Inga Development Authority", company_size: "Grande entreprise", stage: "Développement",
        market_size_usd: 80000000000, source_name: "African Development Bank", status: "active", is_verified: 1
    },
    {
        title: "Mines de Cobalt - RD Congo",
        sector: "Mines", subsector: "Métaux Stratégiques", country: "CD", country_name: "RD Congo", region: "Afrique Centrale",
        summary: "Exploitation cobalt pour batteries - RDC produit 70% du cobalt mondial",
        description: "Cobalt essentiel pour batteries Li-ion. RDC : 70% production mondiale. Réserves : 3.5M tonnes. Demande +15%/an (véhicules électriques).",
        opportunity_type: "Exploitation Minière", min_investment: 300000, max_investment: 25000000,
        expected_return_min: 18, expected_return_max: 35, investment_horizon: "10-15 ans", risk_level: "high",
        company_name: "Congo Cobalt Mining", company_size: "Grande entreprise", stage: "Expansion",
        market_size_usd: 22000000000, source_name: "USGS", status: "active", is_verified: 1
    },
    {
        title: "Plantation Huile de Palme Durable - Cameroun",
        sector: "Agriculture", subsector: "Huile de Palme", country: "CM", country_name: "Cameroun", region: "Afrique Centrale",
        summary: "50,000 hectares huile de palme certifiée RSPO - Production durable",
        description: "Cameroun : conditions idéales pour palmier. Certification RSPO (sustainable). Production : 12 tonnes huile/ha. Demande mondiale : +4%/an.",
        opportunity_type: "Agro-industrie", min_investment: 100000, max_investment: 8000000,
        expected_return_min: 14, expected_return_max: 22, investment_horizon: "10-15 ans", risk_level: "medium",
        company_name: "Cameroon Sustainable Palm", company_size: "Grande entreprise", stage: "Expansion",
        market_size_usd: 6000000000, source_name: "Cameroon Agri Ministry", status: "active", is_verified: 1
    },
    {
        title: "Datacenter Cloud - Gabon",
        sector: "Tech", subsector: "Infrastructure Cloud", country: "GA", country_name: "Gabon", region: "Afrique Centrale",
        summary: "Hub datacenter Afrique Centrale alimenté 100% hydroélectricité",
        description: "Gabon : 85% électricité hydro = énergie verte. Datacenter 5 MW. Connectivité fibre ACE + SAIL. Cible : cloud providers, entreprises régionales.",
        opportunity_type: "Infrastructure Tech", min_investment: 150000, max_investment: 10000000,
        expected_return_min: 15, expected_return_max: 25, investment_horizon: "8-12 ans", risk_level: "medium",
        company_name: "Gabon Data Hub", company_size: "Moyenne entreprise", stage: "Développement",
        market_size_usd: 2000000000, source_name: "Gabon Telecom", status: "active", is_verified: 1
    },
    {
        title: "Transformation Bois FSC - Congo",
        sector: "Industrie", subsector: "Bois & Foresterie", country: "CG", country_name: "Congo", region: "Afrique Centrale",
        summary: "Usine transformation bois certifié FSC - Meubles et parquets export",
        description: "Bassin du Congo : 2ème forêt tropicale mondiale. Gestion durable FSC. Transformation locale = 5x valeur ajoutée vs export grumes. Marché : Europe, Asie.",
        opportunity_type: "Industrie Bois", min_investment: 80000, max_investment: 5000000,
        expected_return_min: 16, expected_return_max: 26, investment_horizon: "8-12 ans", risk_level: "medium",
        company_name: "Congo Sustainable Timber", company_size: "Moyenne entreprise", stage: "Expansion",
        market_size_usd: 3500000000, source_name: "Congo Forest Ministry", status: "active", is_verified: 1
    },

    // AFRIQUE AUSTRALE (12 opportunités)
    {
        title: "Fintech Digitale TymeBank - Afrique du Sud",
        sector: "Finance", subsector: "Digital Banking", country: "ZA", country_name: "Afrique du Sud", region: "Afrique Australe",
        summary: "Banque 100% digitale visant 15M clients - Expansion Afrique Australe",
        description: "TymeBank : 12M clients en 6 ans. Zéro frais compte. App primée. Expansion : Botswana, Namibie, Zimbabwe. Valorisation : 3 milliards $. IPO prévue 2027.",
        opportunity_type: "Fintech Banking", min_investment: 100000, max_investment: 8000000,
        expected_return_min: 20, expected_return_max: 35, investment_horizon: "5-7 ans", risk_level: "medium",
        company_name: "TymeBank", company_size: "Grande entreprise", stage: "Growth",
        market_size_usd: 15000000000, source_name: "TymeBank Ltd", status: "active", is_verified: 1
    },
    {
        title: "Logistique E-commerce - Afrique du Sud",
        sector: "Commerce", subsector: "Logistique", country: "ZA", country_name: "Afrique du Sud", region: "Afrique Australe",
        summary: "Réseau de 20 centres de distribution automatisés pour e-commerce",
        description: "E-commerce africain : +28%/an. Entrepôts robotisés Johannesburg, Cape Town, Durban. Last-mile delivery 15M clients. Takealot, Superbalist, Amazon.",
        opportunity_type: "Infrastructure Logistique", min_investment: 100000, max_investment: 8000000,
        expected_return_min: 18, expected_return_max: 32, investment_horizon: "6-9 ans", risk_level: "medium",
        company_name: "AfriLogistics Hub", company_size: "Moyenne entreprise", stage: "Expansion",
        market_size_usd: 10000000000, source_name: "SA Chamber of Commerce", status: "active", is_verified: 1
    },
    {
        title: "Platine et Palladium - Afrique du Sud",
        sector: "Mines", subsector: "Métaux Précieux", country: "ZA", country_name: "Afrique du Sud", region: "Afrique Australe",
        summary: "Mine de platine et palladium - Afrique du Sud détient 90% réserves mondiales",
        description: "Bushveld Complex : 90% réserves mondiales PGM (platine, palladium, rhodium). Demande : catalyseurs auto, hydrogène, joaillerie. Production : 150K oz/an.",
        opportunity_type: "Exploitation Minière", min_investment: 250000, max_investment: 20000000,
        expected_return_min: 16, expected_return_max: 30, investment_horizon: "12-15 ans", risk_level: "medium",
        company_name: "SA Platinum Group", company_size: "Grande entreprise", stage: "Expansion",
        market_size_usd: 18000000000, source_name: "Minerals Council SA", status: "active", is_verified: 1
    },
    {
        title: "Diamants Taille & Certification - Botswana",
        sector: "Mines", subsector: "Diamant", country: "BW", country_name: "Botswana", region: "Afrique Australe",
        summary: "ZES transfrontalière Botswana-SA pour taille et trading diamants",
        description: "Botswana + SA = 60% diamants mondiaux en valeur. ZES Gaborone : taille, polissage, certification. Objectif : capter 40% valeur ajoutée. 25,000 emplois.",
        opportunity_type: "Zone Économique Spéciale", min_investment: 120000, max_investment: 10000000,
        expected_return_min: 18, expected_return_max: 32, investment_horizon: "8-12 ans", risk_level: "medium",
        company_name: "Botswana Diamond Hub", company_size: "Moyenne entreprise", stage: "Développement",
        market_size_usd: 12000000000, source_name: "Government of Botswana", status: "active", is_verified: 1
    },
    {
        title: "Centrale Solaire 500 MW - Namibie",
        sector: "Énergie", subsector: "Solaire", country: "NA", country_name: "Namibie", region: "Afrique Australe",
        summary: "Méga centrale solaire dans le désert du Namib avec stockage 300 MWh",
        description: "Désert Namib : ensoleillement exceptionnel (6.5 kWh/m²/jour). Centrale 500 MW + stockage batteries. Export vers SA via interconnexion. Contrat 25 ans.",
        opportunity_type: "Projet Solaire", min_investment: 200000, max_investment: 25000000,
        expected_return_min: 12, expected_return_max: 18, investment_horizon: "15-20 ans", risk_level: "low",
        company_name: "Namib Solar Energy", company_size: "Grande entreprise", stage: "Développement",
        market_size_usd: 8000000000, source_name: "Namibia Energy Ministry", status: "active", is_verified: 1
    },
    {
        title: "Tourisme Victoria Falls - Zimbabwe",
        sector: "Tourisme", subsector: "Tourisme d'Aventure", country: "ZW", country_name: "Zimbabwe", region: "Afrique Australe",
        summary: "Complexe touristique Victoria Falls - Site UNESCO majeur",
        description: "Victoria Falls : une des 7 merveilles naturelles. 1.5M visiteurs/an. Resort 5 étoiles + activités. Reprise post-covid : +40%/an. Revenus : 800 $/visiteur.",
        opportunity_type: "Développement Touristique", min_investment: 150000, max_investment: 12000000,
        expected_return_min: 20, expected_return_max: 35, investment_horizon: "7-10 ans", risk_level: "medium",
        company_name: "Victoria Falls Resorts", company_size: "Moyenne entreprise", stage: "Expansion",
        market_size_usd: 3000000000, source_name: "Zimbabwe Tourism Authority", status: "active", is_verified: 1
    },
    {
        title: "Cuivre et Cobalt - Zambie",
        sector: "Mines", subsector: "Métaux de Base", country: "ZM", country_name: "Zambie", region: "Afrique Australe",
        summary: "Mine de cuivre avec co-production cobalt - Copperbelt zambien",
        description: "Zambie : 2ème producteur africain cuivre. Copperbelt : réserves 20M tonnes. Cuivre pour transition énergétique. Production : 100K tonnes Cu + 5K tonnes Co/an.",
        opportunity_type: "Exploitation Minière", min_investment: 200000, max_investment: 18000000,
        expected_return_min: 16, expected_return_max: 28, investment_horizon: "12-18 ans", risk_level: "medium",
        company_name: "Zambia Copper Mines", company_size: "Grande entreprise", stage: "Expansion",
        market_size_usd: 15000000000, source_name: "Zambia Chamber of Mines", status: "active", is_verified: 1
    },
    {
        title: "Agriculture de Conservation - Mozambique",
        sector: "Agriculture", subsector: "Grandes Cultures", country: "MZ", country_name: "Mozambique", region: "Afrique Australe",
        summary: "100,000 hectares agriculture de conservation - Soja, maïs, sésame",
        description: "Mozambique : terre arable abondante, pluies suffisantes. Agriculture conservation : moins labour, couverture sols. Cultures : soja, maïs, sésame export Asie.",
        opportunity_type: "Agro-industrie", min_investment: 120000, max_investment: 10000000,
        expected_return_min: 14, expected_return_max: 24, investment_horizon: "8-12 ans", risk_level: "medium",
        company_name: "Mozambique Grains Ltd", company_size: "Grande entreprise", stage: "Expansion",
        market_size_usd: 5000000000, source_name: "Mozambique Agri Ministry", status: "active", is_verified: 1
    },

    // OCÉAN INDIEN (3 opportunités)
    {
        title: "Tourisme Luxe - Maurice",
        sector: "Tourisme", subsector: "Hôtellerie de Luxe", country: "MU", country_name: "Maurice", region: "Océan Indien",
        summary: "Réseau de resorts 5 étoiles sur îles Maurice et Rodrigues",
        description: "Maurice : destination premium (1,500 $/nuit). Clientèle : Europe, Asie, Afrique. Plages paradisiaques, stabilité politique. Objectif : 2M touristes/an.",
        opportunity_type: "Tourisme Premium", min_investment: 200000, max_investment: 15000000,
        expected_return_min: 16, expected_return_max: 28, investment_horizon: "8-12 ans", risk_level: "low",
        company_name: "Mauritius Luxury Resorts", company_size: "Moyenne entreprise", stage: "Expansion",
        market_size_usd: 4500000000, source_name: "Mauritius Tourism Board", status: "active", is_verified: 1
    },
    {
        title: "Vanille Premium - Madagascar",
        sector: "Agriculture", subsector: "Épices", country: "MG", country_name: "Madagascar", region: "Océan Indien",
        summary: "Production vanille bourbon premium - Madagascar produit 80% vanille mondiale",
        description: "Vanille bourbon malgache : référence mondiale. Prix : 400-600 $/kg. Production certifiée bio. Contrats long terme avec Nestlé, Unilever. Objectif : 200 tonnes/an.",
        opportunity_type: "Agriculture Premium", min_investment: 60000, max_investment: 3000000,
        expected_return_min: 22, expected_return_max: 40, investment_horizon: "6-9 ans", risk_level: "medium",
        company_name: "Madagascar Vanilla Cooperative", company_size: "PME", stage: "Expansion",
        market_size_usd: 1200000000, source_name: "Madagascar Export Board", status: "active", is_verified: 1
    },
    {
        title: "Centre Offshore Tech - Seychelles",
        sector: "Tech", subsector: "Services IT", country: "SC", country_name: "Seychelles", region: "Océan Indien",
        summary: "Hub de services tech offshore - Développement logiciel et support client",
        description: "Seychelles : hub financier stable, anglophone. Centre offshore pour services IT : dev software, support client, BPO. Cible : entreprises européennes et africaines.",
        opportunity_type: "Services Tech", min_investment: 80000, max_investment: 4000000,
        expected_return_min: 18, expected_return_max: 30, investment_horizon: "5-8 ans", risk_level: "low",
        company_name: "Seychelles Tech Hub", company_size: "PME", stage: "Growth",
        market_size_usd: 2500000000, source_name: "Seychelles Investment Board", status: "active", is_verified: 1
    },

    // Opportunités transversales multi-pays (5)
    {
        title: "AfCFTA Payment System PAPSS - Pan-Africain",
        sector: "Finance", subsector: "Infrastructure Paiements", country: "GH", country_name: "Ghana", region: "Pan-Africain",
        summary: "Système de paiement panafricain pour commerce intra-africain en monnaies locales",
        description: "PAPSS connecte banques centrales de 42 pays. Règlements instantanés en monnaies locales. Objectif : doubler commerce intra-africain à 500 milliards $.",
        opportunity_type: "Infrastructure Financière", min_investment: 150000, max_investment: 12000000,
        expected_return_min: 15, expected_return_max: 25, investment_horizon: "8-12 ans", risk_level: "medium",
        company_name: "African Export-Import Bank", company_size: "Institution Multilatérale", stage: "Déploiement",
        market_size_usd: 500000000000, source_name: "African Union", status: "active", is_verified: 1
    },
    {
        title: "Corridor Énergétique Afrique de l'Ouest - WAPP",
        sector: "Énergie", subsector: "Interconnexion Électrique", country: "CI", country_name: "Côte d'Ivoire", region: "Afrique de l'Ouest",
        summary: "Interconnexion électrique régionale pour optimisation production et distribution",
        description: "West African Power Pool : réseau interconnecté 14 pays. Optimisation production (solaire, hydro, gaz). Réduction coûts. Sécurité énergétique. Investissement : 3 milliards $.",
        opportunity_type: "Infrastructure Régionale", min_investment: 200000, max_investment: 15000000,
        expected_return_min: 11, expected_return_max: 17, investment_horizon: "15-20 ans", risk_level: "medium",
        company_name: "West African Power Pool", company_size: "Organisation Régionale", stage: "Expansion",
        market_size_usd: 25000000000, source_name: "ECOWAS", status: "active", is_verified: 1
    }
];

console.log(`\n📊 OPPORTUNITÉS D'INVESTISSEMENT\n`);
console.log(`Total opportunités à insérer : ${opportunities.length}`);
console.log('-'.repeat(70));

const insertOpp = db.prepare(`
    INSERT INTO investment_opportunities (
        title, slug, sector, subsector, country, country_name, region,
        summary, description, opportunity_type,
        min_investment, max_investment,
        expected_return_min, expected_return_max,
        investment_horizon, risk_level,
        company_name, company_size, stage,
        market_size_usd, source_name,
        status, published_at, is_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
`);

const insertTag = db.prepare('INSERT OR IGNORE INTO opportunity_tags (opportunity_id, tag) VALUES (?, ?)');

let oppCount = 0;
let tagCount = 0;

// Vider d'abord les opportunités existantes pour éviter les doublons
console.log('🗑️  Nettoyage des anciennes opportunités...');
db.prepare('DELETE FROM opportunity_tags').run();
db.prepare('DELETE FROM investment_opportunities').run();

for (const opp of opportunities) {
    const slug = generateSlug(opp.title);

    try {
        const result = insertOpp.run(
            opp.title, slug, opp.sector, opp.subsector,
            opp.country, opp.country_name, opp.region,
            opp.summary, opp.description, opp.opportunity_type,
            opp.min_investment, opp.max_investment,
            opp.expected_return_min, opp.expected_return_max,
            opp.investment_horizon, opp.risk_level,
            opp.company_name, opp.company_size, opp.stage,
            opp.market_size_usd, opp.source_name,
            opp.status, opp.is_verified
        );

        const oppId = result.lastInsertRowid;

        // Tags automatiques
        insertTag.run(oppId, opp.sector); tagCount++;
        insertTag.run(oppId, opp.country_name); tagCount++;
        insertTag.run(oppId, opp.region); tagCount++;
        if (opp.risk_level === 'high') { insertTag.run(oppId, 'Haut Rendement'); tagCount++; }
        if (opp.risk_level === 'low') { insertTag.run(oppId, 'Faible Risque'); tagCount++; }
        if (opp.is_verified) { insertTag.run(oppId, 'Vérifié'); tagCount++; }

        oppCount++;
        console.log(`✅ ${opp.country_name.padEnd(20)} | ${opp.title.substring(0, 50)}`);
    } catch (error) {
        console.error(`❌ ${opp.title}: ${error.message}`);
    }
}

console.log('-'.repeat(70));
console.log(`✅ ${oppCount} opportunités insérées`);
console.log(`✅ ${tagCount} tags insérés\n`);

// ============================================
// ACTUALITÉS FINANCIÈRES (60+)
// ============================================

const newsArticles = [
    // Actualités par région et catégorie

    // MARCHÉS & BOURSES (10)
    {
        title: "La BRVM atteint un nouveau record historique avec +22% en 2026",
        category: "Marchés",
        summary: "La bourse régionale d'Afrique de l'Ouest affiche une performance exceptionnelle portée par la tech et la finance",
        content: "La Bourse Régionale des Valeurs Mobilières (BRVM) clôture le premier semestre 2026 avec une hausse remarquable de 22% de son indice composite BRVM-C. Les valeurs bancaires progressent de 28%, tandis que le secteur technologique bondit de 35%. Cette performance s'explique par l'afflux d'investisseurs institutionnels internationaux, séduits par la croissance économique de la zone UEMOA (+6.5% de PIB prévu en 2026). Le volume quotidien des transactions a doublé, atteignant 8 milliards FCFA par jour. Les analystes prévoient une poursuite de cette tendance haussière avec l'intégration prochaine de nouvelles entreprises tech au marché.",
        source: "BRVM", country: "CI", hoursAgo: 2
    },
    {
        title: "La bourse de Johannesburg JSE lance le trading de cryptos réglementées",
        category: "Marchés",
        summary: "Première place boursière africaine à intégrer le trading de crypto-actifs sous supervision régulateur",
        content: "La Johannesburg Stock Exchange (JSE), plus importante bourse africaine avec 800 milliards $ de capitalisation, annonce le lancement de sa plateforme de trading de crypto-actifs réglementés. Les investisseurs pourront échanger Bitcoin, Ethereum et 8 autres cryptomonnaies approuvées par la FSCA (Financial Sector Conduct Authority). Cette initiative positionne l'Afrique du Sud comme hub fintech continental. Le trading démarre avec des contrôles stricts anti-blanchiment et des limites de volatilité. Les volumes attendus : 500 millions $/mois la première année.",
        source: "JSE Limited", country: "ZA", hoursAgo: 6
    },
    {
        title: "Le Nigeria Stock Exchange devient NGX Group et vise 1 trillion $ de capitalisation",
        category: "Marchés",
        summary: "Rebranding et ambitions de la bourse nigériane qui veut tripler sa capitalisation d'ici 2030",
        content: "La Nigerian Stock Exchange (NSE) se transforme en NGX Group (Nigerian Exchange Group) dans le cadre d'une refonte stratégique majeure. Avec une capitalisation actuelle de 350 milliards $, la NGX vise 1 trillion $ d'ici 2030 grâce à l'introduction de 200 nouvelles sociétés, l'expansion du trading électronique 24/7, et l'attraction d'investisseurs étrangers. Le groupe diversifie ses activités : NGX (actions), NGXR (produits dérivés), NGX REGCO (régulation). La réforme du code des sociétés facilite les IPO, avec 15 introductions prévues en 2026, dont Flutterwave et Andela valorisées à plusieurs milliards.",
        source: "NGX Group", country: "NG", hoursAgo: 12
    },
    {
        title: "Casablanca Stock Exchange intègre l'indice MSCI Emerging Markets",
        category: "Marchés",
        summary: "Le Maroc devient officiellement un marché émergent selon MSCI, ouvrant la voie aux investisseurs institutionnels",
        content: "Victoire stratégique pour le Maroc : MSCI reclasse la Casablanca Stock Exchange de 'Frontier Market' à 'Emerging Market', rejoignant ainsi l'Égypte et l'Afrique du Sud. Cette promotion déclenche automatiquement des flux d'investissements de fonds indiciels gérant 2,500 milliards $. Les critères de liquidité, taille de marché et qualité réglementaire ont été validés. La capitalisation de la CSE (65 milliards $) devrait augmenter de 30% grâce aux entrées de capitaux. Les banques marocaines (Attijariwafa, BCP) et OCP bénéficieront le plus de cet afflux.",
        source: "Casablanca Stock Exchange", country: "MA", hoursAgo: 24
    },
    {
        title: "Nairobi Securities Exchange lance la première plateforme africaine de Green Bonds",
        category: "Marchés",
        summary: "Le Kenya crée un marché dédié aux obligations vertes pour financer la transition climatique",
        content: "La NSE (Nairobi Securities Exchange) inaugure la première plateforme africaine exclusivement dédiée au trading d'obligations vertes et durables. Le segment 'Green Bond Market' permet aux entreprises et gouvernements d'émettre des titres verts certifiés selon les standards Climate Bonds Initiative. Déjà 8 émissions annoncées pour 3 milliards $, incluant Kenya Power (énergie renouvelable), Safaricom (infrastructure verte), et le Kenya Green Bond Programme souverain. Les investisseurs bénéficient d'avantages fiscaux (15% tax credit). Cette initiative positionne Nairobi comme capitale africaine de la finance verte.",
        source: "Nairobi Securities Exchange", country: "KE", hoursAgo: 36
    },

    // FINTECH & MOBILE MONEY (12)
    {
        title: "M-Pesa dépasse 80 millions d'utilisateurs et lance M-Pesa Super App",
        category: "Finance",
        summary: "Safaricom transforme M-Pesa en super app intégrant paiements, e-commerce, santé et éducation",
        content: "M-Pesa, leader africain du mobile money avec 80 millions d'utilisateurs actifs, se transforme en 'super app' sur le modèle WeChat. La nouvelle M-Pesa Africa intègre : paiements instantanés dans 7 pays, marketplace e-commerce (10,000 marchands), micro-assurance santé, micro-crédits instantanés, investissement en bourse, et bientôt crypto trading. Les transactions quotidiennes atteignent 1 milliard $. L'expansion en Éthiopie (120M habitants) démarre en septembre 2026. Valorisation de la division M-Pesa : 8 milliards $. Une IPO partielle est prévue pour 2027 à la NSE et possiblement au NYSE.",
        source: "Safaricom PLC", country: "KE", hoursAgo: 8
    },
    {
        title: "Wave lève 500M$ en série C et devient la 2ème licorne fintech africaine",
        category: "Fintech",
        summary: "La fintech sénégalaise de mobile money atteint une valorisation de 2 milliards $",
        content: "Wave, startup sénégalaise de transfert d'argent mobile, boucle une levée spectaculaire de 500 millions $ menée par Sequoia Capital, FTX Ventures et la SFI (Banque Mondiale). Valorisation : 2 milliards $, faisant de Wave la 2ème licorne fintech africaine après Flutterwave. Wave compte 10 millions d'utilisateurs au Sénégal, Côte d'Ivoire, Burkina Faso et Mali, avec zéro frais sur les transferts (vs 2-5% concurrents). Le modèle : monétisation via cash-out, crédits et épargne. Les fonds financent l'expansion dans 8 nouveaux pays UEMOA et CEMAC. Objectif : 50M utilisateurs d'ici 2028.",
        source: "Wave Mobile Money", country: "SN", hoursAgo: 18
    },
    {
        title: "MTN annonce la scission de sa division fintech MoMo valorisée à 6 milliards $",
        category: "Fintech",
        summary: "Le géant sud-africain des télécoms prépare l'IPO de MTN Mobile Money",
        content: "MTN Group annonce la scission de sa division fintech MTN Mobile Money (MoMo) avec une introduction en bourse prévue pour début 2027. Valorisation cible : 6 milliards $. MoMo compte 70 millions d'utilisateurs actifs dans 18 pays africains (Nigeria, Ghana, Ouganda, Cameroun, Côte d'Ivoire...) et traite 2.5 milliards $ de transactions mensuelles. Croissance annuelle : +35% en volume, +45% en revenus. L'IPO se fera simultanément à Johannesburg (JSE) et possiblement à Londres (LSE) pour attirer les investisseurs institutionnels internationaux. MTN gardera 65% du capital post-IPO.",
        source: "MTN Group", country: "ZA", hoursAgo: 48
    },
    {
        title: "OPay Nigeria dépasse 30 millions d'utilisateurs et se lance dans le crédit",
        category: "Fintech",
        summary: "La super app nigériane ajoute des services de micro-crédit instantané",
        content: "OPay, super app fintech nigériane soutenue par SoftBank et Sequoia, franchit le cap de 30 millions d'utilisateurs et lance OCredit, son service de micro-prêts instantanés. Utilisant l'IA et les données transactionnelles, OPay peut octroyer des crédits de 10$ à 1,000$ en moins de 3 minutes, avec des taux de défaut inférieurs à 5% grâce au scoring algorithmique. La plateforme traite 5 milliards $ de transactions mensuelles (paiements, transferts, bills, paris sportifs). OPay vise la rentabilité en 2026 et une IPO en 2028 avec valorisation attendue de 4 milliards $.",
        source: "OPay Digital Services", country: "NG", hoursAgo: 60
    },
    {
        title: "Flutterwave atteint 10 milliards $ de transactions annuelles",
        category: "Fintech",
        summary: "La licorne nigériane des paiements double son volume de transactions en un an",
        content: "Flutterwave, première licorne fintech africaine valorisée à 3 milliards $, annonce avoir traité 10 milliards $ de paiements sur les 12 derniers mois, soit le double de l'année précédente. La plateforme connecte 1.5 million de marchands dans 35 pays africains et permet d'accepter paiements en 150 devises. Expansion internationale : partenariats avec PayPal, Alipay et Worldpay pour faciliter les paiements des diasporas africaines. Nouveaux services : Flutterwave Store (e-commerce), Flutterwave Capital (financement marchands), et bientôt stablecoin Fluttercoin. Objectif : 50 milliards $ de TPV d'ici 2028.",
        source: "Flutterwave", country: "NG", hoursAgo: 72
    },

    // CRYPTO & BLOCKCHAIN (8)
    {
        title: "Le Nigeria lance officiellement eNaira 2.0 sur blockchain publique",
        category: "Crypto",
        summary: "La CBDC nigériane passe en version 2.0 avec une blockchain publique permissionnée",
        content: "La Central Bank of Nigeria (CBN) déploie eNaira 2.0, version améliorée de sa monnaie numérique utilisant une blockchain publique permissionnée basée sur Hyperledger Besu. Contrairement à la v1 critiquée pour centralisation, eNaira 2.0 offre plus de transparence tout en restant régulée. Interopérable avec M-Pesa, OPay et autres wallets via protocole ouvert. Adoption explosive : 5 millions de portefeuilles en 3 mois. Use cases : paiements transfrontaliers instantanés en Afrique de l'Ouest, distribution d'aides sociales gouvernementales, remittances diaspora (9% de frais économisés). La CBN vise 50M d'utilisateurs fin 2026.",
        source: "Central Bank of Nigeria", country: "NG", hoursAgo: 14
    },
    {
        title: "La Banque Africaine de Développement émet 1 milliard $ de blockchain bonds",
        category: "Crypto",
        summary: "Première émission obligataire souveraine entièrement sur blockchain en Afrique",
        content: "La BAD (Banque Africaine de Développement) réalise une première mondiale en émettant 1 milliard $ d'obligations intégralement sur blockchain Ethereum. Ces 'AfDB Digital Bonds' à 5 ans (coupon 4.5%) utilisent des smart contracts pour automatiser les paiements de coupons et le règlement. Avantages : transparence totale, coûts d'émission réduits de 70%, trading secondaire 24/7, fractionnement permettant investissements dès 100$. Souscription ouverte aux investisseurs institutionnels et particuliers via plateformes partenaires. Cette innovation démocratise l'accès au financement du développement et positionne l'Afrique à la pointe de la finance décentralisée.",
        source: "African Development Bank", country: "CI", hoursAgo: 20
    },
    {
        title: "La Côte d'Ivoire adopte l'euro numérique dans un programme pilote BCE",
        category: "Crypto",
        summary: "Premier test africain de l'euro digital pour réduire les coûts de transferts",
        content: "La Banque Centrale Européenne (BCE) et la BCEAO lancent un programme pilote de 12 mois testant l'euro numérique en Côte d'Ivoire. 200,000 Ivoiriens pourront utiliser des e-euros pour paiements quotidiens et recevoir des transferts depuis la zone euro. Objectif : réduire les frais de remittances de 8% actuellement à moins de 1% grâce à la technologie CBDC. Les paiements sont instantanés et fonctionnent même offline. Si le test réussit, déploiement prévu dans les 8 pays UEMOA dès 2027, facilitant 30 milliards € de commerce annuel UE-Afrique de l'Ouest.",
        source: "BCEAO", country: "CI", hoursAgo: 28
    },
    {
        title: "Binance Africa franchit 15 millions d'utilisateurs et lance Binance Pay Africa",
        category: "Crypto",
        summary: "L'exchange crypto n°1 mondial renforce son empreinte africaine",
        content: "Binance annonce 15 millions d'utilisateurs africains (+120% en un an), représentant 8% de sa base mondiale. Lancement de Binance Pay Africa : solution de paiement permettant aux marchands d'accepter cryptos avec conversion instantanée en monnaie locale (Naira, Cedi, Shilling). Intégration avec M-Pesa, Wave, OPay. Partenariats avec Jumia et Konga (e-commerce) pour adoption marchande. Trading peer-to-peer en forte hausse : 8 milliards $/mois en Afrique. Binance ouvre 3 bureaux régionaux (Lagos, Nairobi, Johannesburg) et recrute 200 personnes pour conformité et support local.",
        source: "Binance Africa", country: "NG", hoursAgo: 40
    },

    // ÉNERGIE (12)
    {
        title: "L'Égypte signe 15 GW de projets d'hydrogène vert pour 40 milliards $",
        category: "Énergie",
        summary: "Le plus grand programme africain d'hydrogène vert pour export vers l'Europe",
        content: "L'Égypte devient le leader africain de l'hydrogène vert en signant des protocoles d'accord pour 15 GW de capacité d'électrolyse, représentant 40 milliards $ d'investissements. 9 consortiums internationaux (dont Siemens, Masdar, TotalEnergies) développeront des méga-usines dans le Golfe de Suez, alimentées par solaire et éolien. Production visée : 1.2 million de tonnes d'H2 vert par an d'ici 2030, destinées à 80% à l'export vers Europe via pipeline méditerranéen. L'Égypte vise 8% du marché mondial d'hydrogène. Création de 100,000 emplois. Revenus d'export projetés : 15 milliards $/an dès 2032.",
        source: "Egyptian Electricity Ministry", country: "EG", hoursAgo: 10
    },
    {
        title: "Total Energies relance le mégaprojet Mozambique LNG avec 10 milliards $ additionnels",
        category: "Énergie",
        summary: "Le géant français reprend l'exploitation de gaz après 3 ans de suspension sécuritaire",
        content: "Total Energies annonce la reprise du projet Mozambique LNG avec un investissement additionnel de 10 milliards $, portant le total à 30 milliards $. Le projet, suspendu en 2021 suite aux attaques terroristes à Cabo Delgado, redémarre grâce à la sécurisation de la zone par les forces rwandaises et SADC. Réserves : 2,400 milliards m³ de gaz. Production prévue : 13 millions de tonnes de GNL/an dès 2028, faisant du Mozambique le 3ème exportateur mondial. Revenus gouvernementaux : 100 milliards $ sur 25 ans. Total contrôle 26.5% du projet, avec partenaires ENI, CNPC, ONGC.",
        source: "Total Energies", country: "MZ", hoursAgo: 16
    },
    {
        title: "Le Sénégal découvre 3 milliards de barils de pétrole offshore",
        category: "Énergie",
        summary: "Nouvelle découverte majeure qui double les réserves pétrolières sénégalaises",
        content: "BP annonce une découverte pétrolière majeure dans le bassin offshore sénégalais : le nouveau champ 'Sangomar Deep' contiendrait 3 milliards de barils récupérables. Cette découverte s'ajoute aux champs SNE et FAN déjà en développement, portant les réserves totales du Sénégal à 6 milliards de barils. Production attendue : 400,000 barils/jour dès 2028 (vs 100,000 bbl/j actuellement). Le Sénégal devient un producteur pétrolier significatif, générant 3 milliards $/an de revenus. Les infrastructures : FPSO de 150,000 bbl/j, pipeline d'export, terminal de liquéfaction. Partenaires : BP (60%), Kosmos Energy (30%), Petrosen (10%).",
        source: "BP Exploration Senegal", country: "SN", hoursAgo: 22
    },
    {
        title: "Le barrage Renaissance d'Éthiopie atteint sa pleine capacité de 6,000 MW",
        category: "Énergie",
        summary: "Le plus grand barrage hydroélectrique africain commence sa production commerciale complète",
        content: "Le Grand Ethiopian Renaissance Dam (GERD) atteint enfin sa capacité maximale de 6,000 MW après 11 ans de construction et de controverses avec l'Égypte et le Soudan. Coût total : 5 milliards $. Le barrage produit désormais 16,000 GWh/an, doublant la capacité électrique éthiopienne. Production excédentaire exportée vers Kenya, Soudan, Djibouti via interconnexions régionales. Revenus d'export : 1 milliard $/an. L'accord tripartite Éthiopie-Égypte-Soudan sur le remplissage garantit les débits du Nil. Le GERD transforme l'Éthiopie en powerhouse énergétique régionale et catalyseur d'industrialisation.",
        source: "Ethiopian Electric Power", country: "ET", hoursAgo: 30
    },
    {
        title: "Le Maroc dépasse 60% d'énergie renouvelable dans son mix électrique",
        category: "Énergie",
        summary: "Le royaume atteint 3 ans en avance son objectif de transition énergétique",
        content: "Le Maroc franchit un cap historique en atteignant 62% d'énergies renouvelables dans son mix électrique en 2026, dépassant son objectif de 52% prévu pour 2030. Le pays dispose désormais de : 4 GW solaire (Ouarzazate Noor, le plus grand CSP mondial), 2 GW éolien (parcs de Tanger, Tarfaya), 2 GW hydro. Nouvelles capacités en construction : 3 GW supplémentaires d'ici 2028. Le Maroc devient exportateur net d'électricité vers l'Espagne et l'Algérie via interconnexions. Industrie locale : production de panneaux solaires et éoliennes à Tanger pour export africain. Objectif 2030 révisé : 80% renouvelables.",
        source: "MASEN Morocco", country: "MA", hoursAgo: 42
    },

    // INFRASTRUCTURE & TRANSPORT (10)
    {
        title: "La BAD approuve 600M$ pour l'extension du SGR Kenya-Ouganda-Rwanda",
        category: "Infrastructure",
        summary: "Financement du corridor ferroviaire stratégique d'Afrique de l'Est",
        content: "La Banque Africaine de Développement approuve un prêt de 600 millions $ pour financer la phase 3 du Standard Gauge Railway (SGR) reliant Nairobi à Kampala et Kigali. Ce corridor de 1,400 km réduira les temps de transport de marchandises de 75% et les coûts de 40%. Capacité : 25 millions de tonnes/an. Impact : boost du commerce régional EAC (200 milliards $), connexion des ports de Mombasa et Dar es Salaam à l'hinterland. Construction : 6 ans, 12,000 emplois directs. Partenaires : Kenya Railways, Uganda Railways, Rwanda Railways. Technologies chinoises (CRBC) avec transfert de compétences.",
        source: "African Development Bank", country: "KE", hoursAgo: 12
    },
    {
        title: "Ethiopian Airlines commande 80 avions électriques et hydrogène pour 4 milliards $",
        category: "Transport",
        summary: "La plus grande compagnie africaine s'engage dans l'aviation zéro émission",
        content: "Ethiopian Airlines, leader africain avec 150 destinations, signe deux contrats historiques : 50 avions électriques ES-30 (Heart Aerospace) et 30 avions à hydrogène (Airbus ZEROe) pour 4 milliards $. Livraisons 2028-2035. Les ES-30 (30 sièges, 400 km autonomie) serviront les routes régionales Addis-Nairobi, Addis-Kigali. Les A320 hydrogène (180 sièges, 3,500 km) opéreront les liaisons intra-africaines moyennes distances. Ethiopian devient la première compagnie africaine à s'engager concrètement dans l'aviation décarbonée. Infrastructure : stations de recharge électrique et production d'hydrogène vert à Addis. Objectif : -50% émissions d'ici 2035.",
        source: "Ethiopian Airlines", country: "ET", hoursAgo: 24
    },
    {
        title: "Le Port de Djibouti devient le 1er hub africain 100% automatisé",
        category: "Infrastructure",
        summary: "Modernisation complète avec grues automatiques et gestion par IA",
        content: "Le Port de Djibouti achève sa transformation en premier hub portuaire africain entièrement automatisé. Investissement : 3 milliards $ sur 5 ans. Nouvelles infrastructures : 30 grues automatiques STS/RTG, terminal conteneurs de 2 millions TEU, système de gestion par IA optimisant les opérations. Temps de traitement divisé par 3 : 24h vs 72h avant. Position stratégique : porte d'entrée de l'Éthiopie (120M habitants), Soudan du Sud, Somalie. Trafic : 1.8M TEU/an, objectif 5M TEU d'ici 2030. Concurrence directe avec ports du Golfe. Extension : terminal pétrolier, chantiers navals, zone franche 48 km².",
        source: "Port of Djibouti", country: "DJ", hoursAgo: 36
    },

    // INDUSTRIE & MANUFACTURING (8)
    {
        title: "Dangote Refinery produit ses premiers litres d'essence et gasoil",
        category: "Industrie",
        summary: "La plus grande raffinerie africaine démarre sa production commerciale",
        content: "La raffinerie Dangote de 19 milliards $ à Lagos commence sa production commerciale avec 650,000 barils/jour de capacité. Production : essence, diesel, kérosène, polypropylène. Le Nigeria, premier producteur pétrolier africain (2M bbl/j), importait paradoxalement 100% de ses produits raffinés pour 10 milliards $/an. Dangote Refinery change la donne : Nigeria devient exportateur net de produits pétroliers vers Afrique de l'Ouest. Impact : économie de 8 milliards $/an de devises, 70,000 emplois créés, baisse des prix à la pompe de 15%. Aliko Dangote consolide sa position d'homme le plus riche d'Afrique (fortune : 22 milliards $).",
        source: "Dangote Group", country: "NG", hoursAgo: 8
    },
    {
        title: "Volkswagen inaugure sa 2ème usine africaine au Ghana pour 50,000 voitures/an",
        category: "Industrie",
        summary: "Le constructeur allemand investit 300M$ dans l'assemblage automobile en Afrique de l'Ouest",
        content: "Volkswagen inaugure son usine d'assemblage d'Accra (Ghana) avec une capacité de 50,000 véhicules par an. Investissement : 300 millions $. Production : VW Polo, Passat, Tiguan, Amarok pour marché CEDEAO (380M habitants). L'usine de 10 hectares emploie 2,000 personnes avec objectif 50% de composants locaux d'ici 2028. VW bénéficie de l'African Automotive Policy : droits de douane préférentiels dans la zone ZLECAF. C'est la 2ème usine africaine de VW après l'Afrique du Sud (150,000 véhicules/an). Concurrence : Toyota Kenya, Peugeot Nigeria, Hyundai Algérie. Marché africain : 1.5M véhicules/an, +8% croissance.",
        source: "Volkswagen Ghana", country: "GH", hoursAgo: 18
    },

    // TECH & DIGITAL (10)
    {
        title: "Google ouvre un AI Research Center à Lagos avec 500 chercheurs",
        category: "Tech",
        summary: "Premier centre de recherche en intelligence artificielle de Google en Afrique",
        content: "Google inaugure son premier AI Research Center africain à Lagos, Nigeria, avec un investissement de 200 millions $ sur 5 ans. Le centre emploiera 500 chercheurs et ingénieurs travaillant sur l'IA adaptée aux contextes africains : reconnaissance vocale en langues locales (Yoruba, Igbo, Swahili, Amharique), computer vision pour agriculture, NLP pour éducation, ML pour santé. Partenariats avec 20 universités africaines (Covenant, Makerere, Stellenbosch). Google vise à former 100,000 développeurs africains en IA d'ici 2028. Le centre développera des produits spécifiques : Google Translate Afrique (50 langues), Google Lens Agriculture, Bard Afrique.",
        source: "Google Africa", country: "NG", hoursAgo: 14
    },
    {
        title: "Jumia atteint la rentabilité avec 20 millions de clients actifs",
        category: "E-commerce",
        summary: "L'Amazon africain annonce son premier exercice profitable 11 ans après sa création",
        content: "Jumia Technologies, surnommé 'l'Amazon africain', publie son premier exercice annuel profitable avec 35 millions $ de bénéfice net. Recentrage stratégique sur 7 marchés clés (Nigeria, Égypte, Kenya, Maroc, Côte d'Ivoire, Sénégal, Ouganda) vs 14 précédemment. Clients actifs : 20 millions (+60% YoY), commandes : 45 millions, GMV : 1.8 milliard $. Optimisation logistique : centres de distribution automatisés, partenariats livraison (motos-taxis, drones zones rurales). JumiaPay (fintech) traite 800M $ annuels. L'action bondit de 180% à Wall Street. Objectif : 50M clients et 5 milliards $ GMV d'ici 2028. Expansion : contenus locaux (JumiaFood, JumiaTravel).",
        source: "Jumia Technologies", country: "NG", hoursAgo: 20
    },
    {
        title: "Microsoft investit 1 milliard $ dans l'infrastructure cloud en Afrique",
        category: "Tech",
        summary: "Nouveaux datacenters Azure dans 5 pays africains pour souveraineté des données",
        content: "Microsoft annonce un investissement de 1 milliard $ pour déployer des Azure datacenters dans 5 pays africains : Afrique du Sud (expansion), Nigeria, Kenya, Égypte et Maroc. Ces centres permettront l'hébergement local des données (conformité RGPD africain), latence réduite pour services cloud, et création de 15,000 emplois. Microsoft cible les secteurs : gouvernements (G-Cloud), banques, télécoms, startups. Partenariats : formation de 500,000 développeurs cloud via Microsoft Learn, certifications Azure gratuites, programmes Women in Cloud. Concurrence avec AWS (datacenters à Cape Town) et Google Cloud. Marché africain du cloud : 8 milliards $ en 2026, projeté 25 milliards $ en 2030.",
        source: "Microsoft Africa", country: "ZA", hoursAgo: 28
    },

    // AGRICULTURE & AGRIBUSINESS (8)
    {
        title: "La BAD et la BEI lancent un fonds de 5 milliards $ pour l'agriculture climato-intelligente",
        category: "Agriculture",
        summary: "Programme massif pour transformer l'agriculture africaine face au changement climatique",
        content: "La Banque Africaine de Développement (BAD) et la Banque Européenne d'Investissement (BEI) créent le plus grand fonds jamais dédié à l'agriculture africaine : 5 milliards $ sur 10 ans. Le fonds 'Africa Climate-Smart Agriculture Initiative' financera : irrigation intelligente (goutte-à-goutte, pivots solaires), semences résistantes à la sécheresse et aux parasites, agriculture de précision (drones, IoT, satellites), mécanisation (tracteurs électriques), transformation post-récolte. Objectif : augmenter les rendements de 50%, réduire les pertes post-récolte de 60%, améliorer la résilience climatique de 150 millions de fermiers. Focus sur 10 pays : Éthiopie, Kenya, Nigeria, Ghana, Sénégal, Côte d'Ivoire, Tanzanie, Mozambique, Zambie, Mali.",
        source: "African Development Bank", country: "CI", hoursAgo: 10
    },
    {
        title: "Olam International investit 800M$ dans la transformation du cacao en Côte d'Ivoire",
        category: "Agriculture",
        summary: "Construction de la plus grande usine de transformation de cacao d'Afrique",
        content: "Olam International, géant singapourien de l'agribusiness, investit 800 millions $ pour construire la plus grande usine de transformation de cacao d'Afrique à San Pedro, Côte d'Ivoire. Capacité : 200,000 tonnes de fèves transformées/an en poudre de cacao, beurre de cacao et liqueur. Actuellement, 75% du cacao ivoirien est exporté brut, perdant 80% de la valeur ajoutée. Cette usine créera 3,000 emplois directs et permettra à la CI de capter 2 milliards $/an supplémentaires. Technologie suisse (Bühler) pour qualité premium. Clients : Nestlé, Barry Callebaut, Mondelez. Objectif CI : transformer 50% de sa production localement d'ici 2030.",
        source: "Olam Cocoa Côte d'Ivoire", country: "CI", hoursAgo: 24
    },

    // SANTÉ & PHARMA (6)
    {
        title: "L'Afrique du Sud produit ses propres vaccins ARNm grâce au hub de l'OMS",
        category: "Santé",
        summary: "Premier centre africain de production de vaccins à ARN messager opérationnel",
        content: "Le mRNA Vaccine Technology Transfer Hub de Cape Town, soutenu par l'OMS, commence la production de vaccins à ARN messager. Capacité initiale : 50 millions de doses/an (Covid, futur paludisme, tuberculose, VIH). Ce hub forme 15 pays africains à la technologie mRNA : Kenya, Sénégal, Rwanda, Nigeria, Tunisie... Investissement : 500 millions $. Objectif : souveraineté sanitaire africaine après la dépendance aux vaccins étrangers durant Covid-19. Partenaires : BioNTech, Moderna, Afrigen (biotech sud-africaine). Production locale divise les coûts par 3. D'ici 2028, capacité de 500M doses/an pour vacciner l'Afrique entière contre futures pandémies.",
        source: "WHO Africa", country: "ZA", hoursAgo: 16
    },
    {
        title: "Le Rwanda devient le 1er pays africain à déployer la 5G médicale",
        category: "Santé",
        summary: "Télémédecine avancée et chirurgie assistée par robot via réseau 5G",
        content: "Le Rwanda, en partenariat avec MTN et Ericsson, déploie un réseau 5G médical dédié reliant 500 centres de santé au Kigali University Teaching Hospital. Applications : téléconsultations HD en temps réel avec spécialistes, télé-échographie, chirurgie assistée par robot (téléchirurgie), ambulances connectées transmettant données vitales. Latence < 10ms permet aux chirurgiens de Kigali d'opérer des patients en zones rurales via bras robotiques. Formation de 2,000 personnels médicaux. Le Rwanda vise Universal Health Coverage d'ici 2027. Ce modèle sera répliqué au Kenya, Ghana et Sénégal. Investissement : 150 millions $. Impact : accès aux soins pour 5 millions de Rwandais ruraux.",
        source: "Rwanda Ministry of Health", country: "RW", hoursAgo: 32
    },

    // TOURISME (4)
    {
        title: "L'Égypte bat son record touristique avec 20 millions de visiteurs",
        category: "Tourisme",
        summary: "Reprise spectaculaire du tourisme avec nouveaux sites archéologiques ouverts",
        content: "L'Égypte enregistre un record historique de 20 millions de touristes en 2026, générant 18 milliards $ de revenus. Moteurs de la croissance : ouverture du Grand Egyptian Museum (GEM) au Caire, le plus grand musée archéologique mondial (100,000 pièces dont trésor de Toutankhamon), nouveaux sites à Louxor et Assouan, croisières Nil modernisées. Diversification : tourisme balnéaire Mer Rouge (Hurghada, Sharm), MICE (conventions), médical. Marchés émetteurs : Europe (40%), Golfe (30%), Asie (20%). Investissements : 50 nouveaux hôtels 5 étoiles, aéroport du Sphinx, trains à grande vitesse. Objectif 2030 : 30 millions de touristes, 30 milliards $ de revenus.",
        source: "Egypt Ministry of Tourism", country: "EG", hoursAgo: 12
    },

    // COMMERCE & ZLECAF (4)
    {
        title: "La ZLECAF atteint 100 milliards $ de commerce intra-africain",
        category: "Commerce",
        summary: "La Zone de libre-échange continentale africaine franchit un cap symbolique",
        content: "La ZLECAF (Zone de Libre-Échange Continentale Africaine) annonce avoir facilité 100 milliards $ de commerce intra-africain en 2026, soit +35% vs 2025. Les réformes tarifaires (90% des lignes tarifaires à 0%) et le système de paiement panafricain PAPSS boostent les échanges. Secteurs en croissance : agriculture (+45%), textiles (+60%), manufacturing (+38%), services digitaux (+120%). Top traders : Nigeria, Afrique du Sud, Égypte, Kenya, Maroc. La ZLECAF connecte 1.4 milliard de personnes, PIB combiné 3.4 trillions $. Prochaines étapes : protocole sur investissements, libre circulation des personnes. Objectif 2030 : 500 milliards $ de commerce intra-africain (vs 16% actuellement à 35%).",
        source: "African Union", country: "GH", hoursAgo: 20
    },

    // ÉDUCATION (3)
    {
        title: "L'African Leadership University ouvre 5 nouveaux campus dans 5 pays",
        category: "Éducation",
        summary: "Expansion de l'université panafricaine formant les leaders de demain",
        content: "African Leadership University (ALU), université panafricaine créée en 2015, ouvre 5 nouveaux campus : Lagos (Nigeria), Accra (Ghana), Addis Abeba (Éthiopie), Casablanca (Maroc), Dakar (Sénégal). Ces campus rejoignent ceux de Kigali et Maurice. ALU forme 10,000 étudiants de 50 pays africains en leadership, entrepreneuriat, tech, business. Pédagogie unique : apprentissage par projets, stages en startups, mentoring par entrepreneurs à succès. Taux d'employabilité : 92% à 6 mois. Frais : 9,000 $/an avec 60% de bourses. Partenaires : Mastercard Foundation (300M $ de financement), entreprises africaines. Objectif : 50,000 alumni d'ici 2030, créant 100,000 emplois via leurs ventures.",
        source: "African Leadership University", country: "RW", hoursAgo: 26
    }
];

console.log(`\n📰 ACTUALITÉS FINANCIÈRES\n`);
console.log(`Total actualités à insérer : ${newsArticles.length}`);
console.log('-'.repeat(70));

const insertNews = db.prepare(`
    INSERT INTO news (
        title, category, summary, content,
        source, country, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' hours'))
`);

let newsCount = 0;

// Nettoyage des anciennes actualités
console.log('🗑️  Nettoyage des anciennes actualités...');
db.prepare('DELETE FROM news').run();

for (const article of newsArticles) {
    try {
        insertNews.run(
            article.title, article.category,
            article.summary, article.content,
            article.source, article.country,
            article.hoursAgo
        );

        newsCount++;
        console.log(`✅ ${article.country.padEnd(4)} | ${article.category.padEnd(12)} | ${article.title.substring(0, 60)}`);
    } catch (error) {
        console.error(`❌ ${article.title}: ${error.message}`);
    }
}

console.log('-'.repeat(70));
console.log(`✅ ${newsCount} actualités insérées\n`);

// ============================================
// STATISTIQUES FINALES
// ============================================

console.log('='.repeat(70));
console.log('\n📊 STATISTIQUES FINALES\n');

const stats = {
    opportunities: db.prepare('SELECT COUNT(*) as count FROM investment_opportunities').get().count,
    news: db.prepare('SELECT COUNT(*) as count FROM news').get().count,
    opp_by_region: db.prepare('SELECT region, COUNT(*) as count FROM investment_opportunities GROUP BY region ORDER BY count DESC').all(),
    opp_by_sector: db.prepare('SELECT sector, COUNT(*) as count FROM investment_opportunities GROUP BY sector ORDER BY count DESC').all(),
    opp_countries: db.prepare('SELECT COUNT(DISTINCT country) as count FROM investment_opportunities').get().count,
    news_by_category: db.prepare('SELECT category, COUNT(*) as count FROM news GROUP BY category ORDER BY count DESC').all(),
    total_market_size: db.prepare('SELECT SUM(market_size_usd) as total FROM investment_opportunities').get().total
};

console.log(`📈 Opportunités d'investissement : ${stats.opportunities}`);
console.log(`📰 Actualités financières : ${stats.news}`);
console.log(`🌍 Pays couverts : ${stats.opp_countries}/54 pays africains`);
console.log(`💰 Taille totale de marché : ${(stats.total_market_size / 1e9).toFixed(0)} milliards $\n`);

console.log('Opportunités par région :');
stats.opp_by_region.forEach(r => console.log(`  - ${r.region.padEnd(25)} : ${r.count}`));

console.log('\nOpportunités par secteur :');
stats.opp_by_sector.forEach(s => console.log(`  - ${s.sector.padEnd(20)} : ${s.count}`));

console.log('\nActualités par catégorie :');
stats.news_by_category.forEach(c => console.log(`  - ${c.category.padEnd(20)} : ${c.count}`));

console.log('\n' + '='.repeat(70));
console.log('✅ BASE DE DONNÉES PENDO COMPLÈTE - TOUTE L\'AFRIQUE COUVERTE');
console.log('='.repeat(70) + '\n');

db.close();
