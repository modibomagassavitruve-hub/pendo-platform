import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Moon, Sun, Bell, TrendingUp } from 'lucide-react';
import { AFRICAN_EXCHANGES } from '../data/africanExchanges';

const MarketClosedPage = ({ markets, onSetAlert }) => {
  const { t, i18n } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedExchange, setSelectedExchange] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getNextOpeningMarket = () => {
    const now = new Date();
    const day = now.getUTCDay();
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
      return { name: t('closedPage.allMarkets'), opensIn: t('closedPage.mondayOpening'), isWeekend: true };
    }

    const exchanges = Object.values(AFRICAN_EXCHANGES);
    let nextOpening = null;
    let minTime = Infinity;

    exchanges.forEach(exchange => {
      if (exchange.tradingHours?.utcOpen) {
        const [hours, minutes] = exchange.tradingHours.utcOpen.split(':').map(Number);
        const openTime = new Date(now);
        openTime.setUTCHours(hours, minutes, 0, 0);
        if (openTime > now) {
          const diff = openTime - now;
          if (diff < minTime) {
            minTime = diff;
            nextOpening = { name: exchange.fullName, flag: exchange.flag, opensIn: exchange.tradingHours.utcOpen + ' UTC', timeLeft: diff };
          }
        }
      }
    });

    return nextOpening || { name: t('closedPage.tomorrow'), opensIn: '07:00 UTC', isNextDay: true };
  };

  const nextMarket = getNextOpeningMarket();

  const formatTimeLeft = (ms) => {
    if (!ms) return '';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}${t('closedPage.minutes')}`;
  };

  const exchangesList = Object.values(AFRICAN_EXCHANGES).slice(0, 10);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', color: 'var(--ink)' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', paddingTop: '4rem', paddingBottom: '3rem', padding: '4rem 1rem 3rem' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--ink) 0%, #3A2E28 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 8px 32px rgba(26,20,16,0.2)',
        }}>
          <Moon style={{ width: '36px', height: '36px', color: 'var(--cream)' }} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(2rem,4vw,3rem)', color: 'var(--ink)', marginBottom: '0.5rem' }}>
          {t('closedPage.title')}
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--ink-mute)', marginBottom: '0.5rem' }}>
          {currentTime.toLocaleDateString(i18n.language || 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', color: 'var(--terracotta)', fontVariantNumeric: 'tabular-nums' }}>
          {currentTime.toLocaleTimeString(i18n.language || 'fr-FR')} ({t('closedPage.localTime')})
        </p>
      </div>

      {/* Next market opening */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem 3rem' }}>
        <div style={{
          background: 'rgba(30,77,58,0.06)',
          border: '1.5px solid rgba(30,77,58,0.2)',
          borderLeft: '4px solid var(--forest)',
          borderRadius: '16px',
          padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Sun style={{ width: '20px', height: '20px', color: 'var(--forest)' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--forest)' }}>
              {t('closedPage.nextOpening')}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--ink)', fontWeight: 500, marginBottom: '0.25rem' }}>
                {nextMarket.flag} {nextMarket.name}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ink-mute)' }}>
                {t('closedPage.openingAt')} {nextMarket.opensIn}
              </p>
            </div>
            {nextMarket.timeLeft && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', color: 'var(--forest)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {formatTimeLeft(nextMarket.timeLeft)}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{t('closedPage.remaining')}</p>
              </div>
            )}
          </div>
          {nextMarket.isWeekend && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem',
              background: 'rgba(232,170,11,0.1)', borderRadius: '10px',
              border: '1px solid rgba(232,170,11,0.25)',
            }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--sun)' }}>
                📅 {t('closedPage.weekendMessage')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Exchange schedule */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem 3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Clock style={{ width: '22px', height: '22px', color: 'var(--terracotta)' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.35rem', color: 'var(--ink)' }}>
            {t('closedPage.exchangeSchedule')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exchangesList.map(exchange => (
            <ExchangeCard
              key={exchange.id}
              exchange={exchange}
              selected={selectedExchange?.id === exchange.id}
              onClick={() => setSelectedExchange(selectedExchange?.id === exchange.id ? null : exchange)}
              t={t}
            />
          ))}
        </div>
      </div>

      {/* Last quotes */}
      {markets && markets.length > 0 && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem 3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <TrendingUp style={{ width: '22px', height: '22px', color: 'var(--forest)' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.35rem', color: 'var(--ink)' }}>
              {t('closedPage.lastQuotes')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {markets.slice(0, 8).map(market => (
              <div
                key={market.id}
                style={{
                  background: 'var(--cream-glow)',
                  border: '1.5px solid rgba(26,20,16,0.08)',
                  borderRadius: '14px', padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>
                    {market.name}
                  </h3>
                  <span style={{
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600,
                    background: market.positive ? 'rgba(30,77,58,0.1)' : 'rgba(194,73,22,0.1)',
                    color: market.positive ? 'var(--forest)' : 'var(--terracotta)',
                  }}>
                    {market.change}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
                  {market.value}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{market.country}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem 3rem' }}>
        <div style={{
          background: 'rgba(194,73,22,0.06)',
          border: '1.5px solid rgba(194,73,22,0.18)',
          borderRadius: '16px', padding: '2rem',
          textAlign: 'center',
        }}>
          <Bell style={{ width: '44px', height: '44px', color: 'var(--terracotta)', margin: '0 auto 1rem', display: 'block' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.35rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
            {t('closedPage.dontMiss')}
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.65 }}>
            {t('closedPage.alertDescription')}
          </p>
          <button
            onClick={onSetAlert}
            style={{
              padding: '0.75rem 2rem',
              background: 'var(--terracotta)', color: 'var(--cream)',
              border: 'none', borderRadius: '12px',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.95rem',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#8F3211'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
          >
            {t('closedPage.configureAlerts')}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{t('closedPage.disclaimer')}</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)', marginTop: '0.25rem' }}>
          © 2024 PENDO - African Financial Markets
        </p>
      </div>
    </div>
  );
};

const ExchangeCard = ({ exchange, selected, onClick, t }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--cream-glow)',
        border: selected || hovered ? '1.5px solid rgba(194,73,22,0.3)' : '1.5px solid rgba(26,20,16,0.08)',
        borderRadius: '14px', padding: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-warm)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
        <span style={{ fontSize: '2rem' }}>{exchange.flag}</span>
        <div>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>{exchange.code}</h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{exchange.country}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {[
          { label: t('closedPage.opening'), val: exchange.tradingHours?.open || 'N/A', color: 'var(--forest)' },
          { label: t('closedPage.closing'), val: exchange.tradingHours?.close || 'N/A', color: 'var(--terracotta)' },
          { label: t('closedPage.timezone'), val: exchange.tradingHours?.timezone || 'N/A', color: 'var(--ink-soft)' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, color }}>{val}</span>
          </div>
        ))}
      </div>

      {exchange.tradingDays?.length > 0 && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(26,20,16,0.07)', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {exchange.tradingDays.map((day, i) => (
            <span key={i} style={{
              padding: '0.15rem 0.5rem',
              background: 'var(--cream-deep)',
              borderRadius: '6px',
              fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-soft)',
            }}>
              {day}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketClosedPage;
