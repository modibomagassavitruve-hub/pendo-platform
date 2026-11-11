import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Filter, TrendingUp, TrendingDown, Building2, Heart,
  Cpu, Zap, Mountain, ShoppingBag, DollarSign, Globe, AlertCircle,
  Star, Eye, ArrowRight, ChevronDown, ExternalLink, Clock
} from 'lucide-react';
import {
  companySizeMap,
  stageMap,
  horizonMap,
  riskLevelMap,
  regionMap,
  sectorMap,
  mapValue
} from '../utils/opportunityMappings';
import { API_URL } from '../config';
import { useOpportunities } from '../hooks/useOpportunities';
import { SkeletonStatGrid, SkeletonCardGrid } from './ui/SkeletonLoader';

const decodeHtmlEntities = (str) => {
  if (!str) return '';
  let s = str.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  s = s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
  s = s.replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&euro;/g, '€').replace(/&pound;/g, '£').replace(/&yen;/g, '¥').replace(/&copy;/g, '©').replace(/&reg;/g, '®').replace(/&trade;/g, '™').replace(/&bull;/g, '•').replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&rdquo;/g, '”').replace(/&ldquo;/g, '“').replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&agrave;/g, 'à').replace(/&ccedil;/g, 'ç');
  return s;
};

const timeAgo = (dateString, t) => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  const diffW = Math.floor(diffD / 7);
  const diffM = Math.floor(diffD / 30);

  if (diffMin < 1) return t('time.justNow');
  if (diffMin < 60) return t('time.minutesAgo', { minutes: diffMin });
  if (diffH < 24) return t('time.hoursAgo', { hours: diffH });
  if (diffD === 1) return t('time.yesterday');
  if (diffD < 7) return t('time.daysAgo', { days: diffD });
  if (diffW < 5) return t('time.weeksAgo', { weeks: diffW });
  if (diffM < 12) return t('time.monthsAgo', { months: diffM });
  return t('time.overAYear');
};

const getRiskStyle = (risk) => {
  const styles = {
    low: { bg: 'rgba(30,77,58,0.1)', color: '#1E4D3A', border: 'rgba(30,77,58,0.2)' },
    medium: { bg: 'rgba(232,170,11,0.1)', color: '#8A6200', border: 'rgba(232,170,11,0.25)' },
    high: { bg: 'rgba(194,73,22,0.1)', color: '#C24916', border: 'rgba(194,73,22,0.2)' },
    very_high: { bg: 'rgba(139,0,0,0.08)', color: '#7F1D1D', border: 'rgba(139,0,0,0.2)' },
  };
  return styles[risk] || { bg: 'rgba(26,20,16,0.06)', color: '#7A6A5C', border: 'rgba(26,20,16,0.1)' };
};

