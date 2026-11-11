import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { languages as LANGS } from '../i18n';

/* =====================================================================================
   PENDO — Vue "Slack" (parité totale)
   Coque façon Slack (charte pastel PENDO, i18n + RTL, accessible). Chaque canal rend le
   VRAI composant d'onglet de l'app classique -> toutes les fonctionnalités sont présentes.
   Les données marché arrivent en props (une seule instance de useMarkets, côté App).
   Styles isolés sous #pslk.
   ===================================================================================== */

/* Vrais composants de l'app (lazy) */
const DashboardTab = lazy(() => import('./DashboardTab'));
const HeroSection = lazy(() => import('./HeroSection'));
const MarketsTab = lazy(() => import('./MarketsTab'));
const TradingTab = lazy(() => import('./TradingTab'));
const OpportunitiesTab = lazy(() => import('./OpportunitiesTab'));
const NewsSection = lazy(() => import('./NewsSection'));
const PortfolioTabEnhanced = lazy(() => import('./PortfolioTabEnhanced'));
const AnalyticsTab = lazy(() => import('./AnalyticsTab'));
const EconomicCalendar = lazy(() => import('./EconomicCalendar'));
const NotificationCenter = lazy(() => import('./NotificationCenter'));
const ForumMain = lazy(() => import('./Forum/ForumMain'));
const ChatMain = lazy(() => import('./Chat/ChatMain'));
const AboutUs = lazy(() => import('./AboutUs'));
const ExchangeDetail = lazy(() => import('./ExchangeDetail'));
const AlertModal = lazy(() => import('./AlertModal'));
const AdminPanel = lazy(() => import('./AdminPanel'));
const LoginModal = lazy(() => import('./LoginModal'));
const MemberGuard = lazy(() => import('./MemberGuard'));
const FeedbackModal = lazy(() => import('./FeedbackModal'));

const EmbedLoader = () => <div className="embed-load"><span className="spin" /> …</div>;

/* ---------- utils ---------- */
const cc2flag = (cc) => (cc && cc.length === 2 ? cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt())) : '🌍');
/* accessibilité : rend un div cliquable équivalent à un bouton (souris + clavier) */
const clickable = (fn) => ({
  role: 'button',
  tabIndex: 0,
  onClick: fn,
  onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } },
});

const TABS = ['dashboard', 'markets', 'trading', 'opportunities', 'news', 'portfolio', 'analytics', 'calendar', 'notifications', 'forum', 'chat', 'about'];
const FULL = ['forum', 'chat', 'about', 'notifications'];

