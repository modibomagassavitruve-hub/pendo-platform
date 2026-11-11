import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import React, { useState, useEffect, useMemo } from 'react';
import { getLocale } from '../utils/locale';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import logger from '../utils/logger';

const StockChart = ({ marketId, currentValue, change, positive }) => {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState('1M');
  // rawItems holds unformatted API data; formatted display values are derived via useMemo
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawStats, setRawStats] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/markets/${marketId}/history?period=${period}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();

        const historyData = result.data?.data || result.data;
        if (result.success && historyData && historyData.length > 0) {
          // Store raw numeric values only — locale formatting happens in useMemo
          setRawItems(historyData.map(item => ({
            timestamp: item.timestamp,
            value: item.close,
            open: item.open,
            high: item.high,
            low: item.low,
            volume: item.volume,
          })));

          const values = historyData.map(d => d.close).filter(v => v);
          setRawStats({
            min: Math.min(...values),
            max: Math.max(...values),
            open: historyData[0]?.close,
            close: historyData[historyData.length - 1]?.close,
            change: ((historyData[historyData.length - 1]?.close - historyData[0]?.close) / historyData[0]?.close * 100).toFixed(2)
          });
        } else {
          const errorMessage = typeof result.error === 'object'
            ? result.error.message || t('messages.noData')
            : result.error || t('messages.noData');
          setError(errorMessage);
          setRawItems([]);
        }
      } catch (err) {
        logger.error('Erreur chargement historique:', err);
        setError(t('messages.loadingError'));
        setRawItems([]);
      } finally {
        setLoading(false);
      }
    };

    if (marketId) fetchHistory();
  }, [marketId, period]);

  const formatDate = (date, per, locale) => {
    if (!date) return '';
    switch (per) {
      case '1D': return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      case '1W': return date.toLocaleDateString(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      case '1M':
      case '3M': return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
      case '6M':
      case '1Y': return date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
      case '5Y': return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
      default: return date.toLocaleDateString(locale);
    }
  };

  // Re-format display values whenever language or data changes (no extra network call)
  const locale = getLocale();
  const data = useMemo(() => {
    const loc = getLocale();
    return rawItems.map(item => ({
      ...item,
      date: new Date(item.timestamp),
      displayValue: item.value?.toLocaleString(loc, { maximumFractionDigits: 2 }),
      displayDate: formatDate(new Date(item.timestamp), period, loc),
    }));
  }, [rawItems, period, i18n.language]); // i18n.language triggers re-format on locale change

  const stats = useMemo(() => {
    if (!rawStats) return null;
    return { ...rawStats };
  }, [rawStats, i18n.language]); // i18n.language triggers re-render for locale-formatted values

  // Couleurs pastel : vert forêt hausse, terracotta baisse
  const chartColor = positive ? '#1E4D3A' : '#C24916';
  const gradientId = `gradient-${marketId}`;

  const periods = [
    { value: '1D', label: t('chart.1d') },
    { value: '1W', label: t('chart.5d') },
    { value: '1M', label: t('chart.1m') },
    { value: '3M', label: t('chart.3m') },
    { value: '6M', label: t('chart.6m') },
    { value: '1Y', label: t('chart.1y') },
    { value: '5Y', label: t('chart.5y') }
  ];

  // Tooltip personnalisé — fond ink, texte crème, mono pour les chiffres
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div style={{
          background: 'var(--ink)',
          color: 'var(--cream)',
          borderRadius: '8px',
          padding: '0.65rem 0.85rem',
          boxShadow: 'var(--shadow-deep)',
          border: '1px solid rgba(250,243,232,0.1)',
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(250,243,232,0.55)', marginBottom: '0.35rem' }}>
            {item.displayDate}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}>
            {item.displayValue}
          </p>
          {item.high && item.low && (
            <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(30,77,58,0.9)' }}>
                {t('chart.high')}: {item.high?.toLocaleString(getLocale(), { maximumFractionDigits: 2 })}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(194,73,22,0.9)' }}>
                {t('chart.low')}: {item.low?.toLocaleString(getLocale(), { maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      background: 'var(--cream-deep)',
      borderRadius: 'var(--radius-md)',
      padding: '1.25rem',
      border: '1.5px solid rgba(26,20,16,0.08)',
    }}>
      {/* Header avec sélecteur de période */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1rem', color: 'var(--ink)' }}>
            {t('chart.priceEvolution')}
          </h3>
          {data.length > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>
              ({t('chart.points', { count: data.length })})
            </span>
          )}
        </div>

        {/* Pills de période */}
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '99px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                fontWeight: 500,
                letterSpacing: '0.04em',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: period === p.value ? 'var(--ink)' : 'var(--cream-glow)',
                color: period === p.value ? 'var(--cream)' : 'var(--ink-mute)',
                boxShadow: period === p.value ? 'var(--shadow-warm)' : 'none',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Zone graphique */}
      <div style={{ height: '256px' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <Loader2 style={{ width: '2rem', height: '2rem', color: 'var(--terracotta)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', fontSize: '0.875rem' }}>
              {t('chart.loadingData')}
            </span>
          </div>
        ) : error ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <AlertCircle style={{ width: '2rem', height: '2rem', color: 'var(--sun)' }} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{error}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', opacity: 0.6 }}>
              {t('chart.yahooFinanceUnavailable')}
            </p>
          </div>
        ) : data.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', fontSize: '0.875rem' }}>
              {t('chart.noDataAvailable')}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,16,0.08)" vertical={false} />
              <XAxis
                dataKey="displayDate"
                tick={{ fill: 'var(--ink-mute)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                axisLine={{ stroke: 'rgba(26,20,16,0.1)' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'var(--ink-mute)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                axisLine={{ stroke: 'rgba(26,20,16,0.1)' }}
                tickLine={false}
                tickFormatter={(v) => v?.toLocaleString(getLocale(), { notation: 'compact', maximumFractionDigits: 0 })}
                domain={['auto', 'auto']}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: chartColor, stroke: 'var(--cream-glow)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats rapides */}
      {stats && !loading && !error && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.75rem',
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(26,20,16,0.08)',
        }}>
          {[
            { label: t('chart.opening'), value: stats.open?.toLocaleString(getLocale(), { maximumFractionDigits: 2 }), color: 'var(--ink-soft)' },
            { label: t('chart.highest'), value: stats.max?.toLocaleString(getLocale(), { maximumFractionDigits: 2 }), color: 'var(--forest)' },
            { label: t('chart.lowest'), value: stats.min?.toLocaleString(getLocale(), { maximumFractionDigits: 2 }), color: 'var(--terracotta)' },
            {
              label: t('exchange.variation'),
              value: `${stats.change}%`,
              color: parseFloat(stats.change) >= 0 ? 'var(--forest)' : 'var(--terracotta)',
              icon: parseFloat(stats.change) >= 0 ? TrendingUp : TrendingDown,
            },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                {stat.label}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '0.85rem', color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', fontVariantNumeric: 'tabular-nums' }}>
                {stat.icon && <stat.icon style={{ width: '0.75rem', height: '0.75rem' }} />}
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Source */}
      <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', opacity: 0.6 }}>
          📊 {t('chart.historicalDataYahooFinance')}
        </p>
      </div>
    </div>
  );
};

export default StockChart;
