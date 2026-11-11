import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocale } from '../utils/locale';
import {
  TrendingUp, TrendingDown, Activity, PieChart as PieChartIcon,
  BarChart3, Download, Calendar
} from 'lucide-react';
import { exportAnalyticsPDF } from '../utils/exportUtils';
import { SkeletonStatGrid, SkeletonChart } from './ui/SkeletonLoader';
import logger from '../utils/logger';

const AnalyticsTab = () => {
  const { t } = useTranslation();
  const { token, isAuthenticated } = useAuth();
  const [performanceData, setPerformanceData] = useState([]);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    if (isAuthenticated) loadAnalytics();
  }, [isAuthenticated, timeRange]);

  const loadAnalytics = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [summaryRes, performanceRes] = await Promise.all([
        fetch(`${API_URL}/portfolio/summary`, { headers }),
        fetch(`${API_URL}/portfolio/performance?days=${timeRange}`, { headers })
      ]);
      for (const r of [summaryRes, performanceRes]) {
        if (!r.ok) throw new Error(`HTTP ${r.status} on ${r.url}`);
      }
      const [summaryData, performanceData] = await Promise.all([
        summaryRes.json(), performanceRes.json()
      ]);
      if (summaryData.success && summaryData.data) {
        const data = summaryData.data;
        if (!data.holdings) data.holdings = [];
        if (!data.summary) data.summary = { totalValue: 0, totalGainLossPercent: 0 };
        setPortfolioSummary(data);
      }
      if (performanceData.success) {
        setPerformanceData(Array.isArray(performanceData.data) ? performanceData.data : []);
      }
    } catch (error) {
      logger.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '0 XOF';
    return new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value);
  };

  const formatPercent = (value) => {
    if (!value) return '0%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const calculateStats = () => {
    if (!portfolioSummary) return null;
    const { summary, holdings = [] } = portfolioSummary;
    if (!holdings || !Array.isArray(holdings)) return null;

    const sectorAllocation = {};
    holdings.forEach(h => {
      const sector = h.sector || t('sectors.other');
      if (!sectorAllocation[sector]) sectorAllocation[sector] = { value: 0, count: 0 };
      sectorAllocation[sector].value += h.current_value || 0;
      sectorAllocation[sector].count += 1;
    });

    const topPerformers = [...holdings].sort((a, b) => (b.gain_loss_percent || 0) - (a.gain_loss_percent || 0)).slice(0, 5);
    const worstPerformers = [...holdings].sort((a, b) => (a.gain_loss_percent || 0) - (b.gain_loss_percent || 0)).slice(0, 5);

    return { sectorAllocation, topPerformers, worstPerformers, totalPositions: holdings.length, averageReturn: summary.totalGainLossPercent };
  };

  const stats = calculateStats();

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 1rem', textAlign: 'center' }}>
        <Activity style={{ width: '3rem', height: '3rem', color: 'var(--ink-mute)', opacity: 0.3, display: 'block', marginBottom: '1rem' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
          {t('auth.login')}
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', fontSize: '0.875rem' }}>
          {t('analytics.title')}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <SkeletonStatGrid count={4} />
        <SkeletonChart />
      </div>
    );
  }

  if (!portfolioSummary) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 1rem', textAlign: 'center' }}>
        <PieChartIcon style={{ width: '3rem', height: '3rem', color: 'var(--ink-mute)', opacity: 0.3, display: 'block', marginBottom: '1rem' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
          {t('analytics.title')}
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', fontSize: '0.875rem', marginBottom: '0.35rem' }}>
          {t('messages.noPosition')}
        </p>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', fontSize: '0.8rem' }}>
          {t('messages.startInvesting')}
        </p>
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
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>{t('analytics.title')}</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', color: 'var(--ink)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {t('analytics.subtitle')}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            aria-label={t('analytics.period', 'Période')}
            style={inputStyle}
          >
            <option value={7}>{t('analytics.period7d')}</option>
            <option value={30}>{t('analytics.period30d')}</option>
            <option value={90}>{t('analytics.period90d')}</option>
            <option value={365}>{t('analytics.period1y')}</option>
          </select>
          <button
            onClick={() => portfolioSummary && exportAnalyticsPDF(portfolioSummary, performanceData, timeRange)}
            disabled={!portfolioSummary}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            <Download style={{ width: '1rem', height: '1rem' }} />
            {t('analytics.exportPdf')}
          </button>
        </div>
      </div>

      {stats && (
        <>
          {/* Key stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: t('analytics.averageReturn'),
                value: formatPercent(stats.averageReturn),
                color: stats.averageReturn >= 0 ? 'var(--forest)' : 'var(--terracotta)',
                icon: stats.averageReturn >= 0 ? TrendingUp : TrendingDown,
              },
              { label: t('analytics.activePositions'), value: stats.totalPositions, color: 'var(--ink)', icon: PieChartIcon },
              { label: t('analytics.sectors'), value: Object.keys(stats.sectorAllocation).length, color: 'var(--ink)', icon: BarChart3 },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>{s.label}</span>
                  <s.icon style={{ width: '1.1rem', height: '1.1rem', color: s.color }} />
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1.75rem', color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Sector allocation */}
          <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChartIcon style={{ width: '1.1rem', height: '1.1rem', color: 'var(--terracotta)' }} />
              {t('analytics.sectorAllocation')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(stats.sectorAllocation).map(([sector, data]) => {
                const percentage = (data.value / portfolioSummary.summary.totalValue * 100);
                return (
                  <div key={sector}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{sector}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '0.8rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(data.value)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', background: 'var(--cream-deep)', borderRadius: '99px', height: '6px' }}>
                      <div style={{
                        background: 'linear-gradient(90deg, var(--terracotta) 0%, var(--terracotta-soft) 100%)',
                        height: '6px', borderRadius: '99px',
                        width: `${percentage}%`,
                        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top & Worst performers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PerformersCard
              title={t('analytics.topPerformers')}
              icon={TrendingUp}
              iconColor="var(--forest)"
              performers={stats.topPerformers}
              positive={true}
              formatPercent={formatPercent}
              formatCurrency={formatCurrency}
            />
            <PerformersCard
              title={t('analytics.worstPerformers')}
              icon={TrendingDown}
              iconColor="var(--terracotta)"
              performers={stats.worstPerformers}
              positive={false}
              formatPercent={formatPercent}
              formatCurrency={formatCurrency}
            />
          </div>

          {/* Performance history bar chart */}
          {performanceData.length > 0 && (
            <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity style={{ width: '1.1rem', height: '1.1rem', color: 'var(--terracotta)' }} />
                {t('analytics.valueEvolution')}
              </h3>
              <div style={{ height: '256px', display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', overflowX: 'auto' }}>
                {performanceData.map((point, idx) => {
                  const maxValue = Math.max(...performanceData.map(p => p.total_value));
                  const height = (point.total_value / maxValue) * 100;
                  const isPositive = point.total_gain_loss >= 0;

                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}
                      className="group"
                    >
                      <div
                        style={{
                          width: '100%',
                          height: `${height}%`,
                          background: isPositive
                            ? 'linear-gradient(to top, var(--forest), rgba(30,77,58,0.6))'
                            : 'linear-gradient(to top, var(--terracotta), rgba(194,73,22,0.6))',
                          borderRadius: '3px 3px 0 0',
                          transition: 'opacity 0.15s',
                          cursor: 'pointer',
                        }}
                        title={`${new Date(point.date).toLocaleDateString(getLocale())} — ${formatCurrency(point.total_value)} (${formatPercent(point.total_gain_loss_percent)})`}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)' }}>
                <span>{performanceData[0] && new Date(performanceData[0].date).toLocaleDateString(getLocale())}</span>
                <span>{performanceData[performanceData.length - 1] && new Date(performanceData[performanceData.length - 1].date).toLocaleDateString(getLocale())}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PerformersCard = ({ title, icon: Icon, iconColor, performers, positive, formatPercent, formatCurrency }) => (
  <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Icon style={{ width: '1.1rem', height: '1.1rem', color: iconColor }} />
      {title}
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {performers.map((holding, idx) => (
        <div key={idx} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.65rem 0.85rem',
          background: positive ? 'rgba(30,77,58,0.06)' : 'rgba(194,73,22,0.06)',
          border: positive ? '1px solid rgba(30,77,58,0.12)' : '1px solid rgba(194,73,22,0.12)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--ink)' }}>{holding.market_id}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', marginTop: '0.1rem' }}>{holding.stock_name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.85rem', color: positive ? 'var(--forest)' : 'var(--terracotta)', fontVariantNumeric: 'tabular-nums' }}>
              {formatPercent(holding.gain_loss_percent)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: positive ? 'var(--forest)' : 'var(--terracotta)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(holding.gain_loss)}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default React.memo(AnalyticsTab);
