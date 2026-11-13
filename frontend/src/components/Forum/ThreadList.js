import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Plus, Eye, MessageSquare } from 'lucide-react';
import { API_URL } from '../../config';
import { getLocale } from '../../utils/locale';
import logger from '../../utils/logger';

const fieldStyle = {
  width: '100%',
  background: 'var(--cream-deep)',
  border: '1.5px solid rgba(26,20,16,0.12)',
  borderRadius: '10px',
  padding: '0.65rem 0.9rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  color: 'var(--ink)',
  outline: 'none',
  boxSizing: 'border-box',
};

const ThreadList = ({ category, onThreadSelect, onBack, onOpenLogin }) => {
  const { t } = useTranslation();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', content: '' });

  useEffect(() => { if (category) loadThreads(); }, [category]);

  const loadThreads = async () => {
    try {
      const token = localStorage.getItem('pendo_token');
      const response = await axios.get(`${API_URL}/forum/categories/${category.id}/threads`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.data.success) setThreads(response.data.threads || []);
    } catch (error) {
      logger.error('Erreur chargement threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('pendo_token');
      if (!token) { if (onOpenLogin) onOpenLogin(); else alert(t('forum.loginRequired')); return; }
      const response = await axios.post(
        `${API_URL}/forum/threads`,
        { category_id: category.id, title: newThread.title, content: newThread.content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setShowNewThread(false);
        setNewThread({ title: '', content: '' });
        loadThreads();
      }
    } catch (error) {
      logger.error('Erreur création thread:', error);
      alert(error.response?.data?.error || t('forum.createError'));
    }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString(getLocale(), {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)',
            padding: 0, transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; }}
        >
          <ArrowLeft style={{ width: '18px', height: '18px' }} />
          {t('forum.backToCategories')}
        </button>

        <button
          onClick={() => { if (!localStorage.getItem('pendo_token') && onOpenLogin) { onOpenLogin(); return; } setShowNewThread(!showNewThread); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            background: 'var(--terracotta)', color: 'var(--cream)',
            border: 'none', borderRadius: '10px',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#8F3211'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          {t('forum.newDiscussion')}
        </button>
      </div>

      {/* Category info */}
      <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
          {category.name}
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--ink-mute)' }}>{category.description}</p>
      </div>

      {/* New thread form */}
      {showNewThread && (
        <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1rem', color: 'var(--ink)', marginBottom: '1rem' }}>
            {t('forum.newDiscussion')}
          </h3>
          <form onSubmit={handleCreateThread} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder={t('forum.threadTitle')}
              value={newThread.title}
              onChange={e => setNewThread({ ...newThread, title: e.target.value })}
              style={fieldStyle}
              required minLength="5" maxLength="200"
            />
            <textarea
              placeholder={t('forum.threadContent')}
              value={newThread.content}
              onChange={e => setNewThread({ ...newThread, content: e.target.value })}
              style={{ ...fieldStyle, height: '120px', resize: 'vertical' }}
              required minLength="10" maxLength="10000"
            />
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="submit" style={{ padding: '0.6rem 1.5rem', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>
                {t('forum.publish')}
              </button>
              <button type="button" onClick={() => setShowNewThread(false)} style={{ padding: '0.6rem 1.5rem', background: 'var(--cream-deep)', color: 'var(--ink)', border: '1.5px solid rgba(26,20,16,0.12)', borderRadius: '10px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Thread list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--cream-deep)', borderTopColor: 'var(--terracotta)', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : threads.length === 0 ? (
        <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', padding: '3rem', textAlign: 'center' }}>
          <MessageSquare style={{ width: '48px', height: '48px', color: 'var(--ink-mute)', opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', marginBottom: '0.25rem' }}>{t('forum.noThreads')}</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--ink-mute)', opacity: 0.7 }}>{t('forum.beFirstToDiscuss')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {threads.map(thread => <ThreadRow key={thread.id} thread={thread} onSelect={onThreadSelect} formatDate={formatDate} t={t} />)}
        </div>
      )}
    </div>
  );
};

const ThreadRow = ({ thread, onSelect, formatDate, t }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onClick={() => onSelect(thread)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--cream-glow)',
        border: hovered ? '1.5px solid rgba(194,73,22,0.2)' : '1.5px solid rgba(26,20,16,0.08)',
        borderRadius: '12px', padding: '1rem 1.25rem',
        cursor: 'pointer', transition: 'all 0.2s',
        transform: hovered ? 'translateX(3px)' : 'none',
      }}
    >
      {thread.is_pinned === 1 && (
        <span style={{
          display: 'inline-block',
          padding: '0.15rem 0.55rem', marginBottom: '0.5rem',
          background: 'rgba(30,77,58,0.1)', color: 'var(--forest)',
          border: '1px solid rgba(30,77,58,0.2)',
          borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700,
        }}>
          {t('forum.pinned')}
        </span>
      )}
      <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.35rem' }}>
        {thread.title}
      </h3>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--ink-mute)', marginBottom: '0.75rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {thread.content}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink-mute)' }}>{t('forum.by')} {thread.author_name}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>{formatDate(thread.created_at)}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Eye style={{ width: '13px', height: '13px' }} />{thread.views_count || 0}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <MessageSquare style={{ width: '13px', height: '13px' }} />{thread.posts_count || 0}
        </span>
      </div>
    </div>
  );
};

export default React.memo(ThreadList);
