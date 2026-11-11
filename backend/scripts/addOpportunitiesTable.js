/**
 * PENDO - Migration: Ajout des tables pour les opportunités d'investissement
 * Usage: node scripts/addOpportunitiesTable.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'pendo.db');

console.log('═'.repeat(50));
console.log('  PENDO - Ajout Tables Opportunités');
console.log('═'.repeat(50));

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Créer les tables pour les opportunités
db.exec(`
-- Table principale des opportunités d'investissement
CREATE TABLE IF NOT EXISTS investment_opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    sector TEXT NOT NULL, -- Tech, Finance, Santé, Énergie, etc.
    subsector TEXT, -- Fintech, Solar, etc.
    country TEXT NOT NULL, -- Code pays ISO 2 lettres
    country_name TEXT NOT NULL, -- Nom complet du pays
    region TEXT, -- West Africa, East Africa, etc.

    -- Description détaillée
    summary TEXT NOT NULL, -- Résumé court (200 chars)
    description TEXT NOT NULL, -- Description complète
    opportunity_type TEXT NOT NULL, -- 'project', 'company', 'sector', 'trend'

    -- Données financières
    min_investment REAL, -- Investissement minimum requis (USD)
    max_investment REAL, -- Investissement maximum (USD)
    expected_return_min REAL, -- ROI minimum estimé (%)
    expected_return_max REAL, -- ROI maximum estimé (%)
    investment_horizon TEXT, -- 'short' (0-2 ans), 'medium' (2-5 ans), 'long' (5+ ans)
    risk_level TEXT NOT NULL, -- 'low', 'medium', 'high', 'very_high'

    -- Métadonnées
    company_name TEXT, -- Nom de l'entreprise si applicable
    company_size TEXT, -- 'startup', 'sme', 'large_enterprise'
    stage TEXT, -- 'seed', 'early', 'growth', 'mature'
    market_size_usd REAL, -- Taille du marché (USD)

    -- Sources et liens
    source_name TEXT NOT NULL, -- Nom de la source
    source_url TEXT, -- URL de la source
    contact_info TEXT, -- Email ou contact
    external_links TEXT, -- JSON array de liens additionnels

    -- Images
    image_url TEXT,
    logo_url TEXT,

    -- Statut et dates
    status TEXT DEFAULT 'active', -- 'active', 'closed', 'pending', 'funded'
    deadline DATE, -- Date limite si applicable
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Métriques d'engagement
    views INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,

    -- Validation
    is_verified INTEGER DEFAULT 0, -- 1 si vérifié par l'équipe PENDO
    verification_date DATETIME
);

-- Table des points clés (key highlights) pour chaque opportunité
CREATE TABLE IF NOT EXISTS opportunity_highlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER NOT NULL,
    highlight_type TEXT NOT NULL, -- 'strength', 'risk', 'milestone', 'market_insight'
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- emoji ou nom d'icône
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY (opportunity_id) REFERENCES investment_opportunities(id) ON DELETE CASCADE
);

-- Table des tags pour catégorisation avancée
CREATE TABLE IF NOT EXISTS opportunity_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY (opportunity_id) REFERENCES investment_opportunities(id) ON DELETE CASCADE
);

-- Table des métriques et KPIs
CREATE TABLE IF NOT EXISTS opportunity_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER NOT NULL,
    metric_name TEXT NOT NULL, -- 'revenue_growth', 'user_count', 'market_share', etc.
    metric_value TEXT NOT NULL,
    metric_unit TEXT, -- '%', 'USD', 'users', etc.
    metric_period TEXT, -- 'annual', 'monthly', 'quarterly'
    FOREIGN KEY (opportunity_id) REFERENCES investment_opportunities(id) ON DELETE CASCADE
);

-- Table de suivi des utilisateurs (watchlist/favoris)
CREATE TABLE IF NOT EXISTS user_opportunity_watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    opportunity_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(user_id, opportunity_id),
    FOREIGN KEY (opportunity_id) REFERENCES investment_opportunities(id) ON DELETE CASCADE
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_opportunities_sector ON investment_opportunities(sector);
CREATE INDEX IF NOT EXISTS idx_opportunities_country ON investment_opportunities(country);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON investment_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_risk ON investment_opportunities(risk_level);
CREATE INDEX IF NOT EXISTS idx_opportunities_published ON investment_opportunities(published_at);
CREATE INDEX IF NOT EXISTS idx_opportunity_tags_tag ON opportunity_tags(tag);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON user_opportunity_watchlist(user_id);
`);

console.log('✅ Tables opportunités créées');

// Insérer quelques données de démonstration
const insertOpp = db.prepare(`
    INSERT INTO investment_opportunities (
        title, slug, sector, subsector, country, country_name, region,
        summary, description, opportunity_type,
        min_investment, max_investment, expected_return_min, expected_return_max,
        investment_horizon, risk_level,
        company_name, company_size, stage, market_size_usd,
        source_name, source_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const opportunities = [
    {
        title: "Fintech Mobile Payment - Expansion Afrique de l'Ouest",
        slug: "fintech-mobile-payment-west-africa-2024",
        sector: "Finance",
        subsector: "Fintech",
        country: "CI",
        country_name: "Côte d'Ivoire",
        region: "Afrique de l'Ouest",
        summary: "Plateforme de paiement mobile en forte croissance cherchant à étendre ses opérations dans 5 pays de l'UEMOA avec un potentiel de 50M d'utilisateurs.",
        description: "Cette opportunité concerne une fintech ivoirienne spécialisée dans les paiements mobiles et les services financiers digitaux. La société a déjà conquis 2,5M d'utilisateurs en Côte d'Ivoire et au Sénégal en 18 mois. L'investissement servira à financer l'expansion au Mali, Burkina Faso et Togo, ainsi qu'à développer de nouveaux services (micro-crédit, épargne digitale). Le marché du mobile money en Afrique de l'Ouest représente 45 milliards USD de transactions annuelles avec un taux de pénétration de seulement 38%, offrant un potentiel de croissance massif.",
        opportunity_type: "company",
        min_investment: 500000,
        max_investment: 5000000,
        expected_return_min: 25,
        expected_return_max: 45,
        investment_horizon: "medium",
        risk_level: "medium",
        company_name: "MobiPay SARL",
        company_size: "sme",
        stage: "growth",
        market_size_usd: 45000000000,
        source_name: "African Business Magazine",
        source_url: "https://example.com/mobipay-opportunity",
        status: "active"
    },
    {
        title: "Centrale Solaire 100MW - Ghana",
        slug: "solar-plant-100mw-ghana-2024",
        sector: "Énergie",
        subsector: "Solaire",
        country: "GH",
        country_name: "Ghana",
        region: "Afrique de l'Ouest",
        summary: "Projet de centrale solaire photovoltaïque de 100MW avec PPA garanti sur 20 ans par le gouvernement ghanéen, ROI stable et prévisible.",
        description: "Projet greenfield de construction d'une centrale solaire de 100MW dans la région de Bono, Ghana. Le projet bénéficie d'un Power Purchase Agreement (PPA) sur 20 ans avec Electricity Company of Ghana (ECG) au tarif de 0,08 USD/kWh. Le site a été sécurisé, les études d'impact environnemental approuvées, et les permis obtenus. Avec un ensoleillement moyen de 5,8 kWh/m²/jour, la centrale produira environ 180 GWh annuellement. Le Ghana vise 10% d'énergies renouvelables d'ici 2030 et offre des incentives fiscaux attractifs (exonération TVA sur équipements, crédit d'impôt 5 ans).",
        opportunity_type: "project",
        min_investment: 2000000,
        max_investment: 50000000,
        expected_return_min: 12,
        expected_return_max: 18,
        investment_horizon: "long",
        risk_level: "low",
        company_name: null,
        company_size: null,
        stage: "early",
        market_size_usd: 3500000000,
        source_name: "African Development Bank",
        source_url: "https://example.com/ghana-solar-100mw",
        status: "active"
    },
    {
        title: "AgriTech - Plateforme de commerce agricole Kenya",
        slug: "agritech-marketplace-kenya-2024",
        sector: "Tech",
        subsector: "AgriTech",
        country: "KE",
        country_name: "Kenya",
        region: "Afrique de l'Est",
        summary: "Marketplace connectant 50 000+ petits agriculteurs aux acheteurs institutionnels, réduisant les intermédiaires et augmentant les revenus fermiers de 35%.",
        description: "Plateforme digitale kenyane révolutionnant la chaîne de valeur agricole en Afrique de l'Est. La solution connecte directement les petits exploitants agricoles aux acheteurs (supermarchés, restaurants, exportateurs) via une app mobile et un système de logistique intégré. Déjà actifs au Kenya avec 50 000 agriculteurs et 800 acheteurs, générant 15M USD de GMV annuel. L'expansion prévue vers Tanzanie et Ouganda pourrait tripler la base utilisateur. La technologie inclut: prévisions météo IA, conseil agronomique, micro-assurance récolte, et paiement mobile. Le secteur agricole représente 34% du PIB kenyan et 75% des emplois ruraux.",
        opportunity_type: "company",
        min_investment: 1000000,
        max_investment: 8000000,
        expected_return_min: 30,
        expected_return_max: 60,
        investment_horizon: "medium",
        risk_level: "high",
        company_name: "FarmLink Technologies",
        company_size: "startup",
        stage: "growth",
        market_size_usd: 28000000000,
        source_name: "TechCrunch Africa",
        source_url: "https://example.com/farmlink-series-b",
        status: "active"
    },
    {
        title: "Réseau de cliniques privées - Nigeria",
        slug: "private-clinics-network-nigeria-2024",
        sector: "Santé",
        subsector: "Infrastructure médicale",
        country: "NG",
        country_name: "Nigeria",
        region: "Afrique de l'Ouest",
        summary: "Réseau de 25 cliniques privées offrant soins primaires et spécialisés dans 10 villes nigérianes, ciblant la classe moyenne en forte croissance.",
        description: "Opportunité d'investissement dans le leader nigérian des soins de santé privés. Le réseau opère 15 cliniques à Lagos, Abuja, et Port Harcourt, avec un plan d'expansion à 25 établissements d'ici 2026. Services: consultations généralistes, imagerie médicale, laboratoire, pharmacie, et télémédecine. Le Nigeria compte 200M d'habitants mais seulement 0,4 médecin pour 1000 personnes (vs 2,5 recommandé OMS). La classe moyenne (60M de personnes) recherche des alternatives de qualité au système public saturé. Revenus 2023: 12M USD (+45% YoY), EBITDA margin 23%. Opportunité de consolidation sectorielle avec 3 acquisitions potentielles identifiées.",
        opportunity_type: "company",
        min_investment: 3000000,
        max_investment: 15000000,
        expected_return_min: 20,
        expected_return_max: 35,
        investment_horizon: "medium",
        risk_level: "medium",
        company_name: "HealthPlus Medical Group",
        company_size: "sme",
        stage: "growth",
        market_size_usd: 14000000000,
        source_name: "Africa Healthcare Report 2024",
        source_url: "https://example.com/healthplus-nigeria",
        status: "active"
    },
    {
        title: "Immobilier résidentiel classe moyenne - Sénégal",
        slug: "residential-real-estate-senegal-2024",
        sector: "Immobilier",
        subsector: "Résidentiel",
        country: "SN",
        country_name: "Sénégal",
        region: "Afrique de l'Ouest",
        summary: "Développement de 500 logements abordables à Dakar ciblant la classe moyenne, avec garantie de rachat gouvernementale et rendement locatif 8-10%.",
        description: "Projet immobilier de construction de 500 unités résidentielles (appartements 2-3 chambres) dans la nouvelle zone d'extension de Dakar, Diamniadio. Le projet bénéficie du programme gouvernemental '100,000 logements' offrant: subventions construction, exonérations fiscales 5 ans, et mécanisme de garantie partielle. Prix de vente moyen: 35 000 USD/unité, coût de construction: 22 000 USD/unité. Demande locative forte avec taux d'occupation prévu 95%+. Le déficit de logements à Dakar est estimé à 200 000 unités. Infrastructure complète prévue: écoles, commerces, espaces verts. Phase 1 (200 unités) démarrage Q2 2024.",
        opportunity_type: "project",
        min_investment: 500000,
        max_investment: 10000000,
        expected_return_min: 15,
        expected_return_max: 22,
        investment_horizon: "medium",
        risk_level: "medium",
        company_name: "Teyliom Development",
        company_size: "sme",
        stage: "early",
        market_size_usd: 8000000000,
        source_name: "West Africa Real Estate Review",
        source_url: "https://example.com/teyliom-dakar",
        status: "active"
    },
    {
        title: "E-commerce mode et beauté - Afrique francophone",
        slug: "ecommerce-fashion-beauty-francophone-africa-2024",
        sector: "Commerce",
        subsector: "E-commerce",
        country: "SN",
        country_name: "Sénégal",
        region: "Multi-pays",
        summary: "Plateforme e-commerce mode africaine livrant dans 8 pays francophones, 150K clients actifs, croissance 200% annuelle, levée série B.",
        description: "Leader du e-commerce mode en Afrique francophone, cette plateforme basée à Dakar propose vêtements, chaussures, accessoires et produits beauté de marques locales et internationales. Opérations dans 8 pays (Sénégal, Côte d'Ivoire, Cameroun, Mali, Burkina, Bénin, Togo, Gabon) avec 150 000 clients actifs et 2M de visiteurs mensuels. GMV 2023: 8,5M USD (+210% vs 2022). Business model: marketplace (65% GMV) + inventory (35%). Logistique propriétaire avec 4 centres de distribution. Plan d'expansion: DRC, Madagascar, et lancement catégorie lifestyle/maison. Le marché africain du e-commerce devrait atteindre 75Mds USD d'ici 2025 (18% CAGR).",
        opportunity_type: "company",
        min_investment: 2000000,
        max_investment: 12000000,
        expected_return_min: 35,
        expected_return_max: 70,
        investment_horizon: "medium",
        risk_level: "high",
        company_name: "AfriStyle Commerce",
        company_size: "startup",
        stage: "growth",
        market_size_usd: 75000000000,
        source_name: "Disrupt Africa E-commerce Report",
        source_url: "https://example.com/afristyle-series-b",
        status: "active"
    }
];

opportunities.forEach(opp => {
    try {
        const result = insertOpp.run(
            opp.title, opp.slug, opp.sector, opp.subsector, opp.country, opp.country_name, opp.region,
            opp.summary, opp.description, opp.opportunity_type,
            opp.min_investment, opp.max_investment, opp.expected_return_min, opp.expected_return_max,
            opp.investment_horizon, opp.risk_level,
            opp.company_name, opp.company_size, opp.stage, opp.market_size_usd,
            opp.source_name, opp.source_url, opp.status
        );
        console.log(`✅ Opportunité insérée: ${opp.title}`);
    } catch (err) {
        console.error(`❌ Erreur insertion ${opp.title}:`, err.message);
    }
});

// Ajouter des highlights pour quelques opportunités
const insertHighlight = db.prepare(`
    INSERT INTO opportunity_highlights (opportunity_id, highlight_type, title, description, icon, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
`);

const highlights = [
    { opp_id: 1, type: 'strength', title: '2.5M utilisateurs actifs', desc: 'Base utilisateur établie et en croissance rapide', icon: '👥', order: 1 },
    { opp_id: 1, type: 'market_insight', title: 'Marché 45Mds USD', desc: 'Taille du marché du mobile money en Afrique de l\'Ouest', icon: '💰', order: 2 },
    { opp_id: 1, type: 'risk', title: 'Réglementation évolutive', desc: 'Cadre réglementaire fintech en développement', icon: '⚠️', order: 3 },
    { opp_id: 2, type: 'strength', title: 'PPA garanti 20 ans', desc: 'Contrat d\'achat d\'électricité sécurisé avec ECG', icon: '📜', order: 1 },
    { opp_id: 2, type: 'strength', title: 'Incentives fiscaux', desc: 'Exonération TVA + crédit d\'impôt 5 ans', icon: '🏛️', order: 2 },
    { opp_id: 3, type: 'strength', title: '50K agriculteurs', desc: 'Réseau établi de producteurs actifs', icon: '🌾', order: 1 },
    { opp_id: 3, type: 'milestone', title: '+35% revenus fermiers', desc: 'Impact direct mesurable sur les agriculteurs', icon: '📈', order: 2 }
];

highlights.forEach(h => {
    insertHighlight.run(h.opp_id, h.type, h.title, h.desc, h.icon, h.order);
});

console.log(`✅ ${highlights.length} highlights insérés`);

// Ajouter des tags
const insertTag = db.prepare('INSERT INTO opportunity_tags (opportunity_id, tag) VALUES (?, ?)');
const tags = [
    [1, 'fintech'], [1, 'mobile-money'], [1, 'uemoa'], [1, 'high-growth'],
    [2, 'renewable-energy'], [2, 'solar'], [2, 'ppa'], [2, 'low-risk'],
    [3, 'agritech'], [3, 'marketplace'], [3, 'east-africa'], [3, 'impact'],
    [4, 'healthcare'], [4, 'private-clinics'], [4, 'nigeria'], [4, 'expansion'],
    [5, 'real-estate'], [5, 'affordable-housing'], [5, 'government-backed'],
    [6, 'ecommerce'], [6, 'fashion'], [6, 'francophone'], [6, 'logistics']
];

tags.forEach(([opp_id, tag]) => {
    insertTag.run(opp_id, tag);
});

console.log(`✅ ${tags.length} tags insérés`);

const count = db.prepare('SELECT COUNT(*) as c FROM investment_opportunities').get();
console.log(`\n✅ ${count.c} opportunités d'investissement dans la base`);
console.log('✅ Migration terminée!');

db.close();
