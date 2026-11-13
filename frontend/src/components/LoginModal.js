import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X, Mail, Lock, User, Phone, Globe,
  Eye, EyeOff, ArrowRight, Sparkles, Shield,
  TrendingUp, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import logger from '../utils/logger';

const fieldStyle = {
  width: '100%',
  paddingLeft: '2.75rem',
  paddingRight: '1rem',
  paddingTop: '0.75rem',
  paddingBottom: '0.75rem',
  background: 'var(--cream-deep)',
  border: '1.5px solid rgba(26,20,16,0.12)',
  borderRadius: '12px',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  color: 'var(--ink)',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

const labelStyle = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--ink-soft)',
  display: 'block',
  marginBottom: '0.4rem',
};

const LoginModal = ({ isOpen, onClose, onForgotPassword }) => {
  const { login, register, error, clearError } = useAuth();
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimateIn(true), 50);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: '', color: '' };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    const levels = [
      { level: 0, text: '', color: '' },
      { level: 1, text: t('auth.passwordStrength.weak'), color: 'var(--terracotta)' },
      { level: 2, text: t('auth.passwordStrength.medium'), color: 'var(--sun)' },
      { level: 3, text: t('auth.passwordStrength.good'), color: 'var(--forest)' },
      { level: 4, text: t('auth.passwordStrength.excellent'), color: 'var(--forest)' }
    ];
    return levels[strength];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.success) {
          setSuccess(true);
          setTimeout(() => { onClose(); resetForm(); }, 1500);
        }
      } else {
        const result = await register({ email, password, first_name: firstName, last_name: lastName, phone, country });
        if (result.success) {
          setSuccess(true);
          // Compte créé et connecté : on ferme la fenêtre
          setTimeout(() => { onClose(); resetForm(); }, 1500);
        }
      }
    } catch (err) {
      logger.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail(''); setPassword(''); setFirstName(''); setLastName('');
    setPhone(''); setCountry(''); setSuccess(false); clearError();
  };

  const switchMode = () => { setIsLogin(!isLogin); resetForm(); };
  const handleClose = () => { setAnimateIn(false); setTimeout(onClose, 200); };

  if (!isOpen) return null;

  const passwordStrength = getPasswordStrength();

  const features = [
    { icon: TrendingUp, text: t('auth.features.accessExchanges') },
    { icon: Shield, text: t('auth.features.securePortfolio') },
    { icon: Sparkles, text: t('auth.features.personalizedAlerts') },
  ];

  const optionBg = 'var(--cream)';

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        background: animateIn ? 'rgba(26,20,16,0.6)' : 'transparent',
        transition: 'background 0.3s',
        backdropFilter: animateIn ? 'blur(4px)' : 'none',
      }}
    >
      {/* Warm ambient blobs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '20%', left: '20%', width: '300px', height: '300px', background: 'rgba(194,73,22,0.06)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: '300px', height: '300px', background: 'rgba(232,170,11,0.05)', borderRadius: '50%', filter: 'blur(60px)' }} />
      </div>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: '440px',
          maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', borderRadius: '24px',
          transform: animateIn ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(16px)',
          opacity: animateIn ? 1 : 0,
          transition: 'all 0.3s',
        }}
      >
        {/* Card */}
        <div style={{
          background: 'var(--cream-glow)',
          borderRadius: '20px',
          border: '1.5px solid rgba(26,20,16,0.1)',
          boxShadow: '0 24px 64px rgba(26,20,16,0.2)',
          overflow: 'hidden',
        }}>
          {/* Close */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute', top: '1rem', right: '1rem', zIndex: 10,
              background: 'var(--cream-deep)', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--ink-mute)',
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>

          {/* Header */}
          <div style={{ padding: '2rem 2rem 1.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{
                width: '64px', height: '64px',
                background: success ? 'rgba(30,77,58,0.12)' : 'rgba(194,73,22,0.1)',
                borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s',
              }}>
                {success
                  ? <CheckCircle style={{ width: '32px', height: '32px', color: 'var(--forest)' }} />
                  : <User style={{ width: '32px', height: '32px', color: 'var(--terracotta)' }} />
                }
              </div>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>
              {success
                ? (isLogin ? t('auth.successLogin') : t('auth.successSignup'))
                : (isLogin ? t('auth.welcomeBack') : t('auth.createAccount'))}
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)' }}>
              {success
                ? t('auth.redirecting')
                : (isLogin ? t('auth.loginToPortfolio') : t('auth.joinCommunity'))}
            </p>
          </div>

          {success ? (
            <div style={{ padding: '1rem 2rem 2rem', textAlign: 'center' }}>
              <Loader2 style={{ width: '24px', height: '24px', color: 'var(--forest)', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <>
              {error && (
                <div style={{
                  margin: '0 2rem 1rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(194,73,22,0.08)',
                  border: '1.5px solid rgba(194,73,22,0.25)',
                  borderRadius: '12px',
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                }}>
                  <AlertCircle style={{ width: '18px', height: '18px', color: 'var(--terracotta)', flexShrink: 0, marginTop: '1px' }} />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--terracotta)' }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ padding: '0 2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: t('auth.firstName'), val: firstName, set: setFirstName, ph: t('placeholders.firstName') },
                      { label: t('auth.lastName'), val: lastName, set: setLastName, ph: t('placeholders.lastName') },
                    ].map(({ label, val, set, ph }) => (
                      <div key={label}>
                        <label style={labelStyle}>{label}</label>
                        <div style={{ position: 'relative' }}>
                          <User style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--ink-mute)' }} />
                          <input type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph} required={!isLogin} style={fieldStyle} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label style={labelStyle}>{t('auth.email')}</label>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--ink-mute)' }} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('placeholders.email')} required style={fieldStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>{t('auth.password')}</label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--ink-mute)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={t('placeholders.password')}
                      required minLength={8}
                      style={{ ...fieldStyle, paddingRight: '2.75rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', padding: 0 }}
                    >
                      {showPassword ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
                    </button>
                  </div>

                  {isLogin && onForgotPassword && (
                    <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                      <button type="button" onClick={onForgotPassword}
                        style={{ background: 'none', border: 'none', color: 'var(--terracotta)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>
                        {t('auth.forgotPassword', 'Mot de passe oublié ?')}
                      </button>
                    </div>
                  )}

                  {!isLogin && password && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.3rem' }}>
                        {[1, 2, 3, 4].map(level => (
                          <div key={level} style={{
                            height: '4px', flex: 1, borderRadius: '2px',
                            background: level <= passwordStrength.level ? passwordStrength.color : 'rgba(26,20,16,0.1)',
                            transition: 'background 0.3s',
                          }} />
                        ))}
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>
                        {t('auth.passwordStrength.strength')}: <span style={{ fontWeight: 600, color: passwordStrength.color }}>{passwordStrength.text}</span>
                      </p>
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <>
                    <div>
                      <label style={labelStyle}>{t('auth.phone')}</label>
                      <div style={{ position: 'relative' }}>
                        <Phone style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--ink-mute)' }} />
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+225 XX XX XX XX XX" style={fieldStyle} />
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>{t('filters.country')}</label>
                      <div style={{ position: 'relative' }}>
                        <Globe style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--ink-mute)', zIndex: 1 }} />
                        <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...fieldStyle, appearance: 'none', cursor: 'pointer' }}>
                          <option value="">{t('common.selectCountry')}</option>
                          <optgroup label="🌍 Afrique de l'Ouest">
                            <option value="BJ">🇧🇯 Bénin</option>
                            <option value="BF">🇧🇫 Burkina Faso</option>
                            <option value="CV">🇨🇻 Cap-Vert</option>
                            <option value="CI">🇨🇮 Côte d'Ivoire</option>
                            <option value="GM">🇬🇲 Gambie</option>
                            <option value="GH">🇬🇭 Ghana</option>
                            <option value="GN">🇬🇳 Guinée</option>
                            <option value="GW">🇬🇼 Guinée-Bissau</option>
                            <option value="LR">🇱🇷 Liberia</option>
                            <option value="ML">🇲🇱 Mali</option>
                            <option value="MR">🇲🇷 Mauritanie</option>
                            <option value="NE">🇳🇪 Niger</option>
                            <option value="NG">🇳🇬 Nigeria</option>
                            <option value="SN">🇸🇳 Sénégal</option>
                            <option value="SL">🇸🇱 Sierra Leone</option>
                            <option value="TG">🇹🇬 Togo</option>
                          </optgroup>
                          <optgroup label="🌍 Afrique Centrale">
                            <option value="AO">🇦🇴 Angola</option>
                            <option value="CM">🇨🇲 Cameroun</option>
                            <option value="CF">🇨🇫 Centrafrique</option>
                            <option value="TD">🇹🇩 Tchad</option>
                            <option value="CG">🇨🇬 Congo</option>
                            <option value="CD">🇨🇩 Congo (RDC)</option>
                            <option value="GQ">🇬🇶 Guinée Équatoriale</option>
                            <option value="GA">🇬🇦 Gabon</option>
                            <option value="ST">🇸🇹 Sao Tomé-et-Principe</option>
                          </optgroup>
                          <optgroup label="🌍 Afrique de l'Est">
                            <option value="BI">🇧🇮 Burundi</option>
                            <option value="KM">🇰🇲 Comores</option>
                            <option value="DJ">🇩🇯 Djibouti</option>
                            <option value="ER">🇪🇷 Érythrée</option>
                            <option value="ET">🇪🇹 Éthiopie</option>
                            <option value="KE">🇰🇪 Kenya</option>
                            <option value="MG">🇲🇬 Madagascar</option>
                            <option value="MW">🇲🇼 Malawi</option>
                            <option value="MU">🇲🇺 Maurice</option>
                            <option value="MZ">🇲🇿 Mozambique</option>
                            <option value="RW">🇷🇼 Rwanda</option>
                            <option value="SC">🇸🇨 Seychelles</option>
                            <option value="SO">🇸🇴 Somalie</option>
                            <option value="SS">🇸🇸 Soudan du Sud</option>
                            <option value="TZ">🇹🇿 Tanzanie</option>
                            <option value="UG">🇺🇬 Ouganda</option>
                            <option value="ZM">🇿🇲 Zambie</option>
                            <option value="ZW">🇿🇼 Zimbabwe</option>
                          </optgroup>
                          <optgroup label="🌍 Afrique du Nord">
                            <option value="DZ">🇩🇿 Algérie</option>
                            <option value="EG">🇪🇬 Égypte</option>
                            <option value="LY">🇱🇾 Libye</option>
                            <option value="MA">🇲🇦 Maroc</option>
                            <option value="SD">🇸🇩 Soudan</option>
                            <option value="TN">🇹🇳 Tunisie</option>
                          </optgroup>
                          <optgroup label="🌍 Afrique du Sud">
                            <option value="BW">🇧🇼 Botswana</option>
                            <option value="LS">🇱🇸 Lesotho</option>
                            <option value="NA">🇳🇦 Namibie</option>
                            <option value="ZA">🇿🇦 Afrique du Sud</option>
                            <option value="SZ">🇸🇿 Eswatini</option>
                          </optgroup>
                          <optgroup label="🇫🇷 Europe (Diaspora)">
                            <option value="FR">🇫🇷 France</option>
                            <option value="BE">🇧🇪 Belgique</option>
                            <option value="CH">🇨🇭 Suisse</option>
                            <option value="LU">🇱🇺 Luxembourg</option>
                            <option value="DE">🇩🇪 Allemagne</option>
                            <option value="GB">🇬🇧 Royaume-Uni</option>
                            <option value="NL">🇳🇱 Pays-Bas</option>
                            <option value="IT">🇮🇹 Italie</option>
                            <option value="ES">🇪🇸 Espagne</option>
                            <option value="PT">🇵🇹 Portugal</option>
                            <option value="SE">🇸🇪 Suède</option>
                            <option value="NO">🇳🇴 Norvège</option>
                            <option value="FI">🇫🇮 Finlande</option>
                            <option value="DK">🇩🇰 Danemark</option>
                          </optgroup>
                          <optgroup label="🌎 Amériques (Diaspora)">
                            <option value="US">🇺🇸 États-Unis</option>
                            <option value="CA">🇨🇦 Canada</option>
                            <option value="BR">🇧🇷 Brésil</option>
                            <option value="HT">🇭🇹 Haïti</option>
                            <option value="MQ">🇲🇶 Martinique</option>
                            <option value="GP">🇬🇵 Guadeloupe</option>
                            <option value="GF">🇬🇫 Guyane française</option>
                          </optgroup>
                          <optgroup label="🌏 Reste du Monde">
                            <option value="AE">🇦🇪 Émirats Arabes Unis</option>
                            <option value="CN">🇨🇳 Chine</option>
                            <option value="IN">🇮🇳 Inde</option>
                            <option value="JP">🇯🇵 Japon</option>
                            <option value="AU">🇦🇺 Australie</option>
                            <option value="OTHER">🌐 Autre pays</option>
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '0.85rem',
                    background: 'var(--ink)',
                    color: 'var(--cream)',
                    border: 'none', borderRadius: '12px',
                    fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '1rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    transition: 'all 0.2s', marginTop: '0.5rem',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--terracotta)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
                >
                  {loading ? (
                    <><Loader2 style={{ width: '20px', height: '20px', animation: 'spin 0.8s linear infinite' }} /> {t('common.loading')}</>
                  ) : (
                    <>{isLogin ? t('auth.signIn') : t('auth.signUp')} <ArrowRight style={{ width: '18px', height: '18px' }} /></>
                  )}
                </button>
              </form>

              {/* Features list (login only) */}
              {isLogin && (
                <div style={{ padding: '0 2rem 1.5rem' }}>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--cream-deep)',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(26,20,16,0.07)',
                  }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                      {t('auth.memberBenefits')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {features.map((feature, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <feature.icon style={{ width: '16px', height: '16px', color: 'var(--forest)', flexShrink: 0 }} />
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{feature.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Switch mode */}
              <div style={{ padding: '0 2rem 2rem', textAlign: 'center' }}>
                <div style={{ height: '1px', background: 'rgba(26,20,16,0.08)', marginBottom: '1.25rem' }} />
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)' }}>
                  {isLogin ? t('messages.noAccount') : t('messages.haveAccount')}{' '}
                  <button
                    onClick={switchMode}
                    style={{ background: 'none', border: 'none', color: 'var(--terracotta)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', padding: 0 }}
                  >
                    {isLogin ? t('auth.createAccount') : t('auth.signIn')}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
