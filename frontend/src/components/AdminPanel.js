import { useTranslation } from 'react-i18next';
import React from 'react';
import { Server, CheckCircle, XCircle, RefreshCw, Download, Database } from 'lucide-react';

const AdminPanel = ({
  apiStatus,
  apiUrl,
  setApiUrl,
  checkApiStatus,
  refreshMarkets,
  loadFallbackData,
  loading,
  markets,
  onClose
}) => {
  const { t } = useTranslation();

  const exportData = () => {
    const json = JSON.stringify(markets, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pendo_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const inputStyle = {
    flex: 1,
    padding: '0.65rem 0.9rem',
    background: 'var(--cream-deep)',
    border: '1.5px solid rgba(26,20,16,0.12)',
    borderRadius: '10px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    color: 'var(--ink)',
    outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(26,20,16,0.5)',
      zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '1rem', overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--cream-glow)',
        borderRadius: '16px',
        maxWidth: '960px', width: '100%',
        margin: '1rem 0',
        maxHeight: 'calc(100vh - 2rem)',
        display: 'flex', flexDirection: 'column',
        border: '1.5px solid rgba(26,20,16,0.08)',
        boxShadow: '0 16px 48px rgba(26,20,16,0.15)',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--terracotta)',
          color: 'var(--cream)',
          padding: '1rem 1.25rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderRadius: '14px 14px 0 0',
          flexShrink: 0,
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Server style={{ width: '22px', height: '22px' }} />
            {t('admin.controlCenter')}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '0.3rem 0.75rem', color: 'var(--cream)', fontSize: '1.25rem', cursor: 'pointer', fontWeight: 700 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Backend status */}
          <div style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            borderLeft: `4px solid ${apiStatus.connected ? 'var(--forest)' : 'var(--terracotta)'}`,
            background: apiStatus.connected ? 'rgba(30,77,58,0.06)' : 'rgba(194,73,22,0.06)',
            border: `1.5px solid ${apiStatus.connected ? 'rgba(30,77,58,0.15)' : 'rgba(194,73,22,0.15)'}`,
            borderLeftWidth: '4px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {apiStatus.connected
                  ? <CheckCircle style={{ width: '22px', height: '22px', color: 'var(--forest)' }} />
                  : <XCircle style={{ width: '22px', height: '22px', color: 'var(--terracotta)' }} />
                }
                <div>
                  <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>
                    {t('admin.backendStatus')}
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{apiStatus.message}</p>
                  {apiStatus.data && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)', marginTop: '0.25rem' }}>
                      Uptime: {Math.floor(apiStatus.data.uptime / 60)}min | Marchés: {apiStatus.data.marketsCount}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={checkApiStatus}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--cream-deep)',
                  border: '1.5px solid rgba(26,20,16,0.12)',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                {t('admin.check')}
              </button>
            </div>
          </div>

          {/* Setup instructions */}
          {!apiStatus.connected && (
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              background: 'rgba(232,170,11,0.08)',
              border: '1.5px solid rgba(232,170,11,0.25)',
              borderLeft: '4px solid var(--sun)',
            }}>
              <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
                ⚠️ {t('admin.backendNotStarted')}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '0.75rem' }}>
                {t('admin.setupInstructions')}
              </p>
              <div style={{
                background: 'var(--ink)', borderRadius: '10px', padding: '0.85rem 1rem',
                fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cream)',
                display: 'flex', flexDirection: 'column', gap: '0.35rem',
              }}>
                <span style={{ opacity: 0.5 }}># 1. Ouvrir un nouveau terminal</span>
                <span style={{ color: 'var(--sun)' }}>cd ~/PENDO/backend</span>
                <span style={{ opacity: 0.5, marginTop: '0.25rem' }}># 2. Démarrer le serveur</span>
                <span style={{ color: 'var(--sun)' }}>node server.js</span>
              </div>
            </div>
          )}

          {/* API config */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>
              ⚙️ {t('admin.apiConfig')}
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                placeholder="API_URL"
                style={inputStyle}
              />
              <button
                onClick={checkApiStatus}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: 'var(--ink)', color: 'var(--cream)',
                  border: 'none', borderRadius: '10px',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {t('admin.test')}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {[
              {
                onClick: refreshMarkets,
                disabled: loading || !apiStatus.connected,
                bg: 'var(--terracotta)',
                Icon: RefreshCw,
                spin: loading,
                label: loading ? t('admin.collecting') : t('admin.collectData'),
              },
              { onClick: exportData, disabled: false, bg: 'var(--forest)', Icon: Download, label: t('buttons.exportJSON') },
              { onClick: loadFallbackData, disabled: false, bg: 'var(--ink)', Icon: Database, label: t('buttons.loadDemo') },
            ].map(({ onClick, disabled, bg, Icon, spin, label }) => (
              <button
                key={label}
                onClick={onClick}
                disabled={disabled}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  background: disabled ? 'var(--cream-deep)' : bg,
                  color: disabled ? 'var(--ink-mute)' : 'var(--cream)',
                  border: 'none', borderRadius: '10px',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Icon style={{ width: '18px', height: '18px', animation: spin ? 'spin 0.8s linear infinite' : 'none' }} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Markets data */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '0.75rem' }}>
              📊 Données des marchés
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {markets.map(m => (
                <div
                  key={m.id}
                  style={{
                    background: 'var(--cream-deep)',
                    border: '1.5px solid rgba(26,20,16,0.07)',
                    borderRadius: '10px', padding: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>{m.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ink-mute)' }}>{m.country}</div>
                    </div>
                    <span style={{
                      padding: '0.15rem 0.5rem',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                      background: m.source === 'Demo' ? 'rgba(232,170,11,0.12)' : 'rgba(30,77,58,0.1)',
                      color: m.source === 'Demo' ? 'var(--sun)' : 'var(--forest)',
                    }}>
                      {m.source || 'API'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>{m.value}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.875rem', color: m.positive ? 'var(--forest)' : 'var(--terracotta)' }}>
                      {m.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture */}
          <div style={{
            background: 'var(--ink)', borderRadius: '12px', padding: '1.25rem',
            color: 'var(--cream)',
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '0.95rem', marginBottom: '0.85rem' }}>
              🏗️ Architecture PENDO
            </h3>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { title: 'Frontend (React)', color: 'var(--terracotta)', items: ['✓ Interface utilisateur', '✓ Affichage temps réel', '✓ Export/Import'] },
                { title: 'Backend (Node.js)', color: 'var(--forest)', items: ['→ Collecte automatique', '→ Multi-sources (Yahoo, Investing)', '→ API REST'] },
                { title: 'Prochaine étape', color: 'var(--sun)', items: ['→ Base de données', '→ Historique', '→ Monétisation'] },
              ].map(({ title, color, items }) => (
                <div key={title} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.85rem' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', color, marginBottom: '0.5rem' }}>{title}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {items.map(item => (
                      <div key={item} style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'rgba(250,243,232,0.75)' }}>{item}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
