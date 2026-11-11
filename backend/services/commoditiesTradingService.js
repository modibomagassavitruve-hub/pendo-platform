/**
 * PENDO - Service de Trading de Matières Premières (Commodities)
 *
 * Contexte Afrique:
 * - L'Afrique produit 70% du cacao mondial, 20% de l'or, 15% du coton
 * - Mais les producteurs africains ne peuvent PAS investir/hedger
 * - PENDO = Premier accès retail aux commodities africaines
 *
 * Commodities Phase 1 (5 essentielles):
 * 1. OR (Gold) - Valeur refuge, hedge inflation, production africaine massive
 * 2. CACAO (Cocoa) - CI+Ghana = 60% production mondiale
 * 3. CAFÉ (Coffee) - Éthiopie, Kenya, Ouganda
 * 4. PÉTROLE (Crude Oil) - Nigeria, Angola, Algérie
 * 5. COTON (Cotton) - Mali, Burkina, Bénin
 *
 * Fonctionnalités:
 * - Spot trading (achat/vente immédiat)
 * - Futures contracts (contrats à terme)
 * - Fractional ownership (0.001 oz or, 0.1 barrel pétrole)
 * - Hedging calculator (pour producteurs)
 * - Prix temps réel
 * - Corrélations avec autres assets
 * - Seasonal patterns
 * - News & sentiment
 */

const Database = require('better-sqlite3');
const path = require('path');

class CommoditiesTradingService {
  constructor() {
    const dbPath = path.join(__dirname, '../data/pendo.db');
    this.db = new Database(dbPath);

    // Catalogue des commodities (DOIT être défini AVANT initializeTables)
    this.COMMODITIES = {
      // MÉTAUX PRÉCIEUX
      GOLD: {
        symbol: 'XAU/USD',
        name: 'Or',
        nameEN: 'Gold',
        category: 'precious_metals',
        unit: 'once troy (oz)',
        minLot: 0.001, // 0.001 oz = ~50,000 FCFA à 2000$/oz
        dataSource: 'kitco',
        market: 'COMEX',
        tradingHours: '24/7',
        spreadPct: 0.5,
        // Production africaine
        africanProducers: ['Ghana', 'Mali', 'Burkina Faso', 'Afrique du Sud', 'Tanzanie'],
        africanProductionPct: 20, // % production mondiale
        typicalPrice: 2000, // USD/oz
        currency: 'USD'
      },

      SILVER: {
        symbol: 'XAG/USD',
        name: 'Argent',
        nameEN: 'Silver',
        category: 'precious_metals',
        unit: 'once troy (oz)',
        minLot: 0.01,
        dataSource: 'kitco',
        market: 'COMEX',
        tradingHours: '24/7',
        spreadPct: 1.0,
        typicalPrice: 25, // USD/oz
        currency: 'USD'
      },

      // AGRICULTURE
      COCOA: {
        symbol: 'CC',
        name: 'Cacao',
        nameEN: 'Cocoa',
        category: 'agriculture',
        unit: 'tonne métrique (MT)',
        minLot: 0.01, // 0.01 MT = 10 kg
        dataSource: 'ICE',
        market: 'ICE US',
        tradingHours: '09:00-19:00 GMT',
        spreadPct: 1.5,
        // Production africaine
        africanProducers: ['Côte d\'Ivoire', 'Ghana', 'Cameroun', 'Nigeria'],
        africanProductionPct: 70, // % production mondiale!
        typicalPrice: 2500, // USD/MT
        currency: 'USD',
        // Saisonnalité
        harvestSeason: {
          main: 'Oct-Mar', // Récolte principale
          mid: 'May-Aug'   // Récolte intermédiaire
        }
      },

      COFFEE_ARABICA: {
        symbol: 'KC',
        name: 'Café Arabica',
        nameEN: 'Coffee Arabica',
        category: 'agriculture',
        unit: 'livre (lb)',
        minLot: 10, // 10 lbs = 4.5 kg
        dataSource: 'ICE',
        market: 'ICE US',
        tradingHours: '09:15-18:30 GMT',
        spreadPct: 1.0,
        africanProducers: ['Éthiopie', 'Kenya', 'Tanzanie', 'Rwanda'],
        africanProductionPct: 12,
        typicalPrice: 1.50, // USD/lb
        currency: 'USD'
      },

      COFFEE_ROBUSTA: {
        symbol: 'RC',
        name: 'Café Robusta',
        nameEN: 'Coffee Robusta',
        category: 'agriculture',
        unit: 'tonne (MT)',
        minLot: 0.01,
        dataSource: 'ICE',
        market: 'ICE Europe',
        tradingHours: '09:00-17:30 GMT',
        spreadPct: 1.0,
        africanProducers: ['Ouganda', 'Côte d\'Ivoire', 'Guinée'],
        africanProductionPct: 15,
        typicalPrice: 2000, // USD/MT
        currency: 'USD'
      },

      COTTON: {
        symbol: 'CT',
        name: 'Coton',
        nameEN: 'Cotton',
        category: 'agriculture',
        unit: 'livre (lb)',
        minLot: 50, // 50 lbs
        dataSource: 'ICE',
        market: 'ICE US',
        tradingHours: '02:00-20:00 GMT',
        spreadPct: 1.5,
        africanProducers: ['Mali', 'Burkina Faso', 'Bénin', 'Cameroun'],
        africanProductionPct: 15,
        typicalPrice: 0.75, // USD/lb
        currency: 'USD'
      },

      // ÉNERGIE
      CRUDE_OIL_WTI: {
        symbol: 'CL',
        name: 'Pétrole brut WTI',
        nameEN: 'Crude Oil WTI',
        category: 'energy',
        unit: 'baril (barrel)',
        minLot: 0.1, // 0.1 barrel
        dataSource: 'CME',
        market: 'NYMEX',
        tradingHours: '23:00-22:00 GMT (almost 24/7)',
        spreadPct: 0.5,
        africanProducers: ['Nigeria', 'Angola', 'Algérie', 'Libye', 'Égypte'],
        africanProductionPct: 12,
        typicalPrice: 75, // USD/barrel
        currency: 'USD'
      },

      CRUDE_OIL_BRENT: {
        symbol: 'BZ',
        name: 'Pétrole brut Brent',
        nameEN: 'Crude Oil Brent',
        category: 'energy',
        unit: 'baril (barrel)',
        minLot: 0.1,
        dataSource: 'ICE',
        market: 'ICE Europe',
        tradingHours: '01:00-23:00 GMT',
        spreadPct: 0.5,
        typicalPrice: 78, // USD/barrel
        currency: 'USD'
      }
    };

    // Types de positions
    this.POSITION_TYPES = {
      SPOT: 'spot',           // Achat/vente immédiat
      FUTURE: 'future',       // Contrat à terme
      CFD: 'cfd',            // Contract for difference
      HEDGE: 'hedge'         // Position de couverture (producteurs)
    };

    // Conversion USD → XOF (à mettre à jour régulièrement)
    this.USD_TO_XOF = 600; // 1 USD = 600 FCFA (approximatif)

    // Initialiser les tables APRÈS avoir défini COMMODITIES
    this.initializeTables();
  }

