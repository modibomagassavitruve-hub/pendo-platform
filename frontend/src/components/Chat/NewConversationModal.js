import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { X, User, AlertCircle } from 'lucide-react';

import { API_URL } from '../../config';
import logger from '../../utils/logger';

const NewConversationModal = ({ onClose, onConversationCreated }) => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!userId || isNaN(userId)) { setError(t('messages.validUserId')); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('pendo_token');
      const response = await axios.post(
        `${API_URL}/chat/conversations`,
        { participant_ids: [parseInt(userId)], type: 'private' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) onConversationCreated(response.data.data);
    } catch (err) {
      logger.error('Erreur création conversation:', err);
      setError(err.response?.data?.error || t('messages.creationError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      background: 'rgba(26,20,16,0.55)',
    }}>
      <div style={{
        background: 'var(--cream-glow)',
        borderRadius: '16px',
        border: '1.5px solid rgba(26,20,16,0.08)',
        boxShadow: 'var(--shadow-warm)',
        maxWidth: '440px', width: '100%',
        padding: '1.5rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.25rem', color: 'var(--ink)' }}>
            {t('newConversation.title')}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex', borderRadius: '8px', padding: '0.25rem', transition: 'color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* User ID field */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '0.4rem' }}>
              ID de l'utilisateur
            </label>
            <div style={{ position: 'relative' }}>
              <User style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--ink-mute)' }} />
              <input
                type="number"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="Ex: 2"
                style={{
                  width: '100%', paddingLeft: '2.25rem', paddingRight: '1rem', paddingTop: '0.6rem', paddingBottom: '0.6rem',
                  background: 'var(--cream-deep)',
                  border: '1.5px solid rgba(26,20,16,0.12)',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ink)',
                  outline: 'none', boxSizing: 'border-box',
                }}
                required
                disabled={loading}
              />
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)', marginTop: '0.35rem' }}>
              Entrez l'ID de l'utilisateur avec qui vous souhaitez discuter
            </p>
          </div>

          {/* Info note */}
          <div style={{ background: 'rgba(30,77,58,0.06)', border: '1.5px solid rgba(30,77,58,0.18)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--forest)', marginBottom: '0.2rem' }}>
              Comment trouver un ID utilisateur ?
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--forest)', opacity: 0.8 }}>
              Pour l'instant, vous devez connaître l'ID de l'utilisateur. Une fonctionnalité de recherche sera ajoutée prochainement.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(194,73,22,0.07)', border: '1.5px solid rgba(194,73,22,0.2)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--terracotta)', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--terracotta)' }}>{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1, padding: '0.65rem 1rem',
                background: loading ? 'var(--cream-deep)' : 'var(--terracotta)',
                color: loading ? 'var(--ink-mute)' : 'var(--cream)',
                border: 'none', borderRadius: '10px',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {loading ? t('buttons.creating2') : t('buttons.createConversation')}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1rem',
                background: 'var(--cream-deep)',
                color: 'var(--ink)',
                border: '1.5px solid rgba(26,20,16,0.12)', borderRadius: '10px',
                fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,20,16,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-deep)'; }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewConversationModal;
