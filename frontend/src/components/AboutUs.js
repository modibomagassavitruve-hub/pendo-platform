import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, Globe, Shield, Zap, Award } from 'lucide-react';
import PendoLogo from './PendoLogo';

const AboutUs = () => {
  const { t } = useTranslation();

  const features = [
    { icon: Globe, title: t('about.features.panAfrican.title'), description: t('about.features.panAfrican.description'), color: 'var(--forest)' },
    { icon: TrendingUp, title: t('about.features.realtime.title'), description: t('about.features.realtime.description'), color: 'var(--terracotta)' },
    { icon: Shield, title: t('about.features.secure.title'), description: t('about.features.secure.description'), color: 'var(--ink)' },
    { icon: Zap, title: t('about.features.tools.title'), description: t('about.features.tools.description'), color: 'var(--sun)' },
    { icon: Users, title: t('about.features.community.title'), description: t('about.features.community.description'), color: 'var(--forest)' },
    { icon: Award, title: t('about.features.education.title'), description: t('about.features.education.description'), color: 'var(--terracotta)' },
  ];

  const stats = [
    { value: '7+', label: t('about.stats.markets') },
    { value: '500+', label: t('about.stats.stocks') },
    { value: '24/7', label: t('about.stats.support') },
    { value: '54', label: t('about.stats.countries') },
  ];

  const markets = [
    { region: t('about.markets.west'), items: ["BRVM (Côte d'Ivoire)", "Nigerian Exchange (NGX)", "Ghana Stock Exchange (GSE)"] },
    { region: t('about.markets.east'), items: ["Nairobi Securities Exchange (NSE)", "Dar es Salaam Stock Exchange"] },
    { region: t('about.markets.south'), items: ["Johannesburg Stock Exchange (JSE)"] },
    { region: t('about.markets.north'), items: ["Egyptian Exchange (EGX)", "Casablanca Stock Exchange"] },
  ];

  return (
    <div style={{ background: 'var(--cream)', color: 'var(--ink)' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--terracotta) 0%, #8F3211 100%)', padding: '5rem 1rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <PendoLogo size={64} theme="dark" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(2rem,5vw,3.5rem)', color: 'var(--cream)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '1.25rem' }}>
            {t('about.title')}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(1rem,1.5vw,1.2rem)', color: 'rgba(250,243,232,0.8)', lineHeight: 1.65, maxWidth: '700px', margin: '0 auto' }}>
            {t('about.subtitle')}
          </p>
        </div>
      </div>

      {/* Mission */}
      <div style={{ padding: '4rem 1rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(1.5rem,3vw,2.25rem)', color: 'var(--ink)', textAlign: 'center', marginBottom: '2rem', letterSpacing: '-0.025em' }}>
            {t('about.mission.title')}
          </h2>
          <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-warm)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', color: 'var(--ink-soft)', lineHeight: 1.75, marginBottom: '1rem' }}>
              {t('about.mission.description1')}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', color: 'var(--ink-soft)', lineHeight: 1.75 }}>
              {t('about.mission.description2')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: 'var(--cream-deep)', padding: '4rem 1rem', borderTop: '1px solid rgba(26,20,16,0.06)', borderBottom: '1px solid rgba(26,20,16,0.06)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 'clamp(2rem,4vw,2.75rem)', color: 'var(--terracotta)', marginBottom: '0.4rem', fontVariantNumeric: 'tabular-nums' }}>
                  {stat.value}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features grid */}
      <div style={{ padding: '4rem 1rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(1.5rem,3vw,2.25rem)', color: 'var(--ink)', textAlign: 'center', marginBottom: '3rem', letterSpacing: '-0.025em' }}>
            {t('about.features.title')}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} />
            ))}
          </div>
        </div>
      </div>

      {/* Markets coverage */}
      <div style={{ background: 'var(--cream-deep)', padding: '4rem 1rem', borderTop: '1px solid rgba(26,20,16,0.06)', borderBottom: '1px solid rgba(26,20,16,0.06)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(1.5rem,3vw,2.25rem)', color: 'var(--ink)', textAlign: 'center', marginBottom: '2rem', letterSpacing: '-0.025em' }}>
            {t('about.markets.title')}
          </h2>
          <div style={{ background: 'var(--cream-glow)', borderRadius: 'var(--radius-xl)', padding: '2rem', border: '1.5px solid rgba(26,20,16,0.08)' }}>
            <div className="grid md:grid-cols-2 gap-6">
              {markets.map((m, i) => (
                <div key={i}>
                  <h3 style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                    {m.region}
                  </h3>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {m.items.map((item, j) => (
                      <li key={j} style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--terracotta)', flexShrink: 0, display: 'inline-block' }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vision */}
      <div style={{ padding: '4rem 1rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(1.5rem,3vw,2.25rem)', color: 'var(--ink)', textAlign: 'center', marginBottom: '2rem', letterSpacing: '-0.025em' }}>
            {t('about.vision.title')}
          </h2>
          <div style={{ background: 'rgba(194,73,22,0.05)', border: '1.5px solid rgba(194,73,22,0.15)', borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.1rem', color: 'var(--ink-soft)', lineHeight: 1.75, textAlign: 'center' }}>
              {t('about.vision.description')}
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: 'var(--ink)', padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(1.5rem,3vw,2.25rem)', color: 'var(--cream)', marginBottom: '1rem', letterSpacing: '-0.025em' }}>
            {t('about.cta.title')}
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem', color: 'rgba(250,243,232,0.7)', marginBottom: '2rem', lineHeight: 1.65 }}>
            {t('about.cta.description')}
          </p>
          <button
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; e.currentTarget.style.transform = 'scale(1.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = 'var(--ink)'; }}
            style={{ padding: '0.85rem 2rem', background: 'var(--cream)', color: 'var(--ink)', border: 'none', borderRadius: '12px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}
          >
            {t('about.cta.button')}
          </button>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ feature }) => {
  const [hovered, setHovered] = React.useState(false);
  const Icon = feature.icon;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--cream-glow)',
        border: hovered ? '1.5px solid rgba(194,73,22,0.25)' : '1.5px solid rgba(26,20,16,0.08)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        transition: 'all 0.25s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-warm)' : 'none',
      }}
    >
      <div style={{
        width: '56px', height: '56px',
        background: `color-mix(in srgb, ${feature.color} 10%, transparent)`,
        borderRadius: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.25rem',
        transition: 'transform 0.3s',
        transform: hovered ? 'scale(1.1)' : 'none',
      }}>
        <Icon style={{ width: '1.75rem', height: '1.75rem', color: feature.color }} />
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--ink)', marginBottom: '0.6rem' }}>
        {feature.title}
      </h3>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)', lineHeight: 1.65 }}>
        {feature.description}
      </p>
    </div>
  );
};

export default AboutUs;
