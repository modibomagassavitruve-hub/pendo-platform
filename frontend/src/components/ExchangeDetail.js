import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Globe, Clock, Building2, ExternalLink, DollarSign, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { getExchange } from '../data/africanExchanges';
import { translateMarketSector } from '../utils/contentTranslations';
import StockChart from './StockChart';

const ExchangeDetail = ({ exchangeId, onClose, marketData }) => {
  const { t, i18n } = useTranslation();
  const exchange = getExchange(exchangeId);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Fermeture au clavier Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!exchange) return null;

  const positive = marketData?.positive ?? true;

  return createPortal(
    /* Overlay */
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26, 20, 16, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      {/* Panel modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--cream-glow)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: '960px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-deep)',
          border: '1.5px solid rgba(26,20,16,0.08)',
          animation: 'scale-in 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(26,20,16,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          position: 'sticky',
          top: 0,
          background: 'var(--cream-glow)',
          zIndex: 10,
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}>
          {/* Gauche : drapeau + nom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--cream-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              flexShrink: 0,
            }}>
              {exchange.flag}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>
                {exchange.code}
                <span style={{ marginLeft: '0.5rem', color: 'var(--terracotta)' }}>#{exchange.rankAfrica} {t('exchange.africa')}</span>
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.3rem', color: 'var(--ink)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {exchange.fullName}
              </h2>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)', marginTop: '0.1rem' }}>
                {exchange.city}
              </p>
            </div>
          </div>

          {/* Droite : valeur + variation + bouton fermer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            {marketData && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                  {marketData.value}
                </p>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: positive ? 'var(--forest)' : 'var(--terracotta)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {positive ? <TrendingUp style={{ width: '0.875rem', height: '0.875rem' }} /> : <TrendingDown style={{ width: '0.875rem', height: '0.875rem' }} />}
                  {marketData.change}
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--cream-deep)',
                border: '1.5px solid rgba(26,20,16,0.12)',
                cursor: 'pointer',
                color: 'var(--ink-soft)',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.color = 'var(--cream)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-deep)'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
              aria-label={t('common.close')}
            >
              <X style={{ width: '1rem', height: '1rem' }} />
            </button>
          </div>
        </div>

        {/* Corps */}
        <div style={{ padding: '1.5rem' }}>
          {/* Graphique — la pièce maîtresse */}
          <div style={{ marginBottom: '1.5rem' }}>
            <StockChart
              marketId={exchangeId}
              currentValue={marketData?.value}
              change={marketData?.change}
              positive={positive}
            />
          </div>

          {/* Stats principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
            <StatCard icon={DollarSign} label={t('exchange.capitalization')} value={exchange.marketCap?.usdDisplay || 'N/A'} sub={exchange.marketCap?.display} />
            <StatCard icon={Building2} label={t('exchange.listedCompanies')} value={exchange.listedCompanies || 'N/A'} sub={t('exchange.companiesListed')} />
            <StatCard icon={Clock} label={t('exchange.tradingHours')} value={`${exchange.tradingHours?.open} – ${exchange.tradingHours?.close}`} sub={exchange.tradingHours?.timezone} />
          </div>

          {/* Indices */}
          {exchange.indices && exchange.indices.length > 0 && (
            <div style={{
              background: 'var(--cream-deep)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <BarChart3 style={{ width: '1rem', height: '1rem', color: 'var(--ink-mute)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {t('exchange.mainIndices')}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {exchange.indices.map((index, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '99px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      background: index.primary ? 'rgba(194,73,22,0.1)' : 'var(--cream-glow)',
                      color: index.primary ? 'var(--terracotta)' : 'var(--ink-soft)',
                      border: index.primary ? '1px solid rgba(194,73,22,0.25)' : '1px solid rgba(26,20,16,0.1)',
                    }}
                  >
                    {index.name} ({index.code})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Secteurs & entreprises */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {exchange.topSectors && (
              <div style={{ background: 'var(--cream-deep)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
                  🏭 {t('exchange.topSectors')}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {exchange.topSectors.map((sector, i) => (
                    <span key={i} style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '99px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      background: 'rgba(30,77,58,0.08)',
                      color: 'var(--forest)',
                      border: '1px solid rgba(30,77,58,0.15)',
                    }}>
                      {translateMarketSector(sector, i18n.language)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {exchange.topCompanies && (
              <div style={{ background: 'var(--cream-deep)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
                  🏢 {t('exchange.largeCapitalizations')}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {exchange.topCompanies.map((company, i) => (
                    <span key={i} style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '99px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      background: 'rgba(232,170,11,0.1)',
                      color: '#8A6200',
                      border: '1px solid rgba(232,170,11,0.2)',
                    }}>
                      {company}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lien site officiel */}
          {exchange.website && (
            <a
              href={exchange.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem',
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
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--terracotta)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--ink)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <Globe style={{ width: '1rem', height: '1rem' }} />
              {t('exchange.visitOfficialSite')}
              <ExternalLink style={{ width: '0.875rem', height: '0.875rem' }} />
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <div style={{
    background: 'var(--cream-deep)',
    borderRadius: 'var(--radius-md)',
    padding: '0.85rem',
    border: '1.5px solid rgba(26,20,16,0.06)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
      <Icon style={{ width: '0.875rem', height: '0.875rem', color: 'var(--ink-mute)' }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
    </div>
    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </p>
    {sub && (
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', marginTop: '0.15rem' }}>
        {sub}
      </p>
    )}
  </div>
);

export default ExchangeDetail;
