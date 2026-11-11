import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Report to monitoring if REACT_APP_SENTRY_DSN is configured
    if (process.env.NODE_ENV === 'production') {
      const body = {
        message: error?.message || String(error),
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };
      // Fire-and-forget to backend error reporting endpoint
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {});
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'var(--cream)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--cream-glow)',
            border: '1.5px solid rgba(194,73,22,0.15)',
            borderRadius: '20px',
            padding: '2.5rem',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 8px 40px rgba(26,20,16,0.1)',
          }}>
            <div style={{
              width: '64px', height: '64px',
              background: 'rgba(194,73,22,0.1)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <AlertTriangle style={{ width: '32px', height: '32px', color: 'var(--terracotta)' }} />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: '1.35rem',
              color: 'var(--ink)',
              marginBottom: '0.75rem',
            }}>
              Une erreur est survenue
            </h2>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              color: 'var(--ink-mute)',
              lineHeight: 1.65,
              marginBottom: '1.75rem',
            }}>
              Une erreur inattendue s'est produite. Veuillez recharger la page.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1.75rem',
                background: 'var(--ink)',
                color: 'var(--cream)',
                border: 'none',
                borderRadius: '12px',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
