import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Users } from 'lucide-react';

const ConversationList = ({ conversations, selectedConversation, onSelectConversation, loading }) => {
  const { t, i18n } = useTranslation();
  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const locale = i18n.language || 'fr-FR';
    if (diff < 86400000) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString(locale, { weekday: 'short' });
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', padding: '3rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--cream-deep)', borderTopColor: 'var(--terracotta)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', padding: '3rem', textAlign: 'center' }}>
        <MessageCircle style={{ width: '44px', height: '44px', color: 'var(--ink-mute)', opacity: 0.3, margin: '0 auto 0.75rem', display: 'block' }} />
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', marginBottom: '0.2rem' }}>{t('chat.noConversation')}</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-mute)', opacity: 0.7 }}>{t('chat.startNewDiscussion')}</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1.5px solid rgba(26,20,16,0.08)' }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>{t('chat.messages')}</h2>
      </div>

      <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
        {conversations.map((conv) => (
          <ConvRow
            key={conv.id}
            conv={conv}
            isSelected={selectedConversation?.id === conv.id}
            onSelect={() => onSelectConversation(conv)}
            formatDate={formatDate}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};

const ConvRow = ({ conv, isSelected, onSelect, formatDate, t }) => {
  const [hovered, setHovered] = React.useState(false);
  const unread = conv.unread_count > 0;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '0.85rem 1.25rem',
        borderBottom: '1px solid rgba(26,20,16,0.06)',
        cursor: 'pointer',
        background: isSelected ? 'rgba(194,73,22,0.05)' : hovered ? 'rgba(26,20,16,0.03)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--terracotta)' : '3px solid transparent',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      }}
    >
      {/* Avatar */}
      <div style={{ flexShrink: 0 }}>
        {conv.type === 'group' ? (
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(194,73,22,0.08)', border: '1.5px solid rgba(194,73,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users style={{ width: '20px', height: '20px', color: 'var(--terracotta)' }} />
          </div>
        ) : (
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--cream)' }}>
            {conv.participants_names?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: unread ? 700 : 600, fontSize: '0.875rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {conv.name || conv.participants_names || 'Conversation'}
          </h3>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', flexShrink: 0, marginLeft: '0.5rem' }}>
            {formatDate(conv.last_message_at)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: unread ? 'var(--ink)' : 'var(--ink-mute)', fontWeight: unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {conv.last_message || t('chat.noMessage')}
          </p>
          {unread && (
            <span style={{ background: 'var(--terracotta)', color: 'var(--cream)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '999px', flexShrink: 0, marginLeft: '0.5rem' }}>
              {conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationList;
