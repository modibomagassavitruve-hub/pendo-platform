import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Activity, BarChart3, AlertCircle } from 'lucide-react';

const cardStyle = {
  background: 'var(--cream-glow)',
  border: '1.5px solid rgba(26,20,16,0.08)',
  borderRadius: '12px',
  padding: '1rem 1.25rem',
};

const rowStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  fontFamily: 'var(--font-body)', fontSize: '0.82rem',
};

const getScoreColor = (score) => {
  if (score >= 70) return 'var(--forest)';
  if (score >= 40) return '#9A6E00';
  return 'var(--terracotta)';
};

const getRecommendationStyle = (recommendation) => {
  const map = {
    BUY: { bg: 'rgba(30,77,58,0.12)', color: 'var(--forest)', border: 'rgba(30,77,58,0.25)' },
    STRONG_BUY: { bg: 'rgba(30,77,58,0.18)', color: 'var(--forest)', border: 'rgba(30,77,58,0.35)' },
    SELL: { bg: 'rgba(194,73,22,0.1)', color: 'var(--terracotta)', border: 'rgba(194,73,22,0.25)' },
    STRONG_SELL: { bg: 'rgba(194,73,22,0.16)', color: 'var(--terracotta)', border: 'rgba(194,73,22,0.35)' },
    HOLD: { bg: 'rgba(232,170,11,0.12)', color: '#9A6E00', border: 'rgba(232,170,11,0.3)' },
  };
  return map[recommendation] || { bg: 'var(--cream-deep)', color: 'var(--ink-mute)', border: 'rgba(26,20,16,0.1)' };
};

const getSignalIcon = (signal) => {
  if (['bullish', 'bullish_cross', 'oversold'].includes(signal))
    return <TrendingUp style={{ width: '16px', height: '16px', color: 'var(--forest)' }} />;
  if (['bearish', 'bearish_cross', 'overbought'].includes(signal))
    return <TrendingDown style={{ width: '16px', height: '16px', color: 'var(--terracotta)' }} />;
  return <Activity style={{ width: '16px', height: '16px', color: 'var(--ink-mute)' }} />;
};

