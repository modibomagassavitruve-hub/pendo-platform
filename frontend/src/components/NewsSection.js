import { useTranslation } from 'react-i18next';
import { API_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import React, { useState, useEffect, memo } from 'react';
import { Newspaper, Clock, TrendingUp, Globe, RefreshCw, X, ExternalLink, Layers } from 'lucide-react';
import { SkeletonArticleGrid } from './ui/SkeletonLoader';
import logger from '../utils/logger';
import { translateMissingFields } from '../utils/gtxTranslate';

const decodeHtmlEntities = (str) => {
  if (!str) return '';
  let s = str.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
  s = s.replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&euro;/g, '€').replace(/&pound;/g, '£').replace(/&yen;/g, '¥').replace(/&copy;/g, '©').replace(/&reg;/g, '®').replace(/&trade;/g, '™').replace(/&bull;/g, '•').replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018').replace(/&rdquo;/g, '\u201D').replace(/&ldquo;/g, '\u201C').replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&agrave;/g, 'à').replace(/&ccedil;/g, 'ç');
  return s;
};

const applyNewsTranslations = (items, lang) => {
  if (!Array.isArray(items) || !lang || lang.length < 2) return items;
  const lc = lang.substring(0, 2).toLowerCase();
  return items.map(item => {
    const t = { ...item };
    // Try exact language column, fall back to French, then base
    t.title   = item[`title_${lc}`]   || item['title_fr']   || item.title;
    t.summary = item[`summary_${lc}`] || item['summary_fr'] || item.summary;
    if (item[`content_${lc}`] || item['content_fr'] || item.content) {
      t.content = item[`content_${lc}`] || item['content_fr'] || item.content;
    }
    return t;
  });
};

// Map category to a pastel pill color pair [bg, color, border]
const getCategoryStyle = (category) => {
  const map = {
    'IPO': ['rgba(139,92,246,0.1)', '#6D28D9', 'rgba(139,92,246,0.2)'],
    'M&A': ['rgba(59,130,246,0.1)', '#1D4ED8', 'rgba(59,130,246,0.2)'],
    'Earnings': ['rgba(30,77,58,0.1)', '#1E4D3A', 'rgba(30,77,58,0.2)'],
    'Monetary Policy': ['rgba(232,170,11,0.1)', '#8A6200', 'rgba(232,170,11,0.25)'],
    'Regulation': ['rgba(194,73,22,0.1)', '#C24916', 'rgba(194,73,22,0.2)'],
    'Commodities': ['rgba(194,73,22,0.08)', '#8F3211', 'rgba(194,73,22,0.15)'],
    'Technology': ['rgba(6,182,212,0.08)', '#0E7490', 'rgba(6,182,212,0.2)'],
    'Banking': ['rgba(99,102,241,0.08)', '#4338CA', 'rgba(99,102,241,0.2)'],
    'Market Update': ['rgba(30,77,58,0.08)', '#1E4D3A', 'rgba(30,77,58,0.15)'],
    'Investment': ['rgba(30,77,58,0.08)', '#2D7253', 'rgba(30,77,58,0.2)'],
  };
  return map[category] || ['rgba(26,20,16,0.06)', '#7A6A5C', 'rgba(26,20,16,0.1)'];
};

