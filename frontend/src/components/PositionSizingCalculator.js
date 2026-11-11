import React, { useState } from 'react';
import { API_URL } from '../config';
import { useTranslation } from 'react-i18next';
import { Calculator, AlertTriangle, CheckCircle } from 'lucide-react';

const inputStyle = {
  width: '100%',
  background: 'var(--cream-deep)',
  border: '1.5px solid rgba(26,20,16,0.12)',
  borderRadius: '10px',
  padding: '0.6rem 1rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  color: 'var(--ink)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  fontSize: '0.82rem',
  color: 'var(--ink-soft)',
  marginBottom: '0.4rem',
};

const rowStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  fontFamily: 'var(--font-body)', fontSize: '0.82rem',
};

const PositionSizingCalculator = () => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    accountBalance: '',
    riskPercentage: '2',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    atr: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculatePosition = async () => {
    if (!formData.accountBalance || !formData.entryPrice || !formData.stopLoss) {
      setError(t('calculator.fillRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/position-sizing/comprehensive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountBalance: parseFloat(formData.accountBalance),
          riskPercentage: parseFloat(formData.riskPercentage),
          entryPrice: parseFloat(formData.entryPrice),
          stopLoss: parseFloat(formData.stopLoss),
          takeProfit: formData.takeProfit ? parseFloat(formData.takeProfit) : null,
          atr: formData.atr ? parseFloat(formData.atr) : null
        })
      });
      const data = await response.json();
      if (data.success) setResult(data.data);
      else setError(data.message || t('calculator.calculationError'));
    } catch (err) {
      setError(t('calculator.calculationError'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat(i18n.language || 'fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const getRRBadgeStyle = (rating) => {
    const map = {
      'Excellent': { bg: 'rgba(30,77,58,0.1)', color: 'var(--forest)', border: 'rgba(30,77,58,0.25)' },
      'Good': { bg: 'rgba(194,73,22,0.08)', color: 'var(--terracotta)', border: 'rgba(194,73,22,0.2)' },
      'Acceptable': { bg: 'rgba(232,170,11,0.1)', color: '#9A6E00', border: 'rgba(232,170,11,0.25)' },
    };
    return map[rating] || { bg: 'rgba(194,73,22,0.08)', color: 'var(--terracotta)', border: 'rgba(194,73,22,0.2)' };
  };

  const getRecLevelStyle = (level) => {
    if (level === 'good') return { bg: 'rgba(30,77,58,0.06)', border: 'rgba(30,77,58,0.18)', color: 'var(--forest)' };
    if (level === 'caution') return { bg: 'rgba(232,170,11,0.08)', border: 'rgba(232,170,11,0.2)', color: '#9A6E00' };
    return { bg: 'rgba(194,73,22,0.07)', border: 'rgba(194,73,22,0.2)', color: 'var(--terracotta)' };
  };

  return (
    <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <Calculator style={{ width: '22px', height: '22px', color: 'var(--terracotta)' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.25rem', color: 'var(--ink)' }}>{t('calculator.title')}</h2>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>{t('calculator.totalCapital')}</label>
            <input type="number" name="accountBalance" value={formData.accountBalance} onChange={handleInputChange} placeholder="100000000" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('calculator.riskPerTrade')}</label>
            <select name="riskPercentage" value={formData.riskPercentage} onChange={handleInputChange} style={inputStyle}>
              <option value="0.5">0.5% ({t('calculator.veryConservative')})</option>
              <option value="1">1% ({t('calculator.conservative')})</option>
              <option value="2">2% ({t('calculator.recommended')})</option>
              <option value="3">3% ({t('calculator.moderate')})</option>
              <option value="5">5% ({t('calculator.aggressive')})</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('calculator.entryPrice')}</label>
            <input type="number" name="entryPrice" value={formData.entryPrice} onChange={handleInputChange} placeholder="50000" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('calculator.stopLoss')}</label>
            <input type="number" name="stopLoss" value={formData.stopLoss} onChange={handleInputChange} placeholder="47500" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('calculator.takeProfit')} <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--ink-mute)' }}>({t('common.optional')})</span></label>
            <input type="number" name="takeProfit" value={formData.takeProfit} onChange={handleInputChange} placeholder="60000" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('calculator.atr')} <span style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--ink-mute)' }}>({t('common.optional')})</span></label>
            <input type="number" name="atr" value={formData.atr} onChange={handleInputChange} placeholder="2500" style={inputStyle} />
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(194,73,22,0.07)', border: '1.5px solid rgba(194,73,22,0.2)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
            <AlertTriangle style={{ width: '16px', height: '16px', color: 'var(--terracotta)', flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--terracotta)' }}>{error}</p>
          </div>
        )}

        <button
          onClick={calculatePosition}
          disabled={loading}
          style={{
            width: '100%', padding: '0.75rem 1rem',
            background: loading ? 'var(--cream-deep)' : 'var(--ink)',
            color: loading ? 'var(--ink-mute)' : 'var(--cream)',
            border: 'none', borderRadius: '10px',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem',
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--terracotta)'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--ink)'; }}
        >
          {loading
            ? <><div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(26,20,16,0.2)', borderTopColor: 'var(--ink-mute)', animation: 'spin 0.8s linear infinite' }} />{t('calculator.calculating')}</>
            : <><Calculator style={{ width: '18px', height: '18px' }} />{t('calculator.calculate')}</>
          }
        </button>
      </div>

      {/* Results */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1.25rem', borderTop: '1.5px solid rgba(26,20,16,0.08)' }}>
          {/* Final recommendation */}
          <div style={{ background: 'rgba(30,77,58,0.06)', border: '1.5px solid rgba(30,77,58,0.18)', borderRadius: '12px', padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <CheckCircle style={{ width: '20px', height: '20px', color: 'var(--forest)' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1rem', color: 'var(--ink)' }}>{t('calculator.recommendation')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink-mute)', marginBottom: '0.3rem' }}>{t('calculator.numberOfShares')}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '2rem', color: 'var(--ink)' }}>{result.finalRecommendation.recommendedShares}</p>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink-mute)', marginBottom: '0.3rem' }}>{t('calculator.investment')}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--forest)' }}>{formatCurrency(result.finalRecommendation.investment)} FCFA</p>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink-mute)', marginBottom: '0.3rem' }}>{t('calculator.maxRisk')}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--terracotta)' }}>{formatCurrency(result.finalRecommendation.riskAmount)} FCFA</p>
              </div>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>{result.finalRecommendation.reason}</p>
          </div>

          {/* Risk-Reward */}
          {result.riskReward && (() => {
            const rrStyle = getRRBadgeStyle(result.riskReward.rating);
            return (
              <div style={{ background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>{t('calculator.riskRewardRatio')}</h4>
                <div className="grid grid-cols-3 gap-4" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--terracotta)', marginBottom: '0.2rem' }}>{t('calculator.risk')}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--ink)' }}>{result.riskReward.riskPercent.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)', marginBottom: '0.2rem' }}>{t('calculator.ratio')}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--terracotta)' }}>1:{result.riskReward.ratio}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--forest)', marginBottom: '0.2rem' }}>{t('calculator.reward')}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--ink)' }}>{result.riskReward.rewardPercent.toFixed(2)}%</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{ background: rrStyle.bg, color: rrStyle.color, border: `1px solid ${rrStyle.border}`, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem', padding: '0.2rem 0.65rem', borderRadius: '999px' }}>
                    {result.riskReward.rating}
                  </span>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>{result.riskReward.recommendation}</p>
                </div>
              </div>
            );
          })()}

          {/* Details */}
          <div style={{ background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>{t('calculator.details')}</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Capital total:', `${formatCurrency(result.accountBalance)} FCFA`],
                ['Risque %:', `${result.fixedPercentageRisk.riskPercentage}%`],
                ["Prix d'entrée:", `${formatCurrency(result.entryPrice)} FCFA`],
                ['Stop Loss:', `${formatCurrency(result.stopLoss)} FCFA`],
                ['Risque par action:', `${formatCurrency(result.fixedPercentageRisk.riskPerShare)} FCFA`],
                ['% du portefeuille:', `${result.fixedPercentageRisk.positionPercent.toFixed(2)}%`],
              ].map(([label, value]) => (
                <div key={label} style={rowStyle}>
                  <span style={{ color: 'var(--ink-mute)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>{value}</span>
                </div>
              ))}
            </div>
            {result.fixedPercentageRisk.recommendation && (() => {
              const lvl = getRecLevelStyle(result.fixedPercentageRisk.recommendation.level);
              return (
                <div style={{ marginTop: '0.75rem', background: lvl.bg, border: `1.5px solid ${lvl.border}`, borderRadius: '8px', padding: '0.65rem 0.9rem' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: lvl.color }}>{result.fixedPercentageRisk.recommendation.message}</p>
                </div>
              );
            })()}
          </div>

          {/* Max position */}
          <div style={{ background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>{t('calculator.diversificationRule')}</h4>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-soft)', marginBottom: '0.25rem' }}>
              {t('calculator.maxPerPosition')} <strong>{result.maxPosition.maxShares} actions</strong> ({result.maxPosition.maxPositionPercent}% du portefeuille)
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>{t('calculator.diversificationAdvice')}</p>
          </div>

          {/* ATR method */}
          {result.atrBased && (
            <div style={{ background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
              <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>{t('calculator.atrMethod')}</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['ATR:', `${result.atrBased.atr} FCFA`],
                  ['Multiplicateur:', `${result.atrBased.atrMultiplier}x`],
                  ['Stop suggéré:', `${formatCurrency(result.atrBased.stopLoss)} FCFA`],
                  ['Position (ATR):', `${result.atrBased.positionSize} actions`],
                ].map(([label, value]) => (
                  <div key={label} style={rowStyle}>
                    <span style={{ color: 'var(--ink-mute)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Best practices */}
      <div style={{ marginTop: '1.25rem', background: 'rgba(232,170,11,0.06)', border: '1.5px solid rgba(232,170,11,0.2)', borderRadius: '10px', padding: '1rem 1.25rem' }}>
        <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: '#9A6E00', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle style={{ width: '15px', height: '15px' }} />
          {t('calculator.bestPractices')}
        </h4>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
              • {t(`calculator.practice${i}`)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PositionSizingCalculator;
