import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Globe,
  MessageSquare,
  MessageCircle,
  User,
  TrendingUp,
  Sparkles,
  Newspaper,
  Briefcase,
  PieChart,
  Bell,
  Info,
  Menu,
  X,
  CandlestickChart,
  CalendarDays,
  LayoutDashboard
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import PendoLogo from './PendoLogo';

// NavPill — pill de navigation, thème pastel
const NavPill = memo(({ item, isActive, isMobile, onClick }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      role="tab"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: isMobile ? '0.75rem 1rem' : '0.4rem 0.9rem',
        borderRadius: isMobile ? '10px' : '99px',
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        fontSize: '0.875rem',
        whiteSpace: 'nowrap',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        width: isMobile ? '100%' : undefined,
        justifyContent: isMobile ? 'flex-start' : undefined,
        background: isActive ? 'var(--ink)' : 'transparent',
        color: isActive ? 'var(--cream)' : 'var(--ink-soft)',
        boxShadow: isActive ? 'var(--shadow-warm)' : 'none',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'var(--cream-deep)';
          e.currentTarget.style.color = 'var(--terracotta)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--ink-soft)';
        }
      }}
    >
      <Icon style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
      <span>{item.label}</span>
    </button>
  );
});

const Header = ({
  apiStatus,
  loading,
  activeTab,
  setActiveTab,
  refreshMarkets,
  openAdmin,
  onOpenLogin,
  onOpenSlack,
  userMenuComponent
}) => {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('navigation.dashboard', 'Dashboard') },
    { id: 'markets', icon: TrendingUp, label: t('navigation.markets') },
    { id: 'trading', icon: CandlestickChart, label: t('navigation.trading') },
    { id: 'opportunities', icon: Sparkles, label: t('navigation.opportunities') },
    { id: 'news', icon: Newspaper, label: t('navigation.news') },
    { id: 'portfolio', icon: Briefcase, label: t('navigation.portfolio') },
    { id: 'analytics', icon: PieChart, label: t('navigation.analytics') },
    { id: 'calendar', icon: CalendarDays, label: t('navigation.calendar') },
    { id: 'notifications', icon: Bell, label: t('navigation.notifications') },
    { id: 'about', icon: Info, label: t('navigation.about') },
  ];

  const handleNavClick = useCallback((itemId) => {
    setActiveTab(itemId);
    setMobileMenuOpen(false);
  }, [setActiveTab]);

  return (
    <header
      role="banner"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        backgroundColor: scrolled
          ? 'rgba(250, 243, 232, 0.92)'
          : 'rgba(250, 243, 232, 0.85)',
        borderBottom: `1px solid rgba(26, 20, 16, ${scrolled ? '0.1' : '0.06'})`,
        boxShadow: scrolled ? '0 2px 16px -4px rgba(26,20,16,0.08)' : 'none',
        transition: 'background-color 0.3s, box-shadow 0.3s, border-color 0.3s',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

          {/* Logo PENDO */}
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.2rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              transition: 'opacity 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            aria-label="PENDO — Accueil"
          >
            <PendoLogo size={32} theme="light" />

            {/* Wordmark */}
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              fontSize: '1.25rem',
              letterSpacing: '0.08em',
              color: 'var(--ink)',
              lineHeight: 1,
              textTransform: 'uppercase',
            }}>
              PENDO
            </span>
          </button>

          {/* Actions droite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="hidden md:block">
              <LanguageSelector />
            </div>

            {/* Forum */}
            <button
              onClick={() => handleNavClick('forum')}
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '99px',
                fontSize: '0.8rem',
                fontWeight: 500,
                fontFamily: 'var(--font-body)',
                border: '1.5px solid rgba(26,20,16,0.15)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'forum' ? 'var(--ink)' : 'transparent',
                color: activeTab === 'forum' ? 'var(--cream)' : 'var(--ink-soft)',
              }}
              className="sm:flex"
              onMouseEnter={e => {
                if (activeTab !== 'forum') {
                  e.currentTarget.style.background = 'var(--cream-deep)';
                  e.currentTarget.style.color = 'var(--terracotta)';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== 'forum') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--ink-soft)';
                }
              }}
            >
              <MessageSquare style={{ width: '0.875rem', height: '0.875rem' }} />
              <span className="hidden md:inline">{t('navigation.forum')}</span>
            </button>

            {/* Chat */}
            <button
              onClick={() => handleNavClick('chat')}
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '99px',
                fontSize: '0.8rem',
                fontWeight: 500,
                fontFamily: 'var(--font-body)',
                border: '1.5px solid rgba(26,20,16,0.15)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === 'chat' ? 'var(--ink)' : 'transparent',
                color: activeTab === 'chat' ? 'var(--cream)' : 'var(--ink-soft)',
              }}
              className="sm:flex"
              onMouseEnter={e => {
                if (activeTab !== 'chat') {
                  e.currentTarget.style.background = 'var(--cream-deep)';
                  e.currentTarget.style.color = 'var(--terracotta)';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== 'chat') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--ink-soft)';
                }
              }}
            >
              <MessageCircle style={{ width: '0.875rem', height: '0.875rem' }} />
              <span className="hidden md:inline">{t('navigation.chat')}</span>
            </button>

            {/* Bouton Vue Slack */}
            {onOpenSlack && (
              <button
                onClick={onOpenSlack}
                title="Vue Slack"
                className="hidden md:flex"
                style={{
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  background: 'linear-gradient(145deg, #C8613A, #A8481F)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-body)',
                  borderRadius: '99px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px -8px rgba(168,72,31,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <span style={{ fontSize: '0.95rem' }}>◨</span>
                <span>Slack</span>
              </button>
            )}

            {/* Séparateur */}
            <div
              style={{ width: '1px', height: '24px', background: 'rgba(26,20,16,0.12)' }}
              className="hidden md:block"
            />

            {/* Bouton connexion / user menu */}
            {userMenuComponent || (
              <button
                onClick={onOpenLogin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'var(--ink)',
                  color: 'var(--cream)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-body)',
                  borderRadius: '99px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-warm)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--terracotta)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 8px 32px -8px rgba(194,73,22,0.35)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--ink)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--shadow-warm)';
                }}
              >
                <User style={{ width: '1rem', height: '1rem' }} />
                <span>{t('auth.login')}</span>
              </button>
            )}

            {/* Menu burger mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                padding: '0.5rem',
                color: 'var(--ink-soft)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '8px',
                transition: 'all 0.2s',
              }}
              className="md:hidden"
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileMenuOpen
                ? <X style={{ width: '1.25rem', height: '1.25rem' }} />
                : <Menu style={{ width: '1.25rem', height: '1.25rem' }} />
              }
            </button>
          </div>
        </div>

        {/* Navigation Desktop */}
        <nav className="hidden md:block" style={{ paddingBottom: '0.75rem' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflowX: 'auto' }}
            className="scrollbar-hide"
            role="tablist"
            aria-label="Navigation principale"
          >
            {navItems.map((item) => (
              <NavPill
                key={item.id}
                item={item}
                isActive={activeTab === item.id}
                onClick={() => handleNavClick(item.id)}
              />
            ))}
          </div>
        </nav>

        {/* Navigation Mobile */}
        <div
          className="md:hidden"
          style={{
            overflow: 'hidden',
            maxHeight: mobileMenuOpen ? '900px' : '0',
            opacity: mobileMenuOpen ? 1 : 0,
            transition: 'max-height 0.3s ease, opacity 0.3s ease',
            paddingBottom: mobileMenuOpen ? '1rem' : '0',
          }}
        >
          <div
            style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(26,20,16,0.08)' }}
            role="tablist"
            aria-label="Navigation mobile"
          >
            {navItems.map((item) => (
              <NavPill
                key={item.id}
                item={item}
                isActive={activeTab === item.id}
                isMobile
                onClick={() => handleNavClick(item.id)}
              />
            ))}

            <div style={{ paddingTop: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid rgba(26,20,16,0.08)' }}>
              <button
                onClick={() => handleNavClick('forum')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  color: 'var(--ink-soft)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                }}
              >
                <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                <span>{t('navigation.forum')}</span>
              </button>
              <button
                onClick={() => handleNavClick('chat')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  color: 'var(--ink-soft)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                }}
              >
                <MessageCircle style={{ width: '1rem', height: '1rem' }} />
                <span>{t('navigation.chat')}</span>
              </button>
            </div>

            <div style={{ paddingTop: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid rgba(26,20,16,0.08)' }}>
              <LanguageSelector inline />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
