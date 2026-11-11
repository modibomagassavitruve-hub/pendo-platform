import React, { useState, useEffect } from 'react';
import { MessageCircle, Sparkles, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FeedbackButton = ({ onClick }) => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasShownInitial, setHasShownInitial] = useState(false);

  useEffect(() => {
    if (!hasShownInitial) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        setHasShownInitial(true);
        setTimeout(() => setShowTooltip(false), 3000);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasShownInitial]);

  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 40 }}>
      {/* Tooltip */}
      <div
        style={{
          position: 'absolute',
          right: 'calc(100% + 1rem)',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: showTooltip || isHovered ? 1 : 0,
          pointerEvents: showTooltip || isHovered ? 'auto' : 'none',
          transition: 'all 0.4s ease-out',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'var(--ink)',
          padding: '0.65rem 1rem',
          borderRadius: '14px',
          boxShadow: '0 4px 20px rgba(26,20,16,0.2)',
        }}>
          <div style={{
            padding: '0.35rem',
            background: 'rgba(194,73,22,0.2)',
            borderRadius: '8px',
          }}>
            <Sparkles style={{ width: '14px', height: '14px', color: 'var(--terracotta)' }} />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--cream)', margin: 0 }}>
              {t('feedback.giveFeedback')}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'rgba(250,243,232,0.6)', margin: 0 }}>
              {t('feedback.helpImprove')}
            </p>
          </div>
          <ChevronRight style={{ width: '14px', height: '14px', color: 'rgba(250,243,232,0.4)' }} />
        </div>
        {/* Arrow */}
        <div style={{
          position: 'absolute', right: 0, top: '50%',
          transform: 'translateY(-50%) translateX(100%)',
          width: 0, height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderLeft: '8px solid var(--ink)',
        }} />
      </div>

      {/* Main button */}
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={t('feedback.giveFeedback')}
        style={{
          position: 'relative',
          width: '56px', height: '56px',
          borderRadius: '50%',
          background: isHovered ? 'var(--terracotta)' : 'var(--ink)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isHovered
            ? '0 8px 32px rgba(194,73,22,0.4)'
            : '0 4px 20px rgba(26,20,16,0.25)',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Pulse ring (idle) */}
        {!isHovered && (
          <div style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '50%',
            border: '2px solid rgba(26,20,16,0.15)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        )}

        <MessageCircle style={{
          width: '22px', height: '22px',
          color: 'var(--cream)',
          transform: isHovered ? 'rotate(12deg) scale(1.1)' : 'none',
          transition: 'transform 0.3s',
        }} />

        {/* Notification dot */}
        <div style={{
          position: 'absolute', top: '-2px', right: '-2px',
          width: '16px', height: '16px',
          background: 'var(--sun)',
          borderRadius: '50%',
          border: '2px solid var(--cream)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', fontWeight: 700, color: 'var(--ink)' }}>!</span>
        </div>
      </button>
    </div>
  );
};

export default FeedbackButton;
