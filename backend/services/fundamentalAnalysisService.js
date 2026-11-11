const Database = require('better-sqlite3');
const path = require('path');

/**
 * Fundamental Analysis Service - Phase 3.3
 *
 * Analyse des fondamentaux financiers des entreprises:
 * - Ratios de valorisation (P/E, P/B, P/S, EV/EBITDA)
 * - Ratios de rentabilité (ROE, ROA, ROIC, Margins)
 * - Ratios de liquidité (Current, Quick, Cash)
 * - Ratios d'endettement (D/E, Interest Coverage)
 * - Ratios de croissance (EPS, Revenue, Book Value)
 * - Score fundamental global (0-100)
 */
class FundamentalAnalysisService {
  constructor() {
    const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  /**
   * Initialise les tables pour les données fondamentales
   */
  initializeTables() {
    this.db.exec(`
      -- Table pour les données financières des entreprises
      CREATE TABLE IF NOT EXISTS company_financials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        fiscal_year INTEGER NOT NULL,
        fiscal_quarter INTEGER,

        -- Compte de résultat
        revenue REAL,
        cost_of_revenue REAL,
        gross_profit REAL,
        operating_expenses REAL,
        operating_income REAL,
        ebitda REAL,
        interest_expense REAL,
        net_income REAL,
        eps REAL,

        -- Bilan
        total_assets REAL,
        current_assets REAL,
        cash REAL,
        inventory REAL,
        total_liabilities REAL,
        current_liabilities REAL,
        total_debt REAL,
        shareholders_equity REAL,
        book_value_per_share REAL,

        -- Flux de trésorerie
        operating_cash_flow REAL,
        free_cash_flow REAL,
        capex REAL,

        -- Autres
        shares_outstanding REAL,
        market_cap REAL,
        enterprise_value REAL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(ticker, fiscal_year, fiscal_quarter)
      );

      -- Table pour les ratios calculés
      CREATE TABLE IF NOT EXISTS fundamental_ratios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        calculation_date DATE NOT NULL,

        -- Valorisation
        pe_ratio REAL,
        pb_ratio REAL,
        ps_ratio REAL,
        peg_ratio REAL,
        ev_ebitda REAL,

        -- Rentabilité
        roe REAL,
        roa REAL,
        roic REAL,
        gross_margin REAL,
        operating_margin REAL,
        net_margin REAL,

        -- Liquidité
        current_ratio REAL,
        quick_ratio REAL,
        cash_ratio REAL,

        -- Endettement
        debt_to_equity REAL,
        debt_to_assets REAL,
        interest_coverage REAL,

        -- Croissance (YoY)
        revenue_growth REAL,
        eps_growth REAL,
        book_value_growth REAL,

        -- Score
        fundamental_score REAL,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(ticker, calculation_date)
      );

      -- Index
      CREATE INDEX IF NOT EXISTS idx_financials_ticker ON company_financials(ticker, fiscal_year DESC);
      CREATE INDEX IF NOT EXISTS idx_ratios_ticker ON fundamental_ratios(ticker, calculation_date DESC);
    `);

    console.log('✅ Fundamental Analysis tables initialized');
  }

  /**
   * Calcule tous les ratios fondamentaux pour un ticker
   */
  calculateRatios(ticker, currentPrice = null) {
    // Récupérer les dernières données financières
    const latest = this.db.prepare(`
      SELECT * FROM company_financials
      WHERE ticker = ?
      ORDER BY fiscal_year DESC, fiscal_quarter DESC
      LIMIT 1
    `).get(ticker);

    if (!latest) {
      throw new Error(`Aucune donnée financière pour ${ticker}`);
    }

    // Récupérer prix actuel si non fourni
    if (!currentPrice) {
      const quote = this.db.prepare(`
        SELECT close FROM extended_market_data
        WHERE ticker = ?
        ORDER BY date DESC
        LIMIT 1
      `).get(ticker);
      currentPrice = quote?.close || null;
    }

    const ratios = {};

    // RATIOS DE VALORISATION
    if (currentPrice && latest.eps) {
      ratios.pe_ratio = currentPrice / latest.eps;
    }

    if (currentPrice && latest.book_value_per_share) {
      ratios.pb_ratio = currentPrice / latest.book_value_per_share;
    }

    if (currentPrice && latest.revenue && latest.shares_outstanding) {
      const revenuePerShare = latest.revenue / latest.shares_outstanding;
      ratios.ps_ratio = currentPrice / revenuePerShare;
    }

    if (ratios.pe_ratio && latest.eps_growth) {
      ratios.peg_ratio = ratios.pe_ratio / (latest.eps_growth * 100);
    }

    if (latest.enterprise_value && latest.ebitda) {
      ratios.ev_ebitda = latest.enterprise_value / latest.ebitda;
    }

    // RATIOS DE RENTABILITÉ
    if (latest.net_income && latest.shareholders_equity) {
      ratios.roe = (latest.net_income / latest.shareholders_equity) * 100;
    }

    if (latest.net_income && latest.total_assets) {
      ratios.roa = (latest.net_income / latest.total_assets) * 100;
    }

    if (latest.net_income && (latest.shareholders_equity + latest.total_debt)) {
      const investedCapital = latest.shareholders_equity + latest.total_debt;
      ratios.roic = (latest.net_income / investedCapital) * 100;
    }

    if (latest.gross_profit && latest.revenue) {
      ratios.gross_margin = (latest.gross_profit / latest.revenue) * 100;
    }

    if (latest.operating_income && latest.revenue) {
      ratios.operating_margin = (latest.operating_income / latest.revenue) * 100;
    }

    if (latest.net_income && latest.revenue) {
      ratios.net_margin = (latest.net_income / latest.revenue) * 100;
    }

    // RATIOS DE LIQUIDITÉ
    if (latest.current_assets && latest.current_liabilities) {
      ratios.current_ratio = latest.current_assets / latest.current_liabilities;
    }

    if (latest.current_assets && latest.inventory && latest.current_liabilities) {
      const quickAssets = latest.current_assets - latest.inventory;
      ratios.quick_ratio = quickAssets / latest.current_liabilities;
    }

    if (latest.cash && latest.current_liabilities) {
      ratios.cash_ratio = latest.cash / latest.current_liabilities;
    }

    // RATIOS D'ENDETTEMENT
    if (latest.total_debt && latest.shareholders_equity) {
      ratios.debt_to_equity = latest.total_debt / latest.shareholders_equity;
    }

    if (latest.total_debt && latest.total_assets) {
      ratios.debt_to_assets = (latest.total_debt / latest.total_assets) * 100;
    }

    if (latest.operating_income && latest.interest_expense && latest.interest_expense > 0) {
      ratios.interest_coverage = latest.operating_income / latest.interest_expense;
    }

    // RATIOS DE CROISSANCE (nécessite données historiques)
    const yearAgo = this.db.prepare(`
      SELECT * FROM company_financials
      WHERE ticker = ? AND fiscal_year = ?
      ORDER BY fiscal_quarter DESC
      LIMIT 1
    `).get(ticker, latest.fiscal_year - 1);

    if (yearAgo) {
      if (yearAgo.revenue && latest.revenue) {
        ratios.revenue_growth = ((latest.revenue - yearAgo.revenue) / yearAgo.revenue) * 100;
      }

      if (yearAgo.eps && latest.eps) {
        ratios.eps_growth = ((latest.eps - yearAgo.eps) / yearAgo.eps) * 100;
      }

      if (yearAgo.book_value_per_share && latest.book_value_per_share) {
        ratios.book_value_growth = ((latest.book_value_per_share - yearAgo.book_value_per_share) / yearAgo.book_value_per_share) * 100;
      }
    }

    // SCORE FUNDAMENTAL (0-100)
    ratios.fundamental_score = this.calculateFundamentalScore(ratios);

    return ratios;
  }

  /**
   * Calcule un score fundamental global (0-100)
   */
  calculateFundamentalScore(ratios) {
    let score = 0;
    let maxScore = 0;

    // Valorisation (25 points max)
    if (ratios.pe_ratio !== undefined) {
      maxScore += 5;
      if (ratios.pe_ratio < 15) score += 5;
      else if (ratios.pe_ratio < 25) score += 3;
      else if (ratios.pe_ratio < 35) score += 1;
    }

    if (ratios.pb_ratio !== undefined) {
      maxScore += 5;
      if (ratios.pb_ratio < 1) score += 5;
      else if (ratios.pb_ratio < 3) score += 3;
      else if (ratios.pb_ratio < 5) score += 1;
    }

    if (ratios.peg_ratio !== undefined) {
      maxScore += 5;
      if (ratios.peg_ratio < 1) score += 5;
      else if (ratios.peg_ratio < 2) score += 3;
      else if (ratios.peg_ratio < 3) score += 1;
    }

    if (ratios.ev_ebitda !== undefined) {
      maxScore += 5;
      if (ratios.ev_ebitda < 10) score += 5;
      else if (ratios.ev_ebitda < 15) score += 3;
      else if (ratios.ev_ebitda < 20) score += 1;
    }

    if (ratios.ps_ratio !== undefined) {
      maxScore += 5;
      if (ratios.ps_ratio < 2) score += 5;
      else if (ratios.ps_ratio < 4) score += 3;
      else if (ratios.ps_ratio < 6) score += 1;
    }

    // Rentabilité (25 points max)
    if (ratios.roe !== undefined) {
      maxScore += 8;
      if (ratios.roe > 20) score += 8;
      else if (ratios.roe > 15) score += 5;
      else if (ratios.roe > 10) score += 2;
    }

    if (ratios.roa !== undefined) {
      maxScore += 7;
      if (ratios.roa > 10) score += 7;
      else if (ratios.roa > 5) score += 4;
      else if (ratios.roa > 2) score += 1;
    }

    if (ratios.net_margin !== undefined) {
      maxScore += 10;
      if (ratios.net_margin > 20) score += 10;
      else if (ratios.net_margin > 10) score += 6;
      else if (ratios.net_margin > 5) score += 2;
    }

    // Liquidité (20 points max)
    if (ratios.current_ratio !== undefined) {
      maxScore += 10;
      if (ratios.current_ratio > 2) score += 10;
      else if (ratios.current_ratio > 1.5) score += 7;
      else if (ratios.current_ratio > 1) score += 3;
    }

    if (ratios.quick_ratio !== undefined) {
      maxScore += 10;
      if (ratios.quick_ratio > 1.5) score += 10;
      else if (ratios.quick_ratio > 1) score += 6;
      else if (ratios.quick_ratio > 0.5) score += 2;
    }

    // Endettement (15 points max)
    if (ratios.debt_to_equity !== undefined) {
      maxScore += 10;
      if (ratios.debt_to_equity < 0.5) score += 10;
      else if (ratios.debt_to_equity < 1) score += 6;
      else if (ratios.debt_to_equity < 2) score += 2;
    }

    if (ratios.interest_coverage !== undefined) {
      maxScore += 5;
      if (ratios.interest_coverage > 10) score += 5;
      else if (ratios.interest_coverage > 5) score += 3;
      else if (ratios.interest_coverage > 2) score += 1;
    }

    // Croissance (15 points max)
    if (ratios.revenue_growth !== undefined) {
      maxScore += 7;
      if (ratios.revenue_growth > 20) score += 7;
      else if (ratios.revenue_growth > 10) score += 4;
      else if (ratios.revenue_growth > 5) score += 1;
    }

    if (ratios.eps_growth !== undefined) {
      maxScore += 8;
      if (ratios.eps_growth > 20) score += 8;
      else if (ratios.eps_growth > 10) score += 5;
      else if (ratios.eps_growth > 5) score += 2;
    }

    // Normaliser sur 100
    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  }

  /**
   * Sauvegarde les ratios calculés
   */
  saveRatios(ticker, ratios, calculationDate = new Date().toISOString().split('T')[0]) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO fundamental_ratios (
        ticker, calculation_date,
        pe_ratio, pb_ratio, ps_ratio, peg_ratio, ev_ebitda,
        roe, roa, roic, gross_margin, operating_margin, net_margin,
        current_ratio, quick_ratio, cash_ratio,
        debt_to_equity, debt_to_assets, interest_coverage,
        revenue_growth, eps_growth, book_value_growth,
        fundamental_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      ticker, calculationDate,
      ratios.pe_ratio || null, ratios.pb_ratio || null, ratios.ps_ratio || null,
      ratios.peg_ratio || null, ratios.ev_ebitda || null,
      ratios.roe || null, ratios.roa || null, ratios.roic || null,
      ratios.gross_margin || null, ratios.operating_margin || null, ratios.net_margin || null,
      ratios.current_ratio || null, ratios.quick_ratio || null, ratios.cash_ratio || null,
      ratios.debt_to_equity || null, ratios.debt_to_assets || null, ratios.interest_coverage || null,
      ratios.revenue_growth || null, ratios.eps_growth || null, ratios.book_value_growth || null,
      ratios.fundamental_score || null
    );
  }

