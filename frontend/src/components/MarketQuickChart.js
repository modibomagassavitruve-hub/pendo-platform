import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { getExchange, EXCHANGES_BY_MARKET_CAP } from '../data/africanExchanges';
import StockChart from './StockChart';

const MarketQuickChart = ({ markets }) => {
  const { t } = useTranslation();
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const activeMarket = useMemo(() => {
    if (selectedMarket) return selectedMarket;
    const firstByMarketCap = EXCHANGES_BY_MARKET_CAP.find(id =>
      markets.some(m => m.id === id)
    );
    return firstByMarketCap || markets[0]?.id || null;
  }, [selectedMarket, markets]);

  const currentMarketData = markets.find(m => m.id === activeMarket);
  const exchange = activeMarket ? getExchange(activeMarket) : null;

  if (!markets.length) return null;

  return (
    <div style={{
      background: 'var(--cream-glow)',
      border: '1.5px solid rgba(26,20,16,0.08)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header cliquable */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid rgba(26,20,16,0.08)',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-deep)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            padding: '0.5rem',
            background: 'rgba(194,73,22,0.1)',
            borderRadius: '8px',
          }}>
            <BarChart3 style={{ width: '1.1rem', height: '1.1rem', color: 'var(--terracotta)' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.05rem', color: 'var(--ink)' }}>
              {t('markets.quickChart', { defaultValue: 'Graphique rapide' })}
            </h3>
            {exchange && !collapsed && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)', marginTop: '0.1rem' }}>
                {exchange.flag} {exchange.fullName}
              </p>
            )}
          </div>
        </div>
        <div style={{ color: 'var(--ink-mute)', padding: '0.25rem' }}>
          {collapsed
            ? <ChevronDown style={{ width: '1.1rem', height: '1.1rem' }} />
            : <ChevronUp style={{ width: '1.1rem', height: '1.1rem' }} />
          }
        </div>
      </button>

      {!collapsed && (
        <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
          {/* Sélecteur de marchés en scroll horizontal */}
          <div
            style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}
            className="scrollbar-hide"
          >
            {markets.map((market) => {
              const ex = getExchange(market.id);
              const isActive = market.id === activeMarket;
              return (
                <button
                  key={market.id}
                  onClick={() => setSelectedMarket(market.id)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '99px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    border: isActive
                      ? '1.5px solid rgba(194,73,22,0.35)'
                      : '1.5px solid rgba(26,20,16,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: isActive ? 'rgba(194,73,22,0.08)' : 'var(--cream-deep)',
                    color: isActive ? 'var(--terracotta)' : 'var(--ink-soft)',
                    boxShadow: isActive ? '0 2px 8px -2px rgba(194,73,22,0.2)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--cream-glow)';
                      e.currentTarget.style.color = 'var(--ink)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--cream-deep)';
                      e.currentTarget.style.color = 'var(--ink-soft)';
                    }
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{ex?.flag || '📊'}</span>
                  <span>{market.name?.split(' ')[0] || market.id}</span>
                  <span style={{ color: market.positive ? 'var(--forest)' : 'var(--terracotta)', fontSize: '0.7rem' }}>
                    {market.positive ? '▲' : '▼'} {market.change}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Graphique */}
          {activeMarket && (
            <StockChart
              marketId={activeMarket}
              currentValue={currentMarketData?.value}
              change={currentMarketData?.change}
              positive={currentMarketData?.positive ?? true}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MarketQuickChart;
