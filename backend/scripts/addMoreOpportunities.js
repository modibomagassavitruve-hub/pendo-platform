/**
 * Script pour ajouter plus d'opportunités d'investissement africaines
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

console.log('📊 Ajout de nouvelles opportunités d\'investissement...\n');

// Fonction pour générer un slug
function generateSlug(title) {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Nouvelles opportunités à ajouter
const newOpportunities = [
    {
        title: "Infrastructure Portuaire - Port de Cotonou",
        sector: "Infrastructure",
        subsector: "Transport Maritime",
        country: "BJ",
        country_name: "Bénin",
        region: "Afrique de l'Ouest",
        summary: "Expansion du port autonome de Cotonou pour doubler sa capacité de traitement de conteneurs d'ici 2027",
        description: "Le projet vise à moderniser et étendre le port de Cotonou, hub stratégique pour le commerce ouest-africain. Investissement dans de nouveaux quais, grues automatisées et systèmes de gestion numérique.",
        opportunity_type: "Projet d'Infrastructure",
        min_investment: 50000,
        max_investment: 5000000,
        expected_return_min: 12,
        expected_return_max: 18,
        investment_horizon: "7-10 ans",
        risk_level: "medium",
        company_name: "Port Autonome de Cotonou",
        company_size: "Grande entreprise",
        stage: "Expansion",
        market_size_usd: 450000000,
        source_name: "Ministère des Infrastructures du Bénin",
        status: "active",
        is_verified: 1
    },
    {
        title: "Télécommunications 5G - MTN Nigeria",
        sector: "Tech",
        subsector: "Télécommunications",
        country: "NG",
        country_name: "Nigeria",
        region: "Afrique de l'Ouest",
        summary: "Déploiement du réseau 5G dans les principales villes nigérianes avec objectif de 20 millions d'abonnés",
        description: "MTN Nigeria lance son réseau 5G pour révolutionner la connectivité. Opportunité d'investir dans l'infrastructure télécoms du plus grand marché africain avec 200+ millions d'habitants.",
        opportunity_type: "Expansion Technologique",
        min_investment: 100000,
        max_investment: 10000000,
        expected_return_min: 20,
        expected_return_max: 35,
        investment_horizon: "5-7 ans",
        risk_level: "high",
        company_name: "MTN Nigeria",
        company_size: "Grande entreprise",
        stage: "Growth",
        market_size_usd: 8500000000,
        source_name: "MTN Group",
        status: "active",
        is_verified: 1
    },
    {
        title: "Agriculture Durable - Cacao en Côte d'Ivoire",
        sector: "Agriculture",
        subsector: "Cacao",
        country: "CI",
        country_name: "Côte d'Ivoire",
        region: "Afrique de l'Ouest",
        summary: "Production de cacao certifié bio et équitable avec coopératives de 5000+ petits producteurs",
        description: "Projet d'agriculture durable visant à certifier 10,000 hectares de cacaoyers. La Côte d'Ivoire produit 40% du cacao mondial. Focus sur qualité premium et pratiques durables.",
        opportunity_type: "Agriculture Durable",
        min_investment: 25000,
        max_investment: 2000000,
        expected_return_min: 15,
        expected_return_max: 25,
        investment_horizon: "5-8 ans",
        risk_level: "medium",
        company_name: "Cacao d'Or Cooperative",
        company_size: "PME",
        stage: "Expansion",
        market_size_usd: 2800000000,
        source_name: "Conseil du Café-Cacao",
        status: "active",
        is_verified: 1
    },
    {
        title: "Énergie Hydroélectrique - Barrage de Grand Inga",
        sector: "Énergie",
        subsector: "Hydroélectricité",
        country: "CD",
        country_name: "RD Congo",
        region: "Afrique Centrale",
        summary: "Méga-projet hydroélectrique de 40,000 MW sur le fleuve Congo - le plus grand projet énergétique d'Afrique",
        description: "Le barrage d'Inga pourrait générer 40 GW, soit deux fois la production totale actuelle d'Afrique du Sud. Projet structurant pour l'électrification du continent.",
        opportunity_type: "Méga Projet",
        min_investment: 500000,
        max_investment: 50000000,
        expected_return_min: 10,
        expected_return_max: 16,
        investment_horizon: "15-20 ans",
        risk_level: "high",
        company_name: "Inga Development Authority",
        company_size: "Grande entreprise",
        stage: "Développement",
        market_size_usd: 80000000000,
        source_name: "African Development Bank",
        status: "active",
        is_verified: 1
    },
    {
        title: "Banque Mobile - M-Pesa Expansion",
        sector: "Finance",
        subsector: "Mobile Banking",
        country: "KE",
        country_name: "Kenya",
        region: "Afrique de l'Est",
        summary: "Expansion de M-Pesa en Éthiopie et Afrique de l'Ouest avec 50 millions de nouveaux utilisateurs visés",
        description: "M-Pesa, leader africain du mobile money avec 51M d'utilisateurs au Kenya, se déploie dans 7 nouveaux pays. Opportunité unique dans la fintech africaine.",
        opportunity_type: "Expansion Fintech",
        min_investment: 75000,
        max_investment: 8000000,
        expected_return_min: 25,
        expected_return_max: 45,
        investment_horizon: "3-5 ans",
        risk_level: "medium",
        company_name: "Safaricom / Vodafone",
        company_size: "Grande entreprise",
        stage: "Expansion",
        market_size_usd: 15000000000,
        source_name: "Safaricom PLC",
        status: "active",
        is_verified: 1
    },
    {
        title: "Tourisme Durable - Lodges Écologiques Rwanda",
        sector: "Tourisme",
        subsector: "Écotourisme",
        country: "RW",
        country_name: "Rwanda",
        region: "Afrique de l'Est",
        summary: "Réseau de 12 lodges de luxe écologiques dans les parcs nationaux rwandais",
        description: "Le Rwanda mise sur le tourisme haut de gamme durable. Projet de lodges 5 étoiles autour des gorilles de montagne et du parc de l'Akagera. Objectif : 500K touristes/an.",
        opportunity_type: "Développement Touristique",
        min_investment: 100000,
        max_investment: 5000000,
        expected_return_min: 18,
        expected_return_max: 30,
        investment_horizon: "6-9 ans",
        risk_level: "medium",
        company_name: "Rwanda Eco Resorts Ltd",
        company_size: "PME",
        stage: "Développement",
        market_size_usd: 800000000,
        source_name: "Rwanda Development Board",
        status: "active",
        is_verified: 1
    },
    {
        title: "Mines de Lithium - Mali",
        sector: "Mines",
        subsector: "Métaux Rares",
        country: "ML",
        country_name: "Mali",
        region: "Afrique de l'Ouest",
        summary: "Exploitation de gisements de lithium pour batteries électriques - 500,000 tonnes de réserves estimées",
        description: "Avec la transition énergétique mondiale, le lithium est stratégique. Le Mali possède des gisements importants inexploités. Projet d'extraction et transformation locale.",
        opportunity_type: "Exploitation Minière",
        min_investment: 200000,
        max_investment: 20000000,
        expected_return_min: 22,
        expected_return_max: 40,
        investment_horizon: "8-12 ans",
        risk_level: "high",
        company_name: "Mali Lithium Mining Corp",
        company_size: "PME",
        stage: "Développement",
        market_size_usd: 12000000000,
        source_name: "Ministère des Mines du Mali",
        status: "active",
        is_verified: 1
    },
    {
        title: "EdTech - Plateforme d'Éducation en Ligne Ghana",
        sector: "Éducation",
        subsector: "Technologie Éducative",
        country: "GH",
        country_name: "Ghana",
        region: "Afrique de l'Ouest",
        summary: "Plateforme d'apprentissage en ligne pour 5 millions d'élèves africains avec contenus localisés",
        description: "Startup EdTech ghanéenne créant des contenus éducatifs digitaux adaptés aux programmes africains. IA pour apprentissage personnalisé. Objectif : 5M d'utilisateurs en 3 ans.",
        opportunity_type: "Startup Tech",
        min_investment: 50000,
        max_investment: 3000000,
        expected_return_min: 30,
        expected_return_max: 60,
        investment_horizon: "4-6 ans",
        risk_level: "high",
        company_name: "AfriLearn",
        company_size: "Startup",
        stage: "Series A",
        market_size_usd: 4500000000,
        source_name: "Ghana Tech Hub",
        status: "active",
        is_verified: 1
    },
    {
        title: "Pharmaceutique - Usine de Médicaments Génériques",
        sector: "Santé",
        subsector: "Pharmaceutique",
        country: "MA",
        country_name: "Maroc",
        region: "Afrique du Nord",
        summary: "Construction d'usine de production de médicaments génériques pour le marché africain et MENA",
        description: "L'Afrique importe 70% de ses médicaments. Usine moderne au Maroc pour produire génériques de qualité. Certifications internationales. Marché de 600M d'habitants.",
        opportunity_type: "Industrie Pharmaceutique",
        min_investment: 150000,
        max_investment: 10000000,
        expected_return_min: 16,
        expected_return_max: 28,
        investment_horizon: "7-10 ans",
        risk_level: "medium",
        company_name: "Pharma Afrique SA",
        company_size: "Moyenne entreprise",
        stage: "Développement",
        market_size_usd: 18000000000,
        source_name: "Ministère de la Santé - Maroc",
        status: "active",
        is_verified: 1
    },
    {
        title: "Logistique E-commerce - Entrepôts Intelligents",
        sector: "Commerce",
        subsector: "Logistique",
        country: "ZA",
        country_name: "Afrique du Sud",
        region: "Afrique Australe",
        summary: "Réseau de 15 centres de distribution automatisés pour e-commerce en Afrique australe",
        description: "L'e-commerce africain croît de 25%/an. Construction d'entrepôts robotisés à Johannesburg, Cape Town, Durban. Last-mile delivery pour 10M de clients.",
        opportunity_type: "Infrastructure Logistique",
        min_investment: 80000,
        max_investment: 6000000,
        expected_return_min: 20,
        expected_return_max: 35,
        investment_horizon: "5-7 ans",
        risk_level: "medium",
        company_name: "AfriLogistics Hub",
        company_size: "Moyenne entreprise",
        stage: "Expansion",
        market_size_usd: 7500000000,
        source_name: "SA Chamber of Commerce",
        status: "active",
        is_verified: 1
    },
    {
        title: "Aquaculture - Élevage de Tilapia Ouganda",
        sector: "Agriculture",
        subsector: "Aquaculture",
        country: "UG",
        country_name: "Ouganda",
        region: "Afrique de l'Est",
        summary: "Fermes aquacoles modernes produisant 10,000 tonnes de tilapia par an pour l'Afrique de l'Est",
        description: "L'Ouganda a 18% de son territoire en eau. Projet d'aquaculture intensive avec technologie recirculation. Export vers Kenya, Rwanda, Tanzanie. Demande croissante de protéines.",
        opportunity_type: "Agro-industrie",
        min_investment: 40000,
        max_investment: 2500000,
        expected_return_min: 18,
        expected_return_max: 30,
        investment_horizon: "5-8 ans",
        risk_level: "medium",
        company_name: "Nile Aqua Farms",
        company_size: "PME",
        stage: "Expansion",
        market_size_usd: 1200000000,
        source_name: "Uganda Investment Authority",
        status: "active",
        is_verified: 1
    },
    {
        title: "Blockchain & Crypto - Hub Fintech Lagos",
        sector: "Tech",
        subsector: "Blockchain",
        country: "NG",
        country_name: "Nigeria",
        region: "Afrique de l'Ouest",
        summary: "Plateforme blockchain pour transferts d'argent et paiements transfrontaliers en Afrique",
        description: "Le Nigeria est le plus grand marché crypto d'Afrique. Plateforme de paiement blockchain pour réduire les coûts des transferts (actuellement 8-15%). Objectif : 5M d'utilisateurs.",
        opportunity_type: "Fintech Blockchain",
        min_investment: 60000,
        max_investment: 4000000,
        expected_return_min: 35,
        expected_return_max: 70,
        investment_horizon: "3-5 ans",
        risk_level: "high",
        company_name: "AfriChain Pay",
        company_size: "Startup",
        stage: "Seed",
        market_size_usd: 25000000000,
        source_name: "Lagos Tech Ecosystem",
        status: "active",
        is_verified: 1
    },
    {
        title: "Textile - Usine de Coton Éthiopie",
        sector: "Industrie",
        subsector: "Textile",
        country: "ET",
        country_name: "Éthiopie",
        region: "Afrique de l'Est",
        summary: "Complexe textile intégré de la production de coton aux vêtements finis pour export H&M, Zara",
        description: "L'Éthiopie devient le hub textile africain avec main d'œuvre qualifiée et énergie bon marché. Usine moderne employant 5000 personnes. Contrats avec grandes marques européennes.",
        opportunity_type: "Industrie Manufacturière",
        min_investment: 100000,
        max_investment: 8000000,
        expected_return_min: 14,
        expected_return_max: 22,
        investment_horizon: "6-9 ans",
        risk_level: "medium",
        company_name: "Ethiopian Textile Industries",
        company_size: "Grande entreprise",
        stage: "Expansion",
        market_size_usd: 6500000000,
        source_name: "Ethiopian Investment Commission",
        status: "active",
        is_verified: 1
    },
    {
        title: "Assurance Paramétrique - Climat Afrique",
        sector: "Finance",
        subsector: "Assurance",
        country: "SN",
        country_name: "Sénégal",
        region: "Afrique de l'Ouest",
        summary: "Assurance agricole basée sur données satellites pour protéger 100,000 fermiers contre sécheresse",
        description: "Assurance innovante utilisant IA et satellites pour indemniser automatiquement les agriculteurs en cas de sécheresse. Pas d'expertise terrain nécessaire. Blockchain pour transparence.",
        opportunity_type: "Insurtech",
        min_investment: 50000,
        max_investment: 3000000,
        expected_return_min: 20,
        expected_return_max: 35,
        investment_horizon: "4-6 ans",
        risk_level: "medium",
        company_name: "Sahel Assur Tech",
        company_size: "Startup",
        stage: "Series A",
        market_size_usd: 3200000000,
        source_name: "BCEAO",
        status: "active",
        is_verified: 1
    },
    {
        title: "Énergies Renouvelables - Parc Éolien Maroc",
        sector: "Énergie",
        subsector: "Éolien",
        country: "MA",
        country_name: "Maroc",
        region: "Afrique du Nord",
        summary: "Parc éolien de 300 MW dans la région de Tanger - contribue à l'objectif de 52% d'énergie verte en 2030",
        description: "Le Maroc est leader africain des renouvelables. Parc éolien de dernière génération avec 120 éoliennes. Contrat d'achat garanti 20 ans. Localisation optimale avec vents constants.",
        opportunity_type: "Projet Énergétique",
        min_investment: 200000,
        max_investment: 15000000,
        expected_return_min: 12,
        expected_return_max: 18,
        investment_horizon: "12-15 ans",
        risk_level: "low",
        company_name: "Maroc Éolien SA",
        company_size: "Grande entreprise",
        stage: "Développement",
        market_size_usd: 22000000000,
        source_name: "MASEN",
        status: "active",
        is_verified: 1
    }
];

// Insérer les opportunités
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

let count = 0;
for (const opp of newOpportunities) {
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

        // Ajouter quelques tags
        const insertTag = db.prepare('INSERT INTO opportunity_tags (opportunity_id, tag) VALUES (?, ?)');
        insertTag.run(oppId, opp.sector);
        insertTag.run(oppId, opp.country_name);
        if (opp.risk_level === 'high') insertTag.run(oppId, 'Haut Rendement');
        if (opp.is_verified) insertTag.run(oppId, 'Vérifié');

        count++;
        console.log(`✅ ${opp.title} (${opp.country_name})`);
    } catch (error) {
        console.error(`❌ Erreur pour ${opp.title}:`, error.message);
    }
}

console.log(`\n✅ ${count} nouvelles opportunités ajoutées avec succès!\n`);

db.close();
