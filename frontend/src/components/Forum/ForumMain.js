import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { MessageSquare, TrendingUp, Users, Clock } from 'lucide-react';
import ForumCategories from './ForumCategories';
import ThreadList from './ThreadList';
import ThreadDetail from './ThreadDetail';
import { API_URL } from '../../config';
import logger from '../../utils/logger';

const ForumMain = () => {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('pendo_token');
      const response = await axios.get(`${API_URL}/forum/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.data.success) setStats(response.data.data);
    } catch (error) {
      logger.error('Erreur chargement stats:', error);
    }
  };

  const handleCategorySelect = (category) => { setSelectedCategory(category); setActiveView('threads'); };
  const handleThreadSelect = (thread) => { setSelectedThread(thread); setActiveView('thread'); };
  const handleBack = () => {
    if (activeView === 'thread') { setActiveView('threads'); setSelectedThread(null); }
    else if (activeView === 'threads') { setActiveView('categories'); setSelectedCategory(null); }
  };

  const statCards = stats ? [
    { Icon: MessageSquare, label: t('forum.discussions'), value: stats.total_threads, color: 'var(--terracotta)', bg: 'rgba(194,73,22,0.08)' },
    { Icon: TrendingUp, label: t('forum.replies'), value: stats.total_posts, color: 'var(--forest)', bg: 'rgba(30,77,58,0.08)' },
    { Icon: Users, label: t('forum.contributors'), value: stats.total_authors, color: 'var(--terracotta)', bg: 'rgba(194,73,22,0.08)' },
    { Icon: Clock, label: t('forum.totalViews'), value: stats.total_views || 0, color: 'var(--forest)', bg: 'rgba(30,77,58,0.08)' },
  ] : [];

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'var(--cream-glow)',
        borderBottom: '1.5px solid rgba(26,20,16,0.08)',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.75rem',
            color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.6rem',
            marginBottom: '0.35rem',
          }}>
            <MessageSquare style={{ width: '28px', height: '28px', color: 'var(--terracotta)' }} />
            {t('forum.title')}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', fontSize: '0.9rem' }}>
            {t('forum.subtitle')}
          </p>

          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginTop: '1.5rem' }}>
              {statCards.map(({ Icon, label, value, color, bg }) => (
                <div key={label} style={{
                  background: bg, border: `1.5px solid ${color}25`,
                  borderRadius: '12px', padding: '1rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <Icon style={{ width: '28px', height: '28px', color, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink-mute)', marginBottom: '0.15rem' }}>{label}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.35rem', color: 'var(--ink)' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem' }}>
        {activeView === 'categories' && <ForumCategories onCategorySelect={handleCategorySelect} />}
        {activeView === 'threads' && <ThreadList category={selectedCategory} onThreadSelect={handleThreadSelect} onBack={handleBack} />}
        {activeView === 'thread' && <ThreadDetail thread={selectedThread} onBack={handleBack} />}
      </div>
    </div>
  );
};

export default ForumMain;
