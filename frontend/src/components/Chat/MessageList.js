import React from 'react';
import { useTranslation } from 'react-i18next';

const MessageList = ({ messages, conversationId }) => {
  const { t, i18n } = useTranslation();
  const currentUserId = getUserIdFromToken();

  const formatTime = (date) => new Date(date).toLocaleTimeString(i18n.language || 'fr-FR', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return t('messages.today');
    if (d.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
    return d.toLocaleDateString(i18n.language || 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Object.entries(groupedMessages).map(([date, msgs]) => (
        <div key={date}>
          {/* Date separator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0.75rem 0' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', background: 'var(--cream-deep)', border: '1px solid rgba(26,20,16,0.08)', borderRadius: '999px', padding: '0.2rem 0.75rem' }}>
              {formatDate(msgs[0].created_at)}
            </span>
          </div>

          {msgs.map((message, index) => {
            const isOwn = message.user_id === currentUserId;
            const showAvatar = index === 0 || msgs[index - 1].user_id !== message.user_id;

            return (
              <div
                key={message.id}
                style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.25rem', flexDirection: isOwn ? 'row-reverse' : 'row' }}
              >
                {/* Avatar */}
                {showAvatar && !isOwn ? (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                    {message.author_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                ) : (
                  <div style={{ width: '32px', flexShrink: 0 }} />
                )}

                {/* Bubble */}
                <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                  {showAvatar && !isOwn && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', marginLeft: '0.25rem', marginBottom: '0.2rem' }}>
                      {message.author_name}
                    </span>
                  )}
                  <div style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isOwn ? 'var(--terracotta)' : 'var(--cream-glow)',
                    color: isOwn ? 'var(--cream)' : 'var(--ink)',
                    border: isOwn ? 'none' : '1.5px solid rgba(26,20,16,0.08)',
                    fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                    wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                  }}>
                    <p>{message.content}</p>
                    {message.is_edited === 1 && (
                      <span style={{ fontSize: '0.72rem', fontStyle: 'italic', opacity: 0.7 }}> ({t('chat.edited')})</span>
                    )}
                  </div>

                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', marginTop: '0.2rem', marginLeft: '0.25rem', marginRight: '0.25rem' }}>
                    {formatTime(message.created_at)}
                  </span>

                  {message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      {Object.entries(message.reactions).map(([emoji, count]) => (
                        <div key={emoji} style={{ background: 'var(--cream-glow)', border: '1px solid rgba(26,20,16,0.1)', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)' }}>
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

function getUserIdFromToken() {
  try {
    const token = localStorage.getItem('pendo_token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1])).userId;
  } catch (error) {
    return null;
  }
}

export default MessageList;
