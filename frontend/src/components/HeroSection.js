import React from "react";
import { TrendingUp, BarChart3, Globe, ArrowRight, Zap } from "lucide-react";
import AnimatedTextCycle from "./ui/AnimatedTextCycle";
import CountUp from "./ui/CountUp";
import { useTranslation } from "react-i18next";

export default function HeroSection({ onExplore, stats }) {
  const { t } = useTranslation();

  const CYCLE_WORDS = [
    t('navigation.markets', 'Marchés'),
    t('navigation.opportunities', 'Opportunités'),
    t('navigation.trading', 'Trading'),
    t('navigation.analytics', 'Analyses'),
    t('navigation.calendar', 'Calendrier'),
  ];

  const STATS = [
    { value: stats?.exchanges || 10, suffix: "+", label: t('hero.exchanges', 'Bourses africaines'), icon: BarChart3 },
    { value: stats?.countries || 54, label: t('hero.countries', 'Pays couverts'), icon: Globe },
    { value: stats?.assets || 500, suffix: "+", label: t('hero.assets', 'Actifs suivis'), icon: TrendingUp },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      {/* Warm ambient blobs — terracotta / sun / forest tints */}
      <div style={{
        position: 'absolute', top: 0, left: '25%',
        width: '600px', height: '600px',
        background: 'rgba(232,170,11,0.06)',
        borderRadius: '50%', filter: 'blur(120px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '33%', right: '25%',
        width: '400px', height: '400px',
        background: 'rgba(194,73,22,0.05)',
        borderRadius: '50%', filter: 'blur(100px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: '50%',
        width: '500px', height: '500px',
        background: 'rgba(30,77,58,0.04)',
        borderRadius: '50%', filter: 'blur(120px)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '3rem', paddingBottom: '4rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Live data badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.375rem 1rem',
              borderRadius: '99px',
              background: 'var(--cream-deep)',
              border: '1.5px solid rgba(26,20,16,0.1)',
              marginBottom: '2rem',
            }}>
              <span style={{ position: 'relative', display: 'flex', width: '8px', height: '8px' }}>
                <span style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '50%', background: '#1E4D3A',
                  opacity: 0.6,
                  animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite',
                }} />
                <span style={{
                  position: 'relative', display: 'inline-flex',
                  borderRadius: '50%', width: '8px', height: '8px',
                  background: 'var(--forest)',
                }} />
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-soft)', fontWeight: 500 }}>
                {t('hero.liveData', 'Données en temps réel')}
              </span>
              <Zap style={{ width: '0.75rem', height: '0.75rem', color: 'var(--sun)' }} />
            </div>

            {/* Main headline — Fraunces display */}
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: 'clamp(2.2rem, 6vw, 4.5rem)',
              textAlign: 'center',
              color: 'var(--ink)',
              maxWidth: '900px',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              marginBottom: '1.5rem',
            }}>
              {t('hero.title', 'Explorez les')}{" "}
              <em style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}>
                <AnimatedTextCycle words={CYCLE_WORDS} interval={2500} />
              </em>{" "}
              <br className="hidden sm:block" />
              {t('hero.subtitle', "d'Afrique")}
            </h1>

            {/* Subheadline */}
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1rem, 1.5vw, 1.125rem)',
              color: 'var(--ink-mute)',
              textAlign: 'center',
              maxWidth: '600px',
              marginBottom: '2.5rem',
              lineHeight: 1.65,
            }}>
              {t('hero.description', 'La plateforme de référence pour suivre les marchés financiers africains. Indices, actions, devises et matières premières en temps réel.')}
            </p>

            {/* CTA + Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem' }}>
              {/* CTA Button */}
              <button
                onClick={onExplore}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--terracotta)';
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 16px 48px -8px rgba(194,73,22,0.35)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--ink)';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-warm)';
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '1rem 2rem',
                  background: 'var(--ink)',
                  color: 'var(--cream)',
                  borderRadius: '16px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: '1.05rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: 'var(--shadow-warm)',
                }}
              >
                {t('hero.cta', 'Explorer les marchés')}
                <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>

              {/* Stats row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                {STATS.map((stat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '44px', height: '44px',
                      borderRadius: '12px',
                      background: 'var(--cream-deep)',
                      border: '1.5px solid rgba(26,20,16,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <stat.icon style={{ width: '1.25rem', height: '1.25rem', color: 'var(--terracotta)' }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                        <CountUp end={stat.value} duration={2} suffix={stat.suffix || ""} />
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>
                        {stat.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      {/* Bottom cream fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '8rem',
        background: 'linear-gradient(to top, var(--cream), transparent)',
        zIndex: 10,
        pointerEvents: 'none',
      }} />
    </div>
  );
}
