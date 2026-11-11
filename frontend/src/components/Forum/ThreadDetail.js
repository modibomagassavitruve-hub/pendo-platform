import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, MessageSquare, Eye, ThumbsUp } from 'lucide-react';
import { API_URL } from '../../config';
import { getLocale } from '../../utils/locale';
import logger from '../../utils/logger';

const ThreadDetail = ({ thread, onBack }) => {
  const { t } = useTranslation();
  const [threadData, setThreadData] = useState(thread);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [userLikes, setUserLikes] = useState([]);

  useEffect(() => {
    if (thread) { loadThreadDetails(); loadPosts(); }
  }, [thread]);

  const loadThreadDetails = async () => {
    try {
      const token = localStorage.getItem('pendo_token');
      const response = await axios.get(`${API_URL}/forum/threads/${thread.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.data.success) setThreadData(response.data.data);
    } catch (error) { logger.error('Erreur chargement thread:', error); }
  };

  const loadPosts = async () => {
    try {
      const token = localStorage.getItem('pendo_token');
      const response = await axios.get(`${API_URL}/forum/threads/${thread.id}/posts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.data.success) {
        const postsData = response.data.posts || [];
        setPosts(postsData);
        setUserLikes(postsData.filter(p => p.liked_by_user).map(p => p.id));
      }
    } catch (error) { logger.error('Erreur chargement posts:', error); }
    finally { setLoading(false); }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('pendo_token');
      if (!token) { alert(t('forum.loginToReply')); return; }
      const response = await axios.post(`${API_URL}/forum/threads/${thread.id}/posts`, { content: newPost }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) { setNewPost(''); loadPosts(); loadThreadDetails(); }
    } catch (error) {
      logger.error('Erreur création post:', error);
      alert(error.response?.data?.error || t('forum.replyError'));
    }
  };

  const handleLike = async (postId) => {
    try {
      const token = localStorage.getItem('pendo_token');
      if (!token) { alert(t('forum.loginToLike')); return; }
      const response = await axios.post(`${API_URL}/forum/posts/${postId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        setUserLikes(prev => response.data.liked ? [...prev, postId] : prev.filter(id => id !== postId));
        loadPosts();
      }
    } catch (error) { logger.error('Erreur like:', error); }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString(getLocale(), {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)', padding: 0, width: 'fit-content', transition: 'color 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; }}
      >
        <ArrowLeft style={{ width: '18px', height: '18px' }} />
        {t('forum.backToList')}
      </button>

      {/* Thread body */}
      <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', padding: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.35rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>
          {threadData.title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{t('forum.by')} {threadData.author_name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-mute)' }}>{formatDate(threadData.created_at)}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Eye style={{ width: '13px', height: '13px' }} />{threadData.views_count || 0} {t('forum.views')}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <MessageSquare style={{ width: '13px', height: '13px' }} />{threadData.replies_count || 0} {t('forum.repliesCount')}
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-soft)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
          {threadData.content}
        </p>
        {threadData.is_locked === 1 && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(30,77,58,0.08)', border: '1.5px solid rgba(30,77,58,0.2)', borderRadius: '10px', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--forest)' }}>
            {t('forum.threadLocked')}
          </div>
        )}
      </div>

      {/* Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--ink)' }}>
          {t('forum.replies')} ({posts.length})
        </h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--cream-deep)', borderTopColor: 'var(--terracotta)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : posts.length === 0 ? (
          <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', padding: '2.5rem', textAlign: 'center' }}>
            <MessageSquare style={{ width: '40px', height: '40px', color: 'var(--ink-mute)', opacity: 0.3, margin: '0 auto 0.75rem', display: 'block' }} />
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)' }}>{t('forum.noReplies')}</p>
          </div>
        ) : posts.map(post => (
          <div key={post.id} style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.07)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(194,73,22,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--terracotta)', fontSize: '0.9rem',
              }}>
                {post.author_name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>{post.author_name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>{formatDate(post.created_at)}</span>
                  {post.is_edited === 1 && (
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--ink-mute)', fontStyle: 'italic' }}>{t('forum.edited')}</span>
                  )}
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ink-soft)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: '0.75rem' }}>
                  {post.content}
                </p>
                <button
                  onClick={() => handleLike(post.id)}
                  aria-label="Like this reply"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                    color: userLikes.includes(post.id) ? 'var(--terracotta)' : 'var(--ink-mute)',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { if (!userLikes.includes(post.id)) e.currentTarget.style.color = 'var(--terracotta)'; }}
                  onMouseLeave={e => { if (!userLikes.includes(post.id)) e.currentTarget.style.color = 'var(--ink-mute)'; }}
                >
                  <ThumbsUp style={{ width: '14px', height: '14px' }} />
                  <span>{post.likes_count || 0}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply form */}
      {threadData.is_locked !== 1 && (
        <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.85rem' }}>
            {t('forum.replyToThread')}
          </h3>
          <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <textarea
              placeholder={t('forum.yourReply')}
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              style={{ width: '100%', background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.12)', borderRadius: '10px', padding: '0.65rem 0.9rem', fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ink)', outline: 'none', height: '120px', resize: 'vertical', boxSizing: 'border-box' }}
              required minLength="10" maxLength="10000"
            />
            <button
              type="submit"
              style={{ padding: '0.65rem 1.5rem', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', width: 'fit-content', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
            >
              {t('forum.publishReply')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ThreadDetail;
