import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import {
  TrendingUp, TrendingDown, Bell, Briefcase,
  Newspaper, Sparkles, Globe, Activity,
  ArrowRight, RefreshCw, AlertTriangle, LogIn,
  BarChart3, Clock, ChevronRight, Minus,
  DollarSign, PieChart, Zap, Layers
} from 'lucide-react';
import logger from '../utils/logger';

// ── Helpers ─────────────────────────────────────────────────────────────────

const formatValue = (v, currency = '', locale = 'fr-FR') => {
  if (v === undefined || v === null) return '–';
  const n = parseFloat(v);
  if (isNaN(n)) return '–';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}Md ${currency}`.trim();
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M ${currency}`.trim();
  if (abs >= 1e3) return `${n.toLocaleString(locale, { maximumFractionDigits: 2 })} ${currency}`.trim();
  return `${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`.trim();
};

// timeAgo is called inside component with t() — kept as helper
const makeTimeAgo = (t) => (dateStr) => {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return t('dashboard.justNow');
  if (diff < 3600) return t('dashboard.minutesAgo', { count: Math.floor(diff / 60) });
  if (diff < 86400) return t('dashboard.hoursAgo', { count: Math.floor(diff / 3600) });
  return t('dashboard.daysAgo', { count: Math.floor(diff / 86400) });
};

const ChangeChip = ({ value, small }) => {
  const n = parseFloat(value);
  const pos = !isNaN(n) ? n >= 0 : String(value).includes('+');
  // Pas de variation connue (donnée non actualisée) : affichage neutre « — »
  const zero = isNaN(n) ? !String(value ?? '').includes('+') : n === 0;
  const Icon = zero ? Minus : pos ? TrendingUp : TrendingDown;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
      padding: small ? '0.1rem 0.35rem' : '0.2rem 0.5rem',
      borderRadius: '999px',
      fontSize: small ? '0.65rem' : '0.75rem',
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      background: zero ? 'rgba(26,20,16,0.06)' : pos ? 'rgba(30,77,58,0.1)' : 'rgba(194,73,22,0.1)',
      color: zero ? 'var(--ink-mute)' : pos ? 'var(--forest)' : 'var(--terracotta)',
    }}>
      <Icon style={{ width: small ? 9 : 11, height: small ? 9 : 11 }} />
      {!isNaN(n) ? `${pos ? '+' : ''}${n.toFixed(2)}%` : (value ?? '—')}
    </span>
  );
};

// ── Skeleton ─────────────────────────────────────────────────────────────────
const Skel = ({ w = '100%', h = '1rem', r = '6px' }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'var(--cream-deep)', animation: 'pulse 1.5s ease-in-out infinite' }} />
);

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, sub, subColor, loading }) => (
  <div style={{
    background: 'var(--cream-glow)',
    border: '1.5px solid rgba(26,20,16,0.07)',
    borderRadius: '16px',
    padding: '1.1rem 1.25rem',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '10px',
        background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: 18, height: 18, color: iconColor }} />
      </div>
    </div>
    {loading ? <Skel w="60%" h="1.75rem" /> : (
      <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.35rem', color: 'var(--ink)', margin: 0, lineHeight: 1 }}>
        {value}
      </p>
    )}
    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink-mute)', margin: 0 }}>{label}</p>
    {sub && !loading && (
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: subColor || 'var(--ink-mute)', margin: 0 }}>{sub}</p>
    )}
  </div>
);

// ── Market row card (compact) ─────────────────────────────────────────────────
const MarketRow = ({ market, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.65rem 0.85rem',
      background: 'transparent',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      width: '100%',
      transition: 'background 0.15s',
      textAlign: 'left',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-deep)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '8px',
        background: market.positive ? 'rgba(30,77,58,0.08)' : 'rgba(194,73,22,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {market.positive
          ? <TrendingUp style={{ width: 15, height: 15, color: 'var(--forest)' }} />
          : <TrendingDown style={{ width: 15, height: 15, color: 'var(--terracotta)' }} />}
      </div>
      <div>
        <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--ink)', margin: 0 }}>
          {market.code || market.id?.toUpperCase()}
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--ink-mute)', margin: 0 }}>
          {market.country}
        </p>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.82rem', color: 'var(--ink)', margin: 0 }}>
        {market.indexValue || (market.rawValue?.toLocaleString(undefined, { maximumFractionDigits: 2 }))}
      </p>
      <ChangeChip value={market.changePercent ?? market.change} small />
    </div>
  </button>
);

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, action, onAction }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Icon style={{ width: 16, height: 16, color: 'var(--terracotta)' }} />
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '0.95rem', color: 'var(--ink)', margin: 0 }}>
        {title}
      </h3>
    </div>
    {action && (
      <button
        onClick={onAction}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.25rem',
          fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--terracotta)',
          background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem',
          borderRadius: '6px', transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(194,73,22,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        {action} <ChevronRight style={{ width: 13, height: 13 }} />
      </button>
    )}
  </div>
);

