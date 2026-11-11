import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import logger from '../utils/logger';

const CATEGORY_COLORS = {
  'IPO': 'rgba(194,73,22,0.12)',
  'M&A': 'rgba(30,77,58,0.12)',
  'Earnings': 'rgba(30,77,58,0.12)',
  'Banking': 'rgba(194,73,22,0.12)',
  'Technology': 'rgba(30,77,58,0.12)',
  'Commodities': 'rgba(232,170,11,0.15)',
  'Market Update': 'rgba(30,77,58,0.12)',
  'Investment': 'rgba(194,73,22,0.12)',
  'Regulation': 'rgba(194,73,22,0.12)',
};
const CATEGORY_TEXT = {
  'IPO': 'var(--terracotta)',
  'M&A': 'var(--forest)',
  'Earnings': 'var(--forest)',
  'Banking': 'var(--terracotta)',
  'Technology': 'var(--forest)',
  'Commodities': '#9A6E00',
  'Market Update': 'var(--forest)',
  'Investment': 'var(--terracotta)',
  'Regulation': 'var(--terracotta)',
};

const flags = { ZA: '🇿🇦', NG: '🇳🇬', EG: '🇪🇬', KE: '🇰🇪', MA: '🇲🇦', GH: '🇬🇭', CI: '🇨🇮', TN: '🇹🇳' };
const marketNames = {
  jse: 'Johannesburg Stock Exchange',
  nse_ng: 'Nigerian Exchange',
  egx: 'Egyptian Exchange',
  masi: 'Bourse de Casablanca',
  brvm: 'BRVM (Bourse Régionale)',
  gse: 'Ghana Stock Exchange',
  nse_ke: 'Nairobi Securities Exchange'
};

const ArticleDetail = ({ article, onClose }) => {
  const { t, i18n } = useTranslation();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const params = new URLSearchParams();
        params.append('lang', i18n.language);
        const response = await fetch(`${API_URL}/news/article/${article.id}?${params}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setContent(data.success && data.data ? data.data : article);
      } catch (error) {
        logger.error('Erreur:', error);
        setContent(article);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [article, i18n.language]);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString(i18n.language || 'fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const displayContent = content || article;
  const catBg = CATEGORY_COLORS[displayContent.category] || 'rgba(194,73,22,0.1)';
  const catColor = CATEGORY_TEXT[displayContent.category] || 'var(--terracotta)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '1rem', overflowY: 'auto',
      background: 'rgba(26,20,16,0.7)',
    }}>
      <div style={{
        background: 'var(--cream-glow)',
        borderRadius: '18px',
        border: '1.5px solid rgba(26,20,16,0.08)',
        boxShadow: 'var(--shadow-warm)',
        maxWidth: '860px', width: '100%',
        margin: '2rem 0',
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0,
          background: 'var(--cream-glow)',
          borderBottom: '1.5px solid rgba(26,20,16,0.08)',
          borderRadius: '18px 18px 0 0',
          padding: '1.25rem 1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.75rem' }}>{flags[displayContent.country] || '🌍'}</span>
              <span style={{
                background: catBg, color: catColor,
                border: `1px solid ${catColor}30`,
                fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
                padding: '0.25rem 0.75rem', borderRadius: '999px',
              }}>
                {displayContent.category || 'General'}
              </span>
              {displayContent.market_id && (
                <span style={{
                  background: 'rgba(194,73,22,0.08)', color: 'var(--terracotta)',
                  border: '1px solid rgba(194,73,22,0.2)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
                  padding: '0.25rem 0.75rem', borderRadius: '999px',
                }}>
                  {displayContent.market_id.toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', fontSize: '1.5rem', lineHeight: 1, padding: '0.25rem 0.5rem', borderRadius: '8px', transition: 'color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem 2rem 2rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--cream-deep)', borderTopColor: 'var(--terracotta)', animation: 'spin 0.8s linear infinite', marginBottom: '1rem' }} />
              <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)' }}>{t('article.loading')}</p>
            </div>
          ) : (
            <>
              {/* Title */}
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.75rem', color: 'var(--ink)', lineHeight: 1.35, marginBottom: '1.25rem' }}>
                {displayContent.title}
              </h1>

              {/* Meta */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1.5px solid rgba(26,20,16,0.08)' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📰</span> {displayContent.source}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🕐</span> {formatDate(displayContent.published_at)}
                </span>
                {displayContent.market_id && (
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>📈</span> {marketNames[displayContent.market_id] || displayContent.market_id.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Summary */}
              {displayContent.summary && (
                <div style={{ borderLeft: '3px solid var(--terracotta)', paddingLeft: '1.25rem', marginBottom: '1.5rem', background: 'rgba(194,73,22,0.04)', borderRadius: '0 10px 10px 0', padding: '1rem 1.25rem' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--ink-soft)', lineHeight: 1.7, fontStyle: 'italic' }}>
                    {displayContent.summary}
                  </p>
                </div>
              )}

              {/* Full content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {displayContent.content ? (
                  displayContent.content.split('\n\n').map((paragraph, i) => {
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      return (
                        <h3 key={i} style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.15rem', color: 'var(--terracotta)', marginTop: '0.5rem' }}>
                          {paragraph.replace(/\*\*/g, '')}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith('- ')) {
                      const items = paragraph.split('\n').filter(line => line.startsWith('- '));
                      return (
                        <ul key={i} style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {items.map((item, j) => (
                            <li key={j} style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--ink-soft)', lineHeight: 1.65 }}>{item.replace('- ', '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--ink-soft)', lineHeight: 1.75 }}>
                        {paragraph}
                      </p>
                    );
                  })
                ) : (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--ink-mute)' }}>
                    {displayContent.summary || t('messages.contentUnavailable')}
                  </p>
                )}
              </div>

              {/* Market info card */}
              {displayContent.market_id && (
                <div style={{ marginTop: '2rem', background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', padding: '1.25rem 1.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📊</span> {t('article.associatedMarket')}
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ink-soft)', marginBottom: '1rem' }}>
                    {marketNames[displayContent.market_id] || displayContent.market_id.toUpperCase()}
                  </p>
                  <button
                    onClick={onClose}
                    style={{
                      padding: '0.55rem 1.25rem',
                      background: 'var(--terracotta)', color: 'var(--cream)',
                      border: 'none', borderRadius: '10px',
                      fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#A03B12'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
                  >
                    {t('article.viewMarketData')}
                  </button>
                </div>
              )}

              {/* Source link */}
              {displayContent.url && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1.5px solid rgba(26,20,16,0.08)' }}>
                  <a
                    href={displayContent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.65rem 1.5rem',
                      background: 'var(--ink)', color: 'var(--cream)',
                      fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem',
                      borderRadius: '10px', textDecoration: 'none',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
                  >
                    🔗 {t('news.readFullArticle')} {displayContent.source}
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