  initializeTables() {
    // Table des commodities (catalogue + prix actuels)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS commodities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        name_en TEXT,
        category TEXT, -- precious_metals, agriculture, energy
        unit TEXT,

        -- Prix & données marché
        current_price_usd REAL,
        current_price_xof REAL,
        change_24h_pct REAL,
        volume_24h REAL,

        -- Trading
        min_lot REAL,
        spread_pct REAL,
        data_source TEXT,
        market TEXT,
        trading_hours TEXT,

        -- Contexte africain
        african_producers TEXT, -- JSON array
        african_production_pct REAL,

        -- Metadata
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des positions commodities utilisateurs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS commodity_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        commodity_symbol TEXT NOT NULL,

        -- Position
        position_type TEXT, -- spot, future, cfd, hedge
        quantity REAL NOT NULL,
        unit TEXT,

        -- Prix
        entry_price_usd REAL NOT NULL,
        entry_price_xof REAL NOT NULL,
        current_price_usd REAL,
        current_price_xof REAL,

        -- Valeur
        entry_value_xof REAL NOT NULL,
        current_value_xof REAL,

        -- P&L
        unrealized_pnl_xof REAL,
        unrealized_pnl_pct REAL,
        realized_pnl_xof REAL DEFAULT 0,

        -- Futures spécifiques
        expiry_date DATE, -- Pour futures
        settlement_price_usd REAL,

        -- Statut
        status TEXT DEFAULT 'open', -- open, closed
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,

        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Table des transactions commodities
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS commodity_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        commodity_symbol TEXT NOT NULL,

        -- Transaction
        type TEXT NOT NULL, -- buy, sell
        position_type TEXT, -- spot, future, cfd
        quantity REAL NOT NULL,

        -- Prix
        price_usd REAL NOT NULL,
        price_xof REAL NOT NULL,
        total_usd REAL NOT NULL,
        total_xof REAL NOT NULL,

        -- Frais
        fees_xof REAL DEFAULT 0,
        spread_cost_xof REAL DEFAULT 0,

        -- P&L (si vente)
        realized_pnl_xof REAL,

        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Table des positions de hedging (pour producteurs)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hedging_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        commodity_symbol TEXT NOT NULL,

        -- Production à hedger
        production_volume REAL NOT NULL, -- Volume production (MT, kg, etc.)
        production_unit TEXT,
        expected_harvest_date DATE,

        -- Hedge
        hedged_volume REAL NOT NULL, -- Volume couvert
        hedge_price_usd REAL NOT NULL, -- Prix garanti
        hedge_ratio REAL, -- % de production hedgée

        -- Protection
        min_guaranteed_revenue_xof REAL, -- Revenu minimum garanti
        max_potential_revenue_xof REAL,  -- Revenu max si prix monte

        -- Contrat
        contract_type TEXT, -- future, forward, option_put
        expiry_date DATE,

        -- Statut
        status TEXT DEFAULT 'active', -- active, exercised, expired
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        settled_at DATETIME,

        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Table historique prix commodities
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS commodity_prices_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,

        -- Prix OHLC
        timestamp DATETIME NOT NULL,
        open_usd REAL,
        high_usd REAL,
        low_usd REAL,
        close_usd REAL,
        volume REAL,

        -- Prix en FCFA (pour utilisateurs africains)
        close_xof REAL,

        -- Metadata
        timeframe TEXT DEFAULT '1d', -- 1h, 1d, 1w, 1m
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(symbol, timestamp, timeframe)
      )
    `);

    // Table alertes commodities
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS commodity_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        commodity_symbol TEXT NOT NULL,

        -- Alerte
        alert_type TEXT, -- price_above, price_below, harvest_season, news
        target_price_usd REAL,
        target_price_xof REAL,

        -- Conditions
        condition_met BOOLEAN DEFAULT 0,
        triggered_at DATETIME,

        -- Notification
        notification_sent BOOLEAN DEFAULT 0,

        status TEXT DEFAULT 'active', -- active, triggered, cancelled
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('✅ Tables de commodities trading initialisées');

    // Initialiser catalogue commodities
    this.initializeCommoditiesCatalog();
  }

  /**
   * Initialiser le catalogue des commodities
   */
  initializeCommoditiesCatalog() {
    const existingCount = this.db.prepare('SELECT COUNT(*) as count FROM commodities').get();

    if (existingCount.count === 0) {
      console.log('📦 Initialisation catalogue commodities...');

      Object.entries(this.COMMODITIES).forEach(([key, commodity]) => {
        this.db.prepare(`
          INSERT INTO commodities (
            symbol, name, name_en, category, unit,
            current_price_usd, current_price_xof,
            min_lot, spread_pct, data_source, market, trading_hours,
            african_producers, african_production_pct
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          commodity.symbol,
          commodity.name,
          commodity.nameEN,
          commodity.category,
          commodity.unit,
          commodity.typicalPrice,
          commodity.typicalPrice * this.USD_TO_XOF,
          commodity.minLot,
          commodity.spreadPct,
          commodity.dataSource,
          commodity.market,
          commodity.tradingHours,
          JSON.stringify(commodity.africanProducers || []),
          commodity.africanProductionPct || 0
        );
      });

      console.log(`✅ ${Object.keys(this.COMMODITIES).length} commodities ajoutées au catalogue`);
    }
  }

  /**
   * 1. ACHETER COMMODITY (Spot)
   */
  async buyCommodity(userId, commoditySymbol, quantity, positionType = 'spot') {
    // Récupérer info commodity
    const commodity = this.db.prepare(`
      SELECT * FROM commodities WHERE symbol = ?
    `).get(commoditySymbol);

    if (!commodity) {
      throw new Error('Commodity introuvable');
    }

    // Vérifier quantité minimum
    if (quantity < commodity.min_lot) {
      throw new Error(`Quantité minimum: ${commodity.min_lot} ${commodity.unit}`);
    }

    // Prix actuel + spread
    const priceUSD = commodity.current_price_usd;
    const spreadCost = priceUSD * (commodity.spread_pct / 100);
    const buyPriceUSD = priceUSD + spreadCost;
    const buyPriceXOF = buyPriceUSD * this.USD_TO_XOF;

    // Montant total
    const totalUSD = buyPriceUSD * quantity;
    const totalXOF = totalUSD * this.USD_TO_XOF;

    // Frais PENDO (0.2% pour commodities)
    const feesXOF = totalXOF * 0.002;
    const grandTotalXOF = totalXOF + feesXOF;

    // Vérifier solde
    const portfolio = this.db.prepare(`
      SELECT balance FROM portfolios WHERE user_id = ?
    `).get(userId);

    if (!portfolio || portfolio.balance < grandTotalXOF) {
      throw new Error(`Solde insuffisant. Requis: ${grandTotalXOF.toFixed(0)} FCFA, Disponible: ${portfolio?.balance?.toFixed(0) || 0} FCFA`);
    }

    // Déduire du portefeuille
    this.db.prepare(`
      UPDATE portfolios SET balance = balance - ? WHERE user_id = ?
    `).run(grandTotalXOF, userId);

    // Créer transaction
    const txStmt = this.db.prepare(`
      INSERT INTO commodity_transactions (
        user_id, commodity_symbol, type, position_type, quantity,
        price_usd, price_xof, total_usd, total_xof,
        fees_xof, spread_cost_xof
      ) VALUES (?, ?, 'buy', ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const txResult = txStmt.run(
      userId,
      commoditySymbol,
      positionType,
      quantity,
      buyPriceUSD,
      buyPriceXOF,
      totalUSD,
      totalXOF,
      feesXOF,
      spreadCost * quantity * this.USD_TO_XOF
    );

    // Créer ou mettre à jour position
    const existingPosition = this.db.prepare(`
      SELECT * FROM commodity_positions
      WHERE user_id = ? AND commodity_symbol = ? AND position_type = ? AND status = 'open'
    `).get(userId, commoditySymbol, positionType);

    if (existingPosition) {
      // Augmenter position existante
      const newQuantity = existingPosition.quantity + quantity;
      const newEntryValueXOF = existingPosition.entry_value_xof + totalXOF;
      const newAvgPriceUSD = newEntryValueXOF / (newQuantity * this.USD_TO_XOF);

      this.db.prepare(`
        UPDATE commodity_positions
        SET quantity = ?,
            entry_price_usd = ?,
            entry_price_xof = ?,
            entry_value_xof = ?
        WHERE id = ?
      `).run(
        newQuantity,
        newAvgPriceUSD,
        newAvgPriceUSD * this.USD_TO_XOF,
        newEntryValueXOF,
        existingPosition.id
      );
    } else {
      // Créer nouvelle position
      this.db.prepare(`
        INSERT INTO commodity_positions (
          user_id, commodity_symbol, position_type, quantity, unit,
          entry_price_usd, entry_price_xof, current_price_usd, current_price_xof,
          entry_value_xof, current_value_xof
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        commoditySymbol,
        positionType,
        quantity,
        commodity.unit,
        buyPriceUSD,
        buyPriceXOF,
        priceUSD,
        priceUSD * this.USD_TO_XOF,
        totalXOF,
        totalXOF
      );
    }

    return {
      transactionId: txResult.lastInsertRowid,
      commodity: commodity.name,
      symbol: commoditySymbol,
      quantity,
      unit: commodity.unit,
      priceUSD: buyPriceUSD.toFixed(2),
      priceXOF: buyPriceXOF.toFixed(0),
      totalXOF: grandTotalXOF.toFixed(0),
      fees: feesXOF.toFixed(0),
      spreadCost: (spreadCost * quantity * this.USD_TO_XOF).toFixed(0)
    };
  }

  /**
   * 2. VENDRE COMMODITY
   */
  async sellCommodity(userId, commoditySymbol, quantity, positionType = 'spot') {
    // Récupérer position
    const position = this.db.prepare(`
      SELECT * FROM commodity_positions
      WHERE user_id = ? AND commodity_symbol = ? AND position_type = ? AND status = 'open'
    `).get(userId, commoditySymbol, positionType);

    if (!position || position.quantity < quantity) {
      throw new Error('Position insuffisante');
    }

    // Récupérer commodity
    const commodity = this.db.prepare(`
      SELECT * FROM commodities WHERE symbol = ?
    `).get(commoditySymbol);

    // Prix actuel - spread (on perd sur le spread à la vente)
    const priceUSD = commodity.current_price_usd;
    const spreadCost = priceUSD * (commodity.spread_pct / 100);
    const sellPriceUSD = priceUSD - spreadCost;
    const sellPriceXOF = sellPriceUSD * this.USD_TO_XOF;

    // Montant total
    const totalUSD = sellPriceUSD * quantity;
    const totalXOF = totalUSD * this.USD_TO_XOF;

    // Frais
    const feesXOF = totalXOF * 0.002;
    const netTotalXOF = totalXOF - feesXOF;

    // Calculer P&L
    const costBasisXOF = position.entry_price_xof * quantity;
    const realizedPnLXOF = netTotalXOF - costBasisXOF;
    const returnPct = (realizedPnLXOF / costBasisXOF) * 100;

    // Ajouter au portefeuille
    this.db.prepare(`
      UPDATE portfolios SET balance = balance + ? WHERE user_id = ?
    `).run(netTotalXOF, userId);

    // Créer transaction
    this.db.prepare(`
      INSERT INTO commodity_transactions (
        user_id, commodity_symbol, type, position_type, quantity,
        price_usd, price_xof, total_usd, total_xof,
        fees_xof, spread_cost_xof, realized_pnl_xof
      ) VALUES (?, ?, 'sell', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      commoditySymbol,
      positionType,
      quantity,
      sellPriceUSD,
      sellPriceXOF,
      totalUSD,
      totalXOF,
      feesXOF,
      spreadCost * quantity * this.USD_TO_XOF,
      realizedPnLXOF
    );

    // Mettre à jour ou fermer position
    if (position.quantity === quantity) {
      // Fermeture totale
      this.db.prepare(`
        UPDATE commodity_positions
        SET status = 'closed',
            realized_pnl_xof = realized_pnl_xof + ?,
            closed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(realizedPnLXOF, position.id);
    } else {
      // Vente partielle
      const newQuantity = position.quantity - quantity;
      this.db.prepare(`
        UPDATE commodity_positions
        SET quantity = ?,
            realized_pnl_xof = realized_pnl_xof + ?
        WHERE id = ?
      `).run(newQuantity, realizedPnLXOF, position.id);
    }

    return {
      commodity: commodity.name,
      symbol: commoditySymbol,
      quantity,
      unit: commodity.unit,
      sellPriceUSD: sellPriceUSD.toFixed(2),
      sellPriceXOF: sellPriceXOF.toFixed(0),
      totalXOF: netTotalXOF.toFixed(0),
      realizedPnL: realizedPnLXOF.toFixed(0),
      returnPct: returnPct.toFixed(2),
      fees: feesXOF.toFixed(0)
    };
  }

  /**
   * 3. CRÉER POSITION DE HEDGING (pour producteurs)
   */
  async createHedge(userId, commoditySymbol, productionVolume, hedgeRatio = 1.0, harvestDate) {
    const commodity = this.db.prepare(`
      SELECT * FROM commodities WHERE symbol = ?
    `).get(commoditySymbol);

    if (!commodity) {
      throw new Error('Commodity introuvable');
    }

    // Volume à hedger
    const hedgedVolume = productionVolume * hedgeRatio;
    const hedgePriceUSD = commodity.current_price_usd;

    // Revenus garantis
    const minGuaranteedRevenueXOF = hedgedVolume * hedgePriceUSD * this.USD_TO_XOF;

    // Si prix monte de 20%, quel serait le revenu max (volume non hedgé)
    const unhedgedVolume = productionVolume - hedgedVolume;
    const maxPotentialRevenueXOF = minGuaranteedRevenueXOF +
                                   (unhedgedVolume * hedgePriceUSD * 1.2 * this.USD_TO_XOF);

    // Créer position hedge
    const stmt = this.db.prepare(`
      INSERT INTO hedging_positions (
        user_id, commodity_symbol,
        production_volume, production_unit, expected_harvest_date,
        hedged_volume, hedge_price_usd, hedge_ratio,
        min_guaranteed_revenue_xof, max_potential_revenue_xof,
        contract_type, expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'future', ?)
    `);

    const result = stmt.run(
      userId,
      commoditySymbol,
      productionVolume,
      commodity.unit,
      harvestDate,
      hedgedVolume,
      hedgePriceUSD,
      hedgeRatio,
      minGuaranteedRevenueXOF,
      maxPotentialRevenueXOF,
      harvestDate
    );

    return {
      hedgeId: result.lastInsertRowid,
      commodity: commodity.name,
      productionVolume,
      hedgedVolume,
      hedgeRatio: (hedgeRatio * 100).toFixed(0) + '%',
      hedgePriceUSD: hedgePriceUSD.toFixed(2),
      minGuaranteedRevenueXOF: minGuaranteedRevenueXOF.toFixed(0),
      maxPotentialRevenueXOF: maxPotentialRevenueXOF.toFixed(0),
      harvestDate,
      recommendation: hedgeRatio >= 0.8 ?
        'Protection forte (80%+)' :
        (hedgeRatio >= 0.5 ? 'Protection modérée (50-80%)' : 'Protection faible (<50%)')
    };
  }

  /**
   * 4. OBTENIR PORTFOLIO COMMODITIES
   */
  getCommoditiesPortfolio(userId) {
    const positions = this.db.prepare(`
      SELECT
        cp.*,
        c.name,
        c.name_en,
        c.category,
        c.current_price_usd,
        c.current_price_xof
      FROM commodity_positions cp
      JOIN commodities c ON cp.commodity_symbol = c.symbol
      WHERE cp.user_id = ? AND cp.status = 'open'
    `).all(userId);

    // Calculer valeurs actuelles et P&L
    const enrichedPositions = positions.map(pos => {
      const currentValueXOF = pos.quantity * pos.current_price_xof;
      const unrealizedPnLXOF = currentValueXOF - pos.entry_value_xof;
      const unrealizedPnLPct = (unrealizedPnLXOF / pos.entry_value_xof) * 100;

      return {
        ...pos,
        current_value_xof: currentValueXOF,
        unrealized_pnl_xof: unrealizedPnLXOF,
        unrealized_pnl_pct: unrealizedPnLPct
      };
    });

    const totalInvestedXOF = enrichedPositions.reduce((sum, p) => sum + p.entry_value_xof, 0);
    const totalCurrentValueXOF = enrichedPositions.reduce((sum, p) => sum + p.current_value_xof, 0);
    const totalPnLXOF = totalCurrentValueXOF - totalInvestedXOF;

    return {
      positions: enrichedPositions,
      summary: {
        totalInvestedXOF,
        totalCurrentValueXOF,
        totalPnLXOF,
        returnPct: totalInvestedXOF > 0 ? (totalPnLXOF / totalInvestedXOF) * 100 : 0,
        positionsCount: enrichedPositions.length
      }
    };
  }

  /**
   * 5. OBTENIR PRIX COMMODITIES (avec historique)
   */
  getCommodityPrices(symbol = null, limit = 1) {
    let query = `
      SELECT * FROM commodities
    `;

    if (symbol) {
      query += ` WHERE symbol = ?`;
      const commodity = this.db.prepare(query).get(symbol);

      // Ajouter historique si demandé
      if (limit > 1) {
        const history = this.db.prepare(`
          SELECT * FROM commodity_prices_history
          WHERE symbol = ?
          ORDER BY timestamp DESC
          LIMIT ?
        `).all(symbol, limit);

        return {
          current: commodity,
          history
        };
      }

      return commodity;
    } else {
      // Toutes commodities
      return this.db.prepare(query).all();
    }
  }

  /**
   * 6. METTRE À JOUR PRIX (simulation - en prod, API externe)
   */
  updatePrices(priceUpdates) {
    // priceUpdates = { 'XAU/USD': 2050, 'CC': 2600, ... }

    Object.entries(priceUpdates).forEach(([symbol, newPriceUSD]) => {
      const old = this.db.prepare('SELECT current_price_usd FROM commodities WHERE symbol = ?').get(symbol);

      if (old) {
        const change24hPct = ((newPriceUSD - old.current_price_usd) / old.current_price_usd) * 100;

        this.db.prepare(`
          UPDATE commodities
          SET current_price_usd = ?,
              current_price_xof = ?,
              change_24h_pct = ?,
              last_updated = CURRENT_TIMESTAMP
          WHERE symbol = ?
        `).run(newPriceUSD, newPriceUSD * this.USD_TO_XOF, change24hPct, symbol);

        // Sauvegarder historique
        this.db.prepare(`
          INSERT INTO commodity_prices_history (
            symbol, timestamp, close_usd, close_xof
          ) VALUES (?, CURRENT_TIMESTAMP, ?, ?)
        `).run(symbol, newPriceUSD, newPriceUSD * this.USD_TO_XOF);
      }
    });

    // Mettre à jour positions utilisateurs
    this.updateAllPositionsCurrentValues();
  }

  /**
   * Mettre à jour valeurs actuelles de toutes positions
   */
  updateAllPositionsCurrentValues() {
    const openPositions = this.db.prepare(`
      SELECT cp.id, cp.quantity, c.current_price_usd, c.current_price_xof
      FROM commodity_positions cp
      JOIN commodities c ON cp.commodity_symbol = c.symbol
      WHERE cp.status = 'open'
    `).all();

    openPositions.forEach(pos => {
      const currentValueXOF = pos.quantity * pos.current_price_xof;

      this.db.prepare(`
        UPDATE commodity_positions
        SET current_price_usd = ?,
            current_price_xof = ?,
            current_value_xof = ?
        WHERE id = ?
      `).run(pos.current_price_usd, pos.current_price_xof, currentValueXOF, pos.id);
    });
  }

  /**
   * 7. CALCULATEUR HEDGING POUR PRODUCTEURS
   */
  calculateHedgingStrategy(productionVolume, currentPriceUSD, costOfProductionUSD, targetProfitMargin = 0.20) {
    // Scénarios de prix
    const scenarios = {
      bearish: currentPriceUSD * 0.7,   // -30%
      moderate: currentPriceUSD * 0.9,   // -10%
      baseline: currentPriceUSD,         // 0%
      bullish: currentPriceUSD * 1.2     // +20%
    };

    // Prix de seuil de rentabilité
    const breakEvenPrice = costOfProductionUSD / (1 - targetProfitMargin);

    // Recommandation hedge ratio
    let recommendedHedgeRatio = 1.0; // 100% par défaut

    if (currentPriceUSD > breakEvenPrice * 1.5) {
      // Prix très favorable, hedger seulement 50-70%
      recommendedHedgeRatio = 0.6;
    } else if (currentPriceUSD > breakEvenPrice * 1.2) {
      // Prix favorable, hedger 70-80%
      recommendedHedgeRatio = 0.75;
    } else if (currentPriceUSD > breakEvenPrice) {
      // Prix acceptable, hedger 80-90%
      recommendedHedgeRatio = 0.85;
    }
    // else 100% hedge (prix proche du break-even)

    const hedgedVolume = productionVolume * recommendedHedgeRatio;
    const unhedgedVolume = productionVolume - hedgedVolume;

    // Calcul revenus dans chaque scénario
    const results = {};
    Object.entries(scenarios).forEach(([scenario, priceUSD]) => {
      const hedgedRevenue = hedgedVolume * currentPriceUSD * this.USD_TO_XOF;
      const unhedgedRevenue = unhedgedVolume * priceUSD * this.USD_TO_XOF;
      const totalRevenue = hedgedRevenue + unhedgedRevenue;
      const cost = productionVolume * costOfProductionUSD * this.USD_TO_XOF;
      const profit = totalRevenue - cost;
      const profitMargin = (profit / totalRevenue) * 100;

      results[scenario] = {
        priceUSD,
        totalRevenueXOF: totalRevenue,
        costXOF: cost,
        profitXOF: profit,
        profitMarginPct: profitMargin
      };
    });

    return {
      recommendation: {
        hedgeRatio: recommendedHedgeRatio,
        hedgedVolume,
        unhedgedVolume,
        hedgePriceUSD: currentPriceUSD,
        reason: recommendedHedgeRatio >= 0.9 ?
          'Prix proche du break-even, protégez-vous fortement' :
          (recommendedHedgeRatio >= 0.75 ?
            'Prix acceptable, protection forte recommandée' :
            'Prix favorable, gardez de la flexibilité')
      },
      scenarios: results,
      breakEvenPriceUSD: breakEvenPrice
    };
  }
}

module.exports = CommoditiesTradingService;
