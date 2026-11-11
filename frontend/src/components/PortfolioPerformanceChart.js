import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { getLocale } from '../utils/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import logger from '../utils/logger';

const PortfolioPerformanceChart = () => {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [period, setPeriod] = useState('30');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => { fetchPerformanceData(); }, [period, token]);

  const fetchPerformanceData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/portfolio/performance?days=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success && result.data) {
        const formattedData = result.data.map(item => ({
          date: item.date,
          displayDate: formatDate(item.date),
          totalValue: item.total_value,
          cashBalance: item.cash_balance,
          gain: item.total_gain_loss,
          gainPercent: item.total_gain_loss_percent
        }));
        setData(formattedData);
        if (formattedData.length > 0) {
          const firstValue = formattedData[0].totalValue;
          const lastValue = formattedData[formattedData.length - 1].totalValue;
          const maxValue = Math.max(...formattedData.map(d => d.totalValue));
          const minValue = Math.min(...formattedData.map(d => d.totalValue));
          const totalGain = lastValue - firstValue;
          setStats({
            firstValue, lastValue, maxValue, minValue, totalGain,
            totalGainPercent: ((totalGain / firstValue) * 100).toFixed(2),
            isPositive: totalGain >= 0
          });
        }
      }
    } catch (error) {
      logger.error('Erreur chargement performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString(getLocale(), { day: '2-digit', month: 'short' });

  const formatCurrency = (value) => new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(value);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.1)', borderRadius: '10px', padding: '0.75rem 1rem', boxShadow: 'var(--shadow-warm)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ink-mute)', marginBottom: '0.5rem' }}>{d.displayDate}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{t('performance.totalValue')}:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--ink)' }}>{formatCurrency(d.totalValue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{t('performance.cash')}:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--forest)' }}>{formatCurrency(d.cashBalance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{t('performance.gainLoss')}:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', color: d.gain >= 0 ? 'var(--forest)' : 'var(--terracotta)' }}>
                {d.gain >= 0 ? '+' : ''}{formatCurrency(d.gain)} ({d.gainPercent}%)
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const periods = [
    { value: '7', label: t('periods.7days') },
    { value: '30', label: t('periods.1month') },
    { value: '90', label: t('periods.3months') },
    { value: '180', label: t('periods.6months') },
    { value: '365', label: t('periods.1year') },
  ];

  if (loading) {
    return (
      <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '0.75rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid var(--cream-deep)', borderTopColor: 'var(--terracotta)', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)' }}>{t('messages.loadingData')}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', padding: '1.25rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Activity style={{ width: '20px', height: '20px', color: 'var(--terracotta)' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--ink)' }}>{t('performance.portfolioPerformance')}</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: period === p.value ? 'var(--terracotta)' : 'var(--cream-deep)',
                color: period === p.value ? 'var(--cream)' : 'var(--ink-mute)',
                fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.75rem',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ marginBottom: '1.25rem' }}>
          {[
            { label: t('performance.currentValue'), value: formatCurrency(stats.lastValue), color: 'var(--ink)' },
            { label: t('performance.periodVariation'), value: `${stats.isPositive ? '+' : ''}${stats.totalGainPercent}%`, color: stats.isPositive ? 'var(--forest)' : 'var(--terracotta)', icon: stats.isPositive ? <TrendingUp style={{ width: '14px', height: '14px' }} /> : <TrendingDown style={{ width: '14px', height: '14px' }} /> },
            { label: t('performance.highest'), value: formatCurrency(stats.maxValue), color: 'var(--forest)' },
            { label: t('performance.lowest'), value: formatCurrency(stats.minValue), color: 'var(--terracotta)' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ background: 'var(--cream-deep)', border: '1px solid rgba(26,20,16,0.06)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)', marginBottom: '0.3rem' }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {icon}{value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ height: '280px' }}>
        {data.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-mute)' }}>
            <Calendar style={{ width: '44px', height: '44px', marginBottom: '0.75rem', opacity: 0.4 }} />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>{t('messages.noHistoryData')}</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>{t('messages.startInvesting')}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C24916" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#C24916" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E4D3A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1E4D3A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,16,0.07)" vertical={false} />
              <XAxis dataKey="displayDate" stroke="rgba(26,20,16,0.2)" tick={{ fill: 'var(--ink-mute)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={{ stroke: 'rgba(26,20,16,0.1)' }} tickLine={false} />
              <YAxis stroke="rgba(26,20,16,0.2)" tick={{ fill: 'var(--ink-mute)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={{ stroke: 'rgba(26,20,16,0.1)' }} tickLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '16px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px', color: 'var(--ink-mute)' }} iconType="line" />
              <Area type="monotone" dataKey="totalValue" name={t('performance.totalValue')} stroke="#C24916" strokeWidth={2} fill="url(#colorValue)" dot={false} activeDot={{ r: 4, fill: '#C24916' }} />
              <Area type="monotone" dataKey="cashBalance" name={t('performance.cash')} stroke="#1E4D3A" strokeWidth={2} fill="url(#colorCash)" dot={false} activeDot={{ r: 4, fill: '#1E4D3A' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default PortfolioPerformanceChart;
