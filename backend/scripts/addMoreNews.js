/**
 * Script pour ajouter plus d'actualités financières africaines
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
const db = new Database(dbPath);

console.log('📰 Ajout de nouvelles actualités financières...\n');

// Fonction pour générer un slug
function generateSlug(title) {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Nouvelles actualités à ajouter
const newsArticles = [
    {
        title: "La BRVM enregistre une hausse de 15% au premier trimestre 2026",
        category: "Marchés",
        summary: "La Bourse Régionale des Valeurs Mobilières affiche une performance exceptionnelle portée par les valeurs bancaires et télécoms",
        content: "La BRVM clôture le premier trimestre 2026 sur une note très positive avec une progression de 15% de son indice composite. Cette performance s'explique par l'engouement des investisseurs pour les valeurs bancaires, en hausse de 22%, et le secteur des télécommunications (+18%). Les analystes prévoient une poursuite de cette tendance haussière avec l'arrivée de nouveaux investisseurs institutionnels internationaux intéressés par le potentiel de croissance de la zone UEMOA.",
        source: "BRVM",
        author: "Amadou Diallo",
        tags: "BRVM,Marchés,UEMOA,Performance",
        impact: "high",
        countries: "CI,SN,BJ,BF,TG,NE,ML,GN",
        is_featured: 1
    },
    {
        title: "Le Nigeria lance son propre stablecoin adossé au Naira",
        category: "Crypto",
        summary: "La Banque Centrale du Nigeria annonce le lancement d'eNaira 2.0, un stablecoin blockchain pour faciliter les transactions",
        content: "Dans une démarche innovante pour l'Afrique, la Central Bank of Nigeria (CBN) déploie eNaira 2.0, une version améliorée de sa monnaie numérique. Contrairement à la première version critiquée pour sa centralisation, eNaira 2.0 utilise une blockchain publique tout en restant régulée. L'objectif : faciliter les paiements transfrontaliers et réduire la dépendance au dollar dans les échanges intra-africains. Plus de 2 millions de Nigérians ont déjà téléchargé le portefeuille digital.",
        source: "Central Bank of Nigeria",
        author: "Chioma Okonkwo",
        tags: "Nigeria,Crypto,CBDC,Innovation",
        impact: "high",
        countries: "NG",
        is_featured: 1
    },
    {
        title: "Total Energies investit 8 milliards $ dans le gaz mozambicain",
        category: "Énergie",
        summary: "Le géant français relance le mégaprojet Mozambique LNG après 3 ans de suspension pour cause d'insécurité",
        content: "Total Energies annonce la reprise de son projet d'extraction de gaz naturel liquéfié au Mozambique avec un investissement additionnel de 8 milliards de dollars. Le projet Mozambique LNG, qui était suspendu depuis 2021 suite à des attaques terroristes dans la province de Cabo Delgado, redémarre grâce à l'amélioration de la sécurité dans la région. Avec des réserves estimées à 2,400 milliards de m³, ce projet pourrait faire du Mozambique le 3ème exportateur mondial de LNG d'ici 2030.",
        source: "Total Energies",
        author: "François Dumont",
        tags: "Mozambique,Gaz,Énergie,Total",
        impact: "high",
        countries: "MZ",
        is_featured: 1
    },
    {
        title: "La BAD approuve un prêt de 500M$ pour l'infrastructure ferroviaire kenyane",
        category: "Infrastructure",
        summary: "Extension du réseau ferroviaire Nairobi-Mombasa vers l'Ouganda et le Rwanda pour désenclaver la région",
        content: "La Banque Africaine de Développement (BAD) vient d'approuver un financement de 500 millions de dollars pour étendre le Standard Gauge Railway (SGR) du Kenya. Ce projet stratégique vise à relier Nairobi à Kampala (Ouganda) et Kigali (Rwanda), créant ainsi un corridor commercial majeur en Afrique de l'Est. Le nouveau tronçon de 1,200 km devrait réduire les temps de transport de marchandises de 70% et stimuler le commerce régional évalué à 15 milliards de dollars annuels.",
        source: "African Development Bank",
        author: "Patricia Mensah",
        tags: "Kenya,Infrastructure,Transport,BAD",
        impact: "high",
        countries: "KE,UG,RW",
        is_featured: 0
    },
    {
        title: "Safaricom lance la 5G dans 10 villes kenyanes",
        category: "Tech",
        summary: "L'opérateur télécoms n°1 d'Afrique de l'Est déploie son réseau 5G avec des débits jusqu'à 1 Gbps",
        content: "Safaricom, leader des télécommunications en Afrique de l'Est, annonce le déploiement commercial de son réseau 5G dans 10 grandes villes du Kenya, dont Nairobi, Mombasa, Kisumu et Nakuru. Avec des vitesses pouvant atteindre 1 Gbps, ce réseau ultra-rapide vise particulièrement les entreprises et le secteur de la santé pour la télémédecine. L'opérateur prévoit d'investir 300 millions de dollars sur 3 ans pour couvrir 80% de la population urbaine kenyane.",
        source: "Safaricom",
        author: "James Mwangi",
        tags: "Kenya,5G,Télécoms,Safaricom",
        impact: "medium",
        countries: "KE",
        is_featured: 0
    },
    {
        title: "L'Égypte devient le 1er producteur africain d'hydrogène vert",
        category: "Énergie",
        summary: "Le Caire signe des accords pour 15 GW de capacité d'électrolyse alimentée par solaire et éolien",
        content: "L'Égypte consolide sa position de leader africain des énergies renouvelables en devenant le premier producteur d'hydrogène vert du continent. Le gouvernement a signé des protocoles d'accord avec 9 consortiums internationaux pour développer 15 GW de capacité de production d'hydrogène par électrolyse, alimentée par des fermes solaires et éoliennes dans le Golfe de Suez. Production prévue : 1 million de tonnes d'H2 vert par an d'ici 2030, destinées à l'export vers l'Europe via pipeline.",
        source: "Egyptian Electricity Ministry",
        author: "Ahmed Hassan",
        tags: "Égypte,Hydrogène,Énergie Verte,Export",
        impact: "high",
        countries: "EG",
        is_featured: 1
    },
    {
        title: "Jumia affiche enfin son premier trimestre profitable",
        category: "E-commerce",
        summary: "Le géant africain du e-commerce atteint la rentabilité 10 ans après sa création",
        content: "Jumia Technologies, souvent surnommé 'l'Amazon africain', annonce son premier trimestre profitable avec 8 millions de dollars de bénéfice net au T1 2026. Cette performance historique résulte d'une stratégie de recentrage sur 6 marchés clés (Nigeria, Égypte, Kenya, Maroc, Côte d'Ivoire, Sénégal) et d'optimisation logistique. Les ventes ont atteint 320 millions de dollars (+45% YoY) avec 12 millions de transactions. L'action bondit de 65% à la nouvelle.",
        source: "Jumia Technologies",
        author: "Sacha Poignonnec",
        tags: "Jumia,E-commerce,Rentabilité,Tech",
        impact: "medium",
        countries: "NG,EG,KE,MA,CI,SN",
        is_featured: 0
    },
    {
        title: "Le Sénégal découvre des réserves pétrolières de 2 milliards de barils",
        category: "Pétrole",
        summary: "Nouvelle découverte offshore qui pourrait doubler les réserves connues du pays",
        content: "La société pétrolière britannique BP annonce une découverte majeure dans le bassin offshore sénégalais : un nouveau gisement estimé à 2 milliards de barils de pétrole. Cette découverte s'ajoute aux champs SNE et FAN déjà en développement, portant les réserves totales du Sénégal à près de 5 milliards de barils. La production devrait débuter fin 2027 avec un objectif de 300,000 barils/jour, faisant du Sénégal un exportateur pétrolier significatif et générant 2 milliards de dollars annuels de revenus.",
        source: "BP Exploration",
        author: "Ibrahima Sarr",
        tags: "Sénégal,Pétrole,Découverte,BP",
        impact: "high",
        countries: "SN",
        is_featured: 1
    },
    {
        title: "La fintech sud-africaine TymeBank atteint 10 millions de clients",
        category: "Finance",
        summary: "La banque digitale devient la 5ème plus grande banque d'Afrique du Sud en seulement 5 ans",
        content: "TymeBank, la banque 100% digitale sud-africaine fondée en 2019, franchit le cap symbolique de 10 millions de clients, devenant ainsi la 5ème plus grande institution bancaire du pays. Avec zéro frais de tenue de compte et une app primée, TymeBank cible la classe moyenne et les populations sous-bancarisées. La fintech prévoit une expansion en Afrique de l'Est dès 2026 et envisage une IPO en 2027 avec une valorisation attendue de 2 milliards de dollars.",
        source: "TymeBank",
        author: "Tauriq Keraan",
        tags: "Afrique du Sud,Fintech,Banking,Digital",
        impact: "medium",
        countries: "ZA",
        is_featured: 0
    },
    {
        title: "Le Ghana émet 1 milliard $ d'obligations vertes pour financer la transition énergétique",
        category: "Finance",
        summary: "Première émission souveraine d'obligations vertes en Afrique de l'Ouest",
        content: "Le gouvernement ghanéen réalise une levée historique de 1 milliard de dollars via des Green Bonds à 10 ans, marquant la première émission souveraine d'obligations vertes en Afrique de l'Ouest. Les fonds seront alloués au développement de 2 GW de capacité solaire, à la reforestation de 500,000 hectares, et à l'électrification rurale. La demande a été 3 fois supérieure à l'offre avec un taux d'intérêt final de 6.8%, démontrant l'appétit des investisseurs pour les instruments durables africains.",
        source: "Ghana Ministry of Finance",
        author: "Ken Ofori-Atta",
        tags: "Ghana,Green Bonds,Finance Verte,Obligations",
        impact: "high",
        countries: "GH",
        is_featured: 1
    },
    {
        title: "Dangote Petroleum inaugure la plus grande raffinerie d'Afrique",
        category: "Industrie",
        summary: "La raffinerie nigériane de 650,000 barils/jour commence sa production commerciale",
        content: "Aliko Dangote, l'homme le plus riche d'Afrique, inaugure officiellement sa méga-raffinerie de 19 milliards de dollars à Lagos. Avec une capacité de traitement de 650,000 barils de pétrole brut par jour, c'est la plus grande raffinerie du continent africain et l'une des plus modernes au monde. Cette infrastructure transforme le Nigeria d'importateur net de produits pétroliers en exportateur, économisant 10 milliards de dollars annuels en devises et créant 70,000 emplois directs et indirects.",
        source: "Dangote Group",
        author: "Aliko Dangote",
        tags: "Nigeria,Raffinerie,Pétrole,Dangote",
        impact: "high",
        countries: "NG",
        is_featured: 1
    },
    {
        title: "Le Rwanda ouvre son premier centre de fabrication de semi-conducteurs",
        category: "Tech",
        summary: "Partenariat avec Intel pour produire des puces destinées aux marchés africains",
        content: "Le Rwanda franchit une nouvelle étape dans sa transformation digitale avec l'inauguration d'une usine de fabrication de semi-conducteurs à Kigali, en partenariat avec Intel. Cette usine de 800 millions de dollars produira des puces pour smartphones, IoT et équipements télécoms, ciblant le marché africain en croissance. Le projet créera 3,500 emplois qualifiés et positionne le Rwanda comme hub technologique africain. C'est la première fab de semi-conducteurs en Afrique subsaharienne.",
        source: "Rwanda ICT Chamber",
        author: "Paula Ingabire",
        tags: "Rwanda,Tech,Semi-conducteurs,Intel",
        impact: "high",
        countries: "RW",
        is_featured: 1
    },
    {
        title: "La BAD et la BEI financent 3 milliards $ pour l'agriculture climato-intelligente",
        category: "Agriculture",
        summary: "Programme massif pour transformer l'agriculture africaine face au changement climatique",
        content: "La Banque Africaine de Développement (BAD) et la Banque Européenne d'Investissement (BEI) lancent un fonds de 3 milliards de dollars dédié à l'agriculture climato-intelligente en Afrique. Ce programme sur 7 ans financera l'irrigation intelligente, les semences résistantes à la sécheresse, l'agriculture de précision et la mécanisation. Objectif : augmenter les rendements de 40%, réduire les pertes post-récolte de 50% et améliorer la résilience climatique de 100 millions de fermiers africains.",
        source: "African Development Bank",
        author: "Akinwumi Adesina",
        tags: "Agriculture,Climat,BAD,BEI,Financement",
        impact: "high",
        countries: "CI,GH,KE,NG,SN,ET,ZA,MZ,UG,ZM",
        is_featured: 0
    },
    {
        title: "MTN Group annonce une IPO de sa filiale fintech à 5 milliards $",
        category: "Finance",
        summary: "MTN Mobile Money prépare son introduction en bourse, la plus grosse IPO fintech africaine",
        content: "Le géant sud-africain des télécoms MTN Group prépare l'introduction en bourse de sa division fintech MTN Mobile Money (MoMo), avec une valorisation cible de 5 milliards de dollars. MoMo compte 65 millions d'utilisateurs actifs dans 17 pays africains et traite 2 milliards de dollars de transactions mensuelles. Cette IPO, prévue pour Q3 2026 à la Johannesburg Stock Exchange, sera la plus importante du secteur fintech africain et permettra à MTN de lever 2 milliards pour financer l'expansion.",
        source: "MTN Group",
        author: "Ralph Mupita",
        tags: "MTN,Fintech,IPO,Mobile Money",
        impact: "high",
        countries: "ZA,NG,GH,UG,CI,CM",
        is_featured: 1
    },
    {
        title: "L'Union Africaine lance l'AfCFTA Payment System pour faciliter le commerce intra-africain",
        category: "Commerce",
        summary: "Nouveau système de paiement panafricain pour réduire la dépendance au dollar dans les échanges",
        content: "L'Union Africaine dévoile l'AfCFTA Payment System (PAPSS), une infrastructure de paiement permettant les transactions commerciales en monnaies locales entre pays africains. Actuellement, 80% du commerce intra-africain transite par des devises étrangères (dollar, euro), générant des frais de change de 5 milliards de dollars annuels. PAPSS connecte les banques centrales de 42 pays et permet des règlements instantanés en monnaies locales. Objectif : doubler le commerce intra-africain à 500 milliards $ d'ici 2030.",
        source: "African Union",
        author: "Wamkele Mene",
        tags: "ZLECAF,Commerce,Paiements,Union Africaine",
        impact: "high",
        countries: "ALL",
        is_featured: 1
    },
    {
        title: "Le Maroc exporte ses premiers panneaux solaires 'Made in Morocco'",
        category: "Énergie",
        summary: "L'usine de Tanger produit 2 GW de panneaux photovoltaïques par an pour l'export",
        content: "Le Maroc renforce sa position de leader africain des énergies renouvelables avec le démarrage des exportations de panneaux solaires fabriqués localement. L'usine de Tanger, fruit d'un partenariat sino-marocain de 500 millions de dollars, a une capacité de production de 2 GW de modules photovoltaïques par an. Ces panneaux seront exportés vers l'Europe (60%), l'Afrique (30%) et le Moyen-Orient (10%). Le Maroc vise ainsi à devenir un hub manufacturier vert pour l'Afrique et le sud de l'Europe.",
        source: "MASEN",
        author: "Mustapha Bakkoury",
        tags: "Maroc,Solaire,Export,Industrie Verte",
        impact: "medium",
        countries: "MA",
        is_featured: 0
    },
    {
        title: "La Côte d'Ivoire devient le premier pays africain à adopter l'euro numérique",
        category: "Crypto",
        summary: "Programme pilote de la BCE pour tester l'euro digital dans la zone UEMOA",
        content: "La Banque Centrale Européenne (BCE) choisit la Côte d'Ivoire pour tester l'euro numérique en Afrique, en partenariat avec la BCEAO. Ce programme pilote de 6 mois permettra à 100,000 Ivoiriens d'utiliser l'euro digital pour les paiements quotidiens et les envois de fonds depuis l'Europe. L'objectif est de réduire les frais de transferts (actuellement 7-10%) et de faciliter le commerce avec la zone euro. Si le test est concluant, le déploiement sera étendu aux 8 pays de l'UEMOA dès 2027.",
        source: "BCEAO",
        author: "Jean-Claude Kassi Brou",
        tags: "Côte d'Ivoire,Euro Numérique,CBDC,BCEAO",
        impact: "medium",
        countries: "CI",
        is_featured: 0
    },
    {
        title: "Ethiopian Airlines commande 50 avions électriques pour vols régionaux",
        category: "Transport",
        summary: "Première compagnie africaine à s'engager dans l'aviation zéro émission",
        content: "Ethiopian Airlines, leader africain du transport aérien, signe un protocole d'accord avec le constructeur suédois Heart Aerospace pour l'acquisition de 50 avions électriques ES-30 à livrer entre 2028 et 2032. Ces appareils de 30 places avec 400 km d'autonomie serviront les routes régionales est-africaines (Addis-Nairobi, Addis-Kigali, etc.). Cette commande de 1,5 milliard de dollars fait d'Ethiopian la première compagnie africaine à s'engager concrètement dans l'aviation décarbonée, en ligne avec les objectifs climatiques du continent.",
        source: "Ethiopian Airlines",
        author: "Mesfin Tasew",
        tags: "Éthiopie,Aviation,Électrique,Transport Vert",
        impact: "medium",
        countries: "ET",
        is_featured: 0
    },
    {
        title: "L'Afrique du Sud et le Botswana créent une zone économique spéciale diamantaire",
        category: "Mines",
        summary: "Hub de taille et certification de diamants pour capter plus de valeur ajoutée",
        content: "L'Afrique du Sud et le Botswana, qui produisent ensemble 60% des diamants mondiaux en valeur, lancent une Zone Économique Spéciale (ZES) transfrontalière dédiée au diamant à Gaborone. Cette ZES hébergera des ateliers de taille, polissage, certification et trading pour transformer localement les diamants bruts au lieu de les exporter. Objectif : capter 40% de la valeur ajoutée (actuellement 10%) et créer 25,000 emplois qualifiés. Des incitations fiscales attireront les grandes maisons diamantaires d'Anvers et Tel-Aviv.",
        source: "Government of Botswana",
        author: "Mokgweetsi Masisi",
        tags: "Botswana,Afrique du Sud,Diamant,ZES",
        impact: "medium",
        countries: "BW,ZA",
        is_featured: 0
    },
    {
        title: "Flutterwave valorisé à 5 milliards $ lors de sa levée de série E",
        category: "Fintech",
        summary: "La licorne nigériane devient la fintech la plus valorisée d'Afrique",
        content: "Flutterwave, la plateforme de paiements nigériane, lève 500 millions de dollars en série E auprès de Tiger Global, SoftBank et Sequoia Capital, portant sa valorisation à 5 milliards de dollars. C'est la plus haute valorisation jamais atteinte par une fintech africaine. Flutterwave traite 16 milliards de dollars de transactions annuelles pour 1 million de commerçants dans 34 pays africains. Les fonds serviront à l'expansion en Afrique du Nord et francophone, et au développement de solutions crypto-natives.",
        source: "Flutterwave",
        author: "Olugbenga Agboola",
        tags: "Flutterwave,Fintech,Licorne,Nigeria",
        impact: "high",
        countries: "NG",
        is_featured: 1
    },
    {
        title: "La Tanzanie lance son premier train à hydrogène en partenariat avec Alstom",
        category: "Transport",
        summary: "Ligne pilote Dar es Salaam-Morogoro avec technologie française de train à hydrogène",
        content: "La Tanzanie inaugure la première ligne ferroviaire à hydrogène d'Afrique sur le tronçon Dar es Salaam-Morogoro (200 km) en partenariat avec le français Alstom. Ce train zéro émission utilise des piles à combustible alimentées par de l'hydrogène vert produit localement à partir d'énergie solaire. Le projet de 800 millions de dollars inclut 5 rames et une station de production d'hydrogène de 10 MW. Si le test est concluant, la Tanzanie envisage de convertir l'ensemble de son réseau ferroviaire de 2,500 km à l'hydrogène d'ici 2035.",
        source: "Tanzania Railways Corporation",
        author: "Samia Suluhu Hassan",
        tags: "Tanzanie,Hydrogène,Train,Transport Vert",
        impact: "medium",
        countries: "TZ",
        is_featured: 0
    }
];

// Insérer les actualités
const insertNews = db.prepare(`
    INSERT INTO news (
        title, category, summary, content,
        source, country,
        published_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' hours'))
`);

let count = 0;
for (let i = 0; i < newsArticles.length; i++) {
    const article = newsArticles[i];
    // Varier les dates de publication (0 à 500 heures dans le passé, soit ~20 jours)
    const hoursAgo = i * 24;
    // Prendre le premier pays de la liste
    const primaryCountry = article.countries.split(',')[0];

    try {
        insertNews.run(
            article.title, article.category,
            article.summary, article.content,
            article.source, primaryCountry,
            hoursAgo
        );

        count++;
        console.log(`✅ ${article.title}`);
    } catch (error) {
        console.error(`❌ Erreur pour ${article.title}:`, error.message);
    }
}

console.log(`\n✅ ${count} nouvelles actualités ajoutées avec succès!\n`);

// Afficher le total
const total = db.prepare('SELECT COUNT(*) as count FROM news').get();
console.log(`📊 Total d'actualités dans la base : ${total.count}\n`);

db.close();
