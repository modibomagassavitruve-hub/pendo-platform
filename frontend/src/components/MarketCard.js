import React, { useState, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Info,
  Clock,
  Building2,
  Globe,
  ChevronDown,
  ExternalLink,
  Zap,
  BarChart3,
  Activity
} from 'lucide-react';
import { getExchange, isMarketOpen } from '../data/africanExchanges';
import { translateMarketSector } from '../utils/contentTranslations';

// ── Sparkline helpers ────────────────────────────────────────────────────
function seededRand(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

function generateSparklineData(marketId, positive, n = 24) {
  const keySeed = String(marketId).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const dayEpoch = Math.floor(Date.now() / 86400000);
  const rand = seededRand((keySeed * 31337 + dayEpoch) >>> 0);
  const trend = positive ? 0.0025 : -0.0025;
  const pts = [100];
  for (let i = 1; i < n; i++) {
    pts.push(pts[i - 1] * (1 + trend + (rand() - 0.47) * 0.012));
  }
  return pts;
}

function buildSvgPath(pts, w, h) {
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const coords = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M${coords.join('L')}`;
}

const Sparkline = memo(({ marketId, positive }) => {
  const pts = useMemo(() => generateSparklineData(marketId, positive), [marketId, positive]);
  const W = 100, H = 36;
  const strokeColor = positive ? '#1E4D3A' : '#C24916';
  const fillId = `sf-${marketId}`;
  const d = buildSvgPath(pts, W, H);
  const fillPath = `${d}L${W},${H}L0,${H}Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${fillId})`} />
      <path d={d} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
});

const MarketCard = ({ market }) => {
  const { t, i18n } = useTranslation();
  const { id, name, country, value, change, positive, volume, source } = market;
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const exchangeInfo = getExchange(id);
  const marketOpen = exchangeInfo ? isMarketOpen(id) : null;
  const changePercent = change ? parseFloat(change.replace(/[^0-9.-]/g, '')) : 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--cream-glow)',
        border: `1.5px solid ${hovered ? 'var(--terracotta)' : 'transparent'}`,
        borderRadius: 'var(--radius-lg)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-warm)' : '0 2px 8px -2px rgba(26,20,16,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Accent barre couleur en haut */}
      <div style={{
        height: '3px',
        background: positive
          ? `linear-gradient(90deg, transparent, var(--forest), transparent)`
          : `linear-gradient(90deg, transparent, var(--terracotta), transparent)`,
        opacity: 0.6,
        transition: 'opacity 0.3s',
      }} />

      <div style={{ padding: '1.25rem 1.5rem' }}>
        {/* Ligne 1 : drapeau + nom + badge ouvert/fermé */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Drapeau dans cercle */}
            {exchangeInfo && (
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--cream-deep)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
              }}>
                {exchangeInfo.flag}
              </div>
            )}
            <div>
              {/* Code bourse en eyebrow */}
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-mute)',
                marginBottom: '0.2rem',
              }}>
                {id}
              </p>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.05rem',
                fontWeight: 500,
                color: 'var(--ink)',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}>
                {name}
              </h3>
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--ink-soft)',
                marginTop: '0.1rem',
              }}>
                {exchangeInfo?.countryCode
                  ? t(`countries.${exchangeInfo.countryCode}`, { defaultValue: country })
                  : country}
              </p>
            </div>
          </div>

          {/* Badge ouvert / fermé */}
          {marketOpen !== null && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '99px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              fontWeight: 500,
              letterSpacing: '0.06em',
              flexShrink: 0,
              background: marketOpen
                ? 'rgba(30, 77, 58, 0.1)'
                : 'rgba(26, 20, 16, 0.05)',
              color: marketOpen ? 'var(--forest)' : 'var(--ink-mute)',
              border: marketOpen
                ? '1px solid rgba(30, 77, 58, 0.2)'
                : '1px solid rgba(26, 20, 16, 0.1)',
            }}>
              <span style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: marketOpen ? 'var(--forest)' : 'var(--ink-mute)',
                animation: marketOpen ? 'pulse-dot 2s ease-in-out infinite' : 'none',
              }} />
              {marketOpen ? t('card.open') : t('card.closed')}
            </span>
          )}
        </div>

        {/* Valeur principale */}
        <div style={{ marginBottom: '1rem' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.5rem',
            fontWeight: 500,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {value}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
            {/* Variation */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
              color: positive ? 'var(--forest)' : 'var(--terracotta)',
            }}>
              {change === '—' ? '—' : <>{positive ? '▲' : '▼'} {change}</>}
            </span>

            {/* Volume */}
            {volume && volume !== 'N/A' && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--ink-mute)',
              }}>
                <Activity style={{ width: '0.75rem', height: '0.75rem' }} />
                {volume}
              </span>
            )}
          </div>
        </div>

        {/* Sparkline */}
        <div style={{ margin: '0.5rem 0 0.875rem', borderRadius: '8px', overflow: 'hidden' }}>
          <Sparkline marketId={id} positive={positive} />
        </div>

        {/* Bouton "Plus de détails" */}
        {exchangeInfo && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.5rem',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--ink-mute)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.04em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--cream-deep)';
                e.currentTarget.style.color = 'var(--terracotta)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--ink-mute)';
              }}
            >
              <Info style={{ width: '0.75rem', height: '0.75rem' }} />
              {expanded ? t('card.lessDetails') : t('card.moreDetails')}
              <ChevronDown style={{
                width: '0.75rem',
                height: '0.75rem',
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.3s',
              }} />
            </button>

            {/* Détails expandés */}
            <div style={{
              overflow: 'hidden',
              maxHeight: expanded ? '700px' : '0',
              opacity: expanded ? 1 : 0,
              transition: 'max-height 0.5s ease, opacity 0.4s ease',
              marginTop: expanded ? '0.75rem' : '0',
            }}>
              <div style={{
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(26, 20, 16, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}>
                <DetailRow icon={Clock} label={t('market.tradingHours')} value={`${exchangeInfo.tradingHours.open} – ${exchangeInfo.tradingHours.close} ${exchangeInfo.tradingHours.timezone}`} />
                <DetailRow icon={Building2} label={t('market.capitalization')} value={`${exchangeInfo?.marketCap?.usdDisplay || 'N/A'} · ${exchangeInfo.listedCompanies} ${t('card.companies')}`} />
                <DetailRow icon={Zap} label={t('market.tradingMechanism')} value={`${exchangeInfo.mechanism} · ${exchangeInfo.currency.code}`} />

                {/* Index principal */}
                <div style={{
                  padding: '0.65rem 0.85rem',
                  background: 'var(--cream-deep)',
                  borderRadius: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <BarChart3 style={{ width: '0.75rem', height: '0.75rem', color: 'var(--ink-mute)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {t('market.primaryIndex')}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 500 }}>
                    {exchangeInfo.primaryIndex.name}
                    <span style={{ color: 'var(--ink-mute)', marginLeft: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 400 }}>
                      ({exchangeInfo.primaryIndex.code})
                    </span>
                  </p>
                </div>

                {/* Secteurs */}
                <div style={{ paddingTop: '0.25rem' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    {t('market.keySectors')}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {exchangeInfo.topSectors.slice(0, 4).map((sector, i) => (
                      <span key={i} style={{
                        padding: '0.25rem 0.6rem',
                        background: 'var(--cream-deep)',
                        color: 'var(--ink-soft)',
                        borderRadius: '99px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        border: '1px solid rgba(26,20,16,0.08)',
                      }}>
                        {translateMarketSector(sector, i18n.language)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pays membres */}
                {exchangeInfo.memberCountries && (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    background: 'var(--cream-deep)',
                    borderRadius: '10px',
                  }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                      {t('card.memberCountries')}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {exchangeInfo.memberCountries.map((c, i) => (
                        <span key={i} title={c.name} style={{ fontSize: '1.25rem', cursor: 'default' }}>{c.flag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lien site officiel */}
                <a
                  href={exchangeInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem',
                    borderRadius: '10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--ink-mute)',
                    border: '1.5px solid rgba(26,20,16,0.1)',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--terracotta)';
                    e.currentTarget.style.color = 'var(--terracotta)';
                    e.currentTarget.style.background = 'rgba(194,73,22,0.05)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(26,20,16,0.1)';
                    e.currentTarget.style.color = 'var(--ink-mute)';
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  <Globe style={{ width: '0.875rem', height: '0.875rem' }} />
                  {exchangeInfo.website.replace('https://', '').replace('www.', '').split('/')[0]}
                  <ExternalLink style={{ width: '0.75rem', height: '0.75rem' }} />
                </a>
              </div>
            </div>
          </>
        )}

        {/* Pied de carte */}
        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.6rem',
          borderTop: '1px solid rgba(26, 20, 16, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', opacity: 0.7 }}>
            {source}
          </span>
          {exchangeInfo && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', opacity: 0.7 }}>
              <span style={{ color: 'var(--terracotta)' }}>#{exchangeInfo.rankAfrica}</span> {t('card.africa')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.6rem 0.75rem',
    background: 'var(--cream-deep)',
    borderRadius: '10px',
  }}>
    <div style={{
      padding: '0.35rem',
      background: 'rgba(194, 73, 22, 0.1)',
      borderRadius: '6px',
      flexShrink: 0,
    }}>
      <Icon style={{ width: '0.875rem', height: '0.875rem', color: 'var(--terracotta)' }} />
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </p>
    </div>
  </div>
);

const areEqual = (prevProps, nextProps) => (
  prevProps.market.id === nextProps.market.id &&
  prevProps.market.value === nextProps.market.value &&
  prevProps.market.change === nextProps.market.change &&
  prevProps.market.positive === nextProps.market.positive
);

export default memo(MarketCard, areEqual);