// ── Card wrapper ──────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{
    background: 'var(--cream-glow)',
    border: '1.5px solid rgba(26,20,16,0.07)',
    borderRadius: '18px',
    padding: '1.25rem',
    ...style,
  }}>
    {children}
  </div>
);

// ── CTA connexion ─────────────────────────────────────────────────────────────
const LoginCTA = ({ onOpenLogin }) => {
  const { t } = useTranslation();
  return (
    <Card style={{ background: 'linear-gradient(135deg, rgba(194,73,22,0.06), rgba(232,170,11,0.04))', border: '1.5px solid rgba(194,73,22,0.15)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem', padding: '0.5rem 0' }}>
        <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'rgba(194,73,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Briefcase style={{ width: 24, height: 24, color: 'var(--terracotta)' }} />
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1rem', color: 'var(--ink)', margin: '0 0 0.35rem' }}>
            {t('dashboard.personalizedDashboard')}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-mute)', margin: 0, lineHeight: 1.6 }}>
            {t('dashboard.loginCTADesc')}
          </p>
        </div>
        <button onClick={onOpenLogin} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--terracotta)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--ink)'}
        >
          <LogIn style={{ width: 16, height: 16 }} />
          {t('dashboard.signIn')}
        </button>
      </div>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DashboardTab