const TechnicalIndicators = ({ ticker }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { if (ticker) fetchAnalysis(); }, [ticker]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/indicators/${ticker}/complete`);
      const data = await response.json();
      if (data.success) setAnalysis(data.data);
      else setError(data.message || t('messages.loadingError'));
    } catch (err) {
      setError(t('messages.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  if (!ticker) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', padding: '2.5rem' }}>
        <BarChart3 style={{ width: '40px', height: '40px', color: 'var(--ink-mute)', opacity: 0.4, margin: '0 auto 0.75rem', display: 'block' }} />
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)' }}>{t('technical.selectStock')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[0.75, 0.5, 0.85].map((w, i) => (
            <div key={i} style={{ height: '14px', background: 'var(--cream-deep)', borderRadius: '6px', width: `${w * 100}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <AlertCircle style={{ width: '18px', height: '18px', color: 'var(--terracotta)', flexShrink: 0 }} />
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--terracotta)' }}>{error}</p>
      </div>
    );
  }

  if (!analysis) return null;

  const recStyle = getRecommendationStyle(analysis.recommendation);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Score header */}
      <div style={{ ...cardStyle, background: 'var(--cream-deep)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>{ticker}</h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{t('technical.fullAnalysis')}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '2.5rem', color: getScoreColor(analysis.overallScore), lineHeight: 1 }}>
              {analysis.overallScore}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>Score / 100</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ background: recStyle.bg, color: recStyle.color, border: `1px solid ${recStyle.border}`, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem', padding: '0.3rem 0.85rem', borderRadius: '999px' }}>
            {analysis.recommendation}
          </span>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>{analysis.interpretation}</p>
        </div>
      </div>

      {/* Indicators grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* RSI */}
        {analysis.rsi && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>RSI ({analysis.rsi.period})</h4>
              {getSignalIcon(analysis.rsi.signal)}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ ...rowStyle, marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--ink-mute)' }}>{t('technical.value')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink)' }}>{analysis.rsi.current.toFixed(2)}</span>
              </div>
              <div style={{ width: '100%', background: 'var(--cream-deep)', borderRadius: '999px', height: '6px' }}>
                <div style={{
                  height: '6px', borderRadius: '999px',
                  background: analysis.rsi.current > 70 ? 'var(--terracotta)' : analysis.rsi.current < 30 ? 'var(--forest)' : '#9A6E00',
                  width: `${analysis.rsi.current}%`,
                }} />
              </div>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>{analysis.rsi.interpretation}</p>
          </div>
        )}

        {/* MACD */}
        {analysis.macd && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>MACD</h4>
              {getSignalIcon(analysis.macd.signal)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
              {[
                { label: 'MACD', value: analysis.macd.current.MACD.toFixed(2) },
                { label: 'Signal', value: analysis.macd.current.signal.toFixed(2) },
                { label: 'Histogramme', value: analysis.macd.current.histogram.toFixed(2), color: analysis.macd.current.histogram >= 0 ? 'var(--forest)' : 'var(--terracotta)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={rowStyle}>
                  <span style={{ color: 'var(--ink-mute)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: color || 'var(--ink)' }}>{value}</span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>{analysis.macd.interpretation}</p>
          </div>
        )}

        {/* Bollinger Bands */}
        {analysis.bollingerBands && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>Bollinger Bands</h4>
              {getSignalIcon(analysis.bollingerBands.signal)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
              {[
                { label: t('technical.upperBand'), value: analysis.bollingerBands.current.upper.toFixed(2) },
                { label: t('technical.average'), value: analysis.bollingerBands.current.middle.toFixed(2) },
                { label: t('technical.lowerBand'), value: analysis.bollingerBands.current.lower.toFixed(2) },
              ].map(({ label, value }) => (
                <div key={label} style={rowStyle}>
                  <span style={{ color: 'var(--ink-mute)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>{value}</span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>{analysis.bollingerBands.interpretation}</p>
          </div>
        )}

        {/* Moving Averages */}
        {analysis.movingAverages && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>{t('technical.movingAverages')}</h4>
              {getSignalIcon(analysis.movingAverages.signal)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
              {Object.entries(analysis.movingAverages.sma).map(([period, value]) => (
                <div key={period} style={rowStyle}>
                  <span style={{ color: 'var(--ink-mute)' }}>SMA {period}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>{value.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>{analysis.movingAverages.interpretation}</p>
          </div>
        )}

        {/* ATR */}
        {analysis.atr && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>{t('technical.atrVolatility')}</h4>
              <Activity style={{ width: '16px', height: '16px', color: 'var(--terracotta)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <div style={rowStyle}><span style={{ color: 'var(--ink-mute)' }}>ATR</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>{analysis.atr.current.toFixed(2)}</span></div>
              <div style={rowStyle}><span style={{ color: 'var(--ink-mute)' }}>ATR %</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>{analysis.atr.percentOfPrice.toFixed(2)}%</span></div>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>{analysis.atr.interpretation}</p>
          </div>
        )}

        {/* Stochastic */}
        {analysis.stochastic && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>Stochastic</h4>
              {getSignalIcon(analysis.stochastic.signal)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <div style={rowStyle}><span style={{ color: 'var(--ink-mute)' }}>%K</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>{analysis.stochastic.current.k.toFixed(2)}</span></div>
              <div style={rowStyle}><span style={{ color: 'var(--ink-mute)' }}>%D</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>{analysis.stochastic.current.d.toFixed(2)}</span></div>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>{analysis.stochastic.interpretation}</p>
          </div>
        )}
      </div>

      <button
        onClick={fetchAnalysis}
        style={{
          width: '100%', padding: '0.65rem 1rem',
          background: 'var(--ink)', color: 'var(--cream)',
          border: 'none', borderRadius: '10px',
          fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem',
          cursor: 'pointer', transition: 'background 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
      >
        {t('buttons.refreshAnalysis')}
      </button>
    </div>
  );
};

export default TechnicalIndicators;
