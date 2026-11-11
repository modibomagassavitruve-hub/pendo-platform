import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '../i18n';
import { Globe, Check, ChevronDown, Search } from 'lucide-react';

const LanguageSelector = ({ inline = false }) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
    setSearchQuery('');
  };

  const currentLanguage = languages[i18n.language] || languages.fr;

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languagesByRegion = {
    international: Object.keys(languages).filter(key => languages[key].region === 'international'),
    west: Object.keys(languages).filter(key => languages[key].region === 'west'),
    central: Object.keys(languages).filter(key => languages[key].region === 'central'),
    east: Object.keys(languages).filter(key => languages[key].region === 'east'),
    south: Object.keys(languages).filter(key => languages[key].region === 'south'),
  };

  const filterLanguages = (langKeys) => {
    if (!searchQuery) return langKeys;
    return langKeys.filter(lng => {
      const lang = languages[lng];
      return (
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  };

  const regionIcons = {
    international: '🌍',
    west: '🇳🇬',
    central: '🇨🇩',
    east: '🇰🇪',
    south: '🇿🇦',
  };

  const regionLabels = {
    international: t('languageSelector.international', 'International'),
    west: t('languageSelector.westAfrica', 'Afrique de l\'Ouest'),
    central: t('languageSelector.centralAfrica', 'Afrique Centrale'),
    east: t('languageSelector.eastAfrica', 'Afrique de l\'Est'),
    south: t('languageSelector.southernAfrica', 'Afrique Australe'),
  };

  const renderLanguageButton = (lng) => {
    const isSelected = i18n.language === lng;
    return (
      <button
        key={lng}
        onClick={() => changeLanguage(lng)}
        style={{
          width: 'calc(100% - 1rem)',
          margin: '0 0.5rem 0.25rem',
          textAlign: 'left',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderRadius: '10px',
          border: isSelected
            ? '1.5px solid rgba(194, 73, 22, 0.3)'
            : '1.5px solid transparent',
          background: isSelected
            ? 'rgba(194, 73, 22, 0.08)'
            : 'transparent',
          color: isSelected ? 'var(--terracotta)' : 'var(--ink-soft)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontFamily: 'var(--font-body)',
        }}
        onMouseEnter={e => {
          if (!isSelected) {
            e.currentTarget.style.background = 'var(--cream-deep)';
            e.currentTarget.style.color = 'var(--ink)';
          }
        }}
        onMouseLeave={e => {
          if (!isSelected) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--ink-soft)';
          }
        }}
      >
        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{languages[lng].flag}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: '0.875rem', color: isSelected ? 'var(--terracotta)' : 'var(--ink)' }}>
            {languages[lng].nativeName}
          </div>
          {languages[lng].name !== languages[lng].nativeName && (
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {languages[lng].name}
            </div>
          )}
        </div>
        {isSelected && (
          <div style={{
            padding: '0.25rem',
            background: 'rgba(194, 73, 22, 0.15)',
            borderRadius: '6px',
            flexShrink: 0,
          }}>
            <Check style={{ width: '0.875rem', height: '0.875rem', color: 'var(--terracotta)' }} />
          </div>
        )}
      </button>
    );
  };

  const renderRegion = (regionKey) => {
    const filteredLangs = filterLanguages(languagesByRegion[regionKey]);
    if (filteredLangs.length === 0) return null;
    return (
      <div key={regionKey} style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
        <div style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>{regionIcons[regionKey]}</span>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--ink-mute)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-mono)',
          }}>
            {regionLabels[regionKey]}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-mute)', opacity: 0.6 }}>
            ({filteredLangs.length})
          </span>
        </div>
        {filteredLangs.map(renderLanguageButton)}
      </div>
    );
  };

  /* ── Mode inline (menu mobile) ───────────────────────────────────── */
  if (inline) {
    return (
      <div>
        {/* Bouton trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            width: '100%', padding: '0.75rem 1rem',
            background: 'none', border: 'none', cursor: 'pointer',
            borderRadius: '10px', fontFamily: 'var(--font-body)', fontSize: '0.875rem',
            color: 'var(--ink-soft)', transition: 'all 0.2s',
          }}
        >
          <Globe style={{ width: '1rem', height: '1rem' }} />
          <span style={{ fontSize: '1.1rem' }}>{currentLanguage.flag}</span>
          <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{currentLanguage.nativeName}</span>
          <ChevronDown style={{
            width: '0.875rem', height: '0.875rem', color: 'var(--ink-mute)',
            transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
            marginLeft: 'auto',
          }} />
        </button>

        {/* Panel inline — pas de position absolute, reste dans le flux */}
        {isOpen && (
          <div style={{
            margin: '0 0.5rem 0.5rem',
            background: 'var(--cream-deep)',
            border: '1.5px solid rgba(26,20,16,0.08)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {/* Recherche */}
            <div style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(26,20,16,0.06)', position: 'relative' }}>
              <Search style={{
                position: 'absolute', left: '1.25rem', top: '50%',
                transform: 'translateY(-50%)', width: '0.8rem', height: '0.8rem', color: 'var(--ink-mute)',
              }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('languageSelector.search', 'Rechercher...')}
                style={{
                  width: '100%', paddingLeft: '2rem', paddingRight: '0.75rem',
                  paddingTop: '0.45rem', paddingBottom: '0.45rem',
                  background: 'var(--cream-glow)', border: '1px solid rgba(26,20,16,0.12)',
                  borderRadius: '8px', fontSize: '0.8rem', color: 'var(--ink)',
                  fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            {/* Langues */}
            <div style={{ maxHeight: '14rem', overflowY: 'auto' }} className="scrollbar-hide">
              {['international', 'west', 'central', 'east', 'south'].map((region) => (
                <React.Fragment key={region}>
                  {renderRegion(region)}
                </React.Fragment>
              ))}
              {searchQuery && Object.values(languagesByRegion).every(langs => filterLanguages(langs).length === 0) && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--ink-mute)', fontSize: '0.8rem' }}>
                  {t('languageSelector.noResults', 'Aucun résultat')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bouton trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.45rem 0.85rem',
          borderRadius: '99px',
          border: '1.5px solid rgba(26,20,16,0.15)',
          background: isOpen ? 'var(--cream-deep)' : 'transparent',
          color: 'var(--ink-soft)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
        }}
        aria-label="Sélectionner la langue"
        onMouseEnter={e => {
          if (!isOpen) e.currentTarget.style.background = 'var(--cream-deep)';
        }}
        onMouseLeave={e => {
          if (!isOpen) e.currentTarget.style.background = 'transparent';
        }}
      >
        <Globe style={{ width: '0.875rem', height: '0.875rem', color: isOpen ? 'var(--terracotta)' : 'var(--ink-mute)' }} />
        <span style={{ fontSize: '1.1rem' }}>{currentLanguage.flag}</span>
        <span className="hidden md:inline" style={{ fontWeight: 500, color: 'var(--ink)' }}>
          {currentLanguage.nativeName}
        </span>
        <ChevronDown style={{
          width: '0.875rem',
          height: '0.875rem',
          color: 'var(--ink-mute)',
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }} />
      </button>

      {/* Dropdown */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 0.5rem)',
          width: '300px',
          zIndex: 200,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-8px)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s, transform 0.2s',
          transformOrigin: 'top right',
        }}
      >
        <div
          style={{
            background: 'var(--cream-glow)',
            border: '1.5px solid rgba(26,20,16,0.1)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-deep)',
            overflow: 'hidden',
          }}
        >
          {/* En-tête avec recherche */}
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid rgba(26,20,16,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '0.95rem', color: 'var(--ink)' }}>
                {t('languageSelector.title', 'Langue')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', marginLeft: 'auto' }}>
                {t('languageSelector.count', { count: Object.keys(languages).length, defaultValue: `${Object.keys(languages).length} langues` })}
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <Search style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '0.875rem',
                height: '0.875rem',
                color: 'var(--ink-mute)',
              }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('languageSelector.search', 'Rechercher...')}
                style={{
                  width: '100%',
                  paddingLeft: '2.25rem',
                  paddingRight: '0.85rem',
                  paddingTop: '0.55rem',
                  paddingBottom: '0.55rem',
                  background: 'var(--cream-deep)',
                  border: '1.5px solid rgba(26,20,16,0.15)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--terracotta)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(26,20,16,0.15)'; }}
              />
            </div>
          </div>

          {/* Liste des langues */}
          <div style={{ maxHeight: '22rem', overflowY: 'auto' }} className="scrollbar-hide">
            {['international', 'west', 'central', 'east', 'south'].map((region, index, arr) => (
              <React.Fragment key={region}>
                {renderRegion(region)}
                {index < arr.length - 1 && filterLanguages(languagesByRegion[region]).length > 0 && (
                  <div style={{ margin: '0 1rem', borderTop: '1px solid rgba(26,20,16,0.06)' }} />
                )}
              </React.Fragment>
            ))}
            {searchQuery && Object.values(languagesByRegion).every(langs => filterLanguages(langs).length === 0) && (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Search style={{ width: '1.5rem', height: '1.5rem', color: 'var(--ink-mute)', margin: '0 auto 0.75rem' }} />
                <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem' }}>
                  {t('languageSelector.noResults', 'Aucun résultat')}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  "{searchQuery}"
                </p>
              </div>
            )}
          </div>

          {/* Pied */}
          <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid rgba(26,20,16,0.06)', background: 'var(--cream-deep)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', textAlign: 'center', letterSpacing: '0.04em' }}>
              {t('languageSelector.footer', '21 langues africaines supportées')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;
