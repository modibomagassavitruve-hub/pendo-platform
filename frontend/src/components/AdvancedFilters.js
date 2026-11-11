import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Filter, X, ChevronDown, Search } from 'lucide-react';

const inputStyle = {
  width: '100%',
  background: 'var(--cream-deep)',
  border: '1.5px solid rgba(26,20,16,0.12)',
  borderRadius: '10px',
  padding: '0.55rem 0.9rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  color: 'var(--ink)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  color: 'var(--ink-mute)',
  marginBottom: '0.4rem',
  fontWeight: 600,
};

const AdvancedFilters = ({ onFilterChange, exchanges = [], sectors = [] }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    exchange: 'all',
    sector: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    priceMin: '',
    priceMax: '',
    changeMin: '',
    changeMax: ''
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const defaultFilters = { search: '', exchange: 'all', sector: 'all', sortBy: 'name', sortOrder: 'asc', priceMin: '', priceMax: '', changeMin: '', changeMax: '' };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sortBy' || key === 'sortOrder') return false;
    if ((key === 'exchange' || key === 'sector') && value === 'all') return false;
    return value !== '' && value !== 'all';
  }).length;

  return (
    <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isOpen ? '1rem' : 0 }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', padding: 0 }}
        >
          <Filter style={{ width: '16px', height: '16px', color: 'var(--terracotta)' }} />
          <span>{t('common.filters')}</span>
          {activeFiltersCount > 0 && (
            <span style={{ background: 'var(--terracotta)', color: 'var(--cream)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '999px' }}>
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown style={{ width: '15px', height: '15px', color: 'var(--ink-mute)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {activeFiltersCount > 0 && (
          <button
            onClick={resetFilters}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)', padding: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--terracotta)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; }}
          >
            <X style={{ width: '14px', height: '14px' }} />
            {t('common.reset')}
          </button>
        )}
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem', borderTop: '1.5px solid rgba(26,20,16,0.08)' }}>
          {/* Search */}
          <div>
            <label style={labelStyle}>{t('common.search')}</label>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'var(--ink-mute)' }} />
              <input
                type="text"
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                placeholder={t('placeholders.searchTickerName')}
                style={{ ...inputStyle, paddingLeft: '2.25rem' }}
              />
            </div>
          </div>

          {/* Exchange & Sector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>{t('market.exchange')}</label>
              <select value={filters.exchange} onChange={e => handleFilterChange('exchange', e.target.value)} style={inputStyle}>
                <option value="all">{t('filters.allExchanges')}</option>
                {exchanges.map(ex => <option key={ex} value={ex}>{ex.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('market.sector')}</label>
              <select value={filters.sector} onChange={e => handleFilterChange('sector', e.target.value)} style={inputStyle}>
                <option value="all">{t('filters.allSectors')}</option>
                {sectors.map(sec => <option key={sec} value={sec}>{sec}</option>)}
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label style={labelStyle}>{t('market.priceRange')} (XOF)</label>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={filters.priceMin} onChange={e => handleFilterChange('priceMin', e.target.value)} placeholder={t('placeholders.min')} style={inputStyle} />
              <input type="number" value={filters.priceMax} onChange={e => handleFilterChange('priceMax', e.target.value)} placeholder={t('placeholders.max')} style={inputStyle} />
            </div>
          </div>

          {/* Change Range */}
          <div>
            <label style={labelStyle}>{t('market.change')} (%)</label>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.1" value={filters.changeMin} onChange={e => handleFilterChange('changeMin', e.target.value)} placeholder="Min %" style={inputStyle} />
              <input type="number" step="0.1" value={filters.changeMax} onChange={e => handleFilterChange('changeMax', e.target.value)} placeholder="Max %" style={inputStyle} />
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ paddingTop: '0.75rem', borderTop: '1.5px solid rgba(26,20,16,0.08)' }}>
            <div>
              <label style={labelStyle}>{t('common.sortBy')}</label>
              <select value={filters.sortBy} onChange={e => handleFilterChange('sortBy', e.target.value)} style={inputStyle}>
                <option value="name">{t('exports.name')}</option>
                <option value="symbol">{t('exports.ticker')}</option>
                <option value="price">{t('market.price')}</option>
                <option value="change">{t('market.change')}</option>
                <option value="volume">{t('market.volume')}</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('common.order')}</label>
              <select value={filters.sortOrder} onChange={e => handleFilterChange('sortOrder', e.target.value)} style={inputStyle}>
                <option value="asc">{t('filters.ascending')}</option>
                <option value="desc">{t('filters.descending')}</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;
