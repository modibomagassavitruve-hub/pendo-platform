import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { X, Bell, BellRing, Mail } from 'lucide-react';
import { AFRICAN_EXCHANGES } from '../data/africanExchanges';

const selectStyle = {
  width: '100%',
  background: 'var(--cream-deep)',
  border: '1.5px solid rgba(26,20,16,0.12)',
  borderRadius: '10px',
  padding: '0.65rem 0.9rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  color: 'var(--ink)',
  outline: 'none',
  boxSizing: 'border-box',
};

const AlertModal = ({ onClose }) => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [newAlert, setNewAlert] = useState({
    exchange: '',
    type: 'opening',
    value: '',
    notification: 'browser'
  });

  const exchanges = Object.values(AFRICAN_EXCHANGES);

  const addAlert = () => {
    if (!newAlert.exchange) return;
    const exchange = exchanges.find(e => e.id === newAlert.exchange);
    setAlerts([...alerts, {
      ...newAlert,
      id: Date.now(),
      exchangeName: exchange?.fullName,
      exchangeFlag: exchange?.flag
    }]);
    setNewAlert({ exchange: '', type: 'opening', value: '', notification: 'browser' });
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const removeAlert = (id) => setAlerts(alerts.filter(a => a.id !== id));

  const getAlertTypeLabel = (type) => {
    switch (type) {
      case 'opening': return t('alertModal.atMarketOpen');
      case 'closing': return t('alertModal.atMarketClose');
      case 'price_above': return t('alertModal.priceAbove');
      case 'price_below': return t('alertModal.priceBelow');
      default: return type;
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(26,20,16,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '1rem',
    }}>
      <div style={{
        background: 'var(--cream-glow)',
        borderRadius: '20px',
        maxWidth: '640px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        border: '1.5px solid rgba(26,20,16,0.08)',
        boxShadow: '0 24px 64px rgba(26,20,16,0.18)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1.5px solid rgba(26,20,16,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(194,73,22,0.1)', borderRadius: '10px' }}>
              <BellRing style={{ width: '22px', height: '22px', color: 'var(--terracotta)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.2rem', color: 'var(--ink)' }}>
              {t('alertModal.configureAlerts')}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--cream-deep)', border: 'none', borderRadius: '10px',
              padding: '0.5rem', cursor: 'pointer', color: 'var(--ink-mute)',
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Create alert form */}
        <div style={{ padding: '1.5rem', borderBottom: '1.5px solid rgba(26,20,16,0.07)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1rem', color: 'var(--ink)', marginBottom: '1rem' }}>
            {t('alertModal.newAlert')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: '0.4rem' }}>
                {t('alertModal.exchange')}
              </label>
              <select
                value={newAlert.exchange}
                onChange={e => setNewAlert({ ...newAlert, exchange: e.target.value })}
                style={selectStyle}
              >
                <option value="">{t('alertModal.selectExchange')}</option>
                {exchanges.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.flag} {ex.code} - {ex.country}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: '0.4rem' }}>
                {t('alertModal.alertType')}
              </label>
              <select
                value={newAlert.type}
                onChange={e => setNewAlert({ ...newAlert, type: e.target.value })}
                style={selectStyle}
              >
                <option value="opening">{t('alertModal.atMarketOpen')}</option>
                <option value="closing">{t('alertModal.atMarketClose')}</option>
                <option value="price_above">{t('alertModal.priceAbove')}</option>
                <option value="price_below">{t('alertModal.priceBelow')}</option>
              </select>
            </div>

            {(newAlert.type === 'price_above' || newAlert.type === 'price_below') && (
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: '0.4rem' }}>
                  {t('alertModal.thresholdValue')}
                </label>
                <input
                  type="number"
                  value={newAlert.value}
                  onChange={e => setNewAlert({ ...newAlert, value: e.target.value })}
                  placeholder="Ex: 75000"
                  style={selectStyle}
                />
              </div>
            )}

            <div>
              <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-mute)', display: 'block', marginBottom: '0.4rem' }}>
                {t('alertModal.notification')}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                  { key: 'browser', Icon: Bell, label: t('alertModal.browser') },
                  { key: 'email', Icon: Mail, label: t('alertModal.notification') },
                ].map(({ key, Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setNewAlert({ ...newAlert, notification: key })}
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      padding: '0.6rem',
                      borderRadius: '10px',
                      border: newAlert.notification === key ? '2px solid var(--terracotta)' : '1.5px solid rgba(26,20,16,0.12)',
                      background: newAlert.notification === key ? 'rgba(194,73,22,0.08)' : 'transparent',
                      color: newAlert.notification === key ? 'var(--terracotta)' : 'var(--ink-mute)',
                      fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 500,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <Icon style={{ width: '15px', height: '15px' }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={addAlert}
            disabled={!newAlert.exchange}
            style={{
              marginTop: '1.25rem', width: '100%', padding: '0.75rem',
              background: newAlert.exchange ? 'var(--terracotta)' : 'var(--cream-deep)',
              color: newAlert.exchange ? 'var(--cream)' : 'var(--ink-mute)',
              border: 'none', borderRadius: '12px',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem',
              cursor: newAlert.exchange ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            {t('alertModal.addAlert')}
          </button>
        </div>

        {/* Alert list */}
        <div style={{ padding: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1rem', color: 'var(--ink)', marginBottom: '1rem' }}>
            {t('alertModal.myAlerts')} ({alerts.length})
          </h3>

          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Bell style={{ width: '48px', height: '48px', color: 'var(--ink-mute)', opacity: 0.4, margin: '0 auto 0.75rem', display: 'block' }} />
              <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', marginBottom: '0.25rem' }}>{t('alertModal.noAlerts')}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--ink-mute)', opacity: 0.7 }}>{t('alertModal.createFirst')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1rem',
                    background: 'var(--cream-deep)',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(26,20,16,0.07)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{alert.exchangeFlag}</span>
                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>
                        {alert.exchangeName}
                      </p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>
                        {getAlertTypeLabel(alert.type)}{alert.value && ` ${alert.value}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      background: 'var(--cream-glow)',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ink-soft)',
                    }}>
                      {alert.notification === 'browser' ? `🔔 ${t('alertModal.notifBrowser', 'Navigateur')}` : `📧 ${t('alertModal.notifEmail', 'Email')}`}
                    </span>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      style={{
                        background: 'none', border: 'none', padding: '0.35rem',
                        borderRadius: '8px', cursor: 'pointer', color: 'var(--ink-mute)',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--terracotta)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; }}
                    >
                      <X style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
