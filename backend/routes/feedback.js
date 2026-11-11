const express = require('express');
const router = express.Router();

/**
 * @route   POST /api/feedback
 * @desc    Soumettre un feedback
 * @access  Public
 */
router.post('/', (req, res) => {
  try {
    const {
      userId,
      email,
      type,
      category,
      title,
      description,
      rating,
      pageUrl,
      browserInfo
    } = req.body;

    if (!type || !title || !description) {
      return res.status(400).json({
        success: false,
        error: { message: 'Type, titre et description requis', code: 400 }
      });
    }

    const db = req.app.get('db');

    const result = db.prepare(`
      INSERT INTO user_feedback (
        user_id, email, type, category, title, description,
        rating, page_url, browser_info, status, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'medium')
    `).run(userId || null, email, type, category, title, description, rating, pageUrl, browserInfo);

    res.json({
      success: true,
      data: {
        feedbackId: result.lastInsertRowid,
        message: 'Merci pour votre feedback ! Nous l\'examinerons bientôt.'
      },
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur soumission feedback:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la soumission du feedback', code: 500 }
    });
  }
});

/**
 * @route   GET /api/feedback
 * @desc    Récupérer tous les feedbacks (admin)
 * @access  Private/Admin
 */
router.get('/', (req, res) => {
  try {
    const { status, type, priority, limit = 50, offset = 0 } = req.query;
    const db = req.app.get('db');

    let query = 'SELECT * FROM user_feedback WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const feedbacks = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM user_feedback').get().count;

    res.json({
      success: true,
      data: feedbacks,
      meta: {
        timestamp: new Date().toISOString(),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Erreur récupération feedbacks:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération des feedbacks', code: 500 }
    });
  }
});

/**
 * @route   GET /api/feedback/:id
 * @desc    Récupérer un feedback spécifique
 * @access  Private/Admin
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.get('db');

    const feedback = db.prepare('SELECT * FROM user_feedback WHERE id = ?').get(id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: { message: 'Feedback non trouvé', code: 404 }
      });
    }

    res.json({
      success: true,
      data: feedback,
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur récupération feedback:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération du feedback', code: 500 }
    });
  }
});

/**
 * @route   PATCH /api/feedback/:id
 * @desc    Mettre à jour le statut d'un feedback
 * @access  Private/Admin
 */
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNotes, resolvedBy } = req.body;
    const db = req.app.get('db');

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);

      if (status === 'resolved' || status === 'closed') {
        updates.push('resolved_at = datetime("now")');
        if (resolvedBy) {
          updates.push('resolved_by = ?');
          params.push(resolvedBy);
        }
      }
    }

    if (priority) {
      updates.push('priority = ?');
      params.push(priority);
    }

    if (adminNotes) {
      updates.push('admin_notes = ?');
      params.push(adminNotes);
    }

    updates.push('updated_at = datetime("now")');
    params.push(id);

    const query = `UPDATE user_feedback SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);

    res.json({
      success: true,
      data: { message: 'Feedback mis à jour avec succès' },
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur mise à jour feedback:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la mise à jour du feedback', code: 500 }
    });
  }
});

/**
 * @route   GET /api/feedback/stats/summary
 * @desc    Obtenir les statistiques des feedbacks
 * @access  Private/Admin
 */
router.get('/stats/summary', (req, res) => {
  try {
    const db = req.app.get('db');

    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM user_feedback').get().count,
      byStatus: {},
      byType: {},
      byPriority: {},
      avgRating: db.prepare('SELECT AVG(rating) as avg FROM user_feedback WHERE rating IS NOT NULL').get().avg,
      recentCount: db.prepare(`
        SELECT COUNT(*) as count FROM user_feedback
        WHERE created_at >= datetime('now', '-7 days')
      `).get().count
    };

    // Par statut
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM user_feedback
      GROUP BY status
    `).all();
    statusCounts.forEach(s => stats.byStatus[s.status] = s.count);

    // Par type
    const typeCounts = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM user_feedback
      GROUP BY type
    `).all();
    typeCounts.forEach(t => stats.byType[t.type] = t.count);

    // Par priorité
    const priorityCounts = db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM user_feedback
      GROUP BY priority
    `).all();
    priorityCounts.forEach(p => stats.byPriority[p.priority] = p.count);

    res.json({
      success: true,
      data: stats,
      meta: { timestamp: new Date().toISOString() }
    });

  } catch (error) {
    console.error('Erreur stats feedback:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur lors de la récupération des statistiques', code: 500 }
    });
  }
});

module.exports = router;
