import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLocale } from '../utils/locale';
import logger from '../utils/logger';

const inputStyle = {
  width: '100%',
  background: 'var(--cream-deep)',
  border: '1.5px solid rgba(26,20,16,0.12)',
  borderRadius: '10px',
  padding: '0.6rem 1rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  color: 'var(--ink)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  fontSize: '0.85rem',
  color: 'var(--ink-soft)',
  marginBottom: '0.4rem',
};

const TransactionModal = ({ isOpen, onClose, onSuccess }) => {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [type, setType] = useState('buy');
  const [formData, setFormData] = useState({
    ticker: '',
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    fees: '',
    notes: ''
  });
  const [stocks, setStocks] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && token) { loadData(); }
  }, [isOpen, token]);

  const loadData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [stocksRes, portfolioRes] = await Promise.all([
        fetch(`${API_URL}/stocks?limit=100`, { headers }),
        fetch(`${API_URL}/portfolio/summary`, { headers })
      ]);
      for (const r of [stocksRes, portfolioRes]) {
        if (!r.ok) throw new Error(`HTTP ${r.status} on ${r.url}`);
      }
      const stocksData = await stocksRes.json();
      const portfolioData = await portfolioRes.json();
      if (stocksData.success) setStocks(stocksData.data || []);
      if (portfolioData.success) setHoldings(portfolioData.data?.holdings || []);
    } catch (err) {
      logger.error('Erreur chargement données:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.ticker || !formData.quantity || !formData.price) {
      setError(t('messages.fillAllFields'));
      setLoading(false);
      return;
    }
    if (parseFloat(formData.quantity) <= 0) {
      setError(t('validation.quantityPositive'));
      setLoading(false);
      return;
    }
    if (parseFloat(formData.price) <= 0) {
      setError(t('validation.pricePositive'));
      setLoading(false);
      return;
    }
    if (type === 'sell') {
      const holding = holdings.find(h => h.market_id === formData.ticker);
      if (!holding) {
        setError(t('transaction.youDontOwn'));
        setLoading(false);
        return;
      }
      if (holding.quantity < parseFloat(formData.quantity)) {
        setError(t('transaction.insufficientQuantity', { quantity: holding.quantity }));
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`${API_URL}/portfolio/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ticker: formData.ticker,
          type,
          quantity: parseFloat(formData.quantity),
          price: parseFloat(formData.price),
          date: formData.date,
          fees: formData.fees ? parseFloat(formData.fees) : 0,
          notes: formData.notes
        })
      });
      const data = await response.json();
      if (data.success) {
        setFormData({ ticker: '', quantity: '', price: '', date: new Date().toISOString().split('T')[0], fees: '', notes: '' });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(data.error || t('messages.transactionError'));
      }
    } catch (err) {
      setError(t('messages.connectionError'));
      logger.error('Erreur transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStocks = stocks.filter(stock =>
    stock.ticker?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStock = stocks.find(s => s.ticker === formData.ticker);
  const selectedHolding = holdings.find(h => h.market_id === formData.ticker);

  const calculateTotal = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price) || 0;
    const fees = parseFloat(formData.fees) || 0;
    const subtotal = quantity * price;
    return type === 'buy' ? subtotal + fees : subtotal - fees;
  };

  if (!isOpen) return null;

  const isBuy = type === 'buy';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0.5rem',
      background: 'rgba(26,20,16,0.55)',
    }}>
      <div style={{
        background: 'var(--cream-glow)',
        borderRadius: '16px',
        border: '1.5px solid rgba(26,20,16,0.08)',
        boxShadow: 'var(--shadow-warm)',
        maxWidth: '672px', width: '100%',
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0,
          background: 'var(--cream-glow)',
          borderBottom: '1.5px solid rgba(26,20,16,0.08)',
          padding: '1rem 1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderRadius: '16px 16px 0 0',
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.35rem', color: 'var(--ink)' }}>
            {t('transaction.newTransaction')}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex', padding: '0.25rem', borderRadius: '8px', transition: 'color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; }}
          >
            <X style={{ width: '22px', height: '22px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Transaction type */}
          <div>
            <label style={labelStyle}>{t('transaction.type')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('buy')}
                style={{
                  padding: '1rem', borderRadius: '12px',
                  border: isBuy ? '2px solid rgba(30,77,58,0.4)' : '1.5px solid rgba(26,20,16,0.1)',
                  background: isBuy ? 'rgba(30,77,58,0.1)' : 'var(--cream-deep)',
                  color: isBuy ? 'var(--forest)' : 'var(--ink-mute)',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem',
                }}
              >
                <TrendingUp style={{ width: '22px', height: '22px' }} />
                {t('portfolio.buyAction')}
              </button>
              <button
                type="button"
                onClick={() => setType('sell')}
                style={{
                  padding: '1rem', borderRadius: '12px',
                  border: !isBuy ? '2px solid rgba(194,73,22,0.35)' : '1.5px solid rgba(26,20,16,0.1)',
                  background: !isBuy ? 'rgba(194,73,22,0.08)' : 'var(--cream-deep)',
                  color: !isBuy ? 'var(--terracotta)' : 'var(--ink-mute)',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem',
                }}
              >
                <TrendingDown style={{ width: '22px', height: '22px' }} />
                {t('portfolio.sellAction')}
              </button>
            </div>
          </div>

          {/* Stock search */}
          <div>
            <label style={labelStyle}>
              {t('transaction.stock')} <span style={{ color: 'var(--terracotta)' }}>*</span>
            </label>
            <input
              type="text"
              placeholder={t('placeholders.searchTickerName')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (!searchTerm) { setSearchTerm(' '); setTimeout(() => setSearchTerm(''), 0); }
              }}
              style={{ ...inputStyle, marginBottom: '0.5rem' }}
            />

            {((searchTerm && filteredStocks.length > 0) || (!searchTerm && !formData.ticker && stocks.length > 0)) && (
              <div style={{
                background: 'var(--cream-deep)',
                border: '1.5px solid rgba(26,20,16,0.1)',
                borderRadius: '10px',
                maxHeight: '192px', overflowY: 'auto',
              }}>
                {(searchTerm ? filteredStocks : stocks).slice(0, 10).map(stock => (
                  <StockOption
                    key={stock.ticker}
                    stock={stock}
                    onSelect={() => {
                      setFormData({ ...formData, ticker: stock.ticker, price: stock.price || '' });
                      setSearchTerm('');
                    }}
                  />
                ))}
              </div>
            )}

            {formData.ticker && selectedStock && (
              <div style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>{selectedStock.ticker}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{selectedStock.name}</div>
                  </div>
                  {selectedStock.price && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>
                        {selectedStock.price.toLocaleString(getLocale())} XOF
                      </div>
                      {selectedStock.change_percent !== undefined && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: selectedStock.change_percent >= 0 ? 'var(--forest)' : 'var(--terracotta)' }}>
                          {selectedStock.change_percent >= 0 ? '+' : ''}{selectedStock.change_percent.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {type === 'sell' && formData.ticker && selectedHolding && (
              <div style={{ marginTop: '0.5rem', padding: '0.65rem 1rem', background: 'rgba(30,77,58,0.06)', border: '1.5px solid rgba(30,77,58,0.18)', borderRadius: '10px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--forest)' }}>
                  {t('transaction.availableQuantity')} <strong>{selectedHolding.quantity}</strong> {t('transaction.actions')}
                </span>
              </div>
            )}
          </div>

          {/* Quantity & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>
                {t('portfolio.quantity')} <span style={{ color: 'var(--terracotta)' }}>*</span>
              </label>
              <input
                type="number" min="1" step="1"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                style={inputStyle}
                placeholder="0"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>
                {t('transaction.unitPrice')} <span style={{ color: 'var(--terracotta)' }}>*</span>
              </label>
              <input
                type="number" min="0" step="0.01"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                style={inputStyle}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Date & Fees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>{t('transaction.date')}</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('transaction.feesXof')}</label>
              <input
                type="number" min="0" step="0.01"
                value={formData.fees}
                onChange={e => setFormData({ ...formData, fees: e.target.value })}
                style={inputStyle}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>{t('transaction.notesOptional')}</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              style={{ ...inputStyle, height: '90px', resize: 'vertical' }}
              placeholder={t('placeholders.addNotes')}
            />
          </div>

          {/* Summary */}
          {formData.quantity && formData.price && (
            <div style={{ background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--ink-mute)' }}>{t('transaction.subtotal')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                  {((parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0)).toLocaleString(getLocale())} XOF
                </span>
              </div>
              {formData.fees && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--ink-mute)' }}>{t('transaction.fees')}:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                    {parseFloat(formData.fees).toLocaleString(getLocale())} XOF
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1.5px solid rgba(26,20,16,0.08)', marginTop: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>{t('transaction.total')}:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: isBuy ? 'var(--terracotta)' : 'var(--forest)' }}>
                  {isBuy ? '-' : '+'}{calculateTotal().toLocaleString(getLocale())} XOF
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.85rem 1rem', background: 'rgba(194,73,22,0.07)', border: '1.5px solid rgba(194,73,22,0.2)', borderRadius: '10px' }}>
              <AlertCircle style={{ width: '18px', height: '18px', color: 'var(--terracotta)', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--terracotta)' }}>{error}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '0.7rem 1.5rem',
                background: 'var(--cream-deep)',
                color: 'var(--ink)',
                border: '1.5px solid rgba(26,20,16,0.12)',
                borderRadius: '10px',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,20,16,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-deep)'; }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1, padding: '0.7rem 1.5rem',
                background: loading ? 'var(--cream-deep)' : isBuy ? 'var(--forest)' : 'var(--terracotta)',
                color: loading ? 'var(--ink-mute)' : 'var(--cream)',
                border: 'none',
                borderRadius: '10px',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? t('common.loading') : isBuy ? t('portfolio.buyAction') : t('portfolio.sellAction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StockOption = ({ stock, onSelect }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', padding: '0.6rem 1rem',
        background: hovered ? 'rgba(26,20,16,0.05)' : 'transparent',
        border: 'none', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)' }}>{stock.ticker}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink-mute)' }}>{stock.name}</div>
      </div>
      {stock.price && (
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--terracotta)' }}>
          {stock.price.toLocaleString()} XOF
        </div>
      )}
    </button>
  );
};

export default TransactionModal;
