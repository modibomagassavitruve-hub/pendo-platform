import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import { useMarkets } from './hooks/useMarkets';
import LoginModal from './components/LoginModal';
import PasswordModal from './components/PasswordModal';
import UserMenu from './components/UserMenu';
import MemberGuard from './components/MemberGuard';
import ErrorBoundary from './components/ErrorBoundary';
import { useTranslation } from 'react-i18next';
import { runApiDiagnostic } from './utils/apiDiagnostic';

// ── Lazy-loaded tab components (code splitting) ─────────────────────────
const DashboardTab = lazy(() => import('./components/DashboardTab'));
const MarketsTab = lazy(() => import('./components/MarketsTab'));
const TradingTab = lazy(() => import('./components/TradingTab'));
const EconomicCalendar = lazy(() => import('./components/EconomicCalendar'));
const OpportunitiesTab = lazy(() => import('./components/OpportunitiesTab'));
const NewsSection = lazy(() => import('./components/NewsSection'));
const PortfolioTabEnhanced = lazy(() => import('./components/PortfolioTabEnhanced'));
const AnalyticsTab = lazy(() => import('./components/AnalyticsTab'));
const NotificationCenter = lazy(() => import('./components/NotificationCenter'));
const ForumMain = lazy(() => import('./components/Forum/ForumMain'));
const ChatMain = lazy(() => import('./components/Chat/ChatMain'));
const AboutUs = lazy(() => import('./components/AboutUs'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const MarketClosedPage = lazy(() => import('./components/MarketClosedPage'));
const AlertModal = lazy(() => import('./components/AlertModal'));
const HeroSection = lazy(() => import('./components/HeroSection'));
const SlackView = lazy(() => import('./components/SlackView'));

// Composants Phase Bêta
import BetaBanner from './components/BetaBanner';
import FeedbackButton from './components/FeedbackButton';
import FeedbackModal from './components/FeedbackModal';
// Analytics chargé en lazy — se diffère automatiquement via requestIdleCallback
import './services/analyticsService';

// ── Loading fallback for lazy components — skeleton layout ──────────────
const TabLoader = () => (
  <div className="space-y-6 animate-fade-in-up">
    {/* Hero skeleton */}
    <div className="rounded-lg bg-cream-deep border border-ink/10 p-6 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-lg bg-cream-deep animate-pulse" style={{ background: 'var(--cream-deep)' }} />
        <div className="space-y-2">
          <div className="w-48 h-5 rounded skeleton" />
          <div className="w-32 h-3 rounded skeleton" />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-28 h-10 rounded skeleton" />
        <div className="w-28 h-10 rounded skeleton" />
        <div className="w-28 h-10 rounded skeleton" />
      </div>
    </div>
    {/* Cards grid skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg p-5 space-y-4" style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)' }}>
          <div className="flex justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded skeleton" />
              <div className="space-y-1.5">
                <div className="w-24 h-4 rounded skeleton" />
                <div className="w-16 h-3 rounded skeleton" />
              </div>
            </div>
            <div className="w-14 h-5 rounded-full skeleton" />
          </div>
          <div className="w-32 h-7 rounded skeleton" />
          <div className="w-20 h-5 rounded skeleton" />
          <div className="h-px" style={{ background: 'var(--cream-deep)' }} />
          <div className="flex justify-between">
            <div className="w-16 h-3 rounded skeleton" />
            <div className="w-12 h-3 rounded skeleton" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Fonction pour vérifier si au moins un marché est ouvert
const isAnyMarketOpen = () => {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const currentTime = hour * 60 + minute;

  // Weekend = fermé
  if (day === 0 || day === 6) return false;

  // Horaires des marchés africains (en minutes UTC)
  const marketHours = [
    { open: 7 * 60, close: 15 * 60 },      // JSE: 07:00-15:00 UTC
    { open: 8 * 60 + 30, close: 13 * 60 + 30 }, // NGX: 08:30-13:30 UTC
    { open: 8 * 60, close: 12 * 60 + 15 }, // EGX: 08:00-12:15 UTC
    { open: 9 * 60, close: 15 * 60 },      // BRVM: 09:00-15:00 UTC
    { open: 7 * 60, close: 12 * 60 },      // NSE Kenya: 07:00-12:00 UTC
    { open: 9 * 60, close: 15 * 60 + 30 }, // Casa: 09:00-15:30 UTC
  ];

  return marketHours.some(m => currentTime >= m.open && currentTime <= m.close);
};

function AppContent() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [marketOpen, setMarketOpen] = useState(true);
  const [showClosedPage, setShowClosedPage] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  // Lien de réinitialisation reçu par e-mail : /?reset_token=...
  const [resetToken] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('reset_token'); } catch (e) { return null; }
  });
  const [passwordMode, setPasswordMode] = useState(() => (resetToken ? 'reset' : null));
  const closePasswordModal = () => {
    setPasswordMode(null);
    if (resetToken) window.history.replaceState({}, '', window.location.pathname);
  };
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showSlack, setShowSlack] = useState(false);

  const {
    markets,
    lastUpdate,
    loading,
    apiStatus,
    apiUrl,
    setApiUrl,
    checkApiStatus,
    loadMarkets,
    refreshMarkets,
    loadFallbackData
  } = useMarkets();

  useEffect(() => {
    // Diagnostic API (en DEV uniquement)
    if (process.env.NODE_ENV === 'development') {
      runApiDiagnostic();
    }

    // Charger les marchés — une seule requête, confirme aussi la connexion
    loadMarkets();

    // Vérifier si les marchés sont ouverts
    const checkMarkets = () => {
      const isOpen = isAnyMarketOpen();
      setMarketOpen(isOpen);
    };

    checkMarkets();
    const interval = setInterval(checkMarkets, 60000);

    return () => clearInterval(interval);
  }, []);

  // Vue "Slack" plein écran (nouveau format)
  if (showSlack) {
    return (
      <Suspense fallback={<TabLoader />}>
        <SlackView
          onExit={() => setShowSlack(false)}
          markets={markets}
          lastUpdate={lastUpdate}
          loading={loading}
          apiStatus={apiStatus}
          apiUrl={apiUrl}
          setApiUrl={setApiUrl}
          checkApiStatus={checkApiStatus}
          refreshMarkets={refreshMarkets}
          loadFallbackData={loadFallbackData}
        />
      </Suspense>
    );
  }

  // Si l'utilisateur choisit de voir la page "Marché Fermé"
  if (showClosedPage) {
    return (
      <Suspense fallback={<TabLoader />}>
        <MarketClosedPage
          markets={markets}
          onSetAlert={() => setShowAlerts(true)}
        />
        <button
          onClick={() => setShowClosedPage(false)}
          className="fixed bottom-4 right-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition z-50 shadow-lg"
        >
          {t('market.viewData')}
        </button>
        {showAlerts && (
          <Suspense fallback={null}>
            <AlertModal onClose={() => setShowAlerts(false)} />
          </Suspense>
        )}
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
        {/* Banner Phase Bêta */}
        <BetaBanner onFeedbackClick={() => setShowFeedbackModal(true)} />

        {/* Login Modal */}
        <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} onForgotPassword={() => { setShowLogin(false); setPasswordMode('forgot'); }} />
        <PasswordModal
          mode={passwordMode}
          resetToken={resetToken}
          onClose={closePasswordModal}
          onBackToLogin={() => { closePasswordModal(); setShowLogin(true); }}
        />

        {/* Alert Modal */}
        {showAlerts && <AlertModal onClose={() => setShowAlerts(false)} />}

        {/* Admin Panel Modal */}
        {showAdmin && (
          <AdminPanel
            apiStatus={apiStatus}
            apiUrl={apiUrl}
            setApiUrl={setApiUrl}
            checkApiStatus={checkApiStatus}
            refreshMarkets={refreshMarkets}
            loadFallbackData={loadFallbackData}
            loading={loading}
            markets={markets}
            onClose={() => setShowAdmin(false)}
          />
        )}

      {/* Bannière Marché Fermé */}
      {!marketOpen && (
        <div style={{ borderBottom: '1px solid rgba(26,20,16,0.08)', background: 'var(--cream-deep)', padding: '0.625rem 1rem' }}>
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🌙</span>
              <span className="text-sm font-medium" style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-body)' }}>{t('market.closed')}</span>
            </div>
            <button
              onClick={() => setShowClosedPage(true)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{ background: 'rgba(194,73,22,0.08)', color: 'var(--terracotta)', border: '1px solid rgba(194,73,22,0.2)', fontFamily: 'var(--font-mono)' }}
            >
              {t('market.viewSchedule')}
            </button>
          </div>
        </div>
      )}

        {/* Header avec Forum, Chat et Connexion intégrés */}
        <Header
          apiStatus={apiStatus}
          loading={loading}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          refreshMarkets={refreshMarkets}
          openAdmin={() => setShowAdmin(true)}
          openAlerts={() => setShowAlerts(true)}
          marketOpen={marketOpen}
          onOpenLogin={() => setShowLogin(true)}
          onOpenSlack={() => setShowSlack(true)}
          userMenuComponent={<UserMenu onOpenLogin={() => setShowLogin(true)} onChangePassword={() => setPasswordMode('change')} />}
        />

      {/* Skip to main content — accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
        {t('common.skipToContent', 'Aller au contenu principal')}
      </a>

      {/* Main Content — lazy-loaded tabs with Suspense */}
      <main id="main-content" aria-label={t('common.mainContent', 'Contenu principal')}>
        <Suspense fallback={<div className="container mx-auto px-4 py-6" style={{ maxWidth: '1280px' }}><TabLoader /></div>}>
          <div key={activeTab} className={activeTab === 'about' ? 'animate-tab-enter' : 'container mx-auto px-4 py-6 animate-tab-enter'} style={activeTab !== 'about' ? { maxWidth: '1280px' } : undefined}>
            {activeTab === 'dashboard' && (
              <DashboardTab
                markets={markets}
                apiStatus={apiStatus}
                setActiveTab={setActiveTab}
                onOpenLogin={() => setShowLogin(true)}
              />
            )}

            {activeTab === 'markets' && (
              <>
                <HeroSection
                  onExplore={() => {
                    document.getElementById('markets-grid')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  stats={{ exchanges: markets?.length || 10, countries: 54, assets: 500 }}
                />
                <div id="markets-grid">
                  <MarketsTab
                    markets={markets}
                    lastUpdate={lastUpdate}
                    apiStatus={apiStatus}
                    openAdmin={() => setShowAdmin(true)}
                  />
                </div>
              </>
            )}

            {activeTab === 'trading' && <TradingTab markets={markets} />}

            {activeTab === 'opportunities' && <OpportunitiesTab />}

            {activeTab === "news" && <NewsSection />}

            {activeTab === "portfolio" && <PortfolioTabEnhanced onOpenLogin={() => setShowLogin(true)} />}

            {activeTab === "analytics" && <AnalyticsTab onOpenLogin={() => setShowLogin(true)} />}

            {activeTab === "calendar" && <EconomicCalendar />}

            {activeTab === "notifications" && (
              <NotificationCenter
                isOpen={true}
                onClose={() => setActiveTab('markets')}
                onOpenLogin={() => setShowLogin(true)}
              />
            )}

            {activeTab === "forum" && (
              // Lecture ouverte à tous ; publier, répondre et aimer demandent un compte
              <ForumMain onOpenLogin={() => setShowLogin(true)} />
            )}

            {activeTab === "chat" && (
              isAuthenticated ? <ChatMain /> : (
                <MemberGuard onOpenLogin={() => setShowLogin(true)} feature="Chat Communauté" />
              )
            )}

            {activeTab === "about" && <AboutUs />}
          </div>
        </Suspense>
      </main>

        {/* Footer */}
        <Footer apiStatus={apiStatus} />

        {/* Bouton Feedback Flottant */}
        <FeedbackButton onClick={() => setShowFeedbackModal(true)} />

        {/* Lanceur Vue Slack (nouveau format) */}
        <button
          onClick={() => setShowSlack(true)}
          title="Ouvrir la vue Slack"
          aria-label="Ouvrir la vue Slack"
          className="pendo-slack-fab"
          style={{
            position: 'fixed', left: '1rem', bottom: '1rem', zIndex: 50,
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(145deg, #C8613A, #A8481F)', color: '#fff',
            fontWeight: 700, fontSize: '14px', boxShadow: '0 6px 18px rgba(168,72,31,0.35)',
            fontFamily: 'var(--font-body)'
          }}
        >
          <span style={{ fontSize: '16px' }}>◨</span> <span className="pendo-fab-label">Vue Slack</span>
        </button>

        {/* Modal de Feedback */}
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
        />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
