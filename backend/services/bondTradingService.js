/**
 * PENDO - Service de Trading d'Obligations
 *
 * Contexte Afrique/BRVM:
 * - 60% du volume BRVM = Obligations (vs 25% actions)
 * - Types: Obligations d'État, Corporate bonds, Eurobonds
 * - Rendements typiques: 5-8%/an (vs 2-3% Europe)
 * - Marché primaire: Souscriptions nouvelles émissions
 * - Marché secondaire: Trading obligations existantes
 *
 * Fonctionnalités:
 * - Trading obligations (achat/vente)
 * - Calcul yield to maturity (YTM)
 * - Calcul duration & convexity
 * - Accrued interest calculator
 * - Bond screener (par rendement, maturité, rating)
 * - Maturity calendar
 * - Coupon tracking & payments
 * - Primary market subscriptions
 */

const Database = require('better-sqlite3');
const path = require('path');

class BondTradingService {
  constructor() {
    const dbPath = path.join(__dirname, '../data/pendo.db');
    this.db = new Database(dbPath);
    this.initializeTables();

    // Constantes obligations
    this.BOND_TYPES = {
      GOVERNMENT: 'government',       // Obligations d'État
      CORPORATE: 'corporate',         // Obligations privées
      EUROBOND: 'eurobond',          // Eurobonds souverains
      SUPRANATIONAL: 'supranational' // BID, BAD, etc.
    };

    this.COUPON_FREQUENCY = {
      ANNUAL: 1,        // 1x/an
      SEMI_ANNUAL: 2,   // 2x/an (standard)
      QUARTERLY: 4,     // 4x/an
      ZERO: 0           // Zero-coupon
    };

    this.RATING_SCALE = {
      AAA: 'AAA', AA: 'AA', A: 'A',
      BBB: 'BBB', BB: 'BB', B: 'B',
      CCC: 'CCC', CC: 'CC', C: 'C',
      D: 'D', // Default
      NR: 'NR' // Not Rated
    };

    // Pays UEMOA
    this.UEMOA_COUNTRIES = [
      'BJ', // Bénin
      'BF', // Burkina Faso
      'CI', // Côte d'Ivoire
      'GW', // Guinée-Bissau
      'ML', // Mali
      'NE', // Niger
      'SN', // Sénégal
      'TG'  // Togo
    ];
  }