/* ---------- i18n de la coque Slack ---------- */
const TR = {
  fr: { search:'Rechercher une bourse, un titre…', threads:'Fils de discussion', liveMkt:'Marchés en direct', watchlist:'Watchlist', tabs:'Onglets PENDO', exchanges:'Bourses africaines', tools:'Outils', alerts:'Alertes', admin:'Admin', login:'Connexion', feedback:'Retour / Bug', dms:'Messages directs', dmBrvm:'Desk BRVM', dmAnalyst:'Analyste Marchés', dmSupport:'Support PENDO', live:'Live', sync:'Sync…', offline:'Hors ligne', back:'Revenir à l’app classique', menu:'Menu', noResult:'Aucun résultat' },
  en: { search:'Search an exchange, a stock…', threads:'Threads', liveMkt:'Live markets', watchlist:'Watchlist', tabs:'PENDO tabs', exchanges:'African exchanges', tools:'Tools', alerts:'Alerts', admin:'Admin', login:'Login', feedback:'Feedback / Bug', dms:'Direct messages', dmBrvm:'BRVM Desk', dmAnalyst:'Market Analyst', dmSupport:'PENDO Support', live:'Live', sync:'Sync…', offline:'Offline', back:'Back to classic app', menu:'Menu', noResult:'No result' },
  ar: { search:'ابحث عن بورصة أو سهم…', threads:'المناقشات', liveMkt:'الأسواق المباشرة', watchlist:'قائمة المتابعة', tabs:'أقسام PENDO', exchanges:'البورصات الأفريقية', tools:'أدوات', alerts:'تنبيهات', admin:'الإدارة', login:'تسجيل الدخول', feedback:'ملاحظات / خطأ', dms:'الرسائل المباشرة', dmBrvm:'مكتب BRVM', dmAnalyst:'محلل الأسواق', dmSupport:'دعم PENDO', live:'مباشر', sync:'تحديث…', offline:'غير متصل', back:'العودة إلى التطبيق الكلاسيكي', menu:'القائمة', noResult:'لا نتائج' },
  es: { search:'Buscar una bolsa, una acción…', threads:'Hilos', liveMkt:'Mercados en vivo', watchlist:'Lista de seguimiento', tabs:'Pestañas PENDO', exchanges:'Bolsas africanas', tools:'Herramientas', alerts:'Alertas', admin:'Admin', login:'Iniciar sesión', feedback:'Comentarios / Error', dms:'Mensajes directos', dmBrvm:'Mesa BRVM', dmAnalyst:'Analista de Mercados', dmSupport:'Soporte PENDO', live:'En vivo', sync:'Sincronizando…', offline:'Sin conexión', back:'Volver a la app clásica', menu:'Menú', noResult:'Sin resultados' },
  de: { search:'Börse oder Aktie suchen…', threads:'Threads', liveMkt:'Live-Märkte', watchlist:'Merkliste', tabs:'PENDO-Tabs', exchanges:'Afrikanische Börsen', tools:'Werkzeuge', alerts:'Warnungen', admin:'Admin', login:'Anmelden', feedback:'Feedback / Fehler', dms:'Direktnachrichten', dmBrvm:'BRVM-Desk', dmAnalyst:'Marktanalyst', dmSupport:'PENDO-Support', live:'Live', sync:'Sync…', offline:'Offline', back:'Zurück zur klassischen App', menu:'Menü', noResult:'Kein Ergebnis' },
  pt: { search:'Pesquisar bolsa ou ação…', threads:'Tópicos', liveMkt:'Mercados ao vivo', watchlist:'Lista de acompanhamento', tabs:'Abas PENDO', exchanges:'Bolsas africanas', tools:'Ferramentas', alerts:'Alertas', admin:'Admin', login:'Entrar', feedback:'Feedback / Bug', dms:'Mensagens diretas', dmBrvm:'Mesa BRVM', dmAnalyst:'Analista de Mercado', dmSupport:'Suporte PENDO', live:'Ao vivo', sync:'Sincronizando…', offline:'Offline', back:'Voltar ao app clássico', menu:'Menu', noResult:'Sem resultados' },
  sw: { search:'Tafuta soko au hisa…', threads:'Mijadala', liveMkt:'Masoko ya moja kwa moja', watchlist:'Orodha ya kufuatilia', tabs:'Vichupo vya PENDO', exchanges:'Masoko ya hisa ya Afrika', tools:'Zana', alerts:'Arifa', admin:'Admin', login:'Ingia', feedback:'Maoni / Hitilafu', dms:'Ujumbe wa moja kwa moja', dmBrvm:'Dawati la BRVM', dmAnalyst:'Mchambuzi wa Masoko', dmSupport:'Msaada wa PENDO', live:'Moja kwa moja', sync:'Inasawazisha…', offline:'Nje ya mtandao', back:'Rudi kwenye programu ya kawaida', menu:'Menyu', noResult:'Hakuna matokeo' },
};

