import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';

const inputStyle = {
  width: '100%',
  background: 'var(--cream-deep)',
  border: '1.5px solid rgba(26,20,16,0.12)',
  borderRadius: '10px',
  padding: '0.6rem 0.85rem',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  color: 'var(--ink)',
  outline: 'none',
};

const NotificationCenter = ({ isOpen, onClose, onOpenLogin }) => {
  const { t, i18n } = useTranslation();
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notifications');
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [newAlert, setNewAlert] = useState({ ticker: '', alertType: 'price_above', targetValue: '' });

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const fetchData = async () => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [notifRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/notifications`, { headers }),
        fetch(`${API_URL}/portfolio/alerts`, { headers })
      ]);
      for (const r of [notifRes, alertsRes]) {
        if (!r.ok) throw new Error(`HTTP ${r.status} on ${r.url}`);
      }
      const notifData = await notifRes.json();
      const alertsData = await alertsRes.json();
      if (notifData.success) setNotifications(notifData.data);
      if (alertsData.success) setAlerts(alertsData.data);
    } catch(e) {
      logger.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  const markAsRead = async (id) => {
    if (!token) return;
    await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  const markAllRead = async () => {
    if (!token) return;
    await fetch(`${API_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  const createAlert = async () => {
    if (!newAlert.ticker || !newAlert.targetValue || !token) return;
    const res = await fetch(`${API_URL}/portfolio/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        ticker: newAlert.ticker,
        alertType: newAlert.alertType,
        targetValue: parseFloat(newAlert.targetValue)
      })
    });
    if (res.ok) {
      fetchData();
      setShowAlertForm(false);
      setNewAlert({ ticker: '', alertType: 'price_above', targetValue: '' });
    }
  };

  const deleteAlert = async (id) => {
    if (!token) return;
    await fetch(`${API_URL}/portfolio/alerts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const getIcon = (type) => {
    const icons = {
      price_alert: '🔔', market_news: '📰', portfolio_update: '💼',
      market_open: '🟢', market_close: '🔴', significant_change: '📈'
    };
    return icons[type] || '📌';
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 60) return t('time.minutesAgo', { minutes: diff });
    if (diff < 1440) return t('time.hoursAgo', { hours: Math.floor(diff / 60) });
    return d.toLocaleDateString(i18n.language || 'fr-FR');
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.6)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'var(--cream-glow)',
          height: '100%',
          overflowY: 'auto',
          boxShadow: '-8px 0 40px rgba(26,20,16,0.15)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0,
          background: 'var(--cream-glow)',
          borderBottom: '1.5px solid rgba(26,20,16,0.08)',
          padding: '1.25rem 1.25rem 1rem',
          zIndex: 2,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.25rem', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔔 {t('notifications.title')}
            </h2>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--ink-mute)', cursor: 'pointer', lineHeight: 1, padding: '0.25rem' }}
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { key: 'notifications', label: `${t('notifications.title')} (${unreadCount})` },
              { key: 'alerts', label: `${t('alerts.title')} (${alerts.length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  background: activeTab === tab.key ? 'var(--terracotta)' : 'var(--cream-deep)',
                  color: activeTab === tab.key ? 'var(--cream)' : 'var(--ink-soft)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.25rem', flex: 1 }}>
          {!isAuthenticated ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--ink)', fontWeight: 500, marginBottom: '0.5rem' }}>
                Notifications & Alertes
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)', maxWidth: '280px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Connectez-vous pour recevoir des notifications sur vos marchés et créer des alertes de prix personnalisées.
              </p>
              <button
                onClick={() => { onClose(); if (onOpenLogin) onOpenLogin(); }}
                style={{
                  padding: '0.7rem 1.75rem',
                  background: 'var(--terracotta)',
                  color: 'var(--cream)',
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                {t('auth.signIn', 'Se connecter')}
              </button>
            </div>
          ) : loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '3px solid var(--cream-deep)',
                borderTopColor: 'var(--terracotta)',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          ) : activeTab === 'notifications' ? (
            <>
              {notifications.length > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: 'none', border: 'none', color: 'var(--terracotta)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '1rem', padding: 0 }}
                >
                  {t('notifications.markAllRead')}
                </button>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', textAlign: 'center', padding: '3rem 0' }}>
                    {t('messages.noNotification')}
                  </p>
                ) : notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: notif.is_read ? 'var(--cream-deep)' : 'var(--cream-glow)',
                      border: notif.is_read
                        ? '1.5px solid rgba(26,20,16,0.06)'
                        : '1.5px solid rgba(194,73,22,0.2)',
                      borderLeft: notif.is_read ? undefined : '4px solid var(--terracotta)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{getIcon(notif.type)}</span>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
                          {notif.title}
                        </h4>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)', lineHeight: 1.5 }}>{notif.message}</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', marginTop: '0.4rem' }}>{formatDate(notif.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowAlertForm(!showAlertForm)}
                style={{
                  width: '100%', padding: '0.75rem',
                  background: 'var(--terracotta)', color: 'var(--cream)',
                  border: 'none', borderRadius: '10px',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem',
                  cursor: 'pointer', marginBottom: '1rem', transition: 'all 0.2s',
                }}
              >
                + {t('alerts.create')}
              </button>

              {showAlertForm && (
                <div style={{
                  background: 'var(--cream-deep)', borderRadius: '12px', padding: '1rem',
                  marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                  border: '1.5px solid rgba(26,20,16,0.08)',
                }}>
                  <input
                    type="text"
                    placeholder={t('notification.tickerPlaceholder')}
                    value={newAlert.ticker}
                    onChange={e => setNewAlert({ ...newAlert, ticker: e.target.value.toUpperCase() })}
                    style={inputStyle}
                  />
                  <select
                    value={newAlert.alertType}
                    onChange={e => setNewAlert({ ...newAlert, alertType: e.target.value })}
                    aria-label={t('alerts.alertType', 'Type d\'alerte')}
                    style={inputStyle}
                  >
                    <option value="price_above">{t('alerts.priceAbove')}</option>
                    <option value="price_below">{t('alerts.priceBelow')}</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={t('notification.targetPrice')}
                    value={newAlert.targetValue}
                    onChange={e => setNewAlert({ ...newAlert, targetValue: e.target.value })}
                    style={inputStyle}
                  />
                  <button
                    onClick={createAlert}
                    style={{
                      width: '100%', padding: '0.6rem',
                      background: 'var(--forest)', color: 'var(--cream)',
                      border: 'none', borderRadius: '8px',
                      fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    {t('buttons.createAlert')}
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {alerts.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', textAlign: 'center', padding: '3rem 0' }}>
                    {t('messages.noAlert')}
                  </p>
                ) : alerts.map(alert => (
                  <div
                    key={alert.id}
                    style={{
                      background: 'var(--cream-deep)',
                      border: '1.5px solid rgba(26,20,16,0.08)',
                      borderRadius: '12px', padding: '1rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
                        {alert.ticker}
                      </h4>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>
                        {alert.alert_type === 'price_above' ? `📈 ${t('alerts.priceAbove')}` : `📉 ${t('alerts.priceBelow')}`} {alert.target_value.toLocaleString(i18n.language || 'fr-FR')} XOF
                      </p>
                      {alert.triggered_at && (
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--forest)', marginTop: '0.25rem' }}>
                          ✓ {t('alerts.triggered')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--terracotta)', cursor: 'pointer', fontSize: '1.1rem' }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
