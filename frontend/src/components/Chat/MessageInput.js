import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const MessageInput = ({ conversationId, onSendMessage }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const handleTypingStart = useCallback(
    debounce(() => {
      if (!isTyping) setIsTyping(true);
    }, 300),
    [conversationId, isTyping]
  );

  const handleTypingStop = useCallback(
    debounce(() => { setIsTyping(false); }, 1000),
    [conversationId]
  );

  const handleChange = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      handleTypingStart();
      handleTypingStop();
    } else {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    setIsTyping(false);
    const success = await onSendMessage(message.trim());
    if (success) setMessage('');
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  const canSend = !!message.trim() && !sending;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
      <textarea
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={t('placeholders.yourMessage')}
        style={{
          flex: 1,
          background: 'var(--cream-deep)',
          border: '1.5px solid rgba(26,20,16,0.12)',
          borderRadius: '10px',
          padding: '0.6rem 1rem',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
          color: 'var(--ink)',
          outline: 'none',
          resize: 'none',
          minHeight: '40px',
          maxHeight: '120px',
        }}
        rows="1"
        disabled={sending}
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        style={{
          width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
          background: canSend ? 'var(--terracotta)' : 'var(--cream-deep)',
          color: canSend ? 'var(--cream)' : 'var(--ink-mute)',
          border: 'none',
          cursor: canSend ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
      >
        {sending
          ? <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(26,20,16,0.2)', borderTopColor: 'var(--ink-mute)', animation: 'spin 0.8s linear infinite' }} />
          : <Send style={{ width: '16px', height: '16px' }} />
        }
      </button>
    </form>
  );
};

export default MessageInput;
