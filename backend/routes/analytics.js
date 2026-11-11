const express = require('express');
const router = express.Router();

/**
 * @route   POST /api/analytics/track
 * @desc    Enregistrer un événement d'utilisation
 * @access  Public
 */
router.post('/track', (req, res) => {
  try {
    const {
      userId,
      sessionId,
      eventType,
      eventName,
      pageUrl,
      component,
      actionData,
      duration,
      deviceType,
      browser,
      os
    } = req.body;

    if (!eventType || !eventName) {
      return res.status(400).json({
        success: false,
        error: { message: 'Type et nom d\'événement requis', code: 400 }
      });
    }

    const db = req.app.get('db');

    db.prepare(`
      INSERT INTO usage_analytics (
        user_id, session_id, event_type, event_name, page_url,
        component, action_data, duration_seconds, device_type, browser, os
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId || null,
      sessionId,
      eventType,
      eventName,
      pageUrl,
      component,
      actionData ? JSON.stringify(actionData) : null,
      duration,
      deviceType,
      browser,
      os
    );

    res.json({
      success: true,
      data: { message: 'Événement enregistré' },
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur tracking:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de l\'enregistrement', code: 500 }
    });
  }
});

/**
 * @route   POST /api/analytics/session/start
 * @desc    Démarrer une session utilisateur
 * @access  Public
 */
router.post('/session/start', (req, res) => {
  try {
    const { userId, sessionId, deviceInfo } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID de session requis', code: 400 }
      });
    }

    const db = req.app.get('db');

    const result = db.prepare(`
      INSERT INTO user_sessions (user_id, session_id, device_info)
      VALUES (?, ?, ?)
    `).run(userId || null, sessionId, deviceInfo ? JSON.stringify(deviceInfo) : null);

    res.json({
      success: true,
      data: { sessionId, id: result.lastInsertRowid },
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur démarrage session:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors du démarrage de la session', code: 500 }
    });
  }
});

/**
 * @route   POST /api/analytics/session/end
 * @desc    Terminer une session utilisateur
 * @access  Public
 */
router.post('/session/end', (req, res) => {
  try {
    const { sessionId, pagesVisited, actionsCount } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID de session requis', code: 400 }
      });
    }

    const db = req.app.get('db');

    // Calculer la durée de la session
    db.prepare(`
      UPDATE user_sessions
      SET ended_at = datetime('now'),
          duration_seconds = (julianday(datetime('now')) - julianday(started_at)) * 86400,
          pages_visited = ?,
          actions_count = ?
      WHERE session_id = ?
    `).run(pagesVisited || 0, actionsCount || 0, sessionId);

    res.json({
      success: true,
      data: { message: 'Session terminée' },
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur fin session:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la fin de la session', code: 500 }
    });
  }
});

/**
 * @route   POST /api/analytics/feature
 * @desc    Enregistrer l'utilisation d'une feature
 * @access  Public
 */
router.post('/feature', (req, res) => {
  try {
    const { userId, featureName, featureCategory } = req.body;

    if (!userId || !featureName) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID utilisateur et nom de feature requis', code: 400 }
      });
    }

    const db = req.app.get('db');

    // Insérer ou mettre à jour
    db.prepare(`
      INSERT INTO feature_usage (user_id, feature_name, feature_category, usage_count, last_used_at)
      VALUES (?, ?, ?, 1, datetime('now'))
      ON CONFLICT(user_id, feature_name) DO UPDATE SET
        usage_count = usage_count + 1,
        last_used_at = datetime('now')
    `).run(userId, featureName, featureCategory);

    res.json({
      success: true,
      data: { message: 'Utilisation enregistrée' },
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur feature tracking:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de l\'enregistrement', code: 500 }
    });
  }
});

/**
 * @route   GET /api/analytics/stats
 * @desc    Obtenir les statistiques d'utilisation (admin)
 * @access  Private/Admin
 */
router.get('/stats', (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const db = req.app.get('db');

    // Déterminer la période
    let periodFilter = '';
    switch (period) {
      case '24h':
        periodFilter = "created_at >= datetime('now', '-1 day')";
        break;
      case '7d':
        periodFilter = "created_at >= datetime('now', '-7 days')";
        break;
      case '30d':
        periodFilter = "created_at >= datetime('now', '-30 days')";
        break;
      default:
        periodFilter = "1=1";
    }

    const stats = {
      period,
      totalEvents: db.prepare(`SELECT COUNT(*) as count FROM usage_analytics WHERE ${periodFilter}`).get().count,
      uniqueUsers: db.prepare(`SELECT COUNT(DISTINCT user_id) as count FROM usage_analytics WHERE ${periodFilter} AND user_id IS NOT NULL`).get().count,
      totalSessions: db.prepare(`SELECT COUNT(*) as count FROM user_sessions WHERE started_at >= datetime('now', '-${period === '24h' ? '1 day' : period === '7d' ? '7 days' : '30 days'}')`).get().count,
      avgSessionDuration: db.prepare(`SELECT AVG(duration_seconds) as avg FROM user_sessions WHERE ended_at IS NOT NULL AND started_at >= datetime('now', '-${period === '24h' ? '1 day' : period === '7d' ? '7 days' : '30 days'}')`).get().avg,
      topPages: db.prepare(`
        SELECT page_url, COUNT(*) as visits
        FROM usage_analytics
        WHERE ${periodFilter} AND page_url IS NOT NULL
        GROUP BY page_url
        ORDER BY visits DESC
        LIMIT 10
      `).all(),
      topFeatures: db.prepare(`
        SELECT feature_name, SUM(usage_count) as total_uses
        FROM feature_usage
        GROUP BY feature_name
        ORDER BY total_uses DESC
        LIMIT 10
      `).all(),
      eventsByType: db.prepare(`
        SELECT event_type, COUNT(*) as count
        FROM usage_analytics
        WHERE ${periodFilter}
        GROUP BY event_type
        ORDER BY count DESC
      `).all(),
      dailyActiveUsers: db.prepare(`
        SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as users
        FROM usage_analytics
        WHERE ${periodFilter} AND user_id IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `).all()
    };

    res.json({
      success: true,
      data: stats,
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur stats analytics:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération des statistiques', code: 500 }
    });
  }
});

/**
 * @route   GET /api/analytics/features/top
 * @desc    Obtenir les features les plus utilisées
 * @access  Private/Admin
 */
router.get('/features/top', (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const db = req.app.get('db');

    const features = db.prepare(`
      SELECT
        feature_name,
        feature_category,
        SUM(usage_count) as total_uses,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(last_used_at) as last_used
      FROM feature_usage
      GROUP BY feature_name, feature_category
      ORDER BY total_uses DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({
      success: true,
      data: features,
      meta: {
        timestamp: new Date().toISOString(),
        total: features.length
      }
    });

  } catch (error) {
    console.error('Erreur top features:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération des features', code: 500 }
    });
  }
});

module.exports = router;
