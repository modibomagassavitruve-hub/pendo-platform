import React, { useState, useEffect } from 'react';
import { X, TestTube, MessageCircle, Sparkles, Rocket, Gift, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BetaBanner = ({ onFeedbackClick }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem('betaBannerDismissed') !== 'true';
  });
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => setIsAnimated(true), 100);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    setIsAnimated(false);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem('betaBannerDismissed', 'true');
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.5s ease-out',
        opacity: isAnimated ? 1 : 0,
        transform: isAnimated ? 'translateY(0)' : 'translateY(-100%)',
      }}
    >
      {/* Warm gradient background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, var(--terracotta) 0%, #A03B12 50%, var(--terracotta) 100%)',
        backgroundSize: '200% 100%',
      }} />

      {/* Subtle dot pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.08,
        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }} />

      {/* Warm ambient glow */}
      <div style={{ position: 'absolute', top: 0, left: '25%', width: '200px', height: '80px', background: 'rgba(232,170,11,0.2)', borderRadius: '50%', filter: 'blur(30px)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: '30%', width: '160px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(20px)' }} />

      {/* Floating sparkles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <Sparkles style={{ position: 'absolute', top: '8px', left: '10%', width: '14px', height: '14px', color: 'rgba(255,255,255,0.4)', animation: 'float 3s ease-in-out infinite' }} />
        <Sparkles style={{ position: 'absolute', top: '10px', left: '30%', width: '10px', height: '10px', color: 'rgba(255,255,255,0.3)', animation: 'float 3s ease-in-out infinite 0.5s' }} />
        <Sparkles style={{ position: 'absolute', top: '6px', right: '25%', width: '12px', height: '12px', color: 'rgba(255,255,255,0.4)', animation: 'float 3s ease-in-out infinite 1s' }} />
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0.875rem 1rem', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Beta badge */}
            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '999px',
                padding: '0.3rem 0.85rem',
                border: '1px solid rgba(255,255,255,0.25)',
                backdropFilter: 'blur(8px)',
              }}>
                <TestTube style={{ width: '14px', height: '14px', color: 'var(--cream)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--cream)', letterSpacing: '0.05em' }}>
                  {t('banner.beta')}
                </span>
              </div>
            </div>

            {/* Message */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Rocket style={{ width: '18px', height: '18px', color: 'var(--sun)' }} className="hidden sm:block" />
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--cream)', margin: 0 }}>
                <strong>{t('banner.welcome')}</strong>
                <span style={{ opacity: 0.85, marginLeft: '0.5rem' }} className="hidden lg:inline">
                  {t('banner.freeAccess')}
                </span>
              </p>
            </div>

            {/* Early adopter badge */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.3rem 0.75rem',
                background: 'rgba(232,170,11,0.2)',
                border: '1px solid rgba(232,170,11,0.4)',
                borderRadius: '8px',
              }}
              className="hidden xl:flex"
            >
              <Gift style={{ width: '14px', height: '14px', color: 'var(--sun)' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--sun)', fontWeight: 500 }}>
                {t('banner.earlyAdopter')}
              </span>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={onFeedbackClick}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.55rem 1.1rem',
                background: 'var(--cream)',
                color: 'var(--terracotta)',
                border: 'none',
                borderRadius: '10px',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.25s',
                boxShadow: '0 2px 12px rgba(26,20,16,0.15)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,20,16,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(26,20,16,0.15)'; }}
            >
              <MessageCircle style={{ width: '15px', height: '15px' }} />
              <span>{t('banner.giveFeedback')}</span>
              <ChevronRight style={{ width: '14px', height: '14px' }} />
            </button>

            <button
              onClick={handleDismiss}
              aria-label={t('common.close')}
              style={{
                padding: '0.5rem',
                borderRadius: '10px',
                border: '1px solid transparent',
                background: 'rgba(255,255,255,0)',
                color: 'rgba(250,243,232,0.7)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--cream)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0)'; e.currentTarget.style.color = 'rgba(250,243,232,0.7)'; e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <X style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BetaBanner;
