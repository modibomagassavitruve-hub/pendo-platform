/**
 * PENDO - Routes API Compliance
 */

const express = require('express');
const router = express.Router();
const complianceService = require('../services/complianceService');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Middleware pour vérifier que l'utilisateur est compliance officer
const requireComplianceOfficer = (req, res, next) => {
  // TODO: Vérifier role dans DB
  // Pour l'instant, on permet à tous les users authentifiés
  next();
};

/**
 * GET /api/compliance/status/:userId
 * Obtenir statut compliance d'un utilisateur
 */
router.get('/status/:userId', authenticateToken, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Vérifier que l'utilisateur demande son propre statut ou est compliance officer
    if (req.user.userId !== userId && req.user.role !== 'compliance_officer') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    const status = complianceService.getComplianceStatus(userId);

    res.json({
      success: true,
      userId,
      complianceStatus: status
    });
  } catch (error) {
    console.error('Erreur statut compliance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/compliance/categorize
 * Catégoriser un client (Retail, Professional, Institutional)
 */
router.post('/categorize', authenticateToken, async (req, res) => {
  try {
    const {
      userId,
      annualIncome,
      netWorth,
      tradingExperienceYears,
      professionalStatus
    } = req.body;

    // Vérifier que c'est le user lui-même ou compliance officer
    if (req.user.userId !== userId && req.user.role !== 'compliance_officer') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    const result = await complianceService.categorizeClient(userId, {
      annualIncome,
      netWorth,
      tradingExperienceYears,
      professionalStatus
    });

    res.json({
      success: true,
      userId,
      category: result.category,
      limits: result.limits,
      message: `Client catégorisé comme: ${result.category}`
    });
  } catch (error) {
    console.error('Erreur catégorisation client:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/compliance/monitor-transaction
 * Surveiller une transaction (appelé automatiquement avant chaque trade)
 */
router.post('/monitor-transaction', authenticateToken, async (req, res) => {
  try {
    const {
      transactionId,
      type,
      ticker,
      quantity,
      price,
      totalAmount
    } = req.body;

    const userId = req.user.userId;

    const result = await complianceService.monitorTransaction(userId, {
      transactionId,
      type,
      ticker,
      quantity,
      price,
      totalAmount
    });

    res.json({
      success: true,
      complianceCheck: result
    });
  } catch (error) {
    console.error('Erreur monitoring transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/compliance/suspicious-activities
 * Lister toutes les activités suspectes (compliance officers only)
 */
router.get('/suspicious-activities', authenticateToken, requireComplianceOfficer, (req, res) => {
  try {
    const { status = 'new', severity, limit = 50 } = req.query;

    let query = `
      SELECT
        sa.*,
        u.email,
        u.first_name,
        u.last_name
      FROM suspicious_activities sa
      JOIN users u ON sa.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND sa.status = ?`;
      params.push(status);
    }

    if (severity) {
      query += ` AND sa.severity = ?`;
      params.push(severity);
    }

    query += ` ORDER BY sa.detection_timestamp DESC LIMIT ?`;
    params.push(parseInt(limit));

    const activities = complianceService.db.prepare(query).all(...params);

    res.json({
      success: true,
      count: activities.length,
      activities
    });
  } catch (error) {
    console.error('Erreur récupération activités suspectes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/compliance/report/daily
 * Générer rapport quotidien pour CREPMF
 */
router.post('/report/daily', authenticateToken, requireComplianceOfficer, async (req, res) => {
  try {
    const { date } = req.body;
    const reportDate = date ? new Date(date) : new Date();

    const report = await complianceService.generateDailyReport(reportDate);

    res.json({
      success: true,
      reportId: report.reportId,
      report: report.reportData
    });
  } catch (error) {
    console.error('Erreur génération rapport:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/compliance/reports
 * Lister tous les rapports générés
 */
router.get('/reports', authenticateToken, requireComplianceOfficer, (req, res) => {
  try {
    const { type, limit = 20 } = req.query;

    let query = `
      SELECT * FROM regulatory_reports
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ` AND report_type = ?`;
      params.push(type);
    }

    query += ` ORDER BY generated_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const reports = complianceService.db.prepare(query).all(...params);

    // Parser report_data JSON
    const parsedReports = reports.map(r => ({
      ...r,
      report_data: JSON.parse(r.report_data)
    }));

    res.json({
      success: true,
      count: parsedReports.length,
      reports: parsedReports
    });
  } catch (error) {
    console.error('Erreur récupération rapports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/compliance/investigate/:alertId
 * Marquer une alerte comme en cours d'investigation
 */
router.post('/investigate/:alertId', authenticateToken, requireComplianceOfficer, (req, res) => {
  try {
    const alertId = parseInt(req.params.alertId);
    const { investigationNotes } = req.body;
    const investigatorId = req.user.userId;

    const stmt = complianceService.db.prepare(`
      UPDATE suspicious_activities
      SET status = 'investigating',
          assigned_to = ?,
          investigation_notes = ?
      WHERE id = ?
    `);

    stmt.run(investigatorId, investigationNotes || '', alertId);

    res.json({
      success: true,
      message: 'Alerte marquée en investigation',
      alertId
    });
  } catch (error) {
    console.error('Erreur investigation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/compliance/resolve/:alertId
 * Résoudre une alerte suspecte
 */
router.post('/resolve/:alertId', authenticateToken, requireComplianceOfficer, (req, res) => {
  try {
    const alertId = parseInt(req.params.alertId);
    const { actionTaken, shouldReport, reportToAuthority } = req.body;

    const stmt = complianceService.db.prepare(`
      UPDATE suspicious_activities
      SET status = 'resolved',
          action_taken = ?,
          action_date = CURRENT_TIMESTAMP,
          reported_to_authorities = ?,
          authority_name = ?
      WHERE id = ?
    `);

    stmt.run(
      actionTaken,
      shouldReport ? 1 : 0,
      reportToAuthority || null,
      alertId
    );

    res.json({
      success: true,
      message: 'Alerte résolue',
      alertId,
      actionTaken
    });
  } catch (error) {
    console.error('Erreur résolution:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/compliance/audit-trail/:userId
 * Récupérer audit trail d'un utilisateur
 */
router.get('/audit-trail/:userId', authenticateToken, requireComplianceOfficer, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { limit = 100, actionType } = req.query;

    let query = `
      SELECT * FROM audit_trail
      WHERE user_id = ?
    `;
    const params = [userId];

    if (actionType) {
      query += ` AND action_type = ?`;
      params.push(actionType);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(parseInt(limit));

    const auditLog = complianceService.db.prepare(query).all(...params);

    // Parser action_details JSON
    const parsedLog = auditLog.map(log => ({
      ...log,
      action_details: JSON.parse(log.action_details)
    }));

    res.json({
      success: true,
      userId,
      count: parsedLog.length,
      auditLog: parsedLog
    });
  } catch (error) {
    console.error('Erreur audit trail:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/compliance/limits
 * Obtenir les limites réglementaires CREPMF/BRVM
 */
router.get('/limits', authenticateToken, (req, res) => {
  try {
    res.json({
      success: true,
      regulatoryLimits: complianceService.REGULATORY_LIMITS
    });
  } catch (error) {
    console.error('Erreur récupération limites:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
