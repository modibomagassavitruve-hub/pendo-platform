import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocale } from '../utils/locale';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Clock,
  Activity,
  Zap
} from 'lucide-react';
import MarketCard from './MarketCard';
import ExchangeDetail from './ExchangeDetail';
import MarketQuickChart from './MarketQuickChart';
import { EXCHANGES_BY_MARKET_CAP, TRADING_HOURS_UTC } from '../data/africanExchanges';

const MarketsTab = ({ markets, lastUpdate, apiStatus, openAdmin }) => {
  const { t } = useTranslation();
  const [selectedExchange, setSelectedExchange] = useState(null);
  const [sortBy, setSortBy] = useState('default');

  const countryExchanges = [
    { code: 'JSE', country: t('countries.ZA'), flag: '🇿🇦' },
    { code: 'MASI', country: t('countries.MA'), flag: '🇲🇦' },
    { code: 'NGX', country: t('countries.NG'), flag: '🇳🇬' },
    { code: 'EGX', country: t('countries.EG'), flag: '🇪🇬' },
    { code: 'NSE', country: t('countries.KE'), flag: '🇰🇪' },
    { code: 'BRVM', country: t('countries.UEMOA'), flag: '🌍' },
    { code: 'GSE', country: t('countries.GH'), flag: '🇬🇭' },
    { code: 'BSE', country: t('countries.BW'), flag: '🇧🇼' },
    { code: 'LuSE', country: t('countries.ZM'), flag: '🇿🇲' },
    { code: 'ZSE', country: t('countries.ZW'), flag: '🇿🇼' },
    { code: 'SEM', country: t('countries.MU'), flag: '🇲🇺' },
    { code: 'DSE', country: t('countries.TZ'), flag: '🇹🇿' },
    { code: 'USE', country: t('countries.UG'), flag: '🇺🇬' },
    { code: 'RSE', country: t('countries.RW'), flag: '🇷🇼' },
    { code: 'BVMT', country: t('countries.TN'), flag: '🇹🇳' },
    { code: 'NSX', country: t('countries.NA'), flag: '🇳🇦' },
    { code: 'MSE', country: t('countries.MW'), flag: '🇲🇼' },
  ];

  const sortedMarkets = [...markets].sort((a, b) => {
    if (sortBy === 'marketCap') return EXCHANGES_BY_MARKET_CAP.indexOf(a.id) - EXCHANGES_BY_MARKET_CAP.indexOf(b.id);
    if (sortBy === 'change') return (b.changePercent || 0) - (a.changePercent || 0);
    return 0;
  });

  const stats = {
    total: markets.length,
    positive: markets.filter(m => m.positive).length,
    negative: markets.filter(m => !m.positive).length,
  };

  const selectedMarketData = selectedExchange ? markets.find(m => m.id === selectedExchange) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Bannière mode démo */}
      {!apiStatus.connected && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(232,170,11,0.08)',
          border: '1.5px solid rgba(232,170,11,0.2)',
          flexWrap: 'wrap',
        }}>
          <div style={{ padding: '0.5rem', background: 'rgba(232,170,11,0.12)', borderRadius: '8px' }}>
            <AlertCircle style={{ width: '1.1rem', height: '1.1rem', color: 'var(--sun)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, color: '#8A6200', fontSize: '0.875rem' }}>
              {t('markets.demoMode')}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)', marginTop: '0.15rem' }}>
              {t('markets.backendNotStarted')}
            </p>
          </div>
          <button
            onClick={openAdmin}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 1rem',
              background: 'rgba(232,170,11,0.15)',
              color: '#8A6200',
              border: '1.5px solid rgba(232,170,11,0.3)',
              borderRadius: '99px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,170,11,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,170,11,0.15)'; }}
          >
            <Zap style={{ width: '0.75rem', height: '0.75rem' }} />
            {t('markets.configureBackend')}
          </button>
        </div>
      )}

      {/* En-tête section */}
      <div style={{
        background: 'var(--cream-glow)',
        border: '1.5px solid rgba(26,20,16,0.08)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Titre + stats + tri */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>
                {t('markets.africanStockMarkets', 'Bourses africaines')}
              </p>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)',
                color: 'var(--ink)',
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
              }}>
                {stats.total} marchés, <em>{t('markets.realTime', 'en temps réel')}.</em>
              </h2>
              {lastUpdate && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock style={{ width: '0.75rem', height: '0.75rem' }} />
                  {lastUpdate.toLocaleString(getLocale())}
                </p>
              )}
            </div>

            {/* Stats + tri */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Hausse */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.85rem',
                background: 'rgba(30,77,58,0.08)',
                border: '1px solid rgba(30,77,58,0.15)',
                borderRadius: '99px',
              }}>
                <TrendingUp style={{ width: '0.875rem', height: '0.875rem', color: 'var(--forest)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1rem', color: 'var(--forest)', fontVariantNumeric: 'tabular-nums' }}>
                  {stats.positive}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--forest)', opacity: 0.7 }}>
                  {t('markets.increase', { count: stats.positive })}
                </span>
              </div>

              {/* Baisse */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.85rem',
                background: 'rgba(194,73,22,0.08)',
                border: '1px solid rgba(194,73,22,0.15)',
                borderRadius: '99px',
              }}>
                <TrendingDown style={{ width: '0.875rem', height: '0.875rem', color: 'var(--terracotta)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1rem', color: 'var(--terracotta)', fontVariantNumeric: 'tabular-nums' }}>
                  {stats.negative}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--terracotta)', opacity: 0.7 }}>
                  {t('markets.decrease', { count: stats.negative })}
                </span>
              </div>

              {/* Tri */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                background: 'var(--cream-deep)',
                border: '1.5px solid rgba(26,20,16,0.1)',
                borderRadius: '99px',
              }}>
                <ArrowUpDown style={{ width: '0.75rem', height: '0.75rem', color: 'var(--ink-mute)' }} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label={t('markets.defaultSort')}
                  style={{
                    background: 'transparent',
                    color: 'var(--ink-soft)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="default">{t('markets.defaultSort')}</option>
                  <option value="marketCap">{t('markets.byCapitalization')}</option>
                  <option value="change">{t('markets.byPerformance')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Horaires de trading */}
          <div style={{ borderTop: '1px solid rgba(26,20,16,0.06)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <Activity style={{ width: '0.75rem', height: '0.75rem', color: 'var(--ink-mute)' }} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t('markets.tradingHoursUTC')}
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {Object.entries(TRADING_HOURS_UTC).map(([id, hours]) => {
                const market = markets.find(m => m.id === id);
                return (
                  <span key={id} style={{
                    padding: '0.25rem 0.65rem',
                    background: 'var(--cream-deep)',
                    borderRadius: '99px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    border: '1px solid rgba(26,20,16,0.08)',
                  }}>
                    <span style={{ fontWeight: 500, color: 'var(--ink-soft)' }}>
                      {market?.name?.split(' ')[0] || id.toUpperCase()}
                    </span>
                    <span style={{ color: 'var(--ink-mute)', marginLeft: '0.35rem' }}>
                      {hours.open}–{hours.close}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Graphique rapide */}
      <MarketQuickChart markets={sortedMarkets} />

      {/* Grille des marchés */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.25rem',
      }}>
        {sortedMarkets.map((market) => (
          <div
            key={market.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedExchange(market.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedExchange(market.id);
              }
            }}
            aria-label={`${market.name || market.id} – ${t('market.viewData')}`}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            <MarketCard market={market} />
          </div>
        ))}
      </div>

      {/* Légende des bourses */}
      <div style={{
        background: 'var(--cream-glow)',
        border: '1.5px solid rgba(26,20,16,0.08)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
      }}>
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>
          {t('markets.legendActiveExchanges', { count: markets.length })}
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '0.5rem',
        }}>
          {countryExchanges.map((exchange) => (
            <div
              key={exchange.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--cream-deep)',
                borderRadius: '10px',
                border: '1px solid rgba(26,20,16,0.06)',
                transition: 'all 0.2s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(194,73,22,0.2)';
                e.currentTarget.style.background = 'var(--cream-glow)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(26,20,16,0.06)';
                e.currentTarget.style.background = 'var(--cream-deep)';
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{exchange.flag}</span>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                  {exchange.code}
                </span>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)' }}>
                  {exchange.countryCode ? t(`countries.${exchange.countryCode}`, exchange.country) : exchange.country}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal détail bourse */}
      {selectedExchange && (
        <ExchangeDetail
          exchangeId={selectedExchange}
          marketData={selectedMarketData}
          onClose={() => setSelectedExchange(null)}
        />
      )}
    </div>
  );
};

export default MarketsTab;
