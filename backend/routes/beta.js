const express = require('express');
const router = express.Router();

/**
 * @route   POST /api/beta/validate-code
 * @desc    Valider un code d'accès bêta
 * @access  Public
 */
router.post('/validate-code', (req, res) => {
  try {
    const { code, email } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: { message: 'Code d\'accès requis', code: 400 }
      });
    }

    const db = req.app.get('db');

    // Vérifier si le code existe et est valide
    const accessCode = db.prepare(`
      SELECT * FROM beta_access_codes
      WHERE code = ? AND is_active = 1
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    `).get(code);

    if (!accessCode) {
      return res.status(404).json({
        success: false,
        error: { message: 'Code d\'accès invalide ou expiré', code: 404 }
      });
    }

    // Vérifier si le code a encore des utilisations disponibles
    if (accessCode.current_uses >= accessCode.max_uses) {
      return res.status(403).json({
        success: false,
        error: { message: 'Ce code a atteint sa limite d\'utilisations', code: 403 }
      });
    }

    // Incrémenter le compteur d'utilisations
    db.prepare(`
      UPDATE beta_access_codes
      SET current_uses = current_uses + 1
      WHERE id = ?
    `).run(accessCode.id);

    res.json({
      success: true,
      data: {
        valid: true,
        code: accessCode.code,
        remaining_uses: accessCode.max_uses - (accessCode.current_uses + 1)
      },
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur validation code bêta:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la validation du code', code: 500 }
    });
  }
});

/**
 * @route   POST /api/beta/register
 * @desc    Enregistrer un utilisateur bêta
 * @access  Public
 */
router.post('/register', (req, res) => {
  try {
    const { userId, accessCodeId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID utilisateur requis', code: 400 }
      });
    }

    const db = req.app.get('db');

    // Enregistrer l'utilisateur bêta
    const result = db.prepare(`
      INSERT INTO beta_users (user_id, access_code_id, status)
      VALUES (?, ?, 'active')
    `).run(userId, accessCodeId || null);

    res.json({
      success: true,
      data: {
        betaUserId: result.lastInsertRowid,
        status: 'active'
      },
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur enregistrement utilisateur bêta:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de l\'enregistrement', code: 500 }
    });
  }
});

/**
 * @route   GET /api/beta/codes
 * @desc    Obtenir les codes d'accès bêta (admin)
 * @access  Private/Admin
 */
router.get('/codes', (req, res) => {
  try {
    const db = req.app.get('db');

    const codes = db.prepare(`
      SELECT
        id, code, max_uses, current_uses,
        is_active, expires_at, created_at, notes
      FROM beta_access_codes
      ORDER BY created_at DESC
    `).all();

    res.json({
      success: true,
      data: codes,
      meta: {
        timestamp: new Date().toISOString(),
        total: codes.length
      }
    });

  } catch (error) {
    console.error('Erreur récupération codes:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération des codes', code: 500 }
    });
  }
});

/**
 * @route   POST /api/beta/codes
 * @desc    Créer un nouveau code d'accès bêta
 * @access  Private/Admin
 */
router.post('/codes', (req, res) => {
  try {
    const { code, maxUses = 1, expiresAt, notes } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: { message: 'Code requis', code: 400 }
      });
    }

    const db = req.app.get('db');

    const result = db.prepare(`
      INSERT INTO beta_access_codes (code, max_uses, expires_at, notes)
      VALUES (?, ?, ?, ?)
    `).run(code, maxUses, expiresAt, notes);

    res.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        code,
        maxUses
      },
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur création code:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la création du code', code: 500 }
    });
  }
});

/**
 * @route   GET /api/beta/stats
 * @desc    Obtenir les statistiques de la phase bêta
 * @access  Private/Admin
 */
router.get('/stats', (req, res) => {
  try {
    const db = req.app.get('db');

    const stats = {
      totalBetaUsers: db.prepare('SELECT COUNT(*) as count FROM beta_users WHERE status = "active"').get().count,
      totalCodes: db.prepare('SELECT COUNT(*) as count FROM beta_access_codes').get().count,
      activeCodes: db.prepare('SELECT COUNT(*) as count FROM beta_access_codes WHERE is_active = 1').get().count,
      totalFeedback: db.prepare('SELECT COUNT(*) as count FROM user_feedback').get().count,
      pendingFeedback: db.prepare('SELECT COUNT(*) as count FROM user_feedback WHERE status = "pending"').get().count,
      totalSessions: db.prepare('SELECT COUNT(*) as count FROM user_sessions').get().count,
      activeToday: db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM usage_analytics
        WHERE DATE(created_at) = DATE('now')
      `).get().count
    };

    res.json({
      success: true,
      data: stats,
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération des statistiques', code: 500 }
    });
  }
});

module.exports = router;
