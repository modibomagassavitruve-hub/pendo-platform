/**
 * PENDO - Service de Compliance CREPMF
 *
 * Régulateur: CREPMF (Conseil Régional de l'Épargne Publique et des Marchés Financiers)
 * Juridiction: UEMOA (8 pays d'Afrique de l'Ouest)
 *
 * Fonctionnalités:
 * - Transaction monitoring
 * - Suspicious activity detection
 * - Regulatory reporting (CREPMF)
 * - Market abuse surveillance
 * - Best execution tracking
 * - Position limits enforcement
 * - Client categorization (Retail, Professional, Institutional)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class ComplianceService {
  constructor() {
    const dbPath = path.join(__dirname, '../data/pendo.db');
    this.db = new Database(dbPath);
    this.initializeTables();

    // Limites réglementaires CREPMF/BRVM
    this.REGULATORY_LIMITS = {
      // Variation quotidienne maximale BRVM
      MAX_DAILY_VARIATION: 0.10, // ±10% (BRVM a des circuit breakers)

      // Position maximale en % de capital social d'une société
      MAX_POSITION_PCT_OF_COMPANY: 0.05, // 5% (seuil déclaration CREPMF)

      // Position maximale en % du portefeuille utilisateur
      MAX_SINGLE_POSITION_PCT: 0.25, // 25% max sur une seule action

      // Effet de levier maximum (pour comptes marge)
      MAX_LEVERAGE: 2.0, // 2:1 max (conservateur pour Afrique)

      // Montant minimum transaction
      MIN_TRADE_AMOUNT: 10000, // 10,000 FCFA

      // Montant maximum transaction sans déclaration
      MAX_TRADE_NO_DECLARATION: 10000000, // 10M FCFA

      // Délai règlement-livraison BRVM
      SETTLEMENT_DAYS: 3, // T+3

      // Seuils alerte blanchiment
      AML_CASH_THRESHOLD: 5000000, // 5M FCFA
      AML_SUSPICIOUS_FREQUENCY: 10, // 10+ trades/jour = surveillance

      // Catégories clients
      CLIENT_CATEGORIES: {
        RETAIL: 'retail', // Particuliers
        PROFESSIONAL: 'professional', // Pros finance
        INSTITUTIONAL: 'institutional' // Fonds, assurances, etc.
      }
    };

    // Types d'activités suspectes
    this.SUSPICIOUS_PATTERNS = {
      WASH_TRADING: 'wash_trading', // Acheter et vendre même action rapidement
      FRONT_RUNNING: 'front_running', // Trading avant ordre client
      INSIDER_TRADING: 'insider_trading', // Trading avec info privilégiée
      MARKET_MANIPULATION: 'market_manipulation', // Manipulation cours
      LAYERING: 'layering', // Ordres fantômes pour manipuler
      SPOOFING: 'spoofing', // Ordres annulés pour tromper
      SMURFING: 'smurfing', // Fractionner pour éviter seuils
      CHURNING: 'churning', // Trading excessif
      UNUSUAL_VOLUME: 'unusual_volume', // Volume anormal
      UNUSUAL_TIMING: 'unusual_timing' // Timing suspect
    };
  }

  initializeTables() {
    // Table des transactions surveillées
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS compliance_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        transaction_id INTEGER,
        transaction_type TEXT, -- buy, sell, deposit, withdrawal
        ticker TEXT,
        quantity REAL,
        price REAL,
        total_amount REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

        -- Flags compliance
        requires_review BOOLEAN DEFAULT 0,
        is_suspicious BOOLEAN DEFAULT 0,
        suspicious_reasons TEXT, -- JSON array de raisons

        -- Limites
        exceeds_position_limit BOOLEAN DEFAULT 0,
        exceeds_amount_limit BOOLEAN DEFAULT 0,

        -- Statut
        compliance_status TEXT DEFAULT 'pending', -- pending, approved, rejected, escalated
        reviewed_by INTEGER,
        reviewed_at DATETIME,
        review_notes TEXT,

        -- Reporting
        reported_to_crepmf BOOLEAN DEFAULT 0,
        crepmf_report_id TEXT,
        report_date DATETIME,

        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Table des activités suspectes détectées
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS suspicious_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        pattern_type TEXT, -- Type de pattern (wash_trading, etc.)
        severity TEXT, -- low, medium, high, critical
        description TEXT,

        -- Données détection
        related_transactions TEXT, -- JSON array de transaction IDs
        detection_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

        -- Investigation
        status TEXT DEFAULT 'new', -- new, investigating, resolved, reported
        assigned_to INTEGER, -- Compliance officer
        investigation_notes TEXT,

        -- Actions
        action_taken TEXT, -- warning, suspension, termination, report
        action_date DATETIME,

        -- Reporting externe
        reported_to_authorities BOOLEAN DEFAULT 0,
        authority_name TEXT, -- CREPMF, CENTIF (anti-blanchiment), etc.
        report_reference TEXT,
        report_date DATETIME,

        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Table des limites de position par utilisateur
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS position_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ticker TEXT,

        -- Limites
        max_position_quantity REAL,
        max_position_value REAL,
        max_daily_trades INTEGER,
        max_leverage REAL,

        -- Statut actuel
        current_position_quantity REAL DEFAULT 0,
        current_position_value REAL DEFAULT 0,
        daily_trades_count INTEGER DEFAULT 0,

        -- Violations
        violation_count INTEGER DEFAULT 0,
        last_violation_date DATETIME,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, ticker)
      )
    `);

    // Table des rapports réglementaires CREPMF
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS regulatory_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_type TEXT, -- daily_activity, monthly_summary, suspicious_activity, position_declaration
        report_period_start DATE,
        report_period_end DATE,

        -- Contenu
        report_data TEXT, -- JSON avec toutes les données

        -- Métadonnées
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        generated_by INTEGER, -- User ID du compliance officer

        -- Soumission
        submitted_to_crepmf BOOLEAN DEFAULT 0,
        submission_date DATETIME,
        submission_reference TEXT,
        submission_status TEXT, -- pending, accepted, rejected

        -- Fichiers
        report_file_path TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des catégories clients (KYC level)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS client_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,

        -- Catégorie CREPMF
        category TEXT DEFAULT 'retail', -- retail, professional, institutional

        -- Critères classification
        annual_income REAL,
        net_worth REAL,
        trading_experience_years INTEGER,
        professional_status TEXT,

        -- Limites associées
        max_leverage REAL,
        max_single_trade REAL,
        requires_advisor BOOLEAN DEFAULT 0,

        -- Appropriateness assessment
        risk_tolerance TEXT, -- low, medium, high
        investment_objectives TEXT,

        -- Validation
        classification_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_review_date DATETIME,
        next_review_date DATETIME,

        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Table audit trail (logs immuables)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_trail (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        -- Qui, Quoi, Quand, Où
        user_id INTEGER,
        action_type TEXT, -- login, trade, withdraw, settings_change, etc.
        action_details TEXT, -- JSON

        -- Contexte
        ip_address TEXT,
        user_agent TEXT,
        session_id TEXT,

        -- Timestamp (immuable)
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

        -- Hash pour intégrité (optionnel mais recommandé)
        previous_hash TEXT,
        current_hash TEXT
      )
    `);

    // Table best execution tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS best_execution_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        ticker TEXT,

        -- Exécution
        order_type TEXT, -- market, limit, stop, etc.
        requested_price REAL,
        executed_price REAL,
        price_difference REAL,

        -- Brokers consultés
        brokers_consulted TEXT, -- JSON array
        best_available_price REAL,

        -- Best execution achieved?
        best_execution_achieved BOOLEAN,
        price_improvement REAL,

        -- Slippage
        slippage_bps INTEGER, -- En basis points (1 bp = 0.01%)

        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('✅ Tables de compliance initialisées');
  }

  /**
   * 1. MONITORING TRANSACTIONNEL - Vérifier chaque transaction
   */
  async monitorTransaction(userId, transactionData) {
    const {
      transactionId,
      type, // buy, sell, deposit, withdrawal
      ticker,
      quantity,
      price,
      totalAmount
    } = transactionData;

    let flags = {
      requiresReview: false,
      isSuspicious: false,
      suspiciousReasons: [],
      exceedsPositionLimit: false,
      exceedsAmountLimit: false
    };

    // 1. Vérifier montant maximum sans déclaration
    if (totalAmount > this.REGULATORY_LIMITS.MAX_TRADE_NO_DECLARATION) {
      flags.requiresReview = true;
      flags.exceedsAmountLimit = true;
      flags.suspiciousReasons.push(`Montant élevé: ${totalAmount} FCFA (> 10M FCFA)`);
    }

    // 2. Vérifier montant minimum
    if (totalAmount < this.REGULATORY_LIMITS.MIN_TRADE_AMOUNT) {
      flags.requiresReview = true;
      flags.suspiciousReasons.push(`Montant trop faible: ${totalAmount} FCFA (< 10,000 FCFA)`);
    }

    // 3. Vérifier limites de position (si achat)
    if (type === 'buy' && ticker) {
      const positionCheck = await this.checkPositionLimits(userId, ticker, quantity, price);
      if (!positionCheck.allowed) {
        flags.requiresReview = true;
        flags.exceedsPositionLimit = true;
        flags.suspiciousReasons.push(...positionCheck.reasons);
      }
    }

    // 4. Détecter patterns suspects
    const suspiciousPatterns = await this.detectSuspiciousPatterns(userId, transactionData);
    if (suspiciousPatterns.length > 0) {
      flags.isSuspicious = true;
      flags.suspiciousReasons.push(...suspiciousPatterns.map(p => p.description));

      // Créer alerte activité suspecte
      for (const pattern of suspiciousPatterns) {
        await this.createSuspiciousActivityAlert(userId, pattern);
      }
    }

    // 5. Enregistrer dans compliance_transactions
    const stmt = this.db.prepare(`
      INSERT INTO compliance_transactions (
        user_id, transaction_id, transaction_type, ticker, quantity, price, total_amount,
        requires_review, is_suspicious, suspicious_reasons,
        exceeds_position_limit, exceeds_amount_limit, compliance_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      transactionId,
      type,
      ticker,
      quantity,
      price,
      totalAmount,
      flags.requiresReview ? 1 : 0,
      flags.isSuspicious ? 1 : 0,
      JSON.stringify(flags.suspiciousReasons),
      flags.exceedsPositionLimit ? 1 : 0,
      flags.exceedsAmountLimit ? 1 : 0,
      flags.isSuspicious ? 'escalated' : (flags.requiresReview ? 'pending' : 'approved')
    );

    // 6. Log audit trail
    await this.logAuditTrail(userId, 'transaction_monitored', {
      transactionId,
      type,
      ticker,
      amount: totalAmount,
      flags
    });

    return {
      complianceId: result.lastInsertRowid,
      allowed: !flags.isSuspicious, // Bloquer si suspect
      requiresReview: flags.requiresReview,
      flags,
      message: flags.isSuspicious ?
        'Transaction bloquée pour vérification compliance' :
        (flags.requiresReview ? 'Transaction en attente de revue' : 'Transaction approuvée')
    };
  }

  /**
   * 2. VÉRIFICATION LIMITES DE POSITION
   */
  async checkPositionLimits(userId, ticker, newQuantity, currentPrice) {
    // Récupérer position actuelle
    const currentPosition = this.db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total_quantity
      FROM holdings
      WHERE user_id = ? AND ticker = ?
    `).get(userId, ticker);

    const futureQuantity = (currentPosition?.total_quantity || 0) + newQuantity;
    const futureValue = futureQuantity * currentPrice;

    // Récupérer capital total utilisateur
    const portfolio = this.db.prepare(`
      SELECT balance FROM portfolios WHERE user_id = ?
    `).get(userId);

    const totalPortfolioValue = portfolio?.balance || 0;

    let allowed = true;
    let reasons = [];

    // 1. Vérifier % du portefeuille
    const positionPct = totalPortfolioValue > 0 ? futureValue / totalPortfolioValue : 0;
    if (positionPct > this.REGULATORY_LIMITS.MAX_SINGLE_POSITION_PCT) {
      allowed = false;
      reasons.push(
        `Position ${ticker} serait ${(positionPct * 100).toFixed(1)}% du portefeuille (max 25%)`
      );
    }

    // 2. Vérifier limites spécifiques utilisateur (si définies)
    const userLimit = this.db.prepare(`
      SELECT max_position_quantity, max_position_value
      FROM position_limits
      WHERE user_id = ? AND ticker = ?
    `).get(userId, ticker);

    if (userLimit) {
      if (userLimit.max_position_quantity && futureQuantity > userLimit.max_position_quantity) {
        allowed = false;
        reasons.push(
          `Limite quantité ${ticker}: ${futureQuantity} > ${userLimit.max_position_quantity}`
        );
      }

      if (userLimit.max_position_value && futureValue > userLimit.max_position_value) {
        allowed = false;
        reasons.push(
          `Limite valeur ${ticker}: ${futureValue} FCFA > ${userLimit.max_position_value} FCFA`
        );
      }
    }

    return { allowed, reasons, positionPct, futureValue };
  }

  /**
   * 3. DÉTECTION PATTERNS SUSPECTS
   */
  async detectSuspiciousPatterns(userId, newTransaction) {
    const suspiciousPatterns = [];
    const { type, ticker, quantity, price, totalAmount } = newTransaction;

    // Pattern 1: WASH TRADING (acheter et vendre rapidement même action)
    if (type === 'sell') {
      const recentBuy = this.db.prepare(`
        SELECT * FROM transactions
        WHERE user_id = ? AND ticker = ? AND type = 'buy'
          AND timestamp > datetime('now', '-1 hour')
        ORDER BY timestamp DESC LIMIT 1
      `).get(userId, ticker);

      if (recentBuy && Math.abs(recentBuy.quantity - quantity) < quantity * 0.1) {
        suspiciousPatterns.push({
          type: this.SUSPICIOUS_PATTERNS.WASH_TRADING,
          severity: 'medium',
          description: `Possible wash trading: Achat puis vente de ${ticker} en moins d'1h`
        });
      }
    }

    // Pattern 2: CHURNING (trading excessif)
    const dailyTradesCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM transactions
      WHERE user_id = ? AND DATE(timestamp) = DATE('now')
    `).get(userId);

    if (dailyTradesCount.count >= this.REGULATORY_LIMITS.AML_SUSPICIOUS_FREQUENCY) {
      suspiciousPatterns.push({
        type: this.SUSPICIOUS_PATTERNS.CHURNING,
        severity: 'high',
        description: `Trading excessif: ${dailyTradesCount.count} trades aujourd'hui (seuil: 10)`
      });
    }

    // Pattern 3: SMURFING (fractionner pour éviter seuils)
    const recentSmallTrades = this.db.prepare(`
      SELECT COUNT(*) as count, SUM(total) as total FROM transactions
      WHERE user_id = ? AND ticker = ? AND type = ?
        AND timestamp > datetime('now', '-1 hour')
        AND total < ?
    `).get(userId, ticker, type, this.REGULATORY_LIMITS.AML_CASH_THRESHOLD);

    if (recentSmallTrades.count >= 5 &&
        recentSmallTrades.total > this.REGULATORY_LIMITS.AML_CASH_THRESHOLD) {
      suspiciousPatterns.push({
        type: this.SUSPICIOUS_PATTERNS.SMURFING,
        severity: 'high',
        description: `Possible smurfing: ${recentSmallTrades.count} petites transactions = ${recentSmallTrades.total} FCFA total`
      });
    }

    // Pattern 4: UNUSUAL VOLUME (volume anormal vs historique)
    const avgVolume = this.db.prepare(`
      SELECT AVG(quantity) as avg_qty FROM transactions
      WHERE user_id = ? AND ticker = ? AND type = ?
        AND timestamp > datetime('now', '-30 days')
    `).get(userId, ticker, type);

    if (avgVolume.avg_qty && quantity > avgVolume.avg_qty * 5) {
      suspiciousPatterns.push({
        type: this.SUSPICIOUS_PATTERNS.UNUSUAL_VOLUME,
        severity: 'medium',
        description: `Volume inhabituel: ${quantity} vs moyenne ${avgVolume.avg_qty.toFixed(0)}`
      });
    }

    // Pattern 5: UNUSUAL TIMING (trading hors heures normales)
    const hour = new Date().getHours();
    if (hour < 8 || hour > 18) { // Bourse BRVM: 8h-18h UTC
      suspiciousPatterns.push({
        type: this.SUSPICIOUS_PATTERNS.UNUSUAL_TIMING,
        severity: 'low',
        description: `Trading hors heures normales: ${hour}h`
      });
    }

    return suspiciousPatterns;
  }

  /**
   * 4. CRÉER ALERTE ACTIVITÉ SUSPECTE
   */
  async createSuspiciousActivityAlert(userId, pattern) {
    const stmt = this.db.prepare(`
      INSERT INTO suspicious_activities (
        user_id, pattern_type, severity, description, status
      ) VALUES (?, ?, ?, ?, 'new')
    `);

    const result = stmt.run(
      userId,
      pattern.type,
      pattern.severity,
      pattern.description
    );

    // Si sévérité HIGH ou CRITICAL, notifier compliance officers
    if (pattern.severity === 'high' || pattern.severity === 'critical') {
      console.log(`⚠️ ALERTE HAUTE SÉVÉRITÉ: User ${userId} - ${pattern.description}`);
      // TODO: Envoyer email/SMS aux compliance officers
    }

    return result.lastInsertRowid;
  }

  /**
   * 5. AUDIT TRAIL (Log immuable de toutes actions)
   */
  async logAuditTrail(userId, actionType, actionDetails, context = {}) {
    const stmt = this.db.prepare(`
      INSERT INTO audit_trail (
        user_id, action_type, action_details, ip_address, user_agent, session_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      actionType,
      JSON.stringify(actionDetails),
      context.ipAddress || null,
      context.userAgent || null,
      context.sessionId || null
    );
  }

  /**
   * 6. RAPPORT QUOTIDIEN POUR CREPMF
   */
  async generateDailyReport(date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];

    // 1. Transactions du jour
    const transactions = this.db.prepare(`
      SELECT
        u.email,
        t.type,
        t.ticker,
        t.quantity,
        t.price,
        t.total,
        t.timestamp
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE DATE(t.timestamp) = ?
      ORDER BY t.timestamp
    `).all(dateStr);

    // 2. Activités suspectes détectées
    const suspiciousActivities = this.db.prepare(`
      SELECT
        u.email,
        sa.pattern_type,
        sa.severity,
        sa.description,
        sa.detection_timestamp
      FROM suspicious_activities sa
      JOIN users u ON sa.user_id = u.id
      WHERE DATE(sa.detection_timestamp) = ?
        AND sa.status != 'resolved'
      ORDER BY sa.severity DESC, sa.detection_timestamp
    `).all(dateStr);

    // 3. Violations de limites
    const violations = this.db.prepare(`
      SELECT
        u.email,
        ct.ticker,
        ct.suspicious_reasons,
        ct.timestamp
      FROM compliance_transactions ct
      JOIN users u ON ct.user_id = u.id
      WHERE DATE(ct.timestamp) = ?
        AND (ct.exceeds_position_limit = 1 OR ct.exceeds_amount_limit = 1)
      ORDER BY ct.timestamp
    `).all(dateStr);

    // 4. Statistiques
    const stats = {
      totalTransactions: transactions.length,
      totalVolume: transactions.reduce((sum, t) => sum + t.total, 0),
      suspiciousActivitiesCount: suspiciousActivities.length,
      violationsCount: violations.length,
      uniqueTraders: new Set(transactions.map(t => t.email)).size
    };

    const reportData = {
      reportDate: dateStr,
      generatedAt: new Date().toISOString(),
      statistics: stats,
      transactions,
      suspiciousActivities,
      violations
    };

    // 5. Enregistrer rapport
    const stmt = this.db.prepare(`
      INSERT INTO regulatory_reports (
        report_type, report_period_start, report_period_end, report_data, generated_by
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      'daily_activity',
      dateStr,
      dateStr,
      JSON.stringify(reportData),
      null // TODO: ID du compliance officer
    );

    return {
      reportId: result.lastInsertRowid,
      reportData
    };
  }

  /**
   * 7. CATÉGORISER CLIENT (Retail, Pro, Institutionnel)
   */
  async categorizeClient(userId, criteria) {
    const {
      annualIncome = 0,
      netWorth = 0,
      tradingExperienceYears = 0,
      professionalStatus = null
    } = criteria;

    let category = this.REGULATORY_LIMITS.CLIENT_CATEGORIES.RETAIL;

    // Critères professionnel (2 sur 3):
    // - Revenu annuel > 50M FCFA
    // - Patrimoine > 100M FCFA
    // - Expérience 3+ ans
    const proScore = [
      annualIncome > 50000000,
      netWorth > 100000000,
      tradingExperienceYears >= 3
    ].filter(Boolean).length;

    if (proScore >= 2 || professionalStatus === 'finance_professional') {
      category = this.REGULATORY_LIMITS.CLIENT_CATEGORIES.PROFESSIONAL;
    }

    // Institutionnel
    if (professionalStatus === 'institutional') {
      category = this.REGULATORY_LIMITS.CLIENT_CATEGORIES.INSTITUTIONAL;
    }

    // Limites selon catégorie
    const limits = {
      retail: {
        maxLeverage: 1.0, // Pas de levier
        maxSingleTrade: 10000000, // 10M FCFA
        requiresAdvisor: false
      },
      professional: {
        maxLeverage: 2.0,
        maxSingleTrade: 100000000, // 100M FCFA
        requiresAdvisor: false
      },
      institutional: {
        maxLeverage: 5.0,
        maxSingleTrade: null, // Pas de limite
        requiresAdvisor: false
      }
    };

    const categoryLimits = limits[category];

    // Enregistrer ou mettre à jour
    const stmt = this.db.prepare(`
      INSERT INTO client_categories (
        user_id, category, annual_income, net_worth,
        trading_experience_years, professional_status,
        max_leverage, max_single_trade, requires_advisor,
        next_review_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now', '+1 year'))
      ON CONFLICT(user_id) DO UPDATE SET
        category = excluded.category,
        annual_income = excluded.annual_income,
        net_worth = excluded.net_worth,
        trading_experience_years = excluded.trading_experience_years,
        professional_status = excluded.professional_status,
        max_leverage = excluded.max_leverage,
        max_single_trade = excluded.max_single_trade,
        last_review_date = CURRENT_TIMESTAMP,
        next_review_date = excluded.next_review_date
    `);

    stmt.run(
      userId,
      category,
      annualIncome,
      netWorth,
      tradingExperienceYears,
      professionalStatus,
      categoryLimits.maxLeverage,
      categoryLimits.maxSingleTrade,
      categoryLimits.requiresAdvisor ? 1 : 0
    );

    return { category, limits: categoryLimits };
  }

  /**
   * 8. OBTENIR STATUT COMPLIANCE UTILISATEUR
   */
  getComplianceStatus(userId) {
    // Dernières transactions
    const recentTransactions = this.db.prepare(`
      SELECT * FROM compliance_transactions
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT 10
    `).all(userId);

    // Alertes actives
    const activeAlerts = this.db.prepare(`
      SELECT * FROM suspicious_activities
      WHERE user_id = ? AND status != 'resolved'
      ORDER BY severity DESC, detection_timestamp DESC
    `).all(userId);

    // Catégorie client
    const clientCategory = this.db.prepare(`
      SELECT * FROM client_categories WHERE user_id = ?
    `).get(userId);

    // Compte des violations
    const violationCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM compliance_transactions
      WHERE user_id = ?
        AND (exceeds_position_limit = 1 OR exceeds_amount_limit = 1)
        AND timestamp > datetime('now', '-30 days')
    `).get(userId);

    return {
      clientCategory: clientCategory?.category || 'retail',
      activeAlerts: activeAlerts.length,
      recentViolations: violationCount.count,
      recentTransactions: recentTransactions.slice(0, 5),
      alerts: activeAlerts,
      riskLevel: activeAlerts.length > 0 ? 'high' :
                 (violationCount.count > 3 ? 'medium' : 'low')
    };
  }
}

module.exports = new ComplianceService();
