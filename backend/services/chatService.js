/**
 * Service de gestion du chat
 */

class ChatService {
  constructor(db) {
    this.db = db;
  }

  // ============================================
  // CONVERSATIONS
  // ============================================

  /**
   * Récupère les conversations d'un utilisateur
   */
  getUserConversations(userId) {
    try {
      const conversations = this.db.prepare(`
        SELECT
          c.id,
          c.type,
          c.name,
          c.last_message_at,
          c.created_at,
          (
            SELECT content
            FROM chat_messages
            WHERE conversation_id = c.id
            ORDER BY created_at DESC
            LIMIT 1
          ) as last_message,
          (
            SELECT COUNT(*)
            FROM chat_messages m
            LEFT JOIN chat_participants p ON p.conversation_id = c.id AND p.user_id = ?
            WHERE m.conversation_id = c.id
              AND m.created_at > COALESCE(p.last_read_at, '1970-01-01')
              AND m.user_id != ?
          ) as unread_count,
          (
            SELECT GROUP_CONCAT(u.first_name || ' ' || u.last_name)
            FROM chat_participants cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.conversation_id = c.id AND cp.user_id != ? AND cp.is_active = 1
          ) as participants_names,
          (
            SELECT GROUP_CONCAT(u.profile_image)
            FROM chat_participants cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.conversation_id = c.id AND cp.user_id != ? AND cp.is_active = 1
          ) as participants_images
        FROM chat_conversations c
        JOIN chat_participants cp ON c.id = cp.conversation_id
        WHERE cp.user_id = ? AND cp.is_active = 1
        ORDER BY c.last_message_at DESC
      `).all(userId, userId, userId, userId, userId);

      return conversations;
    } catch (error) {
      throw new Error(`Erreur récupération conversations: ${error.message}`);
    }
  }

  /**
   * Récupère une conversation par son ID
   */
  getConversationById(conversationId, userId) {
    try {
      // Vérifier que l'utilisateur est participant
      const participant = this.db.prepare(`
        SELECT * FROM chat_participants
        WHERE conversation_id = ? AND user_id = ? AND is_active = 1
      `).get(conversationId, userId);

      if (!participant) {
        throw new Error('Accès refusé à cette conversation');
      }

      const conversation = this.db.prepare(`
        SELECT
          c.*,
          (
            SELECT GROUP_CONCAT(u.id || ':' || u.first_name || ' ' || u.last_name || ':' || COALESCE(u.profile_image, ''))
            FROM chat_participants cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.conversation_id = c.id AND cp.is_active = 1
          ) as participants_data
        FROM chat_conversations c
        WHERE c.id = ?
      `).get(conversationId);

      // Parser les participants
      if (conversation && conversation.participants_data) {
        conversation.participants = conversation.participants_data.split(',').map(p => {
          const [id, name, image] = p.split(':');
          return { id: parseInt(id), name, profile_image: image || null };
        });
        delete conversation.participants_data;
      }

      return conversation;
    } catch (error) {
      throw new Error(`Erreur récupération conversation: ${error.message}`);
    }
  }

  /**
   * Crée une nouvelle conversation
   */
  createConversation(createdBy, participantIds, name = null, type = 'private') {
    try {
      // Vérifier que le créateur est dans les participants
      if (!participantIds.includes(createdBy)) {
        participantIds.push(createdBy);
      }

      // Pour les conversations privées, vérifier qu'il n'y a pas déjà une conversation
      if (type === 'private' && participantIds.length === 2) {
        const existing = this.findPrivateConversation(participantIds[0], participantIds[1]);
        if (existing) {
          return existing;
        }
      }

      // Créer la conversation
      const result = this.db.prepare(`
        INSERT INTO chat_conversations (type, name, created_by)
        VALUES (?, ?, ?)
      `).run(type, name, createdBy);

      const conversationId = result.lastInsertRowid;

      // Ajouter les participants
      const insertParticipant = this.db.prepare(`
        INSERT INTO chat_participants (conversation_id, user_id)
        VALUES (?, ?)
      `);

      participantIds.forEach(userId => {
        insertParticipant.run(conversationId, userId);
      });

      return this.getConversationById(conversationId, createdBy);
    } catch (error) {
      throw new Error(`Erreur création conversation: ${error.message}`);
    }
  }

  /**
   * Trouve une conversation privée existante entre deux utilisateurs
   */
  findPrivateConversation(userId1, userId2) {
    try {
      const conversation = this.db.prepare(`
        SELECT c.id
        FROM chat_conversations c
        WHERE c.type = 'private'
          AND (
            SELECT COUNT(*)
            FROM chat_participants cp
            WHERE cp.conversation_id = c.id
              AND cp.is_active = 1
              AND cp.user_id IN (?, ?)
          ) = 2
          AND (
            SELECT COUNT(*)
            FROM chat_participants cp
            WHERE cp.conversation_id = c.id AND cp.is_active = 1
          ) = 2
        LIMIT 1
      `).get(userId1, userId2);

      if (conversation) {
        return this.getConversationById(conversation.id, userId1);
      }

      return null;
    } catch (error) {
      throw new Error(`Erreur recherche conversation: ${error.message}`);
    }
  }

