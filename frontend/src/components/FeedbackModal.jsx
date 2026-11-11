import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import React, { useState } from 'react';
import { X, Send, Bug, Lightbulb, TrendingUp, MessageCircle, Star } from 'lucide-react';
import logger from '../utils/logger';

const FeedbackModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    type: 'feature', category: '', title: '', description: '', rating: 0, email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const feedbackTypes = [
    { value: 'bug', label: t('feedback.reportBug'), icon: Bug, bg: 'rgba(194,73,22,0.08)', color: 'var(--terracotta)' },
    { value: 'feature', label: t('feedback.suggestFeature'), icon: Lightbulb, bg: 'rgba(232,170,11,0.1)', color: 'var(--sun)' },
    { value: 'improvement', label: t('feedback.suggestImprovement'), icon: TrendingUp, bg: 'rgba(30,77,58,0.08)', color: 'var(--forest)' },
    { value: 'other', label: t('feedback.other'), icon: MessageCircle, bg: 'rgba(26,20,16,0.06)', color: 'var(--ink-soft)' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, pageUrl: window.location.href, browserInfo: navigator.userAgent }),
      });
      if (response.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          onClose();
          setSubmitSuccess(false);
          setFormData({ type: 'feature', category: '', title: '', description: '', rating: 0, email: '' });
        }, 2000);
      }
    } catch (error) {
      logger.error('Erreur lors de l\'envoi du feedback:', error);
      alert(t('feedback.sendError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputCls = {
    width: '100%',
    padding: '0.65rem 0.9rem',
    background: 'var(--cream-deep)',
    border: '1.5px solid rgba(26,20,16,0.12)',
    borderRadius: '10px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    color: 'var(--ink)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const labelCls = {
    display: 'block',
    fontFamily: 'var(--font-body)',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--ink-soft)',
    marginBottom: '0.4rem',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(26,20,16,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '1rem',
    }}>
      <div style={{
        background: 'var(--cream-glow)',
        borderRadius: '20px',
        maxWidth: '600px', width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(26,20,16,0.2)',
        border: '1.5px solid rgba(26,20,16,0.08)',
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0,
          background: 'var(--cream-glow)',
          borderBottom: '1.5px solid rgba(26,20,16,0.08)',
          padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 2,
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.35rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
              {t('feedback.title')}
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>
              {t('feedback.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--cream-deep)', border: 'none', borderRadius: '10px',
              padding: '0.5rem', cursor: 'pointer', color: 'var(--ink-mute)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-deep)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {submitSuccess ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px',
              background: 'rgba(30,77,58,0.1)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <svg style={{ width: '32px', height: '32px', color: 'var(--forest)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
              {t('feedback.thankYou')}
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink-mute)' }}>
              {t('feedback.thankYouDetails')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Type */}
            <div>
              <label style={labelCls}>{t('feedback.feedbackType')}</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {feedbackTypes.map(({ value, label, icon: Icon, bg, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: value })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      border: formData.type === value
                        ? `2px solid ${color}`
                        : '2px solid rgba(26,20,16,0.1)',
                      background: formData.type === value ? bg : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ padding: '0.4rem', borderRadius: '8px', background: bg }}>
                      <Icon style={{ width: '18px', height: '18px', color }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)' }}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" style={labelCls}>{t('feedback.feedbackTitle')}</label>
              <input
                type="text" id="title" required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('feedback.titlePlaceholder')}
                style={inputCls}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" style={labelCls}>{t('feedback.feedbackDescription')}</label>
              <textarea
                id="description" required
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                placeholder={t('feedback.descriptionPlaceholder')}
                style={{ ...inputCls, resize: 'none' }}
              />
            </div>

            {/* Rating */}
            <div>
              <label style={labelCls}>{t('feedback.generalRating')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                      transform: 'scale(1)', transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <Star style={{
                      width: '28px', height: '28px',
                      fill: star <= formData.rating ? 'var(--sun)' : 'transparent',
                      color: star <= formData.rating ? 'var(--sun)' : 'rgba(26,20,16,0.2)',
                      transition: 'all 0.2s',
                    }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" style={labelCls}>{t('feedback.emailOptional')}</label>
              <input
                type="email" id="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('feedback.emailPlaceholder')}
                style={inputCls}
              />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)', marginTop: '0.35rem' }}>
                {t('feedback.emailNotice')}
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1, padding: '0.75rem',
                  background: 'transparent',
                  border: '1.5px solid rgba(26,20,16,0.15)',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem',
                  color: 'var(--ink-soft)', cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-deep)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  flex: 1, padding: '0.75rem',
                  background: 'var(--ink)',
                  color: 'var(--cream)',
                  border: 'none',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = 'var(--terracotta)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{ width: '18px', height: '18px', border: '2px solid rgba(250,243,232,0.3)', borderTopColor: 'var(--cream)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    {t('feedback.sending')}
                  </>
                ) : (
                  <><Send style={{ width: '18px', height: '18px' }} /> {t('feedback.send')}</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