export default function SlackView({
  onExit, markets = [], lastUpdate, loading, apiStatus,
  apiUrl, setApiUrl, checkApiStatus, refreshMarkets, loadFallbackData,
}) {
  const { t, i18n } = useTranslation();
  const lang = (((i18n && i18n.language) || 'fr').slice(0, 2));
  const L = TR[lang] || TR.en;
  const rtl = lang === 'ar';

  const { isAuthenticated } = useAuth();

  const [current, setCurrent] = useState('dashboard');
  const [secOpen, setSecOpen] = useState({ tabs: true, bourses: true, tools: true, dm: true });
  const [showLogin, setShowLogin] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(null);
  const [query, setQuery] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const feedRef = useRef(null);

  const curLang = LANGS[i18n.language] || LANGS[lang] || LANGS.fr;
  const changeLang = (code) => { i18n.changeLanguage(code); setLangOpen(false); };

  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = 0; }, [current]);

  // Échap : ferme la fiche bourse ouverte, sinon quitte la vue Slack (si aucune modale ouverte)
  useEffect(() => {
    const h = (e) => {
      if (e.key !== 'Escape') return;
      if (exchangeOpen) { setExchangeOpen(null); return; }
      if (showLogin || showAlerts || showAdmin || showFeedback) return;
      if (mobileNav) { setMobileNav(false); return; }
      if (onExit) onExit();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [exchangeOpen, showLogin, showAlerts, showAdmin, showFeedback, mobileNav, onExit]);

  const live = !!(apiStatus && apiStatus.connected);
  const toggleSec = (k) => setSecOpen((s) => ({ ...s, [k]: !s[k] }));
  const openLogin = () => setShowLogin(true);
  const go = (id) => { setCurrent(id); setMobileNav(false); };

  const tabLabel = (id) => id;
  const tabDesc = (id) => t('navigation.' + id, id);

  // recherche (filtre onglets + bourses)
  const q = query.trim().toLowerCase();
  const tabsF = TABS.filter((id) => !q || id.includes(q) || String(tabDesc(id)).toLowerCase().includes(q));
  const mktsF = (markets || []).filter((e) => !q
    || (e.id || '').toLowerCase().includes(q)
    || (e.name || '').toLowerCase().includes(q)
    || (e.country || '').toLowerCase().includes(q));

  const renderTab = () => {
    switch (current) {
      case 'dashboard':
        return <DashboardTab markets={markets} apiStatus={apiStatus} setActiveTab={go} onOpenLogin={openLogin} />;
      case 'markets':
        return (
          <>
            <HeroSection onExplore={() => document.getElementById('pslk-markets-grid')?.scrollIntoView({ behavior: 'smooth' })}
              stats={{ exchanges: markets?.length || 17, countries: 54, assets: 500 }} />
            <div id="pslk-markets-grid">
              <MarketsTab markets={markets} lastUpdate={lastUpdate} apiStatus={apiStatus} openAdmin={() => setShowAdmin(true)} />
            </div>
          </>
        );
      case 'trading': return <TradingTab markets={markets} />;
      case 'opportunities': return <OpportunitiesTab />;
      case 'news': return <NewsSection />;
      case 'portfolio': return <PortfolioTabEnhanced />;
      case 'analytics': return <AnalyticsTab />;
      case 'calendar': return <EconomicCalendar />;
      case 'notifications': return <NotificationCenter isOpen onClose={() => go('dashboard')} onOpenLogin={openLogin} />;
      case 'forum': return isAuthenticated ? <ForumMain /> : <MemberGuard onOpenLogin={openLogin} feature="Forum" />;
      case 'chat': return isAuthenticated ? <ChatMain /> : <MemberGuard onOpenLogin={openLogin} feature="Chat Communauté" />;
      case 'about': return <AboutUs />;
      default: return null;
    }
  };

  const isFull = FULL.includes(current);

  return (
    <div id="pslk" dir={rtl ? 'rtl' : 'ltr'}>
      <style>{CSS}</style>
      <div className="app">
        {/* RAIL */}
        <div className="rail">
          <div className="logo" aria-hidden="true">P</div>
          <div className={'ricon' + (current === 'dashboard' ? ' active' : '')} title="PENDO" aria-label="PENDO" {...clickable(() => go('dashboard'))}>🏠</div>
          <div className={'ricon' + (current === 'chat' ? ' active' : '')} title={L.dms} aria-label={L.dms} {...clickable(() => go('chat'))}>💬</div>
          <div className="ricon" title={L.alerts} aria-label={L.alerts} {...clickable(() => setShowAlerts(true))}>🔔</div>
          <div className={'ricon' + (current === 'markets' ? ' active' : '')} title={L.liveMkt} aria-label={L.liveMkt} {...clickable(() => go('markets'))}>📈</div>
          <div className={'ricon' + (current === 'portfolio' ? ' active' : '')} title={t('navigation.portfolio', 'Portfolio')} aria-label={t('navigation.portfolio', 'Portfolio')} {...clickable(() => go('portfolio'))}>💼</div>
          <div className="spacer" />
          <div className="me" title={isAuthenticated ? 'Compte' : L.login} aria-label={isAuthenticated ? 'Compte' : L.login} {...clickable(openLogin)}>MM</div>
        </div>

        {/* SIDEBAR */}
        <div className={'sidebar' + (mobileNav ? ' open' : '')}>
          <div className="sb-head"><h1>PENDO <span className="chev" aria-hidden="true">▾</span></h1>
            {onExit && <div className="exit" title={L.back} aria-label={L.back} {...clickable(onExit)}>✕</div>}
          </div>
          <div className="sb-search">
            <span aria-hidden="true">🔎</span>
            <input className="sb-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L.search} aria-label={L.search} />
          </div>
          <div className="sb-scroll">
            <div className="nav-item" {...clickable(() => go('forum'))}><span className="ico" aria-hidden="true">🧵</span> {L.threads}</div>
            <div className="nav-item" {...clickable(() => go('markets'))}><span className="ico" aria-hidden="true">📡</span> {L.liveMkt}</div>
            <div className="nav-item" {...clickable(() => go('dashboard'))}><span className="ico" aria-hidden="true">⭐</span> {L.watchlist}</div>

            <div className={'sec' + (secOpen.tabs ? '' : ' collapsed')}>
              <div className="sec-title" {...clickable(() => toggleSec('tabs'))}><span className="tri" aria-hidden="true">▾</span> {L.tabs}</div>
              {tabsF.map((id) => (
                <div key={id} className={'chan' + (current === id ? ' active' : '')} {...clickable(() => go(id))} title={tabDesc(id)}>
                  <span className="hash" aria-hidden="true">#</span> {tabLabel(id)}
                </div>
              ))}
              {q && tabsF.length === 0 && <div className="noresult">{L.noResult}</div>}
            </div>

            <div className={'sec' + (secOpen.bourses ? '' : ' collapsed')}>
              <div className="sec-title" {...clickable(() => toggleSec('bourses'))}><span className="tri" aria-hidden="true">▾</span> {L.exchanges} · {markets ? markets.length : 0}</div>
              {mktsF.map((e) => {
                const chg = Number(e.changePercent) || 0; const g = chg >= 0; const ar = chg > 0 ? '▲' : (chg < 0 ? '▼' : '–');
                return (
                  <div key={e.id} className="chan" {...clickable(() => { setExchangeOpen(e.id); setMobileNav(false); })} title={e.name}>
                    <span className="hash" aria-hidden="true">#</span><span className="flag" aria-hidden="true">{cc2flag(e.countryCode)}</span>{(e.id || '').replace('_', '-')}
                    <span className={'up ' + (g ? 'g' : 'r')}>{ar}{Math.abs(chg).toFixed(2)}%</span>
                  </div>
                );
              })}
              {q && mktsF.length === 0 && <div className="noresult">{L.noResult}</div>}
            </div>

            <div className={'sec' + (secOpen.tools ? '' : ' collapsed')}>
              <div className="sec-title" {...clickable(() => toggleSec('tools'))}><span className="tri" aria-hidden="true">▾</span> {L.tools}</div>
              <div className="chan" {...clickable(() => setShowAlerts(true))}><span className="hash" aria-hidden="true">🔔</span> {L.alerts}</div>
              <div className="chan" {...clickable(() => setShowAdmin(true))}><span className="hash" aria-hidden="true">🛠️</span> {L.admin}</div>
              <div className="chan" {...clickable(() => setShowFeedback(true))}><span className="hash" aria-hidden="true">🐞</span> {L.feedback}</div>
              <div className="chan" {...clickable(openLogin)}><span className="hash" aria-hidden="true">👤</span> {L.login}</div>
            </div>

            <div className={'sec' + (secOpen.dm ? '' : ' collapsed')}>
              <div className="sec-title" {...clickable(() => toggleSec('dm'))}><span className="tri" aria-hidden="true">▾</span> {L.dms}</div>
              <div className="chan" {...clickable(() => go('chat'))}><span className="dm-dot" aria-hidden="true" /> {L.dmBrvm}</div>
              <div className="chan" {...clickable(() => go('chat'))}><span className="dm-dot off" aria-hidden="true" /> {L.dmAnalyst}</div>
              <div className="chan" {...clickable(() => go('chat'))}><span className="dm-dot off" aria-hidden="true" /> {L.dmSupport}</div>
            </div>
          </div>
        </div>

        {/* overlay mobile */}
        {mobileNav && <div className="scrim" {...clickable(() => setMobileNav(false))} aria-label="Fermer le menu" />}

        {/* MAIN */}
        <div className="main">
          <div className="topbar">
            <div className="burger" title={L.menu} aria-label={L.menu} {...clickable(() => setMobileNav((v) => !v))}>☰</div>
            <div className="ch-name"><span className="hash" aria-hidden="true">#</span> {tabLabel(current)}</div>
            <div className="ch-desc">{tabDesc(current)}</div>
            <div className="spacer" />
            <div className="langsel">
              <div className="langbtn" title="Langue" aria-label="Langue" {...clickable(() => setLangOpen((v) => !v))}>
                <span aria-hidden="true">{curLang.flag}</span>
                <span className="lname">{curLang.nativeName}</span>
                <span className="lchev" aria-hidden="true">▾</span>
              </div>
            </div>
            <div className={'live ' + (loading ? '' : live ? 'on' : 'off')} title="Rafraîchir" aria-label="Rafraîchir" {...clickable(() => refreshMarkets && refreshMarkets())}>
              <span className="dot" aria-hidden="true" />
              <span>{loading ? L.sync : live ? (L.live + (lastUpdate ? ' · ' + new Date(lastUpdate).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' }) : '')) : L.offline}</span>
            </div>
            <div className="members" aria-hidden="true">👥 {markets ? markets.length : 0}</div>
            {onExit && <div className="exit-top" title={L.back} aria-label={L.back} {...clickable(onExit)}>✕</div>}
          </div>
          <div className={'feed' + (isFull ? ' feed-embed' : '')} ref={feedRef}>
            <Suspense fallback={<EmbedLoader />}>
              {isFull ? <div className="embed">{renderTab()}</div> : <div className="tabwrap">{renderTab()}</div>}
            </Suspense>
          </div>
        </div>
      </div>

      {/* MENU LANGUE (position fixe -> non rogné par overflow) */}
      {langOpen && (
        <>
          <div className="lang-scrim" {...clickable(() => setLangOpen(false))} aria-label="Fermer" />
          <div className="lang-menu" role="listbox" aria-label="Langues">
            {Object.entries(LANGS).map(([code, info]) => (
              <div key={code} role="option" aria-selected={i18n.language === code}
                className={'lang-item' + (i18n.language === code ? ' sel' : '')} {...clickable(() => changeLang(code))}>
                <span className="lf" aria-hidden="true">{info.flag}</span>
                <span className="ln">{info.nativeName}</span>
                {i18n.language === code && <span className="lc" aria-hidden="true">✓</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODALES (mêmes composants que l'app classique) */}
      <Suspense fallback={null}>
        {showLogin && <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />}
        {showAlerts && <AlertModal onClose={() => setShowAlerts(false)} />}
        {showFeedback && <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />}
        {showAdmin && (
          <AdminPanel apiStatus={apiStatus} apiUrl={apiUrl} setApiUrl={setApiUrl} checkApiStatus={checkApiStatus}
            refreshMarkets={refreshMarkets} loadFallbackData={loadFallbackData} loading={loading} markets={markets}
            onClose={() => setShowAdmin(false)} />
        )}
        {exchangeOpen && (
          <ExchangeDetail exchangeId={exchangeOpen} marketData={(markets || []).find((m) => m.id === exchangeOpen)} onClose={() => setExchangeOpen(null)} />
        )}
      </Suspense>
    </div>
  );
}

/* ---------- styles isolés (#pslk) ---------- */
const CSS = `
#pslk{position:fixed;inset:0;z-index:9999;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#2B211C;font-size:15px;
 --sidebar:#2E1D18;--sidebar-active:#C8613A;--sidebar-hover:rgba(255,255,255,.08);--rail:#231512;
 --terracotta:#C8613A;--forest:#2F5D50;--forest-soft:#DCEBE4;--cream:#FBF6EE;--cream-2:#F4ECDF;--ink:#2B211C;--muted:#8A7C72;--line:#EBE1D3;--green:#1E8A5B;--red:#C0392B;--gold:#C8963E;}
#pslk *{box-sizing:border-box}
#pslk [role="button"]{outline:none}
#pslk [role="button"]:focus-visible{outline:2px solid var(--terracotta);outline-offset:2px;border-radius:8px}
#pslk .app{display:grid;grid-template-columns:68px 300px 1fr;height:100vh;width:100vw;background:var(--sidebar)}
#pslk .rail{background:var(--rail);display:flex;flex-direction:column;align-items:center;padding:14px 0;gap:12px}
#pslk .rail .logo{width:44px;height:44px;border-radius:14px;background:linear-gradient(145deg,var(--terracotta),#A8481F);display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:900;color:#fff;font-size:24px}
#pslk .rail .ricon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#C9BCB3;font-size:20px;cursor:pointer;transition:.15s}
#pslk .rail .ricon:hover{background:rgba(255,255,255,.08);color:#fff}
#pslk .rail .ricon.active{background:rgba(255,255,255,.14);color:#fff}
#pslk .rail .spacer{flex:1}
#pslk .rail .me{width:40px;height:40px;border-radius:11px;background:#5A4B43;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;position:relative;cursor:pointer}
#pslk .rail .me::after{content:"";position:absolute;right:-2px;bottom:-2px;width:13px;height:13px;border-radius:50%;background:var(--green);border:2.5px solid var(--rail)}
#pslk .sidebar{background:var(--sidebar);color:#D8CCC4;display:flex;flex-direction:column;min-height:0}
#pslk .sb-head{padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.09);display:flex;align-items:center;justify-content:space-between}
#pslk .sb-head h1{font-family:'Fraunces',serif;font-size:19px;color:#fff;font-weight:700;display:flex;align-items:center;gap:7px}
#pslk .sb-head .chev{color:#C9BCB3;font-size:12px}
#pslk .sb-head .exit{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px}
#pslk .sb-head .exit:hover{background:var(--terracotta)}
#pslk .sb-search{margin:10px 12px 6px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.10);border-radius:8px;padding:7px 11px;color:#C9BCB3;font-size:13.5px;display:flex;align-items:center;gap:8px}
#pslk .sb-search .sb-input{flex:1;background:transparent;border:none;outline:none;color:#EFE7DD;font-family:inherit;font-size:13.5px}
#pslk .sb-search .sb-input::placeholder{color:#C9BCB3}
#pslk .sb-scroll{flex:1;overflow-y:auto;padding:6px 8px 40px}
#pslk .sb-scroll::-webkit-scrollbar{width:8px}
#pslk .sb-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:8px}
#pslk .noresult{padding:6px 14px;color:#9C8C82;font-size:13px;font-style:italic}
#pslk .nav-item{display:flex;align-items:center;gap:11px;padding:6px 12px;border-radius:7px;color:#CDBFB6;font-size:14.5px;cursor:pointer}
#pslk .nav-item:hover{background:var(--sidebar-hover)}
#pslk .nav-item .ico{width:18px;text-align:center;opacity:.85}
#pslk .sec{margin-top:14px}
#pslk .sec-title{display:flex;align-items:center;gap:6px;padding:4px 12px;color:#B7A79D;font-size:13px;font-weight:600;cursor:pointer}
#pslk .sec-title .tri{font-size:10px;transition:.15s}
#pslk .sec.collapsed .tri{transform:rotate(-90deg)}
#pslk .sec.collapsed .chan{display:none}
#pslk .chan{display:flex;align-items:center;gap:9px;padding:6px 12px 6px 14px;border-radius:7px;color:#CDBFB6;font-size:14.5px;cursor:pointer;line-height:1.25}
#pslk .chan:hover{background:var(--sidebar-hover)}
#pslk .chan.active{background:var(--sidebar-active);color:#fff;font-weight:600}
#pslk .chan .hash{opacity:.7;font-weight:500}
#pslk .chan .flag{font-size:14px}
#pslk .chan .up{margin-left:auto;font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace}
#pslk[dir="rtl"] .chan .up{margin-left:0;margin-right:auto}
#pslk .chan .up.g{color:#8FE0B0}
#pslk .chan .up.r{color:#F2A79C}
#pslk .dm-dot{width:9px;height:9px;border-radius:50%;background:var(--green);display:inline-block}
#pslk .dm-dot.off{background:transparent;border:1.5px solid #9C8C82}
#pslk .main{background:var(--cream);display:flex;flex-direction:column;min-height:0;border-top-left-radius:12px;overflow:hidden}
#pslk[dir="rtl"] .main{border-top-left-radius:0;border-top-right-radius:12px}
#pslk .topbar{height:58px;border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 18px;gap:12px;background:var(--cream);flex-shrink:0}
#pslk .topbar .burger{display:none;font-size:20px;color:var(--ink);cursor:pointer;padding:2px 6px}
#pslk .topbar .ch-name{font-weight:800;font-size:18px;display:flex;align-items:center;gap:8px}
#pslk .topbar .ch-name .hash{color:var(--muted)}
#pslk .topbar .ch-desc{color:var(--muted);font-size:13.5px;border-left:1px solid var(--line);padding-left:12px;margin-left:4px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#pslk[dir="rtl"] .topbar .ch-desc{border-left:none;border-right:1px solid var(--line);padding-left:0;padding-right:12px;margin-left:0;margin-right:4px}
#pslk .topbar .spacer{flex:1}
#pslk .langsel{display:flex;align-items:center}
#pslk .langbtn{display:flex;align-items:center;gap:7px;background:var(--cream-2);border:1px solid var(--line);border-radius:20px;padding:5px 12px;font-size:13px;font-weight:700;color:var(--ink);cursor:pointer;white-space:nowrap}
#pslk .langbtn .lname{max-width:120px;overflow:hidden;text-overflow:ellipsis}
#pslk .langbtn .lchev{color:var(--muted);font-size:11px}
#pslk .lang-scrim{position:fixed;inset:0;z-index:10040;background:transparent}
#pslk .lang-menu{position:fixed;top:60px;right:20px;z-index:10050;width:250px;max-height:70vh;overflow-y:auto;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 14px 44px rgba(80,50,30,.22);padding:6px}
#pslk[dir="rtl"] .lang-menu{right:auto;left:20px}
#pslk .lang-menu::-webkit-scrollbar{width:8px}
#pslk .lang-menu::-webkit-scrollbar-thumb{background:#E1D5C4;border-radius:8px}
#pslk .lang-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:14px;color:var(--ink)}
#pslk .lang-item:hover{background:var(--cream-2)}
#pslk .lang-item.sel{background:rgba(200,97,58,.10);font-weight:700}
#pslk .lang-item .lf{font-size:17px}
#pslk .lang-item .ln{flex:1}
#pslk .lang-item .lc{color:var(--terracotta);font-weight:800}
#pslk .live{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;background:var(--cream-2);border:1px solid var(--line);border-radius:20px;padding:5px 12px;cursor:pointer;white-space:nowrap}
#pslk .live .dot{width:9px;height:9px;border-radius:50%;background:#B8A99E}
#pslk .live.on .dot{background:var(--green);animation:pslkpulse 2s infinite}
#pslk .live.off .dot{background:var(--gold)}
@keyframes pslkpulse{0%{box-shadow:0 0 0 0 rgba(30,138,91,.35)}70%{box-shadow:0 0 0 6px rgba(30,138,91,0)}100%{box-shadow:0 0 0 0 rgba(30,138,91,0)}}
#pslk .topbar .members{display:flex;align-items:center;gap:6px;background:var(--cream-2);border:1px solid var(--line);border-radius:8px;padding:5px 10px;font-size:13px;font-weight:600}
#pslk .topbar .exit-top{display:none;font-size:15px;color:var(--muted);cursor:pointer;padding:4px 8px;border-radius:8px}
#pslk .topbar .exit-top:hover{background:var(--cream-2);color:var(--ink)}
#pslk .feed{flex:1;overflow-y:auto;min-height:0}
#pslk .feed::-webkit-scrollbar{width:10px}
#pslk .feed::-webkit-scrollbar-thumb{background:#E1D5C4;border-radius:8px}
#pslk .feed.feed-embed{padding:0;overflow:hidden;display:flex}
#pslk .tabwrap{padding:16px 22px;max-width:1240px;margin:0 auto}
#pslk .embed{flex:1;min-height:0;height:100%;background:var(--cream);overflow:auto;width:100%}
#pslk .embed-load{padding:40px;text-align:center;color:var(--muted);font-size:14px}
#pslk .scrim{display:none}
#pslk .spin{width:16px;height:16px;border:2.5px solid var(--line);border-top-color:var(--terracotta);border-radius:50%;display:inline-block;animation:pslksp .7s linear infinite;vertical-align:middle}
@keyframes pslksp{to{transform:rotate(360deg)}}
@media(max-width:900px){
  #pslk .app{grid-template-columns:56px 1fr}
  #pslk .sidebar{position:fixed;top:0;bottom:0;left:56px;width:290px;z-index:60;transform:translateX(-120%);transition:transform .22s ease;box-shadow:0 10px 40px rgba(0,0,0,.35)}
  #pslk[dir="rtl"] .sidebar{left:auto;right:56px;transform:translateX(120%)}
  #pslk .sidebar.open{transform:translateX(0)}
  #pslk .scrim{display:block;position:fixed;inset:0;left:56px;background:rgba(0,0,0,.35);z-index:55}
  #pslk .topbar .burger{display:block}
  #pslk .topbar .exit-top{display:block}
  #pslk .langbtn .lname{display:none}
  #pslk .topbar .members{display:none}
  #pslk .lang-menu{right:10px;left:10px;width:auto}
}
`;