  // ============================================
  // MESSAGES
  // ============================================

  /**
   * Récupère les messages d'une conversation
   */
  getMessages(conversationId, userId, options = {}) {
    const { limit = 50, offset = 0, before = null } = options;

    try {
      // Vérifier que l'utilisateur est participant
      const participant = this.db.prepare(`
        SELECT * FROM chat_participants
        WHERE conversation_id = ? AND user_id = ? AND is_active = 1
      `).get(conversationId, userId);

      if (!participant) {
        throw new Error('Accès refusé à cette conversation');
      }

      let query = `
        SELECT
          m.*,
          u.first_name || ' ' || u.last_name as author_name,
          u.profile_image as author_image,
          (
            SELECT GROUP_CONCAT(emoji || ':' || COUNT(*))
            FROM chat_message_reactions
            WHERE message_id = m.id
            GROUP BY emoji
          ) as reactions_data
        FROM chat_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.conversation_id = ? AND m.is_deleted = 0
      `;

      const params = [conversationId];

      if (before) {
        query += ` AND m.created_at < ?`;
        params.push(before);
      }

      query += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      let messages = this.db.prepare(query).all(...params);

      // Inverser pour avoir l'ordre chronologique
      messages = messages.reverse();

      // Parser les réactions
      messages.forEach(msg => {
        if (msg.reactions_data) {
          msg.reactions = {};
          msg.reactions_data.split(',').forEach(r => {
            const [emoji, count] = r.split(':');
            msg.reactions[emoji] = parseInt(count);
          });
          delete msg.reactions_data;
        } else {
          msg.reactions = {};
        }
      });

      return messages;
    } catch (error) {
      throw new Error(`Erreur récupération messages: ${error.message}`);
    }
  }