const NewsSection = () => {
  const { t, i18n } = useTranslation();

  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const getSourceUrl = (article) => article.source_url || article.url || null;

  const getSourceDomain = (article) => {
    const url = getSourceUrl(article);
    if (!url) return article.source || 'Source';
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return article.source || 'Source';
    }
  };

  const fetchNews = async (lang) => {
    try {
      let rawData = null;

      try {
        const lc = (lang || i18n.language || 'fr').substring(0, 2).toLowerCase();
        const langCols = lc === 'fr'
          ? `,title_fr,summary_fr,content_fr`
          : `,title_${lc},summary_${lc},content_${lc},title_fr,summary_fr,content_fr`;
        const newsCols = `id,title,summary,url,source_url,source,category,market_id,country,published_at,created_at${langCols}`;
        const supaResp = await fetch(
          `${SUPABASE_URL}/rest/v1/news?select=${newsCols}&order=published_at.desc&limit=50`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          }
        );
        if (supaResp.ok) {
          const supaData = await supaResp.json();
          if (supaData && supaData.length > 5) rawData = supaData;
        }
      } catch {
        // Supabase unavailable
      }

      if (!rawData) {
        const params = new URLSearchParams();
        params.append('limit', '100');
        params.append('lang', lang || i18n.language);
        const response = await fetch(`${API_URL}/news?${params}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) rawData = data.data;
      }

      if (rawData) {
        const lc = (lang || i18n.language || 'fr').substring(0, 2).toLowerCase();
        // Show immediately with whatever translations exist
        setNews(applyNewsTranslations(rawData, lang || i18n.language));
        // If not French, translate items that are missing the target-language column
        // Always translate missing columns — even for French:
        // scraped articles may have title/summary in English with no title_fr/summary_fr in DB.
        translateMissingFields(rawData, {
          to: lc,
          from: 'auto',
          fields: ['title', 'summary', 'content'],
        }).then(enriched => {
          if (enriched !== rawData) {
            setNews(applyNewsTranslations(enriched, lang || i18n.language));
          }
        }).catch(() => {}); // silent fail — already showing fallback
      }
    } catch (error) {
      logger.error('Erreur chargement actualités:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchNews(i18n.language);
    const interval = setInterval(() => fetchNews(i18n.language), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [i18n.language]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(`${API_URL}/news/refresh`, { method: 'POST' });
      await fetchNews(i18n.language);
    } catch (error) {
      logger.error('Erreur rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return t('time.minutesAgo', { minutes: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { hours: diffHours });
    if (diffDays < 7) return t('time.daysAgo', { days: diffDays });

    return date.toLocaleDateString(i18n.language || 'fr-FR');
  };

  const getCategoryLabel = (category) => {
    const categoryMap = {
      'IPO': t('categories.ipo'),
      'M&A': t('categories.ma'),
      'Earnings': t('categories.earnings'),
      'Monetary Policy': t('categories.monetaryPolicy'),
      'Regulation': t('categories.regulation'),
      'Commodities': t('categories.commodities'),
      'Technology': t('categories.technology'),
      'Banking': t('categories.banking'),
      'Market Update': t('categories.marketUpdate'),
      'Investment': t('categories.investment'),
      'Markets': t('categories.markets'),
      'Énergie': t('categories.energy'),
      'Économie': t('categories.economy'),
      'Entreprise': t('categories.business'),
      'Régulation': t('categories.regulation'),
      'Investissement': t('categories.investment'),
      'Politique Monétaire': t('categories.monetaryPolicy'),
      'Banque': t('categories.banking'),
      'Technologie': t('categories.technology'),
      'Matières Premières': t('categories.commodities'),
      'Mise à jour du marché': t('categories.marketUpdate'),
      'Introduction en bourse': t('categories.ipo'),
      'Résultats': t('categories.earnings'),
      'Marchés': t('categories.markets'),
      'Marché': t('categories.markets'),
      'Agriculture': t('categories.agriculture'),
      'Tech': t('categories.technology'),
      'Energy': t('categories.energy'),
      'Economy': t('categories.economy'),
    };
    return categoryMap[category] || category;
  };

  const filteredNews = filter === 'all' ? news : news.filter(n => n.category === filter);
  const categories = ['all', ...new Set(news.map(n => n.category).filter(Boolean))];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(194,73,22,0.1)', borderRadius: '8px' }}>
            <Newspaper style={{ width: '1.25rem', height: '1.25rem', color: 'var(--terracotta)' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.25rem', color: 'var(--ink)' }}>
            {t('news.financialNews')}
          </h2>
        </div>
        <SkeletonArticleGrid count={4} cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-4" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{
        background: 'var(--cream-glow)',
        border: '1.5px solid rgba(26,20,16,0.08)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(194,73,22,0.1)', borderRadius: '10px' }}>
              <Newspaper style={{ width: '1.25rem', height: '1.25rem', color: 'var(--terracotta)' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.25rem', color: 'var(--ink)' }}>
                {t('news.financialNews')}
              </h2>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', marginTop: '0.1rem' }}>
                {news.length} {t('market.articles')}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-glow)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-deep)'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'var(--cream-deep)',
              border: '1.5px solid rgba(26,20,16,0.08)',
              borderRadius: '99px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--ink-soft)',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw style={{ width: '0.875rem', height: '0.875rem', ...(refreshing ? { animation: 'spin 1s linear infinite' } : {}) }} />
            {t('buttons.refresh')}
          </button>
        </div>

        {/* Category filter pills */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }} className="scrollbar-hide">
          {categories.slice(0, 8).map(f => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  flexShrink: 0,
                  padding: '0.35rem 0.85rem',
                  borderRadius: '99px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  border: isActive ? '1.5px solid rgba(194,73,22,0.35)' : '1.5px solid rgba(26,20,16,0.08)',
                  background: isActive ? 'rgba(194,73,22,0.1)' : 'var(--cream-deep)',
                  color: isActive ? 'var(--terracotta)' : 'var(--ink-mute)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {f === 'all' ? t('common.all') : getCategoryLabel(f)}
              </button>
            );
          })}
        </div>
      </div>

      {/* News list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[800px] overflow-y-auto pr-1 scrollbar-hide">
        {filteredNews.length === 0 ? (
          <div style={{ gridColumn: '1/-1', background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-lg)', padding: '3rem 1.5rem', textAlign: 'center' }}>
            <Newspaper style={{ width: '3rem', height: '3rem', color: 'var(--ink-mute)', opacity: 0.3, display: 'block', margin: '0 auto 1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--ink-soft)', marginBottom: '0.4rem' }}>
              {t('news.noNewsAvailable')}
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {filter !== 'all'
                ? t('opportunities.tryModifyFilters')
                : t('messages.contentUnavailable')}
            </p>
            {filter !== 'all' ? (
              <button
                onClick={() => setFilter('all')}
                style={{ padding: '0.5rem 1.1rem', background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.1)', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-soft)', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-glow)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-deep)'; }}
              >
                {t('common.resetFilters')}
              </button>
            ) : (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.25rem', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', cursor: refreshing ? 'not-allowed' : 'pointer', transition: 'background 0.2s', opacity: refreshing ? 0.7 : 1 }}
                onMouseEnter={e => { if (!refreshing) e.currentTarget.style.background = 'var(--terracotta)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
              >
                <RefreshCw style={{ width: '0.9rem', height: '0.9rem', ...(refreshing ? { animation: 'spin 1s linear infinite' } : {}) }} />
                {t('buttons.refresh')}
              </button>
            )}
          </div>
        ) : (
          filteredNews.map((article, index) => {
            const sourceUrl = getSourceUrl(article);
            const sourceDomain = getSourceDomain(article);
            const [catBg, catColor, catBorder] = getCategoryStyle(article.category);

            return (
              <ArticleCard
                key={index}
                article={article}
                index={index}
                sourceUrl={sourceUrl}
                sourceDomain={sourceDomain}
                catBg={catBg}
                catColor={catColor}
                catBorder={catBorder}
                getCategoryLabel={getCategoryLabel}
                formatDate={formatDate}
                onSelect={setSelectedArticle}
                t={t}
              />
            );
          })
        )}
      </div>

      {/* Article detail modal */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          getCategoryLabel={getCategoryLabel}
          getCategoryStyle={getCategoryStyle}
          getSourceUrl={getSourceUrl}
          getSourceDomain={getSourceDomain}
          formatDate={formatDate}
          t={t}
        />
      )}
    </div>
  );
};

const ArticleCard = ({ article, index, sourceUrl, sourceDomain, catBg, catColor, catBorder, getCategoryLabel, formatDate, onSelect, t }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      style={{
        background: 'var(--cream-glow)',
        border: hovered ? '1.5px solid rgba(194,73,22,0.3)' : '1.5px solid rgba(26,20,16,0.08)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        transition: 'all 0.25s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-warm)' : 'none',
        animationDelay: `${index * 30}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {article.category && (
          <span style={{
            background: catBg, color: catColor, border: `1px solid ${catBorder}`,
            padding: '0.2rem 0.6rem', borderRadius: '99px',
            fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600,
          }}>
            {getCategoryLabel(article.category)}
          </span>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Clock style={{ width: '0.65rem', height: '0.65rem' }} />
          {formatDate(article.published_at)}
        </span>
        {article.market_id && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <TrendingUp style={{ width: '0.65rem', height: '0.65rem' }} />
            {article.market_id.toUpperCase()}
          </span>
        )}
        {article.related_count > 1 && (
          <span
            title={(article.related_sources || []).map(s => s.source).join(', ')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.15rem 0.5rem', borderRadius: '99px',
              background: 'rgba(26,20,16,0.06)', color: 'var(--ink-soft)',
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600,
            }}
          >
            <Layers style={{ width: '0.65rem', height: '0.65rem' }} />
            {t('news.multipleSources', { count: article.related_count })}
          </span>
        )}
      </div>

      {/* Title */}
      <button onClick={() => onSelect(article)} style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <h3 style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: '0.9375rem',
          lineHeight: 1.4,
          color: hovered ? 'var(--terracotta)' : 'var(--ink)',
          transition: 'color 0.2s',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {decodeHtmlEntities(article.title)}
        </h3>
      </button>

      {/* Summary */}
      {article.summary && (
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.825rem',
          color: 'var(--ink-mute)',
          lineHeight: 1.6,
          marginBottom: '1rem',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {decodeHtmlEntities(article.summary)}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(26,20,16,0.06)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {article.source || sourceDomain}
        </span>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              background: 'rgba(194,73,22,0.08)',
              color: 'var(--terracotta)',
              border: '1px solid rgba(194,73,22,0.2)',
              borderRadius: '99px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            <Globe style={{ width: '0.75rem', height: '0.75rem' }} />
            {t('news.source')}
            <ExternalLink style={{ width: '0.65rem', height: '0.65rem' }} />
          </a>
        )}
      </div>
    </div>
  );
};

const ArticleModal = ({ article, onClose, getCategoryLabel, getCategoryStyle, getSourceUrl, getSourceDomain, formatDate, t }) => {
  React.useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const sourceUrl = getSourceUrl(article);
  const sourceDomain = getSourceDomain(article);
  const [catBg, catColor, catBorder] = getCategoryStyle(article.category);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26,20,16,0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--cream-glow)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: '768px', width: '100%',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          border: '1.5px solid rgba(26,20,16,0.08)',
          boxShadow: 'var(--shadow-deep)',
          animation: 'scale-in 0.2s ease-out',
        }}
      >
        {/* Modal header */}
        <div style={{
          flexShrink: 0,
          background: 'var(--cream-glow)',
          borderBottom: '1px solid rgba(26,20,16,0.08)',
          padding: '1.25rem 1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}>
          <div style={{ flex: 1, paddingRight: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
              {article.category && (
                <span style={{
                  background: catBg, color: catColor, border: `1px solid ${catBorder}`,
                  padding: '0.2rem 0.6rem', borderRadius: '99px',
                  fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600,
                }}>
                  {getCategoryLabel(article.category)}
                </span>
              )}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock style={{ width: '0.65rem', height: '0.65rem' }} />
                {formatDate(article.published_at)}
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.2rem', color: 'var(--ink)', lineHeight: 1.3 }}>
              {decodeHtmlEntities(article.title)}
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', marginTop: '0.35rem' }}>
              {article.source || sourceDomain}
            </p>
          </div>
          <button
            onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--cream)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-deep)'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px',
              borderRadius: '8px',
              background: 'var(--cream-deep)',
              border: '1.5px solid rgba(26,20,16,0.1)',
              color: 'var(--ink-soft)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
            aria-label="Fermer"
          >
            <X style={{ width: '1rem', height: '1rem' }} />
          </button>
        </div>

        {/* Modal content - scrollable */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.5rem' }}>
          {article.summary && (
            <div style={{
              background: 'rgba(194,73,22,0.05)',
              border: '1px solid rgba(194,73,22,0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}>
              <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--terracotta)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.65rem' }}>
                {t('news.description')}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--ink-soft)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {decodeHtmlEntities(article.summary)}
              </p>
            </div>
          )}

          {!article.summary && (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <Newspaper style={{ width: '3rem', height: '3rem', color: 'var(--ink-mute)', opacity: 0.3, display: 'block', margin: '0 auto 0.75rem' }} />
              <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', fontSize: '0.875rem' }}>
                {t('messages.contentNotAvailable')}
              </p>
            </div>
          )}
        </div>

        {/* Modal footer - always visible */}
        {sourceUrl && (
          <div style={{
            flexShrink: 0,
            borderTop: '1px solid rgba(26,20,16,0.08)',
            background: 'var(--cream-glow)',
            padding: '1rem 1.5rem',
            borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
          }}>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.transform = 'none'; }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.85rem 1.5rem',
                background: 'var(--ink)',
                color: 'var(--cream)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '0.9rem',
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: 'var(--shadow-warm)',
              }}
            >
              <Globe style={{ width: '1.125rem', height: '1.125rem' }} />
              {t('buttons.readFullArticle')}
              <ExternalLink style={{ width: '0.875rem', height: '0.875rem' }} />
            </a>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ExternalLink style={{ width: '0.6rem', height: '0.6rem' }} />
              {sourceDomain}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(NewsSection);
