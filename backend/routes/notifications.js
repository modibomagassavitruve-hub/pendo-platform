/**
 * Routes API pour les notifications utilisateur
 */
const express = require('express');

module.exports = function(db, authMiddleware) {
  const router = express.Router();

  /**
   * GET /api/notifications
   * Récupérer les notifications de l'utilisateur
   */
  router.get('/', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;
      const unreadOnly = req.query.unread === 'true';
      const limit = parseInt(req.query.limit) || 50;

      let query = 'SELECT * FROM user_notifications WHERE user_id = ?';
      const params = [userId];

      if (unreadOnly) {
        query += ' AND is_read = 0';
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const notifications = db.prepare(query).all(...params);

      // Compter les non lues
      const unreadCount = db.prepare(
        'SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ? AND is_read = 0'
      ).get(userId).count;

      res.json({
        success: true,
        data: notifications,
        unreadCount
      });
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /api/notifications/:id/read
   * Marquer une notification comme lue
   */
  router.put('/:id/read', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      db.prepare(`
        UPDATE user_notifications
        SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `).run(notificationId, userId);

      res.json({ success: true, message: 'Notification marquée comme lue' });
    } catch (error) {
      console.error('Erreur marquage notification:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /api/notifications/read-all
   * Marquer toutes les notifications comme lues
   */
  router.put('/read-all', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;

      db.prepare(`
        UPDATE user_notifications
        SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND is_read = 0
      `).run(userId);

      res.json({ success: true, message: 'Toutes les notifications marquées comme lues' });
    } catch (error) {
      console.error('Erreur marquage notifications:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /api/notifications/:id
   * Supprimer une notification
   */
  router.delete('/:id', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      db.prepare('DELETE FROM user_notifications WHERE id = ? AND user_id = ?')
        .run(notificationId, userId);

      res.json({ success: true, message: 'Notification supprimée' });
    } catch (error) {
      console.error('Erreur suppression notification:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /api/notifications/clear-all
   * Supprimer toutes les notifications lues
   */
  router.delete('/clear-all', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;

      db.prepare('DELETE FROM user_notifications WHERE user_id = ? AND is_read = 1')
        .run(userId);

      res.json({ success: true, message: 'Notifications lues supprimées' });
    } catch (error) {
      console.error('Erreur suppression notifications:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/notifications/unread-count
   * Compter les notifications non lues
   */
  router.get('/unread-count', authMiddleware, (req, res) => {
    try {
      const userId = req.user.id;

      const result = db.prepare(
        'SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ? AND is_read = 0'
      ).get(userId);

      res.json({ success: true, count: result.count });
    } catch (error) {
      console.error('Erreur comptage notifications:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