const OpportunitiesTab = () => {
  const { t, i18n } = useTranslation();
  const { opportunities: allOpportunities, loading: hookLoading, error: hookError } = useOpportunities();
  const [opportunities, setOpportunities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const intervalRef = useRef(null);

  const [filters, setFilters] = useState({
    sector: '',
    country: '',
    risk_level: '',
    search: '',
    sort: 'newest'
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!hookLoading) {
      setLoading(false);
      applyFilters(allOpportunities);
      calculateStats(allOpportunities);
    }
  }, [allOpportunities, hookLoading]);

  useEffect(() => {
    if (!hookLoading) {
      applyFilters(allOpportunities);
    }
  }, [filters, allOpportunities]);

  const applyFilters = (data) => {
    let filtered = [...data];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(opp =>
        opp.title?.toLowerCase().includes(searchLower) ||
        opp.description?.toLowerCase().includes(searchLower) ||
        opp.company?.toLowerCase().includes(searchLower) ||
        opp.sector?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.sector) {
      filtered = filtered.filter(opp => opp.sector === filters.sector);
    }

    if (filters.country) {
      filtered = filtered.filter(opp => opp.country === filters.country);
    }

    if (filters.risk_level) {
      filtered = filtered.filter(opp => opp.riskLevel === filters.risk_level);
    }

    filtered.sort((a, b) => {
      const dateA = a.published_at || a.publishedAt || a.created_at || a.createdAt || '';
      const dateB = b.published_at || b.publishedAt || b.created_at || b.createdAt || '';
      switch (filters.sort) {
        case 'newest': return new Date(dateB) - new Date(dateA);
        case 'oldest': return new Date(dateA) - new Date(dateB);
        case 'return_high': return (b.expectedReturn || b.expected_return_max || 0) - (a.expectedReturn || a.expected_return_max || 0);
        case 'return_low': return (a.expectedReturn || a.expected_return_min || 0) - (b.expectedReturn || b.expected_return_min || 0);
        case 'investment_low': return (a.minInvestment || a.min_investment || 0) - (b.minInvestment || b.min_investment || 0);
        case 'investment_high': return (b.minInvestment || b.min_investment || 0) - (a.minInvestment || a.min_investment || 0);
        case 'relevance': return (b.relevance_score || 0) - (a.relevance_score || 0);
        default: return new Date(dateB) - new Date(dateA);
      }
    });

    setOpportunities(filtered);
  };

  const calculateStats = (data) => {
    if (!data || data.length === 0) return;

    const totalMarketSize = data.reduce((sum, opp) => {
      return sum + (opp.min_investment || opp.minInvestment || opp.amount || 0);
    }, 0);

    const returnsData = data.filter(opp =>
      (opp.expected_return_min || opp.expectedReturnMin || opp.expected_return_max || opp.expectedReturnMax)
    );
    const avgReturn = returnsData.length > 0
      ? returnsData.reduce((sum, opp) => {
          const minR = opp.expected_return_min || opp.expectedReturnMin || 0;
          const maxR = opp.expected_return_max || opp.expectedReturnMax || 0;
          return sum + ((minR + maxR) / 2);
        }, 0) / returnsData.length
      : 0;

    const bySector = {};
    data.forEach(opp => {
      if (opp.sector) bySector[opp.sector] = (bySector[opp.sector] || 0) + 1;
    });

    const byCountry = {};
    data.forEach(opp => {
      const country = opp.country || opp.country_name || opp.countryName;
      if (country) byCountry[country] = (byCountry[country] || 0) + 1;
    });

    setStats({
      total: data.length,
      total_market_size: totalMarketSize,
      avg_return: avgReturn,
      total_markets: Object.keys(bySector).length,
      by_sector: Object.entries(bySector).map(([sector, count]) => ({ sector, count })),
      by_country: Object.entries(byCountry).map(([country, count]) => ({
        country, country_name: country, count
      }))
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ sector: '', country: '', risk_level: '', search: '', sort: 'newest' });
  };

  const getRiskLabel = (risk) => {
    const labels = { low: t('opportunities.riskLow'), medium: t('opportunities.riskMedium'), high: t('opportunities.riskHigh'), very_high: t('opportunities.riskVeryHigh') };
    return labels[risk] || risk;
  };

  const getHorizonLabel = (horizon) => {
    const labels = { short: t('opportunities.horizonShort'), medium: t('opportunities.horizonMedium'), long: t('opportunities.horizonLong') };
    return labels[horizon] || horizon;
  };

  const getSectorLabel = (sector) => {
    const key = mapValue(sector, sectorMap);
    const labels = {
      energy: t('sectors.energy'), agriculture: t('sectors.agriculture'), technology: t('sectors.tech'),
      finance: t('sectors.finance'), fintech: t('sectors.fintech'), health: t('sectors.health'),
      real_estate: t('sectors.realEstate'), infrastructure: t('sectors.infrastructure'),
      industry: t('sectors.industry'), commerce: t('sectors.commerce'), services: t('sectors.services'),
      transport: t('sectors.transport'), education: t('sectors.education'), tourism: t('sectors.tourism')
    };
    return labels[key] || sector;
  };

  const getCountryNameLabel = (name) => {
    if (!name) return '';
    const regionKey = mapValue(name, regionMap);
    const regionLabels = {
      north_africa: t('regions.northAfrica'), west_africa: t('regions.westAfrica'),
      central_africa: t('regions.centralAfrica'), east_africa: t('regions.eastAfrica'),
      southern_africa: t('regions.southernAfrica'), pan_african: t('regions.panAfrican')
    };
    if (regionLabels[regionKey]) return regionLabels[regionKey];
    const countryTranslation = t(`countries.${name}`, { defaultValue: '' });
    if (countryTranslation) return countryTranslation;
    return name;
  };

  const getSectorIcon = (sector) => {
    const icons = { 'Finance': DollarSign, 'Énergie': Zap, 'Tech': Cpu, 'Santé': Heart, 'Mines': Mountain, 'Commerce': ShoppingBag, 'Immobilier': Building2, 'Agriculture': '🌾' };
    return icons[sector] || Globe;
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M USD`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K USD`;
    return `${amount} USD`;
  };

  if (loading && opportunities.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <SkeletonStatGrid count={4} />
        <SkeletonCardGrid count={4} cols="grid-cols-1 md:grid-cols-2" />
      </div>
    );
  }

  const inputStyle = {
    background: 'var(--cream-deep)',
    border: '1.5px solid rgba(26,20,16,0.1)',
    borderRadius: '10px',
    padding: '0.5rem 0.85rem',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: 'var(--ink)',
    outline: 'none',
    width: '100%',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>{t('opportunities.title')}</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', color: 'var(--ink)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
          {t('opportunities.subtitle')}
        </h2>
      </div>

      {/* Stats rapides */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: t('opportunities.totalOpportunities'), value: stats.total, color: 'var(--ink)' },
            { label: t('opportunities.totalMarkets'), value: stats.total_markets || stats.by_sector?.length || 0, color: 'var(--forest)' },
            { label: t('opportunities.avgROI'), value: `${stats.avg_return?.toFixed(1)}%`, color: 'var(--terracotta)' },
            { label: t('opportunities.countriesCovered'), value: stats.by_country?.length || 0, color: 'var(--ink-soft)' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                {s.label}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1.5rem', color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="md:flex-row">
          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: 'var(--ink-mute)' }} />
            <input
              type="text"
              placeholder={t('placeholders.searchOpportunity')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ ...inputStyle, paddingLeft: '2.25rem' }}
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-deep)'; }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'var(--cream-deep)',
              border: '1.5px solid rgba(26,20,16,0.1)',
              borderRadius: '10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--ink-soft)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            <Filter style={{ width: '0.875rem', height: '0.875rem' }} />
            {t('common.filters')}
            <ChevronDown style={{ width: '0.75rem', height: '0.75rem', transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Sort select */}
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            aria-label={t('filters.sort', 'Trier')}
            style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
          >
            <option value="newest">{t('filters.newest')}</option>
            <option value="oldest">{t('filters.oldest')}</option>
            <option value="relevance">{t('filters.relevance')}</option>
            <option value="return_high">{t('filters.roiHigh')}</option>
            <option value="return_low">{t('filters.roiLow')}</option>
            <option value="investment_low">{t('filters.investmentLow')}</option>
            <option value="investment_high">{t('filters.investmentHigh')}</option>
          </select>
        </div>

        {/* Advanced filters panel */}
        {showFilters && (
          <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.4rem' }}>
                  {t('filters.sector')}
                </label>
                <select value={filters.sector} onChange={(e) => handleFilterChange('sector', e.target.value)} style={{ ...inputStyle }}>
                  <option value="">{t('filters.allSectors')}</option>
                  {stats?.by_sector.map(s => (
                    <option key={s.sector} value={s.sector}>{getSectorLabel(s.sector)} ({s.count})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.4rem' }}>
                  {t('filters.country')}
                </label>
                <select value={filters.country} onChange={(e) => handleFilterChange('country', e.target.value)} style={{ ...inputStyle }}>
                  <option value="">{t('filters.allCountries')}</option>
                  {stats?.by_country.map(c => (
                    <option key={c.country} value={c.country}>{t(`countries.${c.country}`, c.country_name)} ({c.count})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.4rem' }}>
                  {t('filters.riskLevel')}
                </label>
                <select value={filters.risk_level} onChange={(e) => handleFilterChange('risk_level', e.target.value)} style={{ ...inputStyle }}>
                  <option value="">{t('filters.allLevels')}</option>
                  <option value="low">{t('opportunities.riskLow')}</option>
                  <option value="medium">{t('opportunities.riskMedium')}</option>
                  <option value="high">{t('opportunities.riskHigh')}</option>
                  <option value="very_high">{t('opportunities.riskVeryHigh')}</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={clearFilters}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem 0.75rem' }}
              >
                {t('common.resetFilters')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Opportunity cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {opportunities.map((opp) => {
          const SectorIcon = getSectorIcon(opp.sector);
          const riskStyle = getRiskStyle(opp.risk_level || opp.riskLevel);

          return (
            <OppCard
              key={opp.id}
              opp={opp}
              SectorIcon={SectorIcon}
              riskStyle={riskStyle}
              getSectorLabel={getSectorLabel}
              getCountryNameLabel={getCountryNameLabel}
              getHorizonLabel={getHorizonLabel}
              getRiskLabel={getRiskLabel}
              formatCurrency={formatCurrency}
              timeAgo={timeAgo}
              onClick={() => setSelectedOpp(opp)}
              t={t}
            />
          );
        })}
      </div>

      {/* Empty state */}
      {!loading && opportunities.length === 0 && (() => {
        const hasActiveFilters = filters.search || filters.sector || filters.country || filters.risk_level;
        const hasAnyData = allOpportunities && allOpportunities.length > 0;
        return (
          <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-lg)', padding: '3rem 1.5rem', textAlign: 'center' }}>
            <AlertCircle style={{ width: '3rem', height: '3rem', color: 'var(--ink-mute)', opacity: 0.4, display: 'block', margin: '0 auto 1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.25rem', color: 'var(--ink-soft)', marginBottom: '0.5rem' }}>
              {t('messages.noOpportunity')}
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', fontSize: '0.875rem', marginBottom: hasAnyData && hasActiveFilters ? '1.25rem' : 0 }}>
              {hasAnyData && hasActiveFilters
                ? t('opportunities.tryModifyFilters')
                : t('messages.contentUnavailable')}
            </p>
            {hasAnyData && hasActiveFilters && (
              <button
                onClick={clearFilters}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
                style={{ padding: '0.55rem 1.25rem', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                {t('common.resetFilters')}
              </button>
            )}
          </div>
        );
      })()}

      {selectedOpp && (
        <OpportunityDetailModal
          opportunity={selectedOpp}
          onClose={() => setSelectedOpp(null)}
        />
      )}
    </div>
  );
};

const OppCard = ({ opp, SectorIcon, riskStyle, getSectorLabel, getCountryNameLabel, getHorizonLabel, getRiskLabel, formatCurrency, timeAgo, onClick, t }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--cream-glow)',
        border: hovered ? '1.5px solid rgba(194,73,22,0.3)' : '1.5px solid rgba(26,20,16,0.08)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.25s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-warm)' : 'none',
      }}
    >
      {/* Card header — sector accent */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(194,73,22,0.12) 0%, rgba(232,170,11,0.08) 100%)',
        borderBottom: '1px solid rgba(26,20,16,0.06)',
        padding: '1rem 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(194,73,22,0.1)', borderRadius: '10px' }}>
            {typeof SectorIcon === 'string' ? (
              <span style={{ fontSize: '1.5rem' }}>{SectorIcon}</span>
            ) : (
              <SectorIcon style={{ width: '1.25rem', height: '1.25rem', color: 'var(--terracotta)' }} />
            )}
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1rem', color: 'var(--ink)' }}>
              {getSectorLabel(opp.sector)}
            </h3>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', marginTop: '0.1rem' }}>
              {getCountryNameLabel(opp.country_name || opp.country)}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
          {(opp.is_verified === 1 || opp.verified) && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600, color: 'var(--forest)', background: 'rgba(30,77,58,0.1)', border: '1px solid rgba(30,77,58,0.2)', borderRadius: '99px', padding: '0.2rem 0.6rem' }}>
              ✓ {t('opportunities.verified')}
            </span>
          )}
          {typeof opp.relevance_score === 'number' && (
            <span
              title={t('opportunities.relevanceScoreTooltip')}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700,
                color: opp.relevance_score >= 55 ? 'var(--forest)' : '#9A6E00',
                background: opp.relevance_score >= 55 ? 'rgba(30,77,58,0.1)' : 'rgba(232,170,11,0.12)',
                border: `1px solid ${opp.relevance_score >= 55 ? 'rgba(30,77,58,0.2)' : 'rgba(232,170,11,0.25)'}`,
                borderRadius: '99px', padding: '0.2rem 0.6rem',
              }}
            >
              ★ {opp.relevance_score}/100
            </span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div>
          <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9375rem', color: hovered ? 'var(--terracotta)' : 'var(--ink)', marginBottom: '0.5rem', transition: 'color 0.2s' }}>
            {decodeHtmlEntities(opp.title)}
          </h4>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.825rem', color: 'var(--ink-mute)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {decodeHtmlEntities(opp.summary || opp.description)}
          </p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div style={{ background: 'var(--cream-deep)', borderRadius: '8px', padding: '0.65rem 0.85rem', border: '1px solid rgba(26,20,16,0.06)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
              {t('opportunities.investment')}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '0.875rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(opp.min_investment || opp.minInvestment)}
            </div>
          </div>
          <div style={{ background: 'var(--cream-deep)', borderRadius: '8px', padding: '0.65rem 0.85rem', border: '1px solid rgba(26,20,16,0.06)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
              {t('opportunities.expectedROI')}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '0.875rem', color: 'var(--forest)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontVariantNumeric: 'tabular-nums' }}>
              <TrendingUp style={{ width: '0.75rem', height: '0.75rem' }} />
              {opp.expected_return_min || opp.expectedReturn}%
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(opp.risk_level || opp.riskLevel) && (() => {
            const rs = getRiskStyle(opp.risk_level || opp.riskLevel);
            return (
              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '99px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 500, background: rs.bg, color: rs.color, border: `1px solid ${rs.border}` }}>
                {getRiskLabel(opp.risk_level || opp.riskLevel)}
              </span>
            );
          })()}
          {(opp.investment_horizon || opp.horizon) && (
            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '99px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 500, background: 'rgba(59,130,246,0.08)', color: '#1D4ED8', border: '1px solid rgba(59,130,246,0.2)' }}>
              {getHorizonLabel(opp.investment_horizon || opp.horizon)}
            </span>
          )}
        </div>

        {/* Company name */}
        {(opp.company_name || opp.companyName) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(26,20,16,0.06)' }}>
            <Building2 style={{ width: '0.875rem', height: '0.875rem', color: 'var(--ink-mute)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-soft)', fontWeight: 500 }}>
              {opp.company_name || opp.companyName}
            </span>
          </div>
        )}

        {/* Source link */}
        {(opp.source_url || opp.source_name) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(26,20,16,0.06)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {opp.source_name}
            </span>
            {opp.source_url && (
              <a href={opp.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 500, color: 'var(--ink-soft)', background: 'var(--cream-deep)', padding: '0.2rem 0.55rem', borderRadius: '99px', border: '1px solid rgba(26,20,16,0.08)', textDecoration: 'none' }}>
                <ExternalLink style={{ width: '0.6rem', height: '0.6rem' }} />
                {t('news.source')}
              </a>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid rgba(26,20,16,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {(opp.published_at || opp.publishedAt) && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock style={{ width: '0.65rem', height: '0.65rem' }} />
                {timeAgo(opp.published_at || opp.publishedAt, t)}
              </span>
            )}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Eye style={{ width: '0.65rem', height: '0.65rem' }} />
              {opp.views || 0}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Star style={{ width: '0.65rem', height: '0.65rem' }} />
              {opp.saves || 0}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 500, color: hovered ? 'var(--terracotta)' : 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'color 0.2s' }}>
            {t('opportunities.viewDetails')}
            <ArrowRight style={{ width: '0.75rem', height: '0.75rem' }} />
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Modal de détail d'opportunité ───────────────────────────────────────────

const OpportunityDetailModal = ({ opportunity, onClose }) => {
  const { t, i18n } = useTranslation();
  const [fullDetails, setFullDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const localizeFields = (item) => {
      if (!item) return item;
      const lc = (i18n.language || 'fr').substring(0, 2).toLowerCase();
      return {
        ...item,
        title: item[`title_${lc}`] || item.title_fr || item.title,
        summary: item[`summary_${lc}`] || item.summary_fr || item.summary,
        description: item[`description_${lc}`] || item.description_fr || item.description,
      };
    };

    const fetchFullDetails = async () => {
      try {
        const identifier = opportunity.slug || opportunity.id;
        const res = await fetch(`${API_URL}/opportunities/${identifier}?lang=${i18n.language}`);
        const data = await res.json();
        const raw = data.success ? data.data : opportunity;
        setFullDetails(localizeFields(raw));
      } catch {
        setFullDetails(localizeFields(opportunity));
      } finally {
        setLoading(false);
      }
    };
    fetchFullDetails();
  }, [opportunity.slug, opportunity.id, i18n.language]);

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}Mds USD`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M USD`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K USD`;
    return `${amount} USD`;
  };

  const getRiskLabel = (risk) => {
    const labels = { low: t('opportunities.riskLow'), medium: t('opportunities.riskMedium'), high: t('opportunities.riskHigh'), very_high: t('opportunities.riskVeryHigh') };
    return labels[risk] || risk;
  };

  const getHorizonLabel = (horizon) => {
    const key = mapValue(horizon, horizonMap);
    const labels = { short: t('opportunities.horizonShort'), medium: t('opportunities.horizonMedium'), long: t('opportunities.horizonLong') };
    return labels[key] || horizon;
  };

  const getCompanySizeLabel = (size) => {
    const key = mapValue(size, companySizeMap);
    const labels = { startup: t('opportunities.startup'), sme: t('opportunities.sme'), large: t('opportunities.largeCompany') };
    return labels[key] || size;
  };

  const getStageLabel = (stage) => {
    const key = mapValue(stage, stageMap);
    const labels = { early: t('opportunities.early'), growth: t('opportunities.growth'), mature: t('opportunities.mature') };
    return labels[key] || stage;
  };

  const getSectorLabel = (sector) => {
    const key = mapValue(sector, sectorMap);
    const labels = {
      energy: t('sectors.energy'), agriculture: t('sectors.agriculture'), technology: t('sectors.tech'),
      finance: t('sectors.finance'), fintech: t('sectors.fintech'), health: t('sectors.health'),
      real_estate: t('sectors.realEstate'), infrastructure: t('sectors.infrastructure'),
      industry: t('sectors.industry'), commerce: t('sectors.commerce'), services: t('sectors.services'),
      transport: t('sectors.transport'), education: t('sectors.education'), tourism: t('sectors.tourism')
    };
    return labels[key] || sector;
  };

  const getRegionLabel = (region) => {
    const key = mapValue(region, regionMap);
    const labels = {
      north_africa: t('regions.northAfrica'), west_africa: t('regions.westAfrica'),
      central_africa: t('regions.centralAfrica'), east_africa: t('regions.eastAfrica'),
      southern_africa: t('regions.southernAfrica'), pan_african: t('regions.panAfrican')
    };
    return labels[key] || region;
  };

  const getCountryNameLabel = (name) => {
    if (!name) return '';
    const regionKey = mapValue(name, regionMap);
    const regionLabels = {
      north_africa: t('regions.northAfrica'), west_africa: t('regions.westAfrica'),
      central_africa: t('regions.centralAfrica'), east_africa: t('regions.eastAfrica'),
      southern_africa: t('regions.southernAfrica'), pan_african: t('regions.panAfrican')
    };
    if (regionLabels[regionKey]) return regionLabels[regionKey];
    const countryTranslation = t(`countries.${name}`, { defaultValue: '' });
    if (countryTranslation) return countryTranslation;
    return name;
  };

  const getHighlightTypeLabel = (type) => {
    const labels = { strength: t('opportunities.strength'), risk: t('opportunities.risk'), milestone: t('opportunities.milestone'), market_insight: t('opportunities.marketInsight') };
    return labels[type] || type;
  };

  const getHighlightTypeStyle = (type) => {
    const styles = {
      strength: { bg: 'rgba(30,77,58,0.08)', color: '#1E4D3A', border: 'rgba(30,77,58,0.2)' },
      risk: { bg: 'rgba(194,73,22,0.08)', color: '#C24916', border: 'rgba(194,73,22,0.2)' },
      milestone: { bg: 'rgba(59,130,246,0.08)', color: '#1D4ED8', border: 'rgba(59,130,246,0.2)' },
      market_insight: { bg: 'rgba(139,92,246,0.08)', color: '#6D28D9', border: 'rgba(139,92,246,0.2)' },
    };
    return styles[type] || { bg: 'rgba(26,20,16,0.06)', color: '#7A6A5C', border: 'rgba(26,20,16,0.1)' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(i18n.language || 'fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const detailBoxStyle = {
    background: 'var(--cream-deep)', borderRadius: 'var(--radius-md)', padding: '1rem',
    border: '1px solid rgba(26,20,16,0.06)',
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--cream-glow)', borderRadius: 'var(--radius-xl)', maxWidth: '960px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1.5px solid rgba(26,20,16,0.08)', boxShadow: 'var(--shadow-deep)', animation: 'scale-in 0.2s ease-out' }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, background: 'var(--cream-glow)', borderBottom: '1px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.2rem', color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {decodeHtmlEntities(opportunity.title)}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>
              {(opportunity.company_name || opportunity.companyName) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Building2 style={{ width: '0.7rem', height: '0.7rem' }} />
                  {opportunity.company_name || opportunity.companyName}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Globe style={{ width: '0.7rem', height: '0.7rem' }} />
                {getCountryNameLabel(opportunity.country_name)}
              </span>
              <span>• {getSectorLabel(opportunity.sector)}</span>
              {opportunity.is_verified === 1 && (
                <span style={{ background: 'rgba(30,77,58,0.1)', color: 'var(--forest)', border: '1px solid rgba(30,77,58,0.2)', padding: '0.15rem 0.5rem', borderRadius: '99px', fontSize: '0.6rem', fontWeight: 600 }}>
                  ✓ {t('opportunities.verified')}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--cream)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-deep)'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.1)', color: 'var(--ink-soft)', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0, marginLeft: '1rem', fontSize: '1.25rem', fontWeight: 300 }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem 0' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', border: '2px solid var(--cream-deep)', borderTopColor: 'var(--terracotta)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : fullDetails ? (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Summary + key metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="lg:flex-row">
              <div style={{ flex: 1, background: 'rgba(194,73,22,0.05)', border: '1px solid rgba(194,73,22,0.12)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--ink-soft)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{decodeHtmlEntities(fullDetails.summary)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 lg:w-72 flex-shrink-0">
                {[
                  { label: `${t('opportunities.investment')} min.`, value: formatCurrency(fullDetails.min_investment) },
                  { label: `${t('opportunities.investment')} max.`, value: formatCurrency(fullDetails.max_investment) },
                  { label: t('opportunities.expectedROI'), value: `${fullDetails.expected_return_min}%–${fullDetails.expected_return_max}%`, color: 'var(--forest)', icon: TrendingUp },
                  { label: t('opportunities.horizon'), value: getHorizonLabel(fullDetails.investment_horizon) },
                ].map((item, i) => (
                  <div key={i} style={detailBoxStyle}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--ink-mute)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '0.875rem', color: item.color || 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontVariantNumeric: 'tabular-nums' }}>
                      {item.icon && <item.icon style={{ width: '0.75rem', height: '0.75rem' }} />}
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '3px', height: '1.25rem', background: 'var(--terracotta)', borderRadius: '99px', display: 'inline-block' }} />
                {t('opportunities.detailedDescription')}
              </h3>
              <div style={{ background: 'var(--cream-deep)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid rgba(26,20,16,0.06)' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-soft)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{decodeHtmlEntities(fullDetails.description)}</p>
              </div>
            </div>

            {/* Highlights */}
            {fullDetails.highlights && (Array.isArray(fullDetails.highlights) ? fullDetails.highlights.length > 0 : typeof fullDetails.highlights === 'string' && fullDetails.highlights.length > 2) && (
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '3px', height: '1.25rem', background: 'var(--terracotta)', borderRadius: '99px', display: 'inline-block' }} />
                  {t('opportunities.keyPoints')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Array.isArray(fullDetails.highlights)
                    ? fullDetails.highlights
                    : (() => { try { return JSON.parse(fullDetails.highlights); } catch { return []; } })()
                  ).map((highlight, idx) => {
                    const hs = getHighlightTypeStyle(highlight.highlight_type);
                    return (
                      <div key={idx} style={{ ...detailBoxStyle }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          {highlight.icon && <span style={{ fontSize: '1.5rem' }}>{highlight.icon}</span>}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--terracotta)', marginBottom: '0.3rem', fontSize: '0.875rem' }}>{highlight.title}</div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.8125rem', color: 'var(--ink-soft)', lineHeight: 1.6 }}>{highlight.description}</div>
                            <div style={{ marginTop: '0.5rem' }}>
                              <span style={{ background: hs.bg, color: hs.color, border: `1px solid ${hs.border}`, padding: '0.15rem 0.5rem', borderRadius: '99px', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 600 }}>
                                {getHighlightTypeLabel(highlight.highlight_type)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Additional info */}
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '3px', height: '1.25rem', background: 'var(--terracotta)', borderRadius: '99px', display: 'inline-block' }} />
                {t('opportunities.additionalInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: t('opportunities.opportunityType'), value: fullDetails.opportunity_type === 'company' ? t('opportunities.company') : fullDetails.opportunity_type === 'project' ? t('opportunities.project') : t('opportunities.other') },
                  { label: t('opportunities.riskLevel'), value: getRiskLabel(fullDetails.risk_level), style: (() => { const rs = getRiskStyle(fullDetails.risk_level); return { background: rs.bg, color: rs.color, border: `1px solid ${rs.border}`, padding: '0.2rem 0.6rem', borderRadius: '99px', display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600 }; })() },
                  fullDetails.company_name && { label: t('opportunities.companyName'), value: fullDetails.company_name },
                  fullDetails.company_size && { label: t('opportunities.companySize'), value: getCompanySizeLabel(fullDetails.company_size) },
                  fullDetails.stage && { label: t('opportunities.developmentStage'), value: getStageLabel(fullDetails.stage) },
                  fullDetails.market_size_usd && { label: t('opportunities.marketSize'), value: formatCurrency(fullDetails.market_size_usd) },
                  fullDetails.region && { label: t('opportunities.region'), value: getRegionLabel(fullDetails.region) },
                  fullDetails.deadline && { label: t('opportunities.deadline'), value: formatDate(fullDetails.deadline) },
                  { label: t('opportunities.viewsFavorites'), value: null, custom: (
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '0.875rem', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Eye style={{ width: '0.875rem', height: '0.875rem' }} />{fullDetails.views || 0}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Star style={{ width: '0.875rem', height: '0.875rem' }} />{fullDetails.saves || 0}</span>
                    </div>
                  )},
                ].filter(Boolean).map((item, i) => (
                  <div key={i} style={detailBoxStyle}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                    {item.custom || (item.style
                      ? <span style={item.style}>{item.value}</span>
                      : <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '0.875rem', color: 'var(--ink)' }}>{item.value}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            {fullDetails.tags && (typeof fullDetails.tags === 'string' ? fullDetails.tags.length > 2 : fullDetails.tags.length > 0) && (
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '0.6rem' }}>{t('opportunities.tags')}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {(Array.isArray(fullDetails.tags) ? fullDetails.tags : (() => { try { return JSON.parse(fullDetails.tags); } catch { return []; } })()).map((tag, idx) => (
                    <span key={idx} style={{ padding: '0.25rem 0.65rem', background: 'var(--cream-deep)', color: 'var(--ink-soft)', border: '1px solid rgba(26,20,16,0.08)', borderRadius: '99px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source */}
            <div style={{ background: 'var(--cream-deep)', borderRadius: 'var(--radius-md)', padding: '1.25rem', border: '1px solid rgba(26,20,16,0.06)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>{t('opportunities.infoSource')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>{t('opportunities.publishedBy')}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--ink)' }}>{fullDetails.source_name}</div>
                </div>
                {fullDetails.source_url && (
                  <a
                    href={fullDetails.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: 'var(--ink)', color: 'var(--cream)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none', transition: 'background 0.2s' }}
                  >
                    <ExternalLink style={{ width: '0.875rem', height: '0.875rem' }} />
                    {t('opportunities.viewSource')}
                  </a>
                )}
              </div>
              {fullDetails.published_at && (
                <div style={{ marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>
                  {t('opportunities.publishedOn')} {formatDate(fullDetails.published_at)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '2.5rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', fontSize: '0.875rem' }}>
            {t('opportunities.unableToLoad')}
          </div>
        )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default React.memo(OpportunitiesTab);
