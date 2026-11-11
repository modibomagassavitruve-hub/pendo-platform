import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { API_URL } from '../../config';
import logger from '../../utils/logger';

const ForumCategories = ({ onCategorySelect }) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('pendo_token');
      const response = await axios.get(`${API_URL}/forum/categories`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.data.success) setCategories(response.data.data);
    } catch (error) {
      logger.error('Erreur chargement catégories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--cream-deep)', borderTopColor: 'var(--terracotta)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.35rem', color: 'var(--ink)' }}>
        {t('forum.categories')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {categories.map(category => (
          <CategoryCard key={category.id} category={category} onSelect={onCategorySelect} t={t} />
        ))}
      </div>
    </div>
  );
};

const CategoryCard = ({ category, onSelect, t }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onClick={() => onSelect(category)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--cream-glow)',
        border: hovered ? '1.5px solid rgba(194,73,22,0.25)' : '1.5px solid rgba(26,20,16,0.08)',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-warm)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
          <div style={{ fontSize: '2.25rem', flexShrink: 0, lineHeight: 1 }}>{category.icon}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '0.35rem' }}>
              {category.name}
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              {category.description}
            </p>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MessageSquare style={{ width: '14px', height: '14px' }} />
                {category.threads_count || 0} {t('forum.threadCount')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink-mute)' }}>
                {category.posts_count || 0} {t('forum.messageCount')}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight style={{ width: '20px', height: '20px', color: 'var(--ink-mute)', flexShrink: 0, transform: hovered ? 'translateX(3px)' : 'none', transition: 'transform 0.2s' }} />
      </div>
    </div>
  );
};

export default ForumCategories;
