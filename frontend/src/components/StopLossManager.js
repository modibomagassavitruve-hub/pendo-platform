import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useTranslation } from 'react-i18next';
import { Shield, Target, TrendingDown, TrendingUp, X, Plus, AlertCircle } from 'lucide-react';
import { getLocale } from '../utils/locale';
import logger from '../utils/logger';

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

const cardStyle = {
  background: 'var(--cream-glow)',
  border: '1.5px solid rgba(26,20,16,0.08)',
  borderRadius: '12px',
  padding: '1rem 1.25rem',
};

const StopLossManager = ({ portfolioId = 1 }) => {
  const { t } = useTranslation();
  const [activeOrders, setActiveOrders] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    ticker: '',
    quantity: '',
    entryPrice: '',
    stopLossPercent: '5',
    takeProfitPercent: '10'
  });

  useEffect(() => {
    fetchOrders();
    fetchExecutions();
    const interval = setInterval(() => { fetchOrders(); fetchExecutions(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_URL}/stop-loss/orders?status=active`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) setActiveOrders(data.data);
    } catch (err) { logger.error('Error fetching orders:', err); }
  };

  const fetchExecutions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${API_URL}/stop-loss/executions?limit=10`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) setExecutions(data.data);
    } catch (err) { logger.error('Error fetching executions:', err); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createBracketOrder = async () => {
    if (!formData.ticker || !formData.quantity || !formData.entryPrice) {
      setError(t('messages.fillAllFields'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/stop-loss/bracket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          portfolioId,
          ticker: formData.ticker.toUpperCase(),
          quantity: parseFloat(formData.quantity),
          entryPrice: parseFloat(formData.entryPrice),
          stopLossPercent: parseFloat(formData.stopLossPercent),
          takeProfitPercent: parseFloat(formData.takeProfitPercent)
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setFormData({ ticker: '', quantity: '', entryPrice: '', stopLossPercent: '5', takeProfitPercent: '10' });
        fetchOrders();
      } else {
        setError(data.message || t('messages.creationError'));
      }
    } catch (err) {
      setError(t('messages.creationError'));
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/stop-loss/orders/${orderId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) fetchOrders();
    } catch (err) { logger.error('Error cancelling order:', err); }
  };

  const formatCurrency = (value) => new Intl.NumberFormat(getLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const formatDate = (dateString) => new Date(dateString).toLocaleString(getLocale(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.35rem', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <Shield style={{ width: '22px', height: '22px', color: 'var(--terracotta)' }} />
            {t('stopLoss.title')}
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--ink-mute)' }}>{t('stopLoss.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            background: showForm ? 'var(--cream-deep)' : 'var(--ink)',
            color: showForm ? 'var(--ink)' : 'var(--cream)',
            border: showForm ? '1.5px solid rgba(26,20,16,0.12)' : 'none',
            borderRadius: '10px',
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {showForm ? <X style={{ width: '15px', height: '15px' }} /> : <Plus style={{ width: '15px', height: '15px' }} />}
          {showForm ? t('common.cancel') : t('orders.newOrder')}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '14px', padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '1rem' }}>{t('stopLoss.createOrder')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label style={labelStyle}>{t('stopLoss.ticker')}</label><input type="text" name="ticker" value={formData.ticker} onChange={handleInputChange} placeholder="SNTS" style={{ ...inputStyle, textTransform: 'uppercase' }} /></div>
            <div><label style={labelStyle}>{t('stopLoss.quantity')}</label><input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="100" style={inputStyle} /></div>
            <div><label style={labelStyle}>{t('stopLoss.entryPrice')}</label><input type="number" name="entryPrice" value={formData.entryPrice} onChange={handleInputChange} placeholder="50000" style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>{t('stopLoss.stopLossPercent')}</label>
              <select name="stopLossPercent" value={formData.stopLossPercent} onChange={handleInputChange} style={inputStyle}>
                {['2', '3', '5', '7', '10'].map(v => <option key={v} value={v}>-{v}%</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('stopLoss.takeProfitPercent')}</label>
              <select name="takeProfitPercent" value={formData.takeProfitPercent} onChange={handleInputChange} style={inputStyle}>
                {['5', '10', '15', '20', '25', '30'].map(v => <option key={v} value={v}>+{v}%</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('stopLoss.rrRatio')}</label>
              <div style={{ ...inputStyle, background: 'var(--cream)', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                1:{(parseFloat(formData.takeProfitPercent) / parseFloat(formData.stopLossPercent)).toFixed(2)}
              </div>
            </div>
          </div>

          {formData.entryPrice && (
            <div style={{ marginTop: '0.75rem', background: 'var(--cream-deep)', border: '1px solid rgba(26,20,16,0.08)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink-mute)', marginBottom: '0.6rem' }}>{t('stopLoss.thresholdPreview')}</p>
              <div className="grid grid-cols-3 gap-4" style={{ textAlign: 'center' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--terracotta)', marginBottom: '0.2rem' }}>{t('stopLoss.stopLoss')}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)' }}>
                    {formatCurrency(parseFloat(formData.entryPrice) * (1 - parseFloat(formData.stopLossPercent) / 100))} FCFA
                  </p>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--ink-mute)', marginBottom: '0.2rem' }}>{t('stopLoss.entry')}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)' }}>{formatCurrency(formData.entryPrice)} FCFA</p>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--forest)', marginBottom: '0.2rem' }}>{t('stopLoss.takeProfit')}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)' }}>
                    {formatCurrency(parseFloat(formData.entryPrice) * (1 + parseFloat(formData.takeProfitPercent) / 100))} FCFA
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(194,73,22,0.07)', border: '1.5px solid rgba(194,73,22,0.2)', borderRadius: '10px', padding: '0.65rem 0.9rem' }}>
              <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--terracotta)', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--terracotta)' }}>{error}</p>
            </div>
          )}

          <button
            onClick={createBracketOrder}
            disabled={loading}
            style={{
              marginTop: '0.75rem', width: '100%', padding: '0.7rem 1rem',
              background: loading ? 'var(--cream-deep)' : 'var(--terracotta)',
              color: loading ? 'var(--ink-mute)' : 'var(--cream)',
              border: 'none', borderRadius: '10px',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            }}
          >
            {loading ? t('stopLoss.creating') : t('stopLoss.createOrders')}
          </button>
        </div>
      )}

      {/* Active orders */}
      <div style={cardStyle}>
        <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '0.85rem' }}>
          {t('stopLoss.activeOrders')} ({activeOrders.length})
        </h3>
        {activeOrders.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)', textAlign: 'center', padding: '2rem 0' }}>{t('stopLoss.noActiveOrders')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {activeOrders.map(order => (
              <div key={order.id} style={{ background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {order.order_type === 'stop_loss'
                      ? <TrendingDown style={{ width: '18px', height: '18px', color: 'var(--terracotta)' }} />
                      : <TrendingUp style={{ width: '18px', height: '18px', color: 'var(--forest)' }} />
                    }
                    <div>
                      <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>{order.ticker}</p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--ink-mute)' }}>
                        {order.order_type === 'stop_loss' ? t('stopLoss.stopLoss') : t('stopLoss.takeProfit')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => cancelOrder(order.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex', padding: '0.2rem', transition: 'color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--terracotta)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; }}
                  >
                    <X style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    [t('stopLoss.quantity'), order.quantity],
                    [t('stopLoss.triggerPrice'), `${formatCurrency(order.trigger_price)} FCFA`],
                    [t('stopLoss.createdAt'), formatDate(order.created_at)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--ink-mute)', marginBottom: '0.15rem' }}>{label}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--ink)' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Execution history */}
      <div style={cardStyle}>
        <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '0.85rem' }}>
          {t('stopLoss.executionHistory')}
        </h3>
        {executions.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)', textAlign: 'center', padding: '2rem 0' }}>{t('stopLoss.noRecentExecutions')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {executions.map(exec => (
              <div key={exec.id} style={{ background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {exec.order_type === 'stop_loss'
                      ? <Shield style={{ width: '18px', height: '18px', color: 'var(--terracotta)' }} />
                      : <Target style={{ width: '18px', height: '18px', color: 'var(--forest)' }} />
                    }
                    <div>
                      <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>{exec.ticker}</p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--ink-mute)' }}>
                        {exec.order_type === 'stop_loss' ? t('stopLoss.executedStopLoss') : t('stopLoss.executedTakeProfit')}
                      </p>
                    </div>
                  </div>
                  {exec.profit_loss !== null && (
                    <div style={{ textAlign: 'right', color: exec.profit_loss >= 0 ? 'var(--forest)' : 'var(--terracotta)' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem' }}>
                        {exec.profit_loss >= 0 ? '+' : ''}{formatCurrency(exec.profit_loss)} FCFA
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                        ({exec.profit_loss_percent >= 0 ? '+' : ''}{exec.profit_loss_percent.toFixed(2)}%)
                      </p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    [t('stopLoss.quantity'), exec.quantity],
                    [t('stopLoss.targetPrice'), `${formatCurrency(exec.trigger_price)} FCFA`],
                    [t('stopLoss.actualPrice'), `${formatCurrency(exec.actual_price)} FCFA`],
                    [t('stopLoss.executedAt'), formatDate(exec.executed_at)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--ink-mute)', marginBottom: '0.15rem' }}>{label}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.78rem', color: 'var(--ink)' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StopLossManager;
