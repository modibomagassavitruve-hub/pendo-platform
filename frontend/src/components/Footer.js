import React from 'react';
import { useTranslation } from 'react-i18next';
import { Twitter, Linkedin, Github, Mail } from 'lucide-react';

const Footer = ({ apiStatus }) => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Github, href: '#', label: 'GitHub' },
    { icon: Mail, href: 'mailto:contact@pendo.africa', label: 'Email' },
  ];

  const cols = [
    {
      title: t('footer.productTitle', 'Produit'),
      links: [
        { label: t('footer.markets', 'Marchés'), href: '#' },
        { label: t('footer.analytics', 'Analyses'), href: '#' },
        { label: t('footer.pricing', 'Tarifs'), href: '#' },
        { label: t('footer.api', 'API'), href: '#' },
      ],
    },
    {
      title: t('footer.learnTitle', 'Apprendre'),
      links: [
        { label: t('footer.guides', 'Guides'), href: '#' },
        { label: t('footer.glossary', 'Glossaire'), href: '#' },
        { label: t('footer.community', 'Communauté'), href: '#' },
        { label: t('footer.blog', 'Blog'), href: '#' },
      ],
    },
    {
      title: t('footer.pendoColumn', 'PENDO'),
      links: [
        { label: t('footer.aboutUs', 'À propos'), href: '#' },
        { label: t('footer.careers', 'Carrières'), href: '#' },
        { label: t('footer.press', 'Presse'), href: '#' },
        { label: t('footer.contact', 'Contact'), href: '#' },
      ],
    },
  ];

  return (
    <footer
      style={{
        marginTop: '4rem',
        borderTop: '1px solid rgba(26, 20, 16, 0.08)',
        background: 'var(--cream-deep)',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '4rem 1rem 2rem' }}>

        {/* Grid principal */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            marginBottom: '3rem',
          }}
        >
          {/* Colonne brand */}
          <div style={{ gridColumn: 'span 1' }}>
            {/* Logo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '1.35rem',
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
                marginBottom: '0.75rem',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  background: 'var(--terracotta)',
                  borderRadius: '50%',
                  animation: 'pulse-dot 3s ease-in-out infinite',
                }}
              />
              PENDO
            </div>

            <p
              style={{
                color: 'var(--ink-soft)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                maxWidth: '280px',
                marginBottom: '1.25rem',
              }}
            >
              {t('footer.description', 'La plateforme qui rend les marchés africains accessibles à tous.')}
            </p>

            {/* Statut API */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '99px',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                background: apiStatus?.connected
                  ? 'rgba(30, 77, 58, 0.1)'
                  : 'rgba(232, 170, 11, 0.1)',
                color: apiStatus?.connected ? 'var(--forest)' : '#8A6200',
                border: apiStatus?.connected
                  ? '1px solid rgba(30, 77, 58, 0.2)'
                  : '1px solid rgba(232, 170, 11, 0.25)',
                marginBottom: '1.5rem',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: apiStatus?.connected ? 'var(--forest)' : 'var(--sun)',
                  animation: apiStatus?.connected ? 'pulse-dot 2s ease-in-out infinite' : 'none',
                }}
              />
              {apiStatus?.connected
                ? t('footer.backendConnected', 'Connecté en temps réel')
                : t('footer.demoMode', 'Mode démonstration')}
            </div>

            {/* Réseaux sociaux */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'var(--cream-glow)',
                      color: 'var(--ink-soft)',
                      border: '1.5px solid rgba(26,20,16,0.1)',
                      transition: 'all 0.2s',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--ink)';
                      e.currentTarget.style.color = 'var(--cream)';
                      e.currentTarget.style.borderColor = 'var(--ink)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--cream-glow)';
                      e.currentTarget.style.color = 'var(--ink-soft)';
                      e.currentTarget.style.borderColor = 'rgba(26,20,16,0.1)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <Icon style={{ width: '1rem', height: '1rem' }} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Newsletter séparée sur desktop */}
          <div>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-mute)',
                marginBottom: '1rem',
              }}
            >
              {t('footer.newsletter', 'Newsletter')}
            </p>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              {t('footer.newsletterDesc', 'Les marchés africains chaque semaine, sans bruit.')}
            </p>
            <form
              onSubmit={e => e.preventDefault()}
              style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
            >
              <input
                type="email"
                placeholder={t('footer.emailPlaceholder', 'votre@email.com')}
                aria-label={t('footer.newsletter', 'Newsletter')}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  padding: '0.65rem 0.9rem',
                  background: 'var(--cream-glow)',
                  border: '1.5px solid rgba(26,20,16,0.2)',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'var(--terracotta)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(194,73,22,0.12)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(26,20,16,0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '0.65rem 1rem',
                  background: 'var(--ink)',
                  color: 'var(--cream)',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
              >
                {t('footer.subscribe', "S'abonner")}
              </button>
            </form>
          </div>

          {/* Colonnes de liens */}
          {cols.map((col) => (
            <div key={col.title}>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-mute)',
                  marginBottom: '1rem',
                }}
              >
                {col.title}
              </p>
              <ul style={{ listStyle: 'none' }}>
                {col.links.map((link) => (
                  <li key={link.label} style={{ marginBottom: '0.6rem' }}>
                    <a
                      href={link.href}
                      style={{
                        color: 'var(--ink-soft)',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--terracotta)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-soft)'; }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Barre basse */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(26, 20, 16, 0.08)',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--ink-mute)',
              letterSpacing: '0.02em',
            }}
          >
            {t('footer.copyright', { year: currentYear, defaultValue: `© ${currentYear} PENDO. Tous droits réservés.` })}
          </span>

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--ink-mute)',
            }}
          >
            {[
              { label: t('footer.conditions', 'Conditions'), href: '#' },
              { label: t('footer.confidentiality', 'Confidentialité'), href: '#' },
              { label: t('footer.legalNotice', 'Mentions légales'), href: '#' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  color: 'var(--ink-mute)',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--terracotta)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; }}
              >
                {link.label}
              </a>
            ))}
          </div>

          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--ink-mute)',
              opacity: 0.6,
            }}
          >
            v1.0.0-beta · {t('footer.madeWith', 'Fait avec')} ♥ {t('footer.forAfrica', 'pour l\'Afrique')}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
