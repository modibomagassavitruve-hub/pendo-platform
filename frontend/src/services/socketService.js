import io from 'socket.io-client';
import logger from '../utils/logger';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || (process.env.NODE_ENV === 'production' ? 'https://pendo-backend.vercel.app' : 'http://localhost:3001');

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(token) {
    if (this.socket && this.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.socket.emit('join_conversations');
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
    });

    this.socket.on('conversations_joined', (data) => {
      // Conversations joined
    });

    this.socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Écouter les nouveaux messages
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  // Écouter les messages modifiés
  onMessageEdited(callback) {
    if (this.socket) {
      this.socket.on('message_edited', callback);
    }
  }

  // Écouter les messages supprimés
  onMessageDeleted(callback) {
    if (this.socket) {
      this.socket.on('message_deleted', callback);
    }
  }

  // Écouter l'indicateur de frappe
  onTyping(callback) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  // Écouter les réactions
  onReaction(callback) {
    if (this.socket) {
      this.socket.on('message_reaction', callback);
    }
  }

  // Envoyer l'état de frappe
  sendTyping(conversationId, isTyping) {
    if (this.socket && this.connected) {
      this.socket.emit('typing', { conversationId, isTyping });
    }
  }

  // Rejoindre une conversation
  joinConversation(conversationId) {
    if (this.socket && this.connected) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  // Quitter une conversation
  leaveConversation(conversationId) {
    if (this.socket && this.connected) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  // Vérifier si connecté
  isConnected() {
    return this.connected;
  }
}

export default new SocketService();
