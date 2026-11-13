import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

// mode : 'forgot' (demande de lien), 'reset' (nouveau mot de passe via lien), 'change' (connecté)
const fieldStyle = {
  width: '100%', padding: '0.75rem 2.75rem', background: 'var(--cream-deep)',
  border: '1.5px solid rgba(26,20,16,0.12)', borderRadius: '12px', fontFamily: 'var(--font-body)',
  fontSize: '0.9rem', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: '0.4rem' };
const iconStyle = { position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--ink-mute)' };

const errMsg = (data, fallback) => {
  const e = data && data.error;
  return (typeof e === 'string' ? e : e && e.message) || fallback;
};

const PasswordField = ({ label, value, onChange, show, onToggle, autoComplete }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <div style={{ position: 'relative' }}>
      <Lock style={iconStyle} />
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
        required minLength={8} autoComplete={autoComplete} style={fieldStyle} />
      <button type="button" onClick={onToggle} aria-label="toggle"
        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', padding: 0 }}>
        {show ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
      </button>
    </div>
  </div>
);

const PasswordModal = ({ mode, resetToken, onClose, onBackToLogin }) => {
  const { t } = useTranslation();
  const { changePassword } = useAuth();
  const [email, setEmail] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  if (!mode) return null;

  const titles = {
    forgot: t('auth.forgotTitle', 'Mot de passe oublié'),
    reset: t('auth.resetTitle', 'Nouveau mot de passe'),
    change: t('auth.changePasswordTitle', 'Changer le mot de passe'),
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode !== 'forgot' && next !== confirm) { setError(t('auth.passwordsMismatch', 'Les deux mots de passe ne correspondent pas')); return; }
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const r = await fetch(`${API_URL}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        const d = await r.json();
        if (!d.success) throw new Error(errMsg(d, 'Erreur'));
        setDone(t('auth.forgotSent', 'Si un compte existe pour cet e-mail, un lien de réinitialisation vient de vous être envoyé. Pensez à vérifier vos spams.'));
      } else if (mode === 'reset') {
        const r = await fetch(`${API_URL}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: resetToken, newPassword: next }) });
        const d = await r.json();
        if (!d.success) throw new Error(errMsg(d, 'Erreur'));
        setDone(t('auth.resetDone', 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.'));
      } else {
        const res = await changePassword(current, next);
        if (!res.success) throw new Error(res.error);
        setDone(t('auth.changeDone', 'Votre mot de passe a été modifié.'));
      }
    } catch (err) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const primaryBtn = { width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'var(--ink)', color: 'var(--cream)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' };
  const linkBtn = { background: 'none', border: 'none', color: 'var(--terracotta)', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', padding: 0 };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,20,16,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '440px', background: 'var(--cream)', borderRadius: '20px', padding: '2rem', position: 'relative', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <button onClick={onClose} aria-label={t('common.close', 'Fermer')} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)' }}>
          <X style={{ width: 20, height: 20 }} />
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.6rem', color: 'var(--ink)', textAlign: 'center', marginBottom: '0.4rem' }}>{titles[mode]}</h2>
        {mode === 'forgot' && !done && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)', textAlign: 'center', marginBottom: '1.25rem' }}>
            {t('auth.forgotIntro', 'Indiquez votre e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.')}
          </p>
        )}

        {done ? (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <CheckCircle style={{ width: 44, height: 44, color: 'var(--forest)', margin: '0 auto 0.75rem' }} />
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: '1.5rem' }}>{done}</p>
            {mode === 'reset' && onBackToLogin
              ? <button style={primaryBtn} onClick={onBackToLogin}>{t('auth.signIn', 'Se connecter')}</button>
              : <button style={primaryBtn} onClick={onClose}>{t('common.close', 'Fermer')}</button>}
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {error && (
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(193,84,47,0.1)', color: 'var(--terracotta)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
                <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} /> {error}
              </div>
            )}
            {mode === 'forgot' && (
              <div>
                <label style={labelStyle}>{t('auth.email', 'Email')}</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={iconStyle} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" style={fieldStyle} />
                </div>
              </div>
            )}
            {mode === 'change' && (
              <PasswordField label={t('auth.currentPassword', 'Mot de passe actuel')} value={current} onChange={setCurrent} show={show} onToggle={() => setShow(!show)} autoComplete="current-password" />
            )}
            {mode !== 'forgot' && (
              <>
                <PasswordField label={t('auth.newPassword', 'Nouveau mot de passe (8 caractères min.)')} value={next} onChange={setNext} show={show} onToggle={() => setShow(!show)} autoComplete="new-password" />
                <PasswordField label={t('auth.confirmPassword', 'Confirmer le nouveau mot de passe')} value={confirm} onChange={setConfirm} show={show} onToggle={() => setShow(!show)} autoComplete="new-password" />
              </>
            )}
            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
              {loading && <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />}
              {mode === 'forgot' ? t('auth.sendLink', 'Envoyer le lien') : t('auth.savePassword', 'Enregistrer')}
            </button>
            {mode === 'forgot' && onBackToLogin && (
              <p style={{ textAlign: 'center' }}><button type="button" style={linkBtn} onClick={onBackToLogin}>{t('auth.backToLogin', 'Retour à la connexion')}</button></p>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default PasswordModal;
