/**
 * Service de récupération des données de marché
 * Fournit des données de marché pour les principales bourses africaines
 */

class MarketDataService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Peupler la base avec des données de marché de référence
   */
  async seedMarketData() {
    console.log('📊 Peuplement des données de marché...');

    const markets = [
      // JSE - Johannesburg Stock Exchange (Afrique du Sud)
      {
        exchange: 'JSE',
        country: 'ZA',
        stocks: [
          { symbol: 'AGL', name: 'Anglo American PLC', sector: 'Mining', price: 45000, change: 1.2 },
          { symbol: 'BHP', name: 'BHP Billiton PLC', sector: 'Mining', price: 38500, change: -0.5 },
          { symbol: 'SBK', name: 'Standard Bank Group', sector: 'Banking', price: 14200, change: 0.8 },
          { symbol: 'FSR', name: 'FirstRand Ltd', sector: 'Banking', price: 6800, change: 1.1 },
          { symbol: 'NED', name: 'Nedbank Group Ltd', sector: 'Banking', price: 19500, change: -0.3 },
          { symbol: 'ANG', name: 'AngloGold Ashanti Ltd', sector: 'Mining', price: 29000, change: 2.1 },
          { symbol: 'IMP', name: 'Implats', sector: 'Mining', price: 15800, change: 1.5 },
          { symbol: 'MTN', name: 'MTN Group Ltd', sector: 'Telecommunications', price: 9200, change: 0.4 },
          { symbol: 'VOD', name: 'Vodacom Group Ltd', sector: 'Telecommunications', price: 12400, change: -0.2 },
          { symbol: 'NPN', name: 'Naspers Ltd', sector: 'Technology', price: 285000, change: 1.8 }
        ]
      },
      // NGX - Nigerian Exchange (Nigeria)
      {
        exchange: 'NGX',
        country: 'NG',
        stocks: [
          { symbol: 'DANGCEM', name: 'Dangote Cement', sector: 'Materials', price: 28500, change: 0.9 },
          { symbol: 'MTNN', name: 'MTN Nigeria', sector: 'Telecommunications', price: 24000, change: 1.2 },
          { symbol: 'BUACEMENT', name: 'BUA Cement', sector: 'Materials', price: 9800, change: -0.4 },
          { symbol: 'ZENITHBANK', name: 'Zenith Bank', sector: 'Banking', price: 3500, change: 0.7 },
          { symbol: 'GTCO', name: 'Guaranty Trust Holding', sector: 'Banking', price: 4200, change: 1.1 },
          { symbol: 'UBA', name: 'United Bank for Africa', sector: 'Banking', price: 2800, change: 0.5 },
          { symbol: 'AIRTELAFRI', name: 'Airtel Africa', sector: 'Telecommunications', price: 175000, change: 2.3 },
          { symbol: 'SEPLAT', name: 'Seplat Energy', sector: 'Energy', price: 320000, change: -1.2 },
          { symbol: 'NESTLE', name: 'Nestle Nigeria', sector: 'Consumer Goods', price: 145000, change: 0.8 },
          { symbol: 'FLOURMILL', name: 'Flour Mills of Nigeria', sector: 'Consumer Goods', price: 4500, change: 1.4 }
        ]
      },
      // BRVM - Bourse Régionale des Valeurs Mobilières (UEMOA)
      {
        exchange: 'BRVM',
        country: 'CI',
        stocks: [
          { symbol: 'SONATEL', name: 'Sonatel', sector: 'Telecommunications', price: 18500, change: 0.6 },
          { symbol: 'BOAB', name: 'Bank of Africa Benin', sector: 'Banking', price: 6200, change: 0.9 },
          { symbol: 'BOABF', name: 'Bank of Africa Burkina Faso', sector: 'Banking', price: 5800, change: 0.3 },
          { symbol: 'SGBCI', name: 'Société Générale Côte d\'Ivoire', sector: 'Banking', price: 8500, change: 1.2 },
          { symbol: 'ETIT', name: 'Ecobank Transnational', sector: 'Banking', price: 3200, change: -0.5 },
          { symbol: 'PALC', name: 'Palm Côte d\'Ivoire', sector: 'Agriculture', price: 7800, change: 1.5 },
          { symbol: 'SMBC', name: 'SMB Côte d\'Ivoire', sector: 'Consumer Goods', price: 9200, change: 0.7 },
          { symbol: 'SIVC', name: 'SIV Côte d\'Ivoire', sector: 'Agriculture', price: 6500, change: 1.1 },
          { symbol: 'ONTBF', name: 'ONATEL Burkina Faso', sector: 'Telecommunications', price: 4200, change: 0.4 },
          { symbol: 'BICC', name: 'BICICI', sector: 'Banking', price: 7200, change: 0.8 }
        ]
      },
      // EGX - Egyptian Exchange (Égypte)
      {
        exchange: 'EGX',
        country: 'EG',
        stocks: [
          { symbol: 'CIB', name: 'Commercial International Bank', sector: 'Banking', price: 8500, change: 1.3 },
          { symbol: 'COMI', name: 'Commercial International Bank (Egypt)', sector: 'Banking', price: 8200, change: 1.1 },
          { symbol: 'OCDI', name: 'Orascom Construction', sector: 'Construction', price: 12500, change: 0.9 },
          { symbol: 'ETEL', name: 'Egypt Telecom', sector: 'Telecommunications', price: 1800, change: -0.3 },
          { symbol: 'SWDY', name: 'El Sewedy Electric', sector: 'Industrials', price: 3400, change: 1.7 },
          { symbol: 'HELI', name: 'Heliopolis Housing', sector: 'Real Estate', price: 6800, change: 0.5 },
          { symbol: 'ISMA', name: 'Ismailia Real Estate', sector: 'Real Estate', price: 4200, change: 0.8 },
          { symbol: 'JUFO', name: 'Juhayna Food Industries', sector: 'Consumer Goods', price: 5500, change: 1.2 },
          { symbol: 'EAST', name: 'Eastern Company', sector: 'Consumer Goods', price: 2900, change: 0.6 },
          { symbol: 'PHDC', name: 'Palm Hills Developments', sector: 'Real Estate', price: 7200, change: 1.4 }
        ]
      },
      // MASI - Moroccan All Shares Index (Maroc)
      {
        exchange: 'MASI',
        country: 'MA',
        stocks: [
          { symbol: 'ATW', name: 'Attijariwafa Bank', sector: 'Banking', price: 48500, change: 0.9 },
          { symbol: 'BCP', name: 'Banque Centrale Populaire', sector: 'Banking', price: 25800, change: 1.2 },
          { symbol: 'IAM', name: 'Maroc Telecom', sector: 'Telecommunications', price: 12200, change: 0.4 },
          { symbol: 'LHM', name: 'LafargeHolcim Maroc', sector: 'Materials', price: 185000, change: 1.5 },
          { symbol: 'ONA', name: 'ONA', sector: 'Conglomerate', price: 95000, change: 0.7 },
          { symbol: 'CIH', name: 'CIH Bank', sector: 'Banking', price: 32500, change: 0.8 },
          { symbol: 'MNG', name: 'Managem', sector: 'Mining', price: 125000, change: 2.1 },
          { symbol: 'SAM', name: 'Samir', sector: 'Energy', price: 15800, change: -0.5 },
          { symbol: 'CMA', name: 'Crédit du Maroc', sector: 'Banking', price: 62000, change: 1.1 },
          { symbol: 'RDS', name: 'Résidences Dar Saada', sector: 'Real Estate', price: 28500, change: 0.6 }
        ]
      }
    ];

    let totalInserted = 0;

    for (const market of markets) {
      for (const stock of market.stocks) {
        try {
          // Vérifier si l'action existe déjà
          const existing = this.db.prepare('SELECT id FROM stocks WHERE symbol = ?').get(stock.symbol);

          if (!existing) {
            this.db.prepare(`
              INSERT INTO stocks (
                symbol, name, exchange, sector,
                price, change_percent, volume
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              stock.symbol,
              stock.name,
              market.exchange,
              stock.sector,
              stock.price,
              stock.change,
              Math.floor(Math.random() * 1000000) + 100000 // Volume aléatoire
            );
            totalInserted++;
          }
        } catch (err) {
          console.error(`Erreur insertion ${stock.symbol}:`, err.message);
        }
      }
    }

    console.log(`✅ ${totalInserted} actions ajoutées à la base de données`);
    return totalInserted;
  }

  /**
   * Mettre à jour les prix avec des variations aléatoires (simulation)
   */
  updatePrices() {
    try {
      const stocks = this.db.prepare('SELECT * FROM stocks').all();

      let updated = 0;
      for (const stock of stocks) {
        // Variation aléatoire entre -3% et +3%
        const variation = (Math.random() * 6 - 3) / 100;
        const newPrice = stock.price * (1 + variation);
        const changePercent = variation * 100;

        this.db.prepare(`
          UPDATE stocks
          SET price = ?,
              change_percent = ?,
              timestamp = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newPrice, changePercent, stock.id);

        updated++;
      }

      console.log(`📈 ${updated} prix mis à jour`);
      return updated;
    } catch (err) {
      console.error('Erreur mise à jour prix:', err);
      return 0;
    }
  }

  /**
   * Démarrer la mise à jour automatique des prix
   */
  startAutoUpdate(intervalMinutes = 5) {
    console.log(`🔄 Démarrage de la mise à jour automatique (toutes les ${intervalMinutes} min)`);

    // Mise à jour initiale
    this.updatePrices();

    // Puis toutes les X minutes
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Arrêter la mise à jour automatique
   */
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏸️ Mise à jour automatique arrêtée');
    }
  }
}

module.exports = MarketDataService;
