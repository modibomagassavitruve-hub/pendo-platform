import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send, Users, RefreshCw } from 'lucide-react';
import { API_URL } from '../../config';
import { getLocale } from '../../utils/locale';

const CONV_ID = 'public';
const POLL_INTERVAL = 4000;

const ChatMain = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);

  const token = localStorage.getItem('pendo_token');
  const isAuthenticated = !!token;

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const loadInitialMessages = useCallback(async () => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/chat/conversations/${CONV_ID}/messages?limit=50`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const msgs = data.data.reverse();
        setMessages(msgs);
        if (msgs.length > 0) setLastTimestamp(msgs[msgs.length - 1].created_at);
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) {
      setError(t('chat.loadError'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  const pollNewMessages = useCallback(async () => {
    if (!lastTimestamp) return;
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/chat/conversations/${CONV_ID}/messages?since=${encodeURIComponent(lastTimestamp)}&limit=20`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = data.data.filter(m => !existingIds.has(m.id));
          if (newMsgs.length === 0) return prev;
          setLastTimestamp(newMsgs[newMsgs.length - 1].created_at);
          setTimeout(scrollToBottom, 100);
          return [...prev, ...newMsgs];
        });
      }
    } catch (e) { /* silent */ }
  }, [lastTimestamp, token]);

  useEffect(() => { loadInitialMessages(); }, [loadInitialMessages]);
  useEffect(() => {
    if (!loading) {
      pollRef.current = setInterval(pollNewMessages, POLL_INTERVAL);
      return () => clearInterval(pollRef.current);
    }
  }, [loading, pollNewMessages]);

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || !isAuthenticated || sending) return;
    setSending(true);
    setNewMessage('');
    try {
      const res = await fetch(`${API_URL}/chat/conversations/${CONV_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === data.data.id);
          if (exists) return prev;
          const updated = [...prev, data.data];
          setLastTimestamp(data.data.created_at);
          return updated;
        });
        setTimeout(scrollToBottom, 100);
      } else {
        setError(data.error || t('chat.sendError'));
        setNewMessage(content);
      }
    } catch (e) {
      setError(t('chat.connectionError'));
      setNewMessage(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return t('chat.today');
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
    return d.toLocaleDateString(getLocale(), { day: '2-digit', month: 'short' });
  };

  const grouped = messages.reduce((acc, msg) => {
    const date = formatDate(msg.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: 'var(--cream-glow)',
      border: '1.5px solid rgba(26,20,16,0.08)',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-warm)',
      minHeight: '600px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.85rem 1rem',
        background: 'var(--cream-deep)',
        borderBottom: '1.5px solid rgba(26,20,16,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(194,73,22,0.1)', border: '1.5px solid rgba(194,73,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={15} color="var(--terracotta)" />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>{t('chat.title')}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>{t('chat.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => { setLoading(true); loadInitialMessages(); }}
          title={t('common.refresh')}
          style={{ padding: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', borderRadius: '8px', display: 'flex', transition: 'color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', background: 'var(--cream)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '160px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--cream-deep)', borderTopColor: 'var(--terracotta)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
            <MessageCircle size={32} color="var(--ink-mute)" style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)' }}>{t('chat.noMessages')}</p>
          </div>
        ) : Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.75rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(26,20,16,0.08)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', padding: '0 0.25rem' }}>{date}</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(26,20,16,0.08)' }} />
            </div>
            {msgs.map((msg, idx) => {
              const isSelf = isAuthenticated && msg.user_id && (() => {
                try { return JSON.parse(atob(token.split('.')[1])).id === msg.user_id; } catch { return false; }
              })();
              const showAvatar = idx === 0 || msgs[idx - 1]?.user_id !== msg.user_id;
              return (
                <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.25rem', flexDirection: isSelf ? 'row-reverse' : 'row' }}>
                  {showAvatar ? (
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      background: isSelf ? 'var(--terracotta)' : 'var(--cream-deep)',
                      border: isSelf ? 'none' : '1.5px solid rgba(26,20,16,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.7rem',
                      color: isSelf ? 'var(--cream)' : 'var(--ink-soft)',
                    }}>
                      {(msg.user_name || 'A')[0].toUpperCase()}
                    </div>
                  ) : <div style={{ width: '28px', flexShrink: 0 }} />}
                  <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
                    {showAvatar && !isSelf && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', marginLeft: '0.25rem', marginBottom: '0.2rem' }}>
                        {msg.user_name || t('chat.anonymous')}
                      </span>
                    )}
                    <div style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: isSelf ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                      background: isSelf ? 'var(--terracotta)' : 'var(--cream-glow)',
                      color: isSelf ? 'var(--cream)' : msg.is_deleted ? 'var(--ink-mute)' : 'var(--ink)',
                      border: isSelf ? 'none' : '1.5px solid rgba(26,20,16,0.08)',
                      fontStyle: msg.is_deleted ? 'italic' : 'normal',
                      wordBreak: 'break-word',
                    }}>
                      {msg.is_deleted ? t('chat.deletedMessage') : msg.content}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', marginTop: '0.2rem', marginLeft: '0.25rem', marginRight: '0.25rem' }}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(194,73,22,0.08)', borderTop: '1.5px solid rgba(194,73,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--terracotta)' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--terracotta)', marginLeft: '0.5rem' }}>✕</button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '0.85rem 1rem', borderTop: '1.5px solid rgba(26,20,16,0.08)', background: 'var(--cream-glow)' }}>
        {!isAuthenticated ? (
          <div style={{ textAlign: 'center', padding: '0.65rem', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)', background: 'var(--cream-deep)', borderRadius: '10px', border: '1.5px solid rgba(26,20,16,0.08)' }}>
            {t('chat.loginToChat')}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              disabled={sending}
              maxLength={1000}
              style={{
                flex: 1, padding: '0.6rem 1rem',
                background: 'var(--cream-deep)',
                border: '1.5px solid rgba(26,20,16,0.12)',
                borderRadius: '999px',
                fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              style={{
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                background: !newMessage.trim() || sending ? 'var(--cream-deep)' : 'var(--terracotta)',
                color: !newMessage.trim() || sending ? 'var(--ink-mute)' : 'var(--cream)',
                border: 'none', cursor: !newMessage.trim() || sending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              {sending
                ? <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(26,20,16,0.2)', borderTopColor: 'var(--ink-mute)', animation: 'spin 0.8s linear infinite' }} />
                : <Send size={14} />
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMain;
