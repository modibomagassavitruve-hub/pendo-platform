import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, MessageCircle, BarChart3, Users, TrendingUp, Shield } from 'lucide-react';

const MemberGuard = ({ onOpenLogin, feature }) => {
  const { t } = useTranslation();

  const BENEFITS = [
    { icon: TrendingUp, title: t('memberGuard.virtualPortfolio'), desc: t('memberGuard.virtualPortfolioDesc') },
    { icon: MessageCircle, title: t('memberGuard.communityChat'), desc: t('memberGuard.communityChatDesc') },
    { icon: Users, title: t('memberGuard.discussionForum'), desc: t('memberGuard.discussionForumDesc') },
    { icon: BarChart3, title: t('memberGuard.advancedAnalytics'), desc: t('memberGuard.advancedAnalyticsDesc') },
    { icon: Shield, title: t('memberGuard.priceAlerts'), desc: t('memberGuard.priceAlertsDesc') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem' }}>
      {/* Lock icon */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <div style={{
          width: '96px', height: '96px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--terracotta) 0%, #8F3211 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(194,73,22,0.3)',
        }}>
          <Lock size={40} color="var(--cream)" />
        </div>
        <div style={{
          position: 'absolute', top: '-4px', right: '-4px',
          width: '24px', height: '24px',
          background: 'var(--sun)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: 'var(--ink)', fontSize: '0.7rem', fontWeight: 700 }}>!</span>
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: '0.5rem', textAlign: 'center' }}>
        {feature} — {t('auth.memberAccess')}
      </h2>
      <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', textAlign: 'center', maxWidth: '400px', marginBottom: '2rem', lineHeight: 1.65 }}>
        {t('auth.joinFree')} <strong style={{ color: 'var(--ink)' }}>{feature}</strong> {t('auth.andAllBenefits')}
      </p>

      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={onOpenLogin}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--ink)',
            color: 'var(--cream)',
            border: 'none',
            borderRadius: '12px',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 16px rgba(26,20,16,0.2)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
        >
          {t('auth.createFreeAccount')}
        </button>
        <button
          onClick={onOpenLogin}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            color: 'var(--ink)',
            border: '1.5px solid rgba(26,20,16,0.2)',
            borderRadius: '12px',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--terracotta)'; e.currentTarget.style.color = 'var(--terracotta)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(26,20,16,0.2)'; e.currentTarget.style.color = 'var(--ink)'; }}
        >
          {t('auth.signIn')}
        </button>
      </div>

      {/* Benefits grid */}
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          {t('auth.memberBenefits')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BENEFITS.map((b, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '1rem',
                background: 'var(--cream-deep)',
                borderRadius: '12px',
                border: '1.5px solid rgba(26,20,16,0.07)',
              }}
            >
              <div style={{
                width: '40px', height: '40px', flexShrink: 0,
                borderRadius: '10px',
                background: 'rgba(194,73,22,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <b.icon size={20} color="var(--terracotta)" />
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>{b.title}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.775rem', color: 'var(--ink-mute)', lineHeight: 1.5 }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.775rem', color: 'var(--ink-mute)', marginTop: '1rem' }}>
          ✨ {t('auth.freeSignup')}
        </p>
      </div>
    </div>
  );
};

export default MemberGuard;