  /**
   * Envoie un message
   */
  sendMessage(conversationId, userId, content) {
    try {
      // Vérifier que l'utilisateur est participant
      const participant = this.db.prepare(`
        SELECT * FROM chat_participants
        WHERE conversation_id = ? AND user_id = ? AND is_active = 1
      `).get(conversationId, userId);

      if (!participant) {
        throw new Error('Accès refusé à cette conversation');
      }

      // Créer le message
      const result = this.db.prepare(`
        INSERT INTO chat_messages (conversation_id, user_id, content)
        VALUES (?, ?, ?)
      `).run(conversationId, userId, content);

      // Mettre à jour la conversation
      this.db.prepare(`
        UPDATE chat_conversations
        SET last_message_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(conversationId);

      // Récupérer le message créé
      const message = this.db.prepare(`
        SELECT
          m.*,
          u.first_name || ' ' || u.last_name as author_name,
          u.profile_image as author_image
        FROM chat_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
      `).get(result.lastInsertRowid);

      message.reactions = {};

      return message;
    } catch (error) {
      throw new Error(`Erreur envoi message: ${error.message}`);
    }
  }

  /**
   * Modifie un message
   */
  editMessage(messageId, userId, content) {
    try {
      const message = this.db.prepare(`
        SELECT * FROM chat_messages WHERE id = ? AND is_deleted = 0
      `).get(messageId);

      if (!message) {
        throw new Error('Message non trouvé');
      }

      if (message.user_id !== userId) {
        throw new Error('Non autorisé à modifier ce message');
      }

      this.db.prepare(`
        UPDATE chat_messages
        SET content = ?,
            is_edited = 1,
            edited_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(content, messageId);

      return this.db.prepare(`
        SELECT
          m.*,
          u.first_name || ' ' || u.last_name as author_name,
          u.profile_image as author_image
        FROM chat_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
      `).get(messageId);
    } catch (error) {
      throw new Error(`Erreur modification message: ${error.message}`);
    }
  }

  /**
   * Supprime un message
   */
  deleteMessage(messageId, userId) {
    try {
      const message = this.db.prepare(`
        SELECT * FROM chat_messages WHERE id = ? AND is_deleted = 0
      `).get(messageId);

      if (!message) {
        throw new Error('Message non trouvé');
      }

      if (message.user_id !== userId) {
        throw new Error('Non autorisé à supprimer ce message');
      }

      this.db.prepare(`
        UPDATE chat_messages
        SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(messageId);

      return { success: true };
    } catch (error) {
      throw new Error(`Erreur suppression message: ${error.message}`);
    }
  }

  // ============================================
  // RÉACTIONS
  // ============================================

  /**
   * Ajoute/Retire une réaction à un message
   */
  toggleReaction(messageId, userId, emoji) {
    try {
      // Vérifier si la réaction existe déjà
      const existing = this.db.prepare(`
        SELECT id FROM chat_message_reactions
        WHERE message_id = ? AND user_id = ? AND emoji = ?
      `).get(messageId, userId, emoji);

      if (existing) {
        // Retirer la réaction
        this.db.prepare(`
          DELETE FROM chat_message_reactions
          WHERE message_id = ? AND user_id = ? AND emoji = ?
        `).run(messageId, userId, emoji);
        return { added: false, emoji };
      } else {
        // Ajouter la réaction
        this.db.prepare(`
          INSERT INTO chat_message_reactions (message_id, user_id, emoji)
          VALUES (?, ?, ?)
        `).run(messageId, userId, emoji);
        return { added: true, emoji };
      }
    } catch (error) {
      throw new Error(`Erreur toggle réaction: ${error.message}`);
    }
  }

  // ============================================
  // LECTURE
  // ============================================

  /**
   * Marque une conversation comme lue
   */
  markAsRead(conversationId, userId) {
    try {
      this.db.prepare(`
        UPDATE chat_participants
        SET last_read_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ? AND user_id = ?
      `).run(conversationId, userId);

      return { success: true };
    } catch (error) {
      throw new Error(`Erreur marquage comme lu: ${error.message}`);
    }
  }

  /**
   * Récupère le nombre de messages non lus
   */
  getUnreadCount(userId) {
    try {
      const { count } = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM chat_messages m
        JOIN chat_participants p ON p.conversation_id = m.conversation_id
        WHERE p.user_id = ?
          AND p.is_active = 1
          AND m.user_id != ?
          AND m.created_at > COALESCE(p.last_read_at, '1970-01-01')
          AND m.is_deleted = 0
      `).get(userId, userId);

      return count;
    } catch (error) {
      throw new Error(`Erreur comptage non lus: ${error.message}`);
    }
  }

  // ============================================
  // PARTICIPANTS
  // ============================================

  /**
   * Ajoute un participant à une conversation
   */
  addParticipant(conversationId, userId, newParticipantId) {
    try {
      // Vérifier que l'utilisateur est participant (et peut ajouter)
      const conversation = this.getConversationById(conversationId, userId);
      if (!conversation) {
        throw new Error('Conversation non trouvée');
      }

      // Pour les conversations privées, ne pas permettre d'ajouter
      if (conversation.type === 'private') {
        throw new Error('Impossible d\'ajouter un participant à une conversation privée');
      }

      // Ajouter le participant
      this.db.prepare(`
        INSERT OR REPLACE INTO chat_participants (conversation_id, user_id, is_active)
        VALUES (?, ?, 1)
      `).run(conversationId, newParticipantId);

      return { success: true };
    } catch (error) {
      throw new Error(`Erreur ajout participant: ${error.message}`);
    }
  }

  /**
   * Retire un participant d'une conversation
   */
  removeParticipant(conversationId, userId, participantId) {
    try {
      // Vérifier que l'utilisateur est participant
      const conversation = this.getConversationById(conversationId, userId);
      if (!conversation) {
        throw new Error('Conversation non trouvée');
      }

      // Un utilisateur peut se retirer lui-même ou le créateur peut retirer
      if (userId !== participantId && userId !== conversation.created_by) {
        throw new Error('Non autorisé à retirer ce participant');
      }

      this.db.prepare(`
        UPDATE chat_participants
        SET is_active = 0
        WHERE conversation_id = ? AND user_id = ?
      `).run(conversationId, participantId);

      return { success: true };
    } catch (error) {
      throw new Error(`Erreur retrait participant: ${error.message}`);
    }
  }

  // ============================================
  // BLOCAGE
  // ============================================

  /**
   * Bloque un utilisateur
   */
  blockUser(blockerId, blockedId, reason = null) {
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO user_blocks (blocker_id, blocked_id, reason)
        VALUES (?, ?, ?)
      `).run(blockerId, blockedId, reason);

      return { success: true };
    } catch (error) {
      throw new Error(`Erreur blocage utilisateur: ${error.message}`);
    }
  }

  /**
   * Débloque un utilisateur
   */
  unblockUser(blockerId, blockedId) {
    try {
      this.db.prepare(`
        DELETE FROM user_blocks
        WHERE blocker_id = ? AND blocked_id = ?
      `).run(blockerId, blockedId);

      return { success: true };
    } catch (error) {
      throw new Error(`Erreur déblocage utilisateur: ${error.message}`);
    }
  }

  /**
   * Vérifie si un utilisateur est bloqué
   */
  isBlocked(userId1, userId2) {
    try {
      const block = this.db.prepare(`
        SELECT id FROM user_blocks
        WHERE (blocker_id = ? AND blocked_id = ?)
           OR (blocker_id = ? AND blocked_id = ?)
      `).get(userId1, userId2, userId2, userId1);

      return !!block;
    } catch (error) {
      throw new Error(`Erreur vérification blocage: ${error.message}`);
    }
  }

  /**
   * Récupère la liste des utilisateurs bloqués
   */
  getBlockedUsers(userId) {
    try {
      const blocked = this.db.prepare(`
        SELECT
          b.blocked_id as user_id,
          u.first_name || ' ' || u.last_name as name,
          u.profile_image,
          b.created_at as blocked_at
        FROM user_blocks b
        JOIN users u ON b.blocked_id = u.id
        WHERE b.blocker_id = ?
        ORDER BY b.created_at DESC
      `).all(userId);

      return blocked;
    } catch (error) {
      throw new Error(`Erreur récupération bloqués: ${error.message}`);
    }
  }
}

module.exports = ChatService;
