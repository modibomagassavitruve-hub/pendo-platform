/**
 * PENDO - Script d'initialisation de la base de données
 * Usage: node scripts/initDatabase.js
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'pendo.db');

console.log('═'.repeat(50));
console.log('  PENDO - Initialisation Base de Données');
console.log('═'.repeat(50));

// Créer le dossier data
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
console.log('✅ DB connectée:', DB_PATH);

// Schéma
db.exec(`
CREATE TABLE IF NOT EXISTS exchanges (
    id TEXT PRIMARY KEY, name TEXT, full_name TEXT, country TEXT, currency TEXT,
    timezone TEXT DEFAULT 'UTC', trading_hours_open TEXT, trading_hours_close TEXT,
    website TEXT, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, name TEXT, name_en TEXT,
    exchange_id TEXT, FOREIGN KEY (exchange_id) REFERENCES exchanges(id)
);
CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ticker TEXT, name TEXT, full_name TEXT, isin TEXT,
    exchange_id TEXT, sector_id INTEGER, subsector TEXT, country TEXT, country_name TEXT,
    description TEXT, logo_url TEXT, website TEXT, ipo_date DATE, is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticker, exchange_id), FOREIGN KEY (sector_id) REFERENCES sectors(id)
);
CREATE TABLE IF NOT EXISTS stock_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT, stock_id INTEGER, price REAL, open REAL, high REAL,
    low REAL, previous_close REAL, change_value REAL, change_percent REAL, volume INTEGER DEFAULT 0,
    market_cap REAL, bid REAL, ask REAL, spread REAL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    source TEXT, FOREIGN KEY (stock_id) REFERENCES stocks(id)
);
CREATE TABLE IF NOT EXISTS stock_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, stock_id INTEGER, date DATE, open REAL, high REAL,
    low REAL, close REAL, volume INTEGER DEFAULT 0, UNIQUE(stock_id, date)
);
CREATE TABLE IF NOT EXISTS stock_fundamentals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, stock_id INTEGER, fiscal_year INTEGER, revenue REAL,
    net_income REAL, eps REAL, per REAL, dividend_yield REAL, roe REAL
);
CREATE TABLE IF NOT EXISTS indices (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ticker TEXT UNIQUE, name TEXT, full_name TEXT,
    exchange_id TEXT, description TEXT, value REAL, change_percent REAL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT, stock_id INTEGER, title TEXT, summary TEXT,
    source TEXT, source_url TEXT, category TEXT, published_at DATETIME
);
CREATE TABLE IF NOT EXISTS collection_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, exchange_id TEXT, source TEXT, status TEXT,
    stocks_collected INTEGER DEFAULT 0, errors_count INTEGER DEFAULT 0, duration_ms INTEGER,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks(ticker);
CREATE INDEX IF NOT EXISTS idx_stock_prices_stock ON stock_prices(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_ts ON stock_prices(timestamp);
`);

console.log('✅ Tables créées');

// BRVM
db.prepare(`INSERT OR REPLACE INTO exchanges VALUES ('BRVM','BRVM','Bourse Régionale des Valeurs Mobilières','UEMOA','XOF','UTC','09:00','15:00','https://brvm.org',1,datetime('now'))`).run();

// Secteurs
[['AGRICULTURE','Agriculture','Agriculture'],['DISTRIBUTION','Distribution','Distribution'],['FINANCE','Finance','Financials'],['INDUSTRIE','Industrie','Industrials'],['SERVICES_PUBLICS','Services Publics','Utilities'],['TRANSPORT','Transport','Transport']].forEach(s => {
  db.prepare('INSERT OR REPLACE INTO sectors (code,name,name_en,exchange_id) VALUES (?,?,?,?)').run(s[0],s[1],s[2],'BRVM');
});

// Indices
db.prepare(`INSERT OR REPLACE INTO indices (ticker,name,full_name,exchange_id,description) VALUES ('BRVMC','BRVM Composite','BRVM Composite Index','BRVM','Toutes les valeurs')`).run();
db.prepare(`INSERT OR REPLACE INTO indices (ticker,name,full_name,exchange_id,description) VALUES ('BRVM10','BRVM 10','BRVM 10 Index','BRVM','10 valeurs les plus actives')`).run();

// 46 Sociétés BRVM
const stocks = [
  ['SGBC','SGBCI','Société Générale de Banques CI','CI0000000346','FINANCE','Banques','CI','Côte d\'Ivoire'],
  ['BICC','BICICI','Banque Internationale Commerce Industrie','CI0000000155','FINANCE','Banques','CI','Côte d\'Ivoire'],
  ['BOAB','BOA Bénin','Bank of Africa Bénin','BJ0000000024','FINANCE','Banques','BJ','Bénin'],
  ['BOABF','BOA Burkina','Bank of Africa Burkina Faso','BF0000000133','FINANCE','Banques','BF','Burkina Faso'],
  ['BOAC','BOA CI','Bank of Africa Côte d\'Ivoire','CI0000000189','FINANCE','Banques','CI','Côte d\'Ivoire'],
  ['BOAM','BOA Mali','Bank of Africa Mali','ML0000000127','FINANCE','Banques','ML','Mali'],
  ['BOAN','BOA Niger','Bank of Africa Niger','NE0000000087','FINANCE','Banques','NE','Niger'],
  ['BOAS','BOA Sénégal','Bank of Africa Sénégal','SN0000000332','FINANCE','Banques','SN','Sénégal'],
  ['CBIBF','Coris Bank','Coris Bank International','BF0000000216','FINANCE','Banques','BF','Burkina Faso'],
  ['ECOC','Ecobank CI','Ecobank Côte d\'Ivoire','CI0000000247','FINANCE','Banques','CI','Côte d\'Ivoire'],
  ['ETIT','ETI','Ecobank Transnational Incorporated','TG0000000132','FINANCE','Banques','TG','Togo'],
  ['NSBC','NSIA Banque','NSIA Banque CI','CI0000000510','FINANCE','Banques','CI','Côte d\'Ivoire'],
  ['ORGT','Oragroup','Oragroup Togo','TG0000000223','FINANCE','Banques','TG','Togo'],
  ['SIBC','SIB','Société Ivoirienne de Banque','CI0000000460','FINANCE','Banques','CI','Côte d\'Ivoire'],
  ['SAFC','SAFCA','Alios Finance CI','CI0000000353','FINANCE','Crédit','CI','Côte d\'Ivoire'],
  ['SNTS','SONATEL','Sonatel Sénégal','SN0000000019','SERVICES_PUBLICS','Télécoms','SN','Sénégal'],
  ['ORAC','Orange CI','Orange Côte d\'Ivoire','CI0000000428','SERVICES_PUBLICS','Télécoms','CI','Côte d\'Ivoire'],
  ['ONTBF','ONATEL','Onatel Burkina Faso','BF0000000174','SERVICES_PUBLICS','Télécoms','BF','Burkina Faso'],
  ['CIEC','CIE','Compagnie Ivoirienne d\'Électricité','CI0000000213','SERVICES_PUBLICS','Électricité','CI','Côte d\'Ivoire'],
  ['SDCC','SODECI','Société Distribution Eau CI','CI0000000338','SERVICES_PUBLICS','Eau','CI','Côte d\'Ivoire'],
  ['LNBB','Loterie Bénin','Loterie Nationale du Bénin','BJ0000000057','SERVICES_PUBLICS','Jeux','BJ','Bénin'],
  ['SLBC','SOLIBRA','Société Limonaderies Brasseries','CI0000000411','INDUSTRIE','Boissons','CI','Côte d\'Ivoire'],
  ['NTLC','Nestlé CI','Nestlé Côte d\'Ivoire','CI0000000304','INDUSTRIE','Agroalimentaire','CI','Côte d\'Ivoire'],
  ['UNLC','Unilever CI','Unilever Côte d\'Ivoire','CI0000000130','INDUSTRIE','Consommation','CI','Côte d\'Ivoire'],
  ['FTSC','FILTISAC','Filtisac Côte d\'Ivoire','CI0000000254','INDUSTRIE','Emballage','CI','Côte d\'Ivoire'],
  ['CABC','SICABLE','Société Ivoirienne de Câbles','CI0000000361','INDUSTRIE','Câblerie','CI','Côte d\'Ivoire'],
  ['SMBC','SMB','Société Multinationale Bitumes','CI0000000262','INDUSTRIE','Matériaux','CI','Côte d\'Ivoire'],
  ['STBC','SITAB','Société Ivoirienne de Tabacs','CI0000000270','INDUSTRIE','Tabac','CI','Côte d\'Ivoire'],
  ['UNXC','UNIWAX','Uniwax Côte d\'Ivoire','CI0000000122','INDUSTRIE','Textile','CI','Côte d\'Ivoire'],
  ['ABJC','Servair','Servair Abidjan','CI0000000395','INDUSTRIE','Services Aéro','CI','Côte d\'Ivoire'],
  ['NEIC','NEI-CEDA','Nouvelles Éditions Ivoiriennes','CI0000000296','INDUSTRIE','Édition','CI','Côte d\'Ivoire'],
  ['SEMC','Crown SIEM','Eviosys Packaging SIEM','CI0000000221','INDUSTRIE','Emballage','CI','Côte d\'Ivoire'],
  ['SIVC','Air Liquide','SIVOA Air Liquide CI','CI0000000163','INDUSTRIE','Gaz','CI','Côte d\'Ivoire'],
  ['STAC','SETAO','Société Équipement Territoire','CI0000000237','INDUSTRIE','BTP','CI','Côte d\'Ivoire'],
  ['PALC','PALM CI','Palm Côte d\'Ivoire','CI0000000312','AGRICULTURE','Palmier','CI','Côte d\'Ivoire'],
  ['SHEC','SAPH','Société Africaine Plantations Hévéas','CI0000000320','AGRICULTURE','Caoutchouc','CI','Côte d\'Ivoire'],
  ['SOGC','SOGB','Société Caoutchoucs Grand-Béréby','CI0000000403','AGRICULTURE','Caoutchouc','CI','Côte d\'Ivoire'],
  ['SCRC','SUCRIVOIRE','Sucrivoire','CI0000000379','AGRICULTURE','Sucre','CI','Côte d\'Ivoire'],
  ['SICC','SICOR','Société Ivoirienne Coco Râpé','CI0000000387','AGRICULTURE','Transformation','CI','Côte d\'Ivoire'],
  ['TTLC','TotalEnergies CI','TotalEnergies Marketing CI','CI0000000148','DISTRIBUTION','Pétrole','CI','Côte d\'Ivoire'],
  ['TTLS','TotalEnergies SN','TotalEnergies Marketing Sénégal','SN0000000043','DISTRIBUTION','Pétrole','SN','Sénégal'],
  ['VIVO','Vivo Energy','Vivo Energy Côte d\'Ivoire','CI0000000536','DISTRIBUTION','Pétrole','CI','Côte d\'Ivoire'],
  ['CFAC','CFAO Motors','CFAO Motors Côte d\'Ivoire','CI0000000445','DISTRIBUTION','Automobile','CI','Côte d\'Ivoire'],
  ['TTRC','Tractafric','Tractafric Motors CI','CI0000000486','DISTRIBUTION','Automobile','CI','Côte d\'Ivoire'],
  ['PRSC','Bernabé','Établissements Bernabé CI','CI0000000171','DISTRIBUTION','Distribution','CI','Côte d\'Ivoire']
];

const getSector = db.prepare('SELECT id FROM sectors WHERE code = ?');
const insertStock = db.prepare('INSERT OR REPLACE INTO stocks (ticker,name,full_name,isin,exchange_id,sector_id,subsector,country,country_name,is_active) VALUES (?,?,?,?,\'BRVM\',?,?,?,?,1)');

stocks.forEach(s => {
  const sec = getSector.get(s[4]);
  if (sec) insertStock.run(s[0],s[1],s[2],s[3],sec.id,s[5],s[6],s[7]);
});

const count = db.prepare('SELECT COUNT(*) as c FROM stocks WHERE exchange_id = ?').get('BRVM');
console.log(`✅ ${count.c} sociétés BRVM insérées`);
console.log('\n✅ Initialisation terminée!');
db.close();