  /**
   * Ajoute des données financières pour un ticker
   */
  addFinancialData(data) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO company_financials (
        ticker, fiscal_year, fiscal_quarter,
        revenue, cost_of_revenue, gross_profit, operating_expenses,
        operating_income, ebitda, interest_expense, net_income, eps,
        total_assets, current_assets, cash, inventory,
        total_liabilities, current_liabilities, total_debt,
        shareholders_equity, book_value_per_share,
        operating_cash_flow, free_cash_flow, capex,
        shares_outstanding, market_cap, enterprise_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.ticker, data.fiscal_year, data.fiscal_quarter || null,
      data.revenue || null, data.cost_of_revenue || null, data.gross_profit || null,
      data.operating_expenses || null, data.operating_income || null,
      data.ebitda || null, data.interest_expense || null, data.net_income || null,
      data.eps || null, data.total_assets || null, data.current_assets || null,
      data.cash || null, data.inventory || null, data.total_liabilities || null,
      data.current_liabilities || null, data.total_debt || null,
      data.shareholders_equity || null, data.book_value_per_share || null,
      data.operating_cash_flow || null, data.free_cash_flow || null,
      data.capex || null, data.shares_outstanding || null, data.market_cap || null,
      data.enterprise_value || null
    );
  }

  /**
   * Screening par critères fondamentaux
   */
  screenByFundamentals(criteria = {}) {
    const {
      min_score = 0,
      max_pe = null,
      min_roe = null,
      max_debt_to_equity = null,
      min_current_ratio = null,
      min_revenue_growth = null,
      limit = 50
    } = criteria;

    let query = `
      SELECT
        r.*,
        f.revenue,
        f.net_income,
        f.market_cap
      FROM fundamental_ratios r
      LEFT JOIN company_financials f ON r.ticker = f.ticker
      WHERE r.fundamental_score >= ?
    `;

    const params = [min_score];

    if (max_pe !== null) {
      query += ` AND r.pe_ratio <= ?`;
      params.push(max_pe);
    }

    if (min_roe !== null) {
      query += ` AND r.roe >= ?`;
      params.push(min_roe);
    }

    if (max_debt_to_equity !== null) {
      query += ` AND r.debt_to_equity <= ?`;
      params.push(max_debt_to_equity);
    }

    if (min_current_ratio !== null) {
      query += ` AND r.current_ratio >= ?`;
      params.push(min_current_ratio);
    }

    if (min_revenue_growth !== null) {
      query += ` AND r.revenue_growth >= ?`;
      params.push(min_revenue_growth);
    }

    query += ` ORDER BY r.fundamental_score DESC LIMIT ?`;
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  /**
   * Récupère les ratios d'un ticker
   */
  getRatios(ticker) {
    return this.db.prepare(`
      SELECT * FROM fundamental_ratios
      WHERE ticker = ?
      ORDER BY calculation_date DESC
      LIMIT 1
    `).get(ticker);
  }

  /**
   * Compare un ticker avec son secteur/marché
   */
  compareToSector(ticker, sector = null) {
    const tickerRatios = this.getRatios(ticker);

    if (!tickerRatios) {
      throw new Error(`Aucun ratio disponible pour ${ticker}`);
    }

    // Pour l'instant, comparer avec la moyenne du marché
    const marketAvg = this.db.prepare(`
      SELECT
        AVG(pe_ratio) as avg_pe,
        AVG(pb_ratio) as avg_pb,
        AVG(roe) as avg_roe,
        AVG(debt_to_equity) as avg_debt,
        AVG(fundamental_score) as avg_score
      FROM fundamental_ratios
      WHERE pe_ratio IS NOT NULL
    `).get();

    return {
      ticker,
      ratios: tickerRatios,
      market_avg: marketAvg,
      comparison: {
        pe_vs_market: tickerRatios.pe_ratio && marketAvg.avg_pe
          ? ((tickerRatios.pe_ratio - marketAvg.avg_pe) / marketAvg.avg_pe) * 100
          : null,
        roe_vs_market: tickerRatios.roe && marketAvg.avg_roe
          ? ((tickerRatios.roe - marketAvg.avg_roe) / marketAvg.avg_roe) * 100
          : null,
        score_vs_market: tickerRatios.fundamental_score && marketAvg.avg_score
          ? ((tickerRatios.fundamental_score - marketAvg.avg_score) / marketAvg.avg_score) * 100
          : null
      }
    };
  }
}

module.exports = FundamentalAnalysisService;
