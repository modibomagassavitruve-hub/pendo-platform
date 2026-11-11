import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import MessageList from './MessageList';
import MessageInput from './MessageInput';

import { API_URL } from '../../config';
import logger from '../../utils/logger';

const ChatWindow = ({ conversation, onConversationUpdate }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (conversation) {
      loadMessages();
      markAsRead();

      socketService.onNewMessage((message) => {
        if (message.conversation_id === conversation.id) {
          setMessages((prev) => [...prev, message]);
          scrollToBottom();
          markAsRead();
        }
      });

      socketService.onTyping((data) => {
        if (data.conversationId === conversation.id) {
          if (data.isTyping) {
            if (!typingUsers.includes(data.userId)) {
              setTypingUsers((prev) => [...prev, data.userId]);
            }
          } else {
            setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
          }
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
          }, 3000);
        }
      });
    }
  }, [conversation]);

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('pendo_token');
      const response = await axios.get(
        `${API_URL}/chat/conversations/${conversation.id}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setMessages(response.data.data);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      logger.error('Erreur chargement messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      const token = localStorage.getItem('pendo_token');
      await axios.post(
        `${API_URL}/chat/conversations/${conversation.id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onConversationUpdate();
    } catch (error) {
      logger.error('Erreur marquage comme lu:', error);
    }
  };

  const handleSendMessage = async (content) => {
    try {
      const token = localStorage.getItem('pendo_token');
      const response = await axios.post(
        `${API_URL}/chat/conversations/${conversation.id}/messages`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        onConversationUpdate();
        return true;
      }
    } catch (error) {
      logger.error('Erreur envoi message:', error);
      alert(error.response?.data?.error || t('chat.sendError'));
      return false;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{
      background: 'var(--cream-glow)',
      border: '1.5px solid rgba(26,20,16,0.08)',
      borderRadius: '14px',
      display: 'flex', flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1.5px solid rgba(26,20,16,0.08)' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', marginBottom: '0.1rem' }}>
          {conversation.name || conversation.participants_names || 'Conversation'}
        </h2>
        {conversation.type === 'group' && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>
            {conversation.participants?.length || 0} participants
          </p>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '160px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid var(--cream-deep)', borderTopColor: 'var(--terracotta)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <>
            <MessageList messages={messages} conversationId={conversation.id} />
            <div ref={messagesEndRef} />
            {typingUsers.length > 0 && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-mute)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                {typingUsers.length === 1 ? 'Quelqu\'un' : `${typingUsers.length} personnes`} est en train d'écrire...
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '0.85rem 1rem', borderTop: '1.5px solid rgba(26,20,16,0.08)' }}>
        <MessageInput conversationId={conversation.id} onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default ChatWindow;
