import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Settings, Activity, ChevronDown, KeyRound } from 'lucide-react';

const UserMenu = ({ onOpenLogin, onChangePassword }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <button
        onClick={onOpenLogin}
        aria-label={t('auth.login')}
        style={{
          padding: '0.5rem 0.9rem',
          background: 'var(--terracotta)',
          color: 'var(--cream)',
          border: 'none',
          borderRadius: '10px',
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: '0.875rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#8F3211'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
      >
        <User style={{ width: '18px', height: '18px' }} />
        {/* Texte masqué sur mobile pour garder le burger et la langue visibles */}
        <span className="hidden sm:inline">{t('auth.login')}</span>
      </button>
    );
  }

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.4rem 0.85rem 0.4rem 0.4rem',
          background: 'var(--cream-deep)',
          border: '1.5px solid rgba(26,20,16,0.1)',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(194,73,22,0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(26,20,16,0.1)'; }}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'var(--terracotta)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--cream)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: '0.8rem',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ textAlign: 'left' }} className="hidden md:block">
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)' }}>
            {user?.first_name} {user?.last_name}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>{user?.email}</div>
        </div>
        <ChevronDown style={{
          width: '16px', height: '16px', color: 'var(--ink-mute)',
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }} />
      </button>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setIsOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 0.5rem)',
            width: '240px',
            background: 'var(--cream-glow)',
            border: '1.5px solid rgba(26,20,16,0.1)',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(26,20,16,0.12)',
            zIndex: 20,
            overflow: 'hidden',
          }}>
            {/* User info */}
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1.5px solid rgba(26,20,16,0.07)' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>{user?.email}</div>
              {user?.role && user.role !== 'user' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{
                    display: 'inline-block', padding: '0.2rem 0.6rem',
                    background: 'rgba(194,73,22,0.1)', color: 'var(--terracotta)',
                    borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600,
                  }}>
                    {user.role === 'premium' ? 'Premium' : 'Admin'}
                  </span>
                </div>
              )}
            </div>

            {/* Menu items */}
            <div style={{ padding: '0.4rem 0' }}>
              {[
                { Icon: User, label: t('user.profile') },
                { Icon: Activity, label: t('user.activity') },
                { Icon: Settings, label: t('user.settings') },
                { Icon: KeyRound, label: t('auth.changePasswordTitle', 'Changer le mot de passe'), onClick: onChangePassword },
              ].map(({ Icon, label, onClick }) => (
                <button
                  key={label}
                  onClick={onClick ? () => { setIsOpen(false); onClick(); } : undefined}
                  style={{
                    width: '100%', padding: '0.65rem 1rem', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-soft)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-deep)'; e.currentTarget.style.color = 'var(--ink)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
                >
                  <Icon style={{ width: '16px', height: '16px' }} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Logout */}
            <div style={{ borderTop: '1.5px solid rgba(26,20,16,0.07)', padding: '0.4rem 0' }}>
              <button
                onClick={() => { logout(); setIsOpen(false); }}
                style={{
                  width: '100%', padding: '0.65rem 1rem', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--terracotta)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(194,73,22,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                <LogOut style={{ width: '16px', height: '16px' }} />
                <span>{t('user.logout')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;
