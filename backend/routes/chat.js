/**
 * Routes API pour le chat
 */

const ChatService = require('../services/chatService');

function createChatRouter(db, requireAuth) {
  const express = require('express');
  const router = express.Router();
  const chatService = new ChatService(db);

  // ============================================
  // CONVERSATIONS
  // ============================================

  /**
   * GET /api/chat/conversations
   * Récupère les conversations de l'utilisateur
   */
  router.get('/conversations', requireAuth, (req, res) => {
    try {
      const conversations = chatService.getUserConversations(req.user.userId);
      res.json({ success: true, data: conversations });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/chat/conversations/:id
   * Récupère une conversation spécifique
   */
  router.get('/conversations/:id', requireAuth, (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = chatService.getConversationById(conversationId, req.user.userId);
      res.json({ success: true, data: conversation });
    } catch (error) {
      if (error.message.includes('Accès refusé')) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/chat/conversations
   * Crée une nouvelle conversation
   */
  router.post('/conversations', requireAuth, (req, res) => {
    try {
      const { participant_ids, name, type } = req.body;

      if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'participant_ids requis (tableau)'
        });
      }

      if (type === 'group' && !name) {
        return res.status(400).json({
          success: false,
          error: 'Le nom est requis pour les conversations de groupe'
        });
      }

      const conversation = chatService.createConversation(
        req.user.userId,
        participant_ids.map(id => parseInt(id)),
        name,
        type || 'private'
      );

      res.status(201).json({ success: true, data: conversation });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/chat/conversations/:id/participants
   * Ajoute un participant à une conversation
   */
  router.post('/conversations/:id/participants', requireAuth, (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id requis'
        });
      }

      const result = chatService.addParticipant(
        conversationId,
        req.user.userId,
        parseInt(user_id)
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /api/chat/conversations/:id/participants/:userId
   * Retire un participant d'une conversation
   */
  router.delete('/conversations/:id/participants/:userId', requireAuth, (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const participantId = parseInt(req.params.userId);

      const result = chatService.removeParticipant(
        conversationId,
        req.user.userId,
        participantId
      );

      res.json(result);
    } catch (error) {
      if (error.message.includes('Non autorisé')) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // MESSAGES
  // ============================================

  /**
   * GET /api/chat/conversations/:id/messages
   * Récupère les messages d'une conversation
   */
  router.get('/conversations/:id/messages', requireAuth, (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { limit, offset, before } = req.query;

      const messages = chatService.getMessages(conversationId, req.user.userId, {
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        before: before || null
      });

      res.json({ success: true, data: messages });
    } catch (error) {
      if (error.message.includes('Accès refusé')) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/chat/conversations/:id/messages
   * Envoie un message
   */
  router.post('/conversations/:id/messages', requireAuth, (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Le contenu est requis'
        });
      }

      if (content.length > 5000) {
        return res.status(400).json({
          success: false,
          error: 'Le message est trop long (max 5000 caractères)'
        });
      }

      const message = chatService.sendMessage(
        conversationId,
        req.user.userId,
        content.trim()
      );

      // Émettre via socket.io si disponible
      if (req.app.get('io')) {
        req.app.get('io').to(`conversation_${conversationId}`).emit('new_message', message);
      }

      res.status(201).json({ success: true, data: message });
    } catch (error) {
      if (error.message.includes('Accès refusé')) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * PUT /api/chat/messages/:id
   * Modifie un message
   */
  router.put('/messages/:id', requireAuth, (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Le contenu est requis'
        });
      }

      const message = chatService.editMessage(messageId, req.user.userId, content.trim());

      // Émettre via socket.io si disponible
      if (req.app.get('io') && message) {
        req.app.get('io').to(`conversation_${message.conversation_id}`).emit('message_edited', message);
      }

      res.json({ success: true, data: message });
    } catch (error) {
      if (error.message.includes('Non autorisé')) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /api/chat/messages/:id
   * Supprime un message
   */
  router.delete('/messages/:id', requireAuth, (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const result = chatService.deleteMessage(messageId, req.user.userId);

      // Émettre via socket.io si disponible
      if (req.app.get('io')) {
        // Récupérer le message avant suppression pour avoir la conversation_id
        // Cette partie nécessiterait une modification du service pour retourner l'ID de conversation
        req.app.get('io').emit('message_deleted', { messageId });
      }

      res.json(result);
    } catch (error) {
      if (error.message.includes('Non autorisé')) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // RÉACTIONS
  // ============================================

  /**
   * POST /api/chat/messages/:id/reactions
   * Ajoute/Retire une réaction
   */
  router.post('/messages/:id/reactions', requireAuth, (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { emoji } = req.body;

      if (!emoji) {
        return res.status(400).json({
          success: false,
          error: 'emoji requis'
        });
      }

      const result = chatService.toggleReaction(messageId, req.user.userId, emoji);

      // Émettre via socket.io si disponible
      if (req.app.get('io')) {
        req.app.get('io').emit('message_reaction', {
          messageId,
          userId: req.user.userId,
          ...result
        });
      }

      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // LECTURE
  // ============================================

  /**
   * POST /api/chat/conversations/:id/read
   * Marque une conversation comme lue
   */
  router.post('/conversations/:id/read', requireAuth, (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const result = chatService.markAsRead(conversationId, req.user.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/chat/unread
   * Récupère le nombre de messages non lus
   */
  router.get('/unread', requireAuth, (req, res) => {
    try {
      const count = chatService.getUnreadCount(req.user.userId);
      res.json({ success: true, count });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // BLOCAGE
  // ============================================

  /**
   * POST /api/chat/block
   * Bloque un utilisateur
   */
  router.post('/block', requireAuth, (req, res) => {
    try {
      const { user_id, reason } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id requis'
        });
      }

      const result = chatService.blockUser(req.user.userId, parseInt(user_id), reason);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/chat/unblock
   * Débloque un utilisateur
   */
  router.post('/unblock', requireAuth, (req, res) => {
    try {
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id requis'
        });
      }

      const result = chatService.unblockUser(req.user.userId, parseInt(user_id));
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/chat/blocked
   * Récupère la liste des utilisateurs bloqués
   */
  router.get('/blocked', requireAuth, (req, res) => {
    try {
      const blocked = chatService.getBlockedUsers(req.user.userId);
      res.json({ success: true, data: blocked });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============================================
  // RECHERCHE D'UTILISATEURS (pour salons privés)
  // ============================================

  /**
   * GET /api/chat/users/search?q=
   * Recherche des utilisateurs par nom/email pour créer un salon privé
   */
  router.get('/users/search', requireAuth, (req, res) => {
    try {
      const { q } = req.query;
      if (!q || q.trim().length < 2) {
        return res.json({ success: true, data: [] });
      }

      const pattern = `%${q.trim()}%`;
      const users = db.prepare(`
        SELECT id, first_name, last_name, email,
               first_name || ' ' || last_name as full_name
        FROM users
        WHERE id != ?
          AND (
            first_name LIKE ?
            OR last_name LIKE ?
            OR (first_name || ' ' || last_name) LIKE ?
            OR email LIKE ?
          )
        ORDER BY first_name, last_name
        LIMIT 20
      `).all(req.user.userId, pattern, pattern, pattern, pattern);

      res.json({ success: true, data: users.map(u => ({
        id: u.id,
        name: u.full_name,
        email: u.email,
        initials: (u.first_name[0] || '') + (u.last_name[0] || '')
      })) });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/chat/join-public
   * Rejoindre ou récupérer le salon public (conversation ID=1)
   */
  router.post('/join-public', requireAuth, (req, res) => {
    try {
      const PUBLIC_CONV_ID = 1;
      const userId = req.user.userId;

      // Vérifier si l'utilisateur est déjà participant
      const existing = db.prepare(`
        SELECT id FROM chat_participants
        WHERE conversation_id = ? AND user_id = ? AND is_active = 1
      `).get(PUBLIC_CONV_ID, userId);

      if (!existing) {
        // Ajouter l'utilisateur comme participant du salon public
        db.prepare(`
          INSERT OR IGNORE INTO chat_participants (conversation_id, user_id)
          VALUES (?, ?)
        `).run(PUBLIC_CONV_ID, userId);
      }

      // Retourner les infos de la conversation publique
      const conv = db.prepare(`
        SELECT id, type, name, created_at
        FROM chat_conversations
        WHERE id = ?
      `).get(PUBLIC_CONV_ID);

      res.json({ success: true, data: conv || { id: PUBLIC_CONV_ID, type: 'public', name: 'Général' } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/chat/private
   * Créer ou récupérer une conversation privée avec un utilisateur
   */
  router.post('/private', requireAuth, (req, res) => {
    try {
      const { target_user_id } = req.body;
      const userId = req.user.userId;

      if (!target_user_id) {
        return res.status(400).json({ success: false, error: 'target_user_id requis' });
      }

      const targetId = parseInt(target_user_id);

      // Vérifier que l'utilisateur cible existe
      const targetUser = db.prepare('SELECT id, first_name, last_name FROM users WHERE id = ?').get(targetId);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
      }

      // Créer ou récupérer la conversation privée
      const conversation = chatService.createConversation(
        userId,
        [userId, targetId],
        `${targetUser.first_name} ${targetUser.last_name}`,
        'private'
      );

      res.status(201).json({ success: true, data: conversation });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = createChatRouter;