// ═══════════════════════════════════════════════════════════════════════════════
const DashboardTab = ({ markets: marketsProp, apiStatus, setActiveTab, onOpenLogin }) => {
  // Guard against null/undefined — useMarkets() can return null before first load
  const markets = Array.isArray(marketsProp) ? marketsProp : [];
  const { isAuthenticated, user, token } = useAuth();
  const { t, i18n } = useTranslation();

  const lang = (i18n.language || 'fr').slice(0, 2);

  const [portfolio, setPortfolio] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [news, setNews] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [marketAnomalies, setMarketAnomalies] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  // ── Fetch public data (news + opportunities + anomalies) ────────────────
  const loadPublicData = useCallback(async () => {
    setLoadingPublic(true);
    try {
      const [newsRes, oppRes, anomaliesRes] = await Promise.all([
        fetch(`${API_URL}/news?limit=4&lang=${lang}`).catch(() => null),
        fetch(`${API_URL}/opportunities?limit=3&lang=${lang}`).catch(() => null),
        fetch(`${API_URL}/market-anomalies?limit=6`).catch(() => null),
      ]);
      if (newsRes?.ok) {
        const d = await newsRes.json();
        // /api/news returns d.data as a direct array
        const items = Array.isArray(d.data) ? d.data
          : Array.isArray(d.data?.items) ? d.data.items
          : [];
        setNews(items);
      }
      if (oppRes?.ok) {
        const d = await oppRes.json();
        // /api/opportunities returns d.data.opportunities as the array
        const items = Array.isArray(d.data?.opportunities) ? d.data.opportunities
          : Array.isArray(d.data?.items) ? d.data.items
          : Array.isArray(d.data) ? d.data
          : [];
        setOpportunities(items);
      }
      if (anomaliesRes?.ok) {
        const d = await anomaliesRes.json();
        setMarketAnomalies(Array.isArray(d.data) ? d.data : []);
      }
    } catch (e) {
      logger.error('Dashboard public data error:', e);
    } finally {
      setLoadingPublic(false);
    }
  }, [i18n.language]);

  // ── Fetch authenticated data ────────────────────────────────────────────
  const loadAuthData = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    setLoadingAuth(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [portRes, watchRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/portfolio/summary`, { headers }).catch(() => null),
        fetch(`${API_URL}/portfolio/watchlist`, { headers }).catch(() => null),
        fetch(`${API_URL}/portfolio/alerts`, { headers }).catch(() => null),
      ]);
      if (portRes?.ok) { const d = await portRes.json(); setPortfolio(d.data || d); }
      if (watchRes?.ok) { const d = await watchRes.json(); setWatchlist(d.data?.items || d.data || []); }
      if (alertsRes?.ok) { const d = await alertsRes.json(); setAlerts(d.data?.items || d.data || []); }
    } catch (e) {
      logger.error('Dashboard auth data error:', e);
    } finally {
      setLoadingAuth(false);
      setLastRefresh(new Date());
    }
  }, [isAuthenticated, token]);

  useEffect(() => { loadPublicData(); }, [loadPublicData]);
  useEffect(() => { loadAuthData(); }, [loadAuthData]);

  const timeAgo = makeTimeAgo(t);

  const handleRefresh = () => {
    loadPublicData();
    loadAuthData();
  };

  // ── Computed ─────────────────────────────────────────────────────────────
  const openMarketsCount = markets.filter(m => m.status === 'open').length;

  const topMovers = [...markets]
    .filter(m => m.changePercent !== undefined && m.changePercent !== null)
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 6);

  // Markets the user watches (by watchlist stock exchanges)
  const watchlistExchangeIds = [...new Set(watchlist.map(w => w.exchange).filter(Boolean))];
  const myMarkets = watchlistExchangeIds.length > 0
    ? markets.filter(m => watchlistExchangeIds.includes(m.id))
    : markets.slice(0, 5);

  const activeAlerts = alerts.filter(a => a.active !== false);

  const portfolioGainPos = portfolio?.totalGain >= 0;
  const todayPnlPos = portfolio?.todayGain >= 0;

  // ── Current time ─────────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const greeting = () => {
    const h = now.getHours();
    if (h < 6) return t('dashboard.greeting.night');
    if (h < 12) return t('dashboard.greeting.morning');
    if (h < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  const locale = i18n.language.startsWith('ar') ? 'ar-SA' : i18n.language.startsWith('fr') ? 'fr-FR' : i18n.language.startsWith('de') ? 'de-DE' : i18n.language.startsWith('es') ? 'es-ES' : i18n.language.startsWith('pt') ? 'pt-PT' : 'en-US';
  const dateLabel = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--ink)', margin: 0 }}>
            {isAuthenticated && user?.name
              ? `${greeting()}, ${user.name.split(' ')[0]}`
              : t('dashboard.title')}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-mute)', margin: '0.2rem 0 0' }}>
            {dateLabel}
            {openMarketsCount > 0 && (
              <span style={{ marginLeft: '0.75rem', color: 'var(--forest)', fontWeight: 600 }}>
                · {t('dashboard.marketsOpen', { count: openMarketsCount })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          title={t('dashboard.refresh')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1rem',
            background: 'var(--cream-glow)',
            border: '1.5px solid rgba(26,20,16,0.08)',
            borderRadius: '10px',
            fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-soft)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(194,73,22,0.3)'; e.currentTarget.style.color = 'var(--terracotta)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(26,20,16,0.08)'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} />
          {lastRefresh ? timeAgo(lastRefresh) : t('dashboard.refresh')}
        </button>
      </div>

      {/* ── Stat cards row ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {isAuthenticated ? (
          <>
            <StatCard
              icon={Briefcase}
              iconBg="rgba(194,73,22,0.1)" iconColor="var(--terracotta)"
              label={t('dashboard.portfolioValue')}
              value={portfolio ? formatValue(portfolio.totalValue, portfolio.currency || '', locale) : '–'}
              sub={portfolio ? t('dashboard.positions', { count: portfolio.holdingsCount || 0 }) : ''}
              loading={loadingAuth}
            />
            <StatCard
              icon={TrendingUp}
              iconBg={portfolioGainPos ? 'rgba(30,77,58,0.1)' : 'rgba(194,73,22,0.1)'}
              iconColor={portfolioGainPos ? 'var(--forest)' : 'var(--terracotta)'}
              label={t('dashboard.totalGainLoss')}
              value={portfolio ? `${portfolioGainPos ? '+' : ''}${formatValue(portfolio.totalGain, '', locale)}` : '–'}
              sub={portfolio?.totalGainPercent !== undefined ? `${portfolioGainPos ? '+' : ''}${parseFloat(portfolio.totalGainPercent).toFixed(2)}%` : ''}
              subColor={portfolioGainPos ? 'var(--forest)' : 'var(--terracotta)'}
              loading={loadingAuth}
            />
            <StatCard
              icon={Bell}
              iconBg="rgba(232,170,11,0.1)" iconColor="#9A6E00"
              label={t('dashboard.activeAlerts')}
              value={loadingAuth ? '–' : activeAlerts.length}
              sub={activeAlerts.length > 0 ? t('dashboard.viewAlerts') : t('dashboard.noAlert')}
              loading={loadingAuth}
            />
            <StatCard
              icon={Globe}
              iconBg="rgba(30,77,58,0.08)" iconColor="var(--forest)"
              label={t('dashboard.trackedMarkets')}
              value={myMarkets.length}
              sub={openMarketsCount > 0 ? t('dashboard.openCount', { count: openMarketsCount }) : t('dashboard.allClosed')}
              loading={false}
            />
          </>
        ) : (
          <>
            <StatCard icon={Globe} iconBg="rgba(194,73,22,0.1)" iconColor="var(--terracotta)" label={t('dashboard.africanExchanges')} value={markets.length} loading={false} />
            <StatCard icon={TrendingUp} iconBg="rgba(30,77,58,0.08)" iconColor="var(--forest)" label={t('dashboard.openMarkets')} value={openMarketsCount} loading={false} />
            <StatCard icon={Activity} iconBg="rgba(232,170,11,0.1)" iconColor="#9A6E00" label={t('dashboard.liveData')} value={markets.filter(m => !m.stale).length} sub={t('dashboard.exchangesCovered')} loading={false} />
            <StatCard icon={BarChart3} iconBg="rgba(194,73,22,0.08)" iconColor="var(--terracotta)" label={t('dashboard.activeOpportunities')} value={opportunities.length || '–'} loading={loadingPublic} />
          </>
        )}
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>

        {/* Mes marchés / Top marchés */}
        <Card>
          <SectionHeader
            icon={Globe}
            title={isAuthenticated && watchlistExchangeIds.length > 0 ? t('dashboard.myMarkets') : t('dashboard.africanMarkets')}
            action={t('dashboard.viewAll')}
            onAction={() => setActiveTab('markets')}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            {markets.length === 0
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ padding: '0.65rem 0' }}><Skel h="2rem" /></div>)
              : myMarkets.slice(0, 6).map(m => (
                <MarketRow key={m.id} market={m} onClick={() => setActiveTab('markets')} />
              ))
            }
          </div>
          {isAuthenticated && watchlistExchangeIds.length === 0 && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)', margin: '0.75rem 0 0', textAlign: 'center' }}>
              {t('dashboard.addWatchlistHint')}
            </p>
          )}
        </Card>

        {/* Top mouvements */}
        <Card>
          <SectionHeader icon={Activity} title={t('dashboard.topMovers')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {topMovers.length === 0
              ? Array.from({ length: 6 }).map((_, i) => <Skel key={i} h="3.5rem" r="10px" />)
              : topMovers.map(m => (
                <button
                  key={m.id}
                  onClick={() => setActiveTab('markets')}
                  style={{
                    padding: '0.65rem 0.75rem',
                    background: m.positive ? 'rgba(30,77,58,0.05)' : 'rgba(194,73,22,0.05)',
                    border: `1.5px solid ${m.positive ? 'rgba(30,77,58,0.12)' : 'rgba(194,73,22,0.12)'}`,
                    borderRadius: '10px',
                    textAlign: 'left', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--ink)', margin: '0 0 0.2rem' }}>
                    {m.code || m.id?.toUpperCase()}
                  </p>
                  <ChangeChip value={m.changePercent} small />
                </button>
              ))}
          </div>
        </Card>

        {/* Alertes de marché (anomalies statistiques) */}
        <Card>
          <SectionHeader icon={Zap} title={t('dashboard.marketAlerts')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {loadingPublic
              ? Array.from({ length: 3 }).map((_, i) => <Skel key={i} h="2.75rem" r="10px" />)
              : marketAnomalies.length === 0
              ? (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-mute)', textAlign: 'center', padding: '1rem 0' }}>
                  {t('dashboard.noAnomalies')}
                </p>
              )
              : marketAnomalies.slice(0, 5).map((a) => {
                  const severityColor = a.severity === 'critical'
                    ? { bg: 'rgba(194,73,22,0.09)', border: 'rgba(194,73,22,0.22)', c: 'var(--terracotta)' }
                    : a.severity === 'high'
                    ? { bg: 'rgba(232,170,11,0.1)', border: 'rgba(232,170,11,0.22)', c: '#9A6E00' }
                    : { bg: 'rgba(26,20,16,0.04)', border: 'rgba(26,20,16,0.08)', c: 'var(--ink-mute)' };
                  return (
                    <button
                      key={a.stock_id}
                      onClick={() => setActiveTab('markets')}
                      title={t('dashboard.anomalyBadge')}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.55rem 0.75rem',
                        background: severityColor.bg,
                        border: `1.5px solid ${severityColor.border}`,
                        borderRadius: '10px',
                        cursor: 'pointer', width: '100%', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <AlertTriangle style={{ width: 13, height: 13, color: severityColor.c, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem', color: 'var(--ink)' }}>
                          {a.ticker}
                        </span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--ink-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: severityColor.c, fontWeight: 700 }}>
                          z={a.z_score}
                        </span>
                        <ChangeChip value={a.change_percent} small />
                      </div>
                    </button>
                  );
                })
            }
          </div>
        </Card>
      </div>

      {/* ── Alertes actives (authenticated only) ────────────────────────── */}
      {isAuthenticated && !loadingAuth && activeAlerts.length > 0 && (
        <Card style={{ marginBottom: '1.25rem' }}>
          <SectionHeader
            icon={Bell}
            title={t('dashboard.activePriceAlerts')}
            action={t('dashboard.manageAlerts')}
            onAction={() => setActiveTab('notifications')}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            {activeAlerts.slice(0, 6).map((alert, i) => (
              <div key={alert.id || i} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.85rem',
                background: 'rgba(232,170,11,0.08)',
                border: '1.5px solid rgba(232,170,11,0.2)',
                borderRadius: '10px',
              }}>
                <AlertTriangle style={{ width: 13, height: 13, color: '#9A6E00', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--ink)', fontWeight: 600 }}>
                  {alert.ticker}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--ink-mute)' }}>
                  {alert.condition === 'above' ? '≥' : '≤'} {formatValue(alert.targetPrice, alert.currency, locale)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Watchlist stocks (authenticated) ────────────────────────────── */}
      {isAuthenticated && !loadingAuth && watchlist.length > 0 && (
        <Card style={{ marginBottom: '1.25rem' }}>
          <SectionHeader
            icon={PieChart}
            title={t('dashboard.watchlist')}
            action={t('dashboard.portfolioLink')}
            onAction={() => setActiveTab('portfolio')}
          />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(26,20,16,0.07)' }}>
                  {[t('dashboard.tableHeaders.ticker'), t('dashboard.tableHeaders.name'), t('dashboard.tableHeaders.price'), t('dashboard.tableHeaders.change'), t('dashboard.tableHeaders.target'), t('dashboard.tableHeaders.distance')].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: 'var(--ink-mute)', fontWeight: 500, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {watchlist.slice(0, 8).map((w, i) => {
                  const distPct = w.targetPrice && w.currentPrice
                    ? (((w.targetPrice - w.currentPrice) / w.currentPrice) * 100).toFixed(1)
                    : null;
                  return (
                    <tr key={w.id || i} style={{ borderBottom: '1px solid rgba(26,20,16,0.04)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-deep)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.55rem 0.6rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink)' }}>{w.ticker}</span>
                      </td>
                      <td style={{ padding: '0.55rem 0.6rem', color: 'var(--ink-soft)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name || '–'}</td>
                      <td style={{ padding: '0.55rem 0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatValue(w.currentPrice, '', locale)}</td>
                      <td style={{ padding: '0.55rem 0.6rem' }}><ChangeChip value={w.changePercent} small /></td>
                      <td style={{ padding: '0.55rem 0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)' }}>{w.targetPrice ? formatValue(w.targetPrice, '', locale) : '–'}</td>
                      <td style={{ padding: '0.55rem 0.6rem' }}>
                        {distPct !== null
                          ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: parseFloat(distPct) > 0 ? 'var(--forest)' : 'var(--terracotta)', fontWeight: 600 }}>{parseFloat(distPct) > 0 ? '+' : ''}{distPct}%</span>
                          : <span style={{ color: 'var(--ink-mute)' }}>–</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Bottom grid: News + Opportunities ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>

        {/* Actualités */}
        <Card>
          <SectionHeader icon={Newspaper} title={t('dashboard.latestNews')} action={t('dashboard.allNews')} onAction={() => setActiveTab('news')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {loadingPublic
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem' }}>
                    <Skel w="56px" h="56px" r="8px" />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <Skel h="0.85rem" /><Skel w="60%" h="0.7rem" />
                    </div>
                  </div>
                ))
              : news.slice(0, 4).map((article, i) => (
                  <div key={article.id || i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    {article.image_url ? (
                      <img
                        src={article.image_url}
                        alt=""
                        loading="lazy"
                        style={{ width: 56, height: 56, borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: '8px', background: 'var(--cream-deep)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Newspaper style={{ width: 20, height: 20, color: 'var(--ink-mute)' }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.82rem', color: 'var(--ink)', margin: '0 0 0.2rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {article[`title_${lang}`] || article.title_fr || article.title_en || article.title}
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{article.source} · {timeAgo(article.published_at || article.publishedAt)}</span>
                        {article.related_count > 1 && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                            padding: '0.05rem 0.4rem', borderRadius: '999px',
                            background: 'rgba(26,20,16,0.06)', color: 'var(--ink-soft)',
                            fontWeight: 700, whiteSpace: 'nowrap',
                          }}>
                            <Layers style={{ width: 9, height: 9 }} />
                            {t('dashboard.multipleSources', { count: article.related_count })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
            }
            {!loadingPublic && news.length === 0 && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-mute)', textAlign: 'center', padding: '1rem 0' }}>
                {t('dashboard.noNewsAvailable')}
              </p>
            )}
          </div>
        </Card>

        {/* Opportunités */}
        <Card>
          <SectionHeader icon={Sparkles} title={t('dashboard.investmentOpportunities')} action={t('dashboard.viewAll')} onAction={() => setActiveTab('opportunities')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {loadingPublic
              ? Array.from({ length: 3 }).map((_, i) => <Skel key={i} h="5rem" r="10px" />)
              : opportunities.slice(0, 3).map((opp, i) => {
                  const riskColors = { low: { bg: 'rgba(30,77,58,0.08)', c: 'var(--forest)' }, medium: { bg: 'rgba(232,170,11,0.1)', c: '#9A6E00' }, high: { bg: 'rgba(194,73,22,0.08)', c: 'var(--terracotta)' } };
                  const rc = riskColors[opp.riskLevel || opp.risk_level] || riskColors.medium;
                  return (
                    <button
                      key={opp.id || i}
                      onClick={() => setActiveTab('opportunities')}
                      style={{
                        padding: '0.85rem', background: 'var(--cream-deep)',
                        border: '1.5px solid rgba(26,20,16,0.06)', borderRadius: '12px',
                        textAlign: 'left', cursor: 'pointer', width: '100%',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(194,73,22,0.25)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(26,20,16,0.06)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.82rem', color: 'var(--ink)', margin: 0, flex: 1, paddingRight: '0.5rem', lineHeight: 1.35 }}>
                          {opp.title}
                        </p>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700, background: rc.bg, color: rc.c, flexShrink: 0 }}>
                          {opp.riskLevel || opp.risk_level || 'medium'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--forest)', fontWeight: 700 }}>
                          {opp.expectedReturn || opp.expected_return}
                        </span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>
                          {opp.sector} · {opp.country}
                        </span>
                        {typeof opp.relevance_score === 'number' && (
                          <span
                            title={t('dashboard.relevanceScoreTooltip')}
                            style={{
                              marginLeft: 'auto', flexShrink: 0,
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                              padding: '0.1rem 0.45rem', borderRadius: '999px',
                              fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 700,
                              background: opp.relevance_score >= 55 ? 'rgba(30,77,58,0.09)' : 'rgba(232,170,11,0.1)',
                              color: opp.relevance_score >= 55 ? 'var(--forest)' : '#9A6E00',
                            }}
                          >
                            <Sparkles style={{ width: 9, height: 9 }} />
                            {opp.relevance_score}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
            }
            {!loadingPublic && opportunities.length === 0 && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-mute)', textAlign: 'center', padding: '1rem 0' }}>
                {t('dashboard.noOpportunitiesAvailable')}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* ── CTA connexion (visiteur) ─────────────────────────────────────── */}
      {!isAuthenticated && <LoginCTA onOpenLogin={onOpenLogin} />}

    </div>
  );
};

export default DashboardTab;