  initializeTables() {
    // Table des obligations disponibles
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bonds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        isin TEXT UNIQUE,                    -- Code ISIN international
        name TEXT NOT NULL,                  -- Nom de l'obligation
        issuer TEXT NOT NULL,                -- Émetteur (État, entreprise)
        country_code TEXT,                   -- Code pays (CI, SN, etc.)
        bond_type TEXT,                      -- government, corporate, eurobond

        -- Caractéristiques
        face_value REAL NOT NULL,            -- Valeur nominale
        currency TEXT DEFAULT 'XOF',         -- Devise (XOF, USD, EUR)
        coupon_rate REAL,                    -- Taux coupon annuel (%)
        coupon_frequency INTEGER DEFAULT 2,  -- Fréquence paiements/an
        issue_date DATE,                     -- Date d'émission
        maturity_date DATE NOT NULL,         -- Date de maturité
        first_coupon_date DATE,              -- Première date coupon
        last_coupon_date DATE,               -- Dernière date coupon

        -- Prix & rendement
        current_price REAL,                  -- Prix actuel (% de nominal)
        ytm REAL,                            -- Yield to maturity (%)
        duration REAL,                       -- Duration Macaulay (années)
        modified_duration REAL,              -- Duration modifiée
        convexity REAL,                      -- Convexité

        -- Rating & risque
        credit_rating TEXT,                  -- AAA, AA, A, BBB, etc.
        rating_agency TEXT,                  -- Moody's, S&P, Fitch

        -- Marché
        listed_on TEXT,                      -- BRVM, NSE, etc.
        market_type TEXT DEFAULT 'secondary', -- primary, secondary
        min_subscription REAL,               -- Montant minimum souscription
        available_quantity REAL,             -- Quantité disponible

        -- Metadata
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des positions obligataires utilisateurs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bond_holdings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        bond_id INTEGER NOT NULL,
        isin TEXT NOT NULL,

        -- Position
        quantity REAL NOT NULL,              -- Nombre d'obligations
        average_price REAL NOT NULL,         -- Prix moyen d'achat (%)
        total_invested REAL NOT NULL,        -- Montant total investi
        current_value REAL,                  -- Valeur actuelle

        -- Coupons
        total_coupons_received REAL DEFAULT 0,
        next_coupon_date DATE,
        next_coupon_amount REAL,

        -- P&L
        unrealized_pnl REAL,                 -- Plus/moins-value latente
        realized_pnl REAL DEFAULT 0,         -- P&L réalisé (si vendu)

        acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (bond_id) REFERENCES bonds(id)
      )
    `);

    // Table des transactions obligataires
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bond_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        bond_id INTEGER NOT NULL,
        isin TEXT NOT NULL,

        -- Transaction
        type TEXT NOT NULL,                  -- buy, sell, subscription
        quantity REAL NOT NULL,
        price REAL NOT NULL,                 -- Prix (% de nominal)
        total_amount REAL NOT NULL,          -- Montant total
        accrued_interest REAL DEFAULT 0,     -- Intérêts courus

        -- Coûts
        fees REAL DEFAULT 0,
        settlement_date DATE,                -- Date règlement-livraison

        -- Statut
        status TEXT DEFAULT 'pending',       -- pending, settled, cancelled

        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (bond_id) REFERENCES bonds(id)
      )
    `);

    // Table des paiements de coupons
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bond_coupon_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        bond_id INTEGER NOT NULL,
        holding_id INTEGER NOT NULL,

        -- Coupon
        payment_date DATE NOT NULL,
        coupon_amount REAL NOT NULL,
        quantity_held REAL NOT NULL,        -- Quantité détenue à la date

        -- Statut
        status TEXT DEFAULT 'pending',       -- pending, paid
        paid_at DATETIME,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (bond_id) REFERENCES bonds(id),
        FOREIGN KEY (holding_id) REFERENCES bond_holdings(id)
      )
    `);

    // Table du calendrier des échéances
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bond_maturity_calendar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bond_id INTEGER NOT NULL,
        isin TEXT NOT NULL,

        -- Échéance
        event_type TEXT NOT NULL,            -- coupon, maturity, call
        event_date DATE NOT NULL,
        amount_per_bond REAL,

        -- Notification
        notified BOOLEAN DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (bond_id) REFERENCES bonds(id)
      )
    `);

    console.log('✅ Tables de bond trading initialisées');
  }

  /**
   * 1. AJOUTER NOUVELLE OBLIGATION AU CATALOGUE
   */
  addBond(bondData) {
    const {
      isin,
      name,
      issuer,
      countryCode,
      bondType,
      faceValue,
      currency = 'XOF',
      couponRate,
      couponFrequency = 2,
      issueDate,
      maturityDate,
      currentPrice,
      creditRating,
      listedOn = 'BRVM',
      minSubscription
    } = bondData;

    // Calculer YTM, duration, convexity
    const yearsToMaturity = this.calculateYearsToMaturity(maturityDate);
    const ytm = this.calculateYTM(currentPrice, faceValue, couponRate, yearsToMaturity, couponFrequency);
    const duration = this.calculateDuration(currentPrice, faceValue, couponRate, yearsToMaturity, couponFrequency);
    const modifiedDuration = duration / (1 + ytm / (100 * couponFrequency));
    const convexity = this.calculateConvexity(currentPrice, faceValue, couponRate, yearsToMaturity, couponFrequency);

    const stmt = this.db.prepare(`
      INSERT INTO bonds (
        isin, name, issuer, country_code, bond_type,
        face_value, currency, coupon_rate, coupon_frequency,
        issue_date, maturity_date, current_price,
        ytm, duration, modified_duration, convexity,
        credit_rating, listed_on, min_subscription
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      isin, name, issuer, countryCode, bondType,
      faceValue, currency, couponRate, couponFrequency,
      issueDate, maturityDate, currentPrice,
      ytm, duration, modifiedDuration, convexity,
      creditRating, listedOn, minSubscription
    );

    return {
      bondId: result.lastInsertRowid,
      ytm,
      duration,
      modifiedDuration,
      convexity
    };
  }

  /**
   * 2. ACHETER OBLIGATION (Marché secondaire)
   */
  async buyBond(userId, bondId, quantity, price) {
    const bond = this.db.prepare('SELECT * FROM bonds WHERE id = ?').get(bondId);
    if (!bond) throw new Error('Obligation introuvable');

    // Calculer intérêts courus (accrued interest)
    const accruedInterest = this.calculateAccruedInterest(
      bond.coupon_rate,
      bond.coupon_frequency,
      bond.last_coupon_date,
      new Date()
    );

    // Montant total = (Prix clean × Quantité × Nominal) + Intérêts courus
    const cleanPrice = price; // Prix en % de nominal
    const dirtyPrice = cleanPrice + accruedInterest; // Prix avec intérêts
    const totalAmount = (dirtyPrice / 100) * bond.face_value * quantity;

    // Vérifier portefeuille
    const portfolio = this.db.prepare('SELECT balance FROM portfolios WHERE user_id = ?').get(userId);
    if (!portfolio || portfolio.balance < totalAmount) {
      throw new Error('Solde insuffisant');
    }

    // Déduire du portefeuille
    this.db.prepare('UPDATE portfolios SET balance = balance - ? WHERE user_id = ?')
      .run(totalAmount, userId);

    // Créer transaction
    const txStmt = this.db.prepare(`
      INSERT INTO bond_transactions (
        user_id, bond_id, isin, type, quantity, price, total_amount, accrued_interest, settlement_date
      ) VALUES (?, ?, ?, 'buy', ?, ?, ?, ?, DATE('now', '+3 days'))
    `);

    const txResult = txStmt.run(
      userId,
      bondId,
      bond.isin,
      quantity,
      price,
      totalAmount,
      accruedInterest
    );

    // Ajouter ou mettre à jour holding
    const existingHolding = this.db.prepare(`
      SELECT * FROM bond_holdings WHERE user_id = ? AND bond_id = ?
    `).get(userId, bondId);

    if (existingHolding) {
      // Mettre à jour position existante
      const newQuantity = existingHolding.quantity + quantity;
      const newTotalInvested = existingHolding.total_invested + totalAmount;
      const newAveragePrice = (newTotalInvested / newQuantity / bond.face_value) * 100;

      this.db.prepare(`
        UPDATE bond_holdings
        SET quantity = ?,
            average_price = ?,
            total_invested = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newQuantity, newAveragePrice, newTotalInvested, existingHolding.id);
    } else {
      // Créer nouvelle position
      this.db.prepare(`
        INSERT INTO bond_holdings (
          user_id, bond_id, isin, quantity, average_price, total_invested
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, bondId, bond.isin, quantity, price, totalAmount);
    }

    // Calculer prochaine date de coupon
    const nextCouponDate = this.getNextCouponDate(bond.coupon_frequency, bond.last_coupon_date);

    return {
      transactionId: txResult.lastInsertRowid,
      bondName: bond.name,
      quantity,
      cleanPrice: price,
      dirtyPrice,
      accruedInterest,
      totalAmount,
      nextCouponDate,
      settlementDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  }

  /**
   * 3. VENDRE OBLIGATION
   */
  async sellBond(userId, bondId, quantity, price) {
    const holding = this.db.prepare(`
      SELECT * FROM bond_holdings WHERE user_id = ? AND bond_id = ?
    `).get(userId, bondId);

    if (!holding || holding.quantity < quantity) {
      throw new Error('Position insuffisante');
    }

    const bond = this.db.prepare('SELECT * FROM bonds WHERE id = ?').get(bondId);

    // Calculer intérêts courus
    const accruedInterest = this.calculateAccruedInterest(
      bond.coupon_rate,
      bond.coupon_frequency,
      bond.last_coupon_date,
      new Date()
    );

    const dirtyPrice = price + accruedInterest;
    const totalAmount = (dirtyPrice / 100) * bond.face_value * quantity;

    // Calculer P&L réalisé
    const costBasis = (holding.average_price / 100) * bond.face_value * quantity;
    const realizedPnL = totalAmount - costBasis;

    // Ajouter au portefeuille
    this.db.prepare('UPDATE portfolios SET balance = balance + ? WHERE user_id = ?')
      .run(totalAmount, userId);

    // Créer transaction
    this.db.prepare(`
      INSERT INTO bond_transactions (
        user_id, bond_id, isin, type, quantity, price, total_amount, accrued_interest, settlement_date
      ) VALUES (?, ?, ?, 'sell', ?, ?, ?, ?, DATE('now', '+3 days'))
    `).run(userId, bondId, bond.isin, quantity, price, totalAmount, accruedInterest);

    // Mettre à jour ou supprimer holding
    if (holding.quantity === quantity) {
      // Vente totale
      this.db.prepare('DELETE FROM bond_holdings WHERE id = ?').run(holding.id);
    } else {
      // Vente partielle
      const newQuantity = holding.quantity - quantity;
      this.db.prepare(`
        UPDATE bond_holdings
        SET quantity = ?,
            realized_pnl = realized_pnl + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newQuantity, realizedPnL, holding.id);
    }

    return {
      bondName: bond.name,
      quantity,
      cleanPrice: price,
      dirtyPrice,
      totalAmount,
      realizedPnL,
      returnPct: (realizedPnL / costBasis) * 100
    };
  }

  /**
   * 4. CALCULER YIELD TO MATURITY (YTM)
   * Formule approximative Bond
   */
  calculateYTM(currentPrice, faceValue, couponRate, yearsToMaturity, couponFrequency) {
    if (yearsToMaturity <= 0) return 0;

    const annualCoupon = (couponRate / 100) * faceValue;
    const periodsToMaturity = yearsToMaturity * couponFrequency;
    const periodCoupon = annualCoupon / couponFrequency;
    const currentValue = (currentPrice / 100) * faceValue;

    // Approximation YTM (formule simplifiée)
    const ytmApprox = (periodCoupon + (faceValue - currentValue) / periodsToMaturity) /
                      ((faceValue + currentValue) / 2);

    return ytmApprox * couponFrequency * 100; // En %
  }

  /**
   * 5. CALCULER DURATION MACAULAY
   */
  calculateDuration(currentPrice, faceValue, couponRate, yearsToMaturity, couponFrequency) {
    if (yearsToMaturity <= 0) return 0;

    const ytm = this.calculateYTM(currentPrice, faceValue, couponRate, yearsToMaturity, couponFrequency);
    const periodicYTM = (ytm / 100) / couponFrequency;
    const periodsToMaturity = yearsToMaturity * couponFrequency;
    const periodCoupon = (couponRate / 100) * faceValue / couponFrequency;
    const currentValue = (currentPrice / 100) * faceValue;

    let weightedCashFlows = 0;

    // Somme des cash flows pondérés par le temps
    for (let t = 1; t <= periodsToMaturity; t++) {
      const cashFlow = t === periodsToMaturity ? periodCoupon + faceValue : periodCoupon;
      const pv = cashFlow / Math.pow(1 + periodicYTM, t);
      weightedCashFlows += (t / couponFrequency) * pv;
    }

    return weightedCashFlows / currentValue;
  }

  /**
   * 6. CALCULER CONVEXITÉ
   */
  calculateConvexity(currentPrice, faceValue, couponRate, yearsToMaturity, couponFrequency) {
    if (yearsToMaturity <= 0) return 0;

    const ytm = this.calculateYTM(currentPrice, faceValue, couponRate, yearsToMaturity, couponFrequency);
    const periodicYTM = (ytm / 100) / couponFrequency;
    const periodsToMaturity = yearsToMaturity * couponFrequency;
    const periodCoupon = (couponRate / 100) * faceValue / couponFrequency;
    const currentValue = (currentPrice / 100) * faceValue;

    let convexity = 0;

    for (let t = 1; t <= periodsToMaturity; t++) {
      const cashFlow = t === periodsToMaturity ? periodCoupon + faceValue : periodCoupon;
      const pv = cashFlow / Math.pow(1 + periodicYTM, t);
      convexity += (t * (t + 1)) * pv;
    }

    return convexity / (currentValue * Math.pow(1 + periodicYTM, 2) * Math.pow(couponFrequency, 2));
  }

  /**
   * 7. CALCULER INTÉRÊTS COURUS (Accrued Interest)
   */
  calculateAccruedInterest(couponRate, couponFrequency, lastCouponDate, currentDate) {
    if (!couponRate || couponRate === 0) return 0;

    const lastCoupon = new Date(lastCouponDate);
    const now = new Date(currentDate);
    const daysSinceLastCoupon = Math.floor((now - lastCoupon) / (1000 * 60 * 60 * 24));
    const daysInCouponPeriod = 365 / couponFrequency;

    // Intérêts courus = (Coupon annuel / Fréquence) × (Jours écoulés / Jours période)
    const periodCoupon = couponRate / couponFrequency;
    const accruedPct = periodCoupon * (daysSinceLastCoupon / daysInCouponPeriod);

    return accruedPct; // En % de nominal
  }

  /**
   * 8. OBTENIR PORTEFEUILLE OBLIGATIONS UTILISATEUR
   */
  getBondPortfolio(userId) {
    const holdings = this.db.prepare(`
      SELECT
        bh.*,
        b.name,
        b.issuer,
        b.isin,
        b.coupon_rate,
        b.maturity_date,
        b.current_price,
        b.ytm,
        b.duration,
        b.credit_rating
      FROM bond_holdings bh
      JOIN bonds b ON bh.bond_id = b.id
      WHERE bh.user_id = ?
    `).all(userId);

    // Calculer valeurs actuelles et P&L
    const enrichedHoldings = holdings.map(holding => {
      const currentValue = (holding.current_price / 100) * holding.quantity * 100; // Assuming face_value = 100
      const unrealizedPnL = currentValue - holding.total_invested;
      const returnPct = (unrealizedPnL / holding.total_invested) * 100;

      return {
        ...holding,
        current_value: currentValue,
        unrealized_pnl: unrealizedPnL,
        return_pct: returnPct.toFixed(2)
      };
    });

    const totalInvested = enrichedHoldings.reduce((sum, h) => sum + h.total_invested, 0);
    const totalCurrentValue = enrichedHoldings.reduce((sum, h) => sum + h.current_value, 0);
    const totalPnL = totalCurrentValue - totalInvested;

    return {
      holdings: enrichedHoldings,
      summary: {
        totalInvested,
        totalCurrentValue,
        totalPnL,
        returnPct: totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0,
        bondCount: enrichedHoldings.length
      }
    };
  }

  /**
   * 9. SCREENER OBLIGATIONS
   */
  screenBonds(criteria = {}) {
    const {
      minYTM,
      maxYTM,
      minDuration,
      maxDuration,
      minRating,
      bondType,
      country,
      currency,
      minMaturityYears,
      maxMaturityYears,
      sortBy = 'ytm',
      sortOrder = 'DESC',
      limit = 50
    } = criteria;

    let query = 'SELECT * FROM bonds WHERE 1=1';
    const params = [];

    if (minYTM) {
      query += ' AND ytm >= ?';
      params.push(minYTM);
    }

    if (maxYTM) {
      query += ' AND ytm <= ?';
      params.push(maxYTM);
    }

    if (minDuration) {
      query += ' AND duration >= ?';
      params.push(minDuration);
    }

    if (maxDuration) {
      query += ' AND duration <= ?';
      params.push(maxDuration);
    }

    if (minRating) {
      query += ' AND credit_rating >= ?';
      params.push(minRating);
    }

    if (bondType) {
      query += ' AND bond_type = ?';
      params.push(bondType);
    }

    if (country) {
      query += ' AND country_code = ?';
      params.push(country);
    }

    if (currency) {
      query += ' AND currency = ?';
      params.push(currency);
    }

    if (minMaturityYears || maxMaturityYears) {
      query += ' AND julianday(maturity_date) - julianday("now")';
      if (minMaturityYears) {
        query += ' >= ?';
        params.push(minMaturityYears * 365);
      }
      if (maxMaturityYears) {
        query += ' <= ?';
        params.push(maxMaturityYears * 365);
      }
    }

    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ?`;
    params.push(limit);

    const bonds = this.db.prepare(query).all(...params);

    return {
      count: bonds.length,
      bonds
    };
  }

  /**
   * 10. OBTENIR CALENDRIER DES COUPONS À VENIR
   */
  getUpcomingCoupons(userId, daysAhead = 90) {
    const holdings = this.db.prepare(`
      SELECT
        bh.*,
        b.name,
        b.isin,
        b.coupon_rate,
        b.coupon_frequency,
        b.face_value
      FROM bond_holdings bh
      JOIN bonds b ON bh.bond_id = b.id
      WHERE bh.user_id = ?
    `).all(userId);

    const upcomingCoupons = [];

    holdings.forEach(holding => {
      const nextCouponDate = this.getNextCouponDate(holding.coupon_frequency, holding.last_coupon_date);
      const daysUntilCoupon = Math.floor((new Date(nextCouponDate) - new Date()) / (1000 * 60 * 60 * 24));

      if (daysUntilCoupon <= daysAhead) {
        const couponAmount = (holding.coupon_rate / 100 / holding.coupon_frequency) * holding.face_value * holding.quantity;

        upcomingCoupons.push({
          bondName: holding.name,
          isin: holding.isin,
          couponDate: nextCouponDate,
          daysUntil: daysUntilCoupon,
          amount: couponAmount
        });
      }
    });

    return upcomingCoupons.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  // Helpers

  calculateYearsToMaturity(maturityDate) {
    const now = new Date();
    const maturity = new Date(maturityDate);
    return (maturity - now) / (1000 * 60 * 60 * 24 * 365);
  }

  getNextCouponDate(frequency, lastCouponDate) {
    const last = new Date(lastCouponDate);
    const monthsToAdd = 12 / frequency;
    const next = new Date(last);
    next.setMonth(next.getMonth() + monthsToAdd);
    return next.toISOString().split('T')[0];
  }
}

module.exports = BondTradingService;
