import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, BarChart3, Clock, Bell, Star,
  ChevronDown, Search, Maximize2, Minimize2,
  Activity, Eye, EyeOff, Camera, X, Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logger from '../utils/logger';

// ─── TradingView symbol map for African markets ───────────────────────
const TV_SYMBOLS = {
  jse:    { symbol: null,              name: 'JSE All Share',      available: false },
  egx:    { symbol: 'EGX:EGX30',      name: 'EGX 30',             available: true },
  nse_ng: { symbol: 'NSENG:ASI',      name: 'NGX All Share',      available: true },
  masi:   { symbol: 'CSEMA:MASI',     name: 'MASI',               available: true },
  bvmt:   { symbol: null,              name: 'TUNINDEX',           available: false },
  nse_ke: { symbol: null,             name: 'NSE 20',             available: false },
  sem:    { symbol: null,             name: 'SEMDEX',             available: false },
  brvm:   { symbol: null,             name: 'BRVM Composite',     available: false },
  gse:    { symbol: null,             name: 'GSE Composite',      available: false },
  bse:    { symbol: null,             name: 'BSE DCI',            available: false },
  luse:   { symbol: null,             name: 'LASI',               available: false },
  zse:    { symbol: null,             name: 'ZSE All Share',      available: false },
  dse:    { symbol: null,             name: 'DSEI',               available: false },
  use:    { symbol: null,             name: 'USE All Share',      available: false },
  rse:    { symbol: null,             name: 'RSE All Share',      available: false },
  nsx:    { symbol: null,             name: 'NSX Overall',        available: false },
  mse:    { symbol: null,             name: 'MSE All Share',      available: false },
};

const COUNTRY_FLAGS = {
  jse: '🇿🇦', egx: '🇪🇬', nse_ng: '🇳🇬', nse_ke: '🇰🇪', masi: '🇲🇦', sem: '🇲🇺',
  brvm: '🇨🇮', gse: '🇬🇭', bse: '🇧🇼', luse: '🇿🇲', zse: '🇿🇼', dse: '🇹🇿',
  use: '🇺🇬', rse: '🇷🇼', bvmt: '🇹🇳', nsx: '🇳🇦', mse: '🇲🇼'
};

const AFRICAN_STOCKS = [
  { id: 'stk_npn',      symbol: 'JSE:NPN',        name: 'Naspers',           country: 'Afrique du Sud', flag: '🇿🇦', sector: 'Tech' },
  { id: 'stk_mtn',      symbol: 'JSE:MTN',        name: 'MTN Group',         country: 'Afrique du Sud', flag: '🇿🇦', sector: 'Télécoms' },
  { id: 'stk_sbk',      symbol: 'JSE:SBK',        name: 'Standard Bank',     country: 'Afrique du Sud', flag: '🇿🇦', sector: 'Finance' },
  { id: 'stk_fsr',      symbol: 'JSE:FSR',        name: 'FirstRand',         country: 'Afrique du Sud', flag: '🇿🇦', sector: 'Finance' },
  { id: 'stk_abg',      symbol: 'JSE:ABG',        name: 'Absa Group',        country: 'Afrique du Sud', flag: '🇿🇦', sector: 'Finance' },
  { id: 'stk_sol',      symbol: 'JSE:SOL',        name: 'Sasol',             country: 'Afrique du Sud', flag: '🇿🇦', sector: 'Énergie' },
  { id: 'stk_ang',      symbol: 'JSE:ANG',        name: 'AngloGold Ashanti', country: 'Afrique du Sud', flag: '🇿🇦', sector: 'Mines' },
  { id: 'stk_gfi',      symbol: 'JSE:GFI',        name: 'Gold Fields',       country: 'Afrique du Sud', flag: '🇿🇦', sector: 'Mines' },
  { id: 'stk_imp',      symbol: 'JSE:IMP',        name: 'Impala Platinum',   country: 'Afrique du Sud', flag: '🇿🇦', sector: 'Mines' },
  { id: 'stk_shp',      symbol: 'JSE:SHP',        name: 'Shoprite',          country: 'Afrique du Sud', flag: '🇿🇦', sector: 'Distribution' },
  { id: 'stk_dangcem',  symbol: 'NSENG:DANGCEM',  name: 'Dangote Cement',    country: 'Nigeria', flag: '🇳🇬', sector: 'Industrie' },
  { id: 'stk_mtnn',     symbol: 'NSENG:MTNN',     name: 'MTN Nigeria',       country: 'Nigeria', flag: '🇳🇬', sector: 'Télécoms' },
  { id: 'stk_buacem',   symbol: 'NSENG:BUACEM',   name: 'BUA Cement',        country: 'Nigeria', flag: '🇳🇬', sector: 'Industrie' },
  { id: 'stk_gtco',     symbol: 'NSENG:GTCO',     name: 'GT Bank',           country: 'Nigeria', flag: '🇳🇬', sector: 'Finance' },
  { id: 'stk_zenithba', symbol: 'NSENG:ZENITHBA', name: 'Zenith Bank',       country: 'Nigeria', flag: '🇳🇬', sector: 'Finance' },
  { id: 'stk_scom',     symbol: 'NSEKE:SCOM',     name: 'Safaricom',         country: 'Kenya', flag: '🇰🇪', sector: 'Télécoms' },
  { id: 'stk_etel',     symbol: 'EGX:ETEL',       name: 'Telecom Egypt',     country: 'Égypte', flag: '🇪🇬', sector: 'Télécoms' },
  { id: 'stk_comi',     symbol: 'EGX:COMI',       name: 'CIB Egypt',         country: 'Égypte', flag: '🇪🇬', sector: 'Finance' },
  { id: 'stk_iam',      symbol: 'CSEMA:IAM',      name: 'Maroc Telecom',     country: 'Maroc', flag: '🇲🇦', sector: 'Télécoms' },
  { id: 'stk_bcp',      symbol: 'CSEMA:BCP',      name: 'Banque Populaire',  country: 'Maroc', flag: '🇲🇦', sector: 'Finance' },
  { id: 'stk_atw',      symbol: 'CSEMA:ATW',      name: 'Attijariwafa Bank', country: 'Maroc', flag: '🇲🇦', sector: 'Finance' },
];

const AFRICAN_CURRENCIES = [
  { id: 'fx_usdzar', symbol: 'FX:USDZAR', name: 'USD/ZAR', desc: 'Rand sud-africain',   flag: '🇿🇦' },
  { id: 'fx_usdegp', symbol: 'FX:USDEGP', name: 'USD/EGP', desc: 'Livre égyptienne',    flag: '🇪🇬' },
  { id: 'fx_usdngn', symbol: 'FX:USDNGN', name: 'USD/NGN', desc: 'Naira nigérian',      flag: '🇳🇬' },
  { id: 'fx_usdkes', symbol: 'FX:USDKES', name: 'USD/KES', desc: 'Shilling kényan',     flag: '🇰🇪' },
  { id: 'fx_usdmad', symbol: 'FX:USDMAD', name: 'USD/MAD', desc: 'Dirham marocain',     flag: '🇲🇦' },
  { id: 'fx_usdghs', symbol: 'FX:USDGHS', name: 'USD/GHS', desc: 'Cedi ghanéen',        flag: '🇬🇭' },
  { id: 'fx_usdtnd', symbol: 'FX:USDTND', name: 'USD/TND', desc: 'Dinar tunisien',      flag: '🇹🇳' },
  { id: 'fx_usdxof', symbol: 'FX:USDXOF', name: 'USD/XOF', desc: 'Franc CFA (UEMOA)',   flag: '🇨🇮' },
  { id: 'fx_usdxaf', symbol: 'FX:USDXAF', name: 'USD/XAF', desc: 'Franc CFA (CEMAC)',   flag: '🇨🇲' },
  { id: 'fx_usdtzs', symbol: 'FX:USDTZS', name: 'USD/TZS', desc: 'Shilling tanzanien',  flag: '🇹🇿' },
  { id: 'fx_usdugx', symbol: 'FX:USDUGX', name: 'USD/UGX', desc: 'Shilling ougandais',  flag: '🇺🇬' },
  { id: 'fx_usdzmw', symbol: 'FX:USDZMW', name: 'USD/ZMW', desc: 'Kwacha zambien',      flag: '🇿🇲' },
  { id: 'fx_eurzar', symbol: 'FX:EURZAR', name: 'EUR/ZAR', desc: 'Euro / Rand',          flag: '🇪🇺' },
  { id: 'fx_gbpzar', symbol: 'FX:GBPZAR', name: 'GBP/ZAR', desc: 'Livre / Rand',         flag: '🇬🇧' },
];

const AFRICAN_RESOURCES = [
  { id: 'res_gold',      symbol: 'TVC:GOLD',       name: 'Or',         desc: 'Gold Spot',              icon: '🥇', category: 'Métaux précieux' },
  { id: 'res_platinum',  symbol: 'TVC:PLATINUM',   name: 'Platine',    desc: 'Platinum Spot',          icon: '⚪', category: 'Métaux précieux' },
  { id: 'res_palladium', symbol: 'TVC:PALLADIUM',  name: 'Palladium',  desc: 'Palladium Spot',         icon: '🔘', category: 'Métaux précieux' },
  { id: 'res_silver',    symbol: 'TVC:SILVER',     name: 'Argent',     desc: 'Silver Spot',            icon: '🥈', category: 'Métaux précieux' },
  { id: 'res_brent',     symbol: 'TVC:UKOIL',      name: 'Pétrole Brent',  desc: 'Brent Crude Oil',   icon: '🛢️', category: 'Énergie' },
  { id: 'res_wti',       symbol: 'TVC:USOIL',      name: 'Pétrole WTI',    desc: 'WTI Crude Oil',     icon: '🛢️', category: 'Énergie' },
  { id: 'res_natgas',    symbol: 'TVC:NATGAS',      name: 'Gaz naturel',    desc: 'Natural Gas',       icon: '🔥', category: 'Énergie' },
  { id: 'res_cocoa',     symbol: 'TVC:COCOA',      name: 'Cacao',      desc: 'Cocoa',                  icon: '🍫', category: 'Agriculture' },
  { id: 'res_coffee',    symbol: 'TVC:COFFEE',     name: 'Café',       desc: 'Coffee',                 icon: '☕', category: 'Agriculture' },
  { id: 'res_cotton',    symbol: 'TVC:COTTON',     name: 'Coton',      desc: 'Cotton',                 icon: '🧶', category: 'Agriculture' },
  { id: 'res_sugar',     symbol: 'TVC:SUGAR',      name: 'Sucre',      desc: 'Sugar',                  icon: '🍬', category: 'Agriculture' },
  { id: 'res_copper',    symbol: 'TVC:COPPER',     name: 'Cuivre',     desc: 'Copper',                 icon: '🔶', category: 'Métaux industriels' },
  { id: 'res_iron',      symbol: 'TVC:IRONORE',    name: 'Fer',        desc: 'Iron Ore',               icon: '⛏️', category: 'Métaux industriels' },
];

const TIMEFRAMES_BASE = [
  { key: '1m',  value: '1'   }, { key: '5m',  value: '5'   }, { key: '15m', value: '15'  },
  { key: '1h',  value: '60'  }, { key: '4h',  value: '240' }, { key: '1d',  value: 'D'   },
  { key: '1w',  value: 'W'   }, { key: '1M',  value: 'M'   },
];

const CHART_TYPES_BASE = [
  { key: 'candles', value: '1', icon: '🕯️' }, { key: 'bars', value: '0', icon: '📊' },
  { key: 'line', value: '2', icon: '📈' }, { key: 'area', value: '3', icon: '📉' },
  { key: 'heikinAshi', value: '8', icon: '🔶' },
];

// Categories and descriptions are translated at render time via t()
const INDICATORS_LIST = [
  { id: 'RSI',      name: 'RSI',            catKey: 'oscillators', descKey: 'rsi' },
  { id: 'MACD',     name: 'MACD',           catKey: 'oscillators', descKey: 'macd' },
  { id: 'BB',       name: 'Bollinger Bands',catKey: 'trend',       descKey: 'bb' },
  { id: 'EMA',      name: 'EMA',            catKey: 'averages',    descKey: 'ema' },
  { id: 'SMA',      name: 'SMA',            catKey: 'averages',    descKey: 'sma' },
  { id: 'VWAP',     name: 'VWAP',           catKey: 'volume',      descKey: 'vwap' },
  { id: 'ATR',      name: 'ATR',            catKey: 'volatility',  descKey: 'atr' },
  { id: 'ADX',      name: 'ADX',            catKey: 'trend',       descKey: 'adx' },
  { id: 'STOCH',    name: 'Stochastic',     catKey: 'oscillators', descKey: 'stoch' },
  { id: 'ICHIMOKU', name: 'Ichimoku',       catKey: 'trend',       descKey: 'ichimoku' },
  { id: 'OBV',      name: 'OBV',            catKey: 'volume',      descKey: 'obv' },
  { id: 'MFI',      name: 'MFI',            catKey: 'volume',      descKey: 'mfi' },
];

const FAVORITES_KEY = 'pendo_trading_favorites';
const ALERTS_KEY = 'pendo_trading_alerts';
const loadFavorites = () => { try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch { return []; } };
const saveFavorites = (favs) => localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
const loadAlerts = () => { try { return JSON.parse(localStorage.getItem(ALERTS_KEY)) || []; } catch { return []; } };
const saveAlerts = (alerts) => localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));

// ─── Toast ───────────────────────────────────────────────────────────
const Toast = ({ message, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100 }}>
      <div style={{
        background: 'var(--forest)', color: 'var(--cream)',
        padding: '0.75rem 1.25rem', borderRadius: '12px',
        boxShadow: 'var(--shadow-warm)',
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem',
      }}>
        <span>✓</span>
        <span>{message}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(250,243,232,0.6)', marginLeft: '0.25rem', display: 'flex' }}>
          <X style={{ width: '14px', height: '14px' }} />
        </button>
      </div>
    </div>
  );
};

// Map i18n language codes to TradingView locale codes
const TV_LOCALE_MAP = {
  fr: 'fr', en: 'en', es: 'es', ar: 'ar', de: 'de', pt: 'pt',
  zh: 'zh_CN', ja: 'ja', ko: 'ko', ru: 'ru', tr: 'tr',
  // African languages not supported by TradingView → fall back to English
};
const getTVLocale = (lang) => {
  const lc = (lang || 'fr').substring(0, 2).toLowerCase();
  return TV_LOCALE_MAP[lc] || 'en';
};

// ─── TradingView Widget (keeps dark theme — chart-area only) ──────────
const TradingViewWidget = ({ symbol, interval, chartType, indicators, fullscreen, locale }) => {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current || !symbol) return;
    containerRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true, symbol, interval: interval || 'D',
      timezone: 'Africa/Johannesburg', theme: 'dark', style: chartType || '1',
      locale: getTVLocale(locale), backgroundColor: 'rgba(10, 15, 28, 1)', gridColor: 'rgba(255,255,255,0.04)',
      allow_symbol_change: true, calendar: false, support_host: 'https://www.tradingview.com',
      hide_volume: false, studies: indicators || [], withdateranges: true, details: false, hotlist: false,
    });
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container';
    widget.style.cssText = 'width:100%;height:100%';
    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.cssText = 'width:100%;height:100%';
    widget.appendChild(inner);
    widget.appendChild(script);
    containerRef.current.appendChild(widget);
    return () => { if (containerRef.current) containerRef.current.innerHTML = ''; };
  }, [symbol, interval, chartType, indicators, locale]);
  return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: fullscreen ? '100vh' : '500px' }} />;
};

// ─── Seeded PRNG (mulberry32) — same seed → same chart across renders ──
function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Custom Chart (cream-based) ───────────────────────────────────────
const CustomChart = ({ marketId, markets }) => {
  const { t } = useTranslation();
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const market = markets?.find(m => m.id === marketId);

  useEffect(() => {
    let cancelled = false;
    const initChart = async () => {
      if (!chartRef.current || cancelled) return;
      try {
        const { createChart } = await import('lightweight-charts');
        if (chartInstanceRef.current) { chartInstanceRef.current.remove(); chartInstanceRef.current = null; }
        const chart = createChart(chartRef.current, {
          layout: { background: { color: '#FAF3E8' }, textColor: 'rgba(26,20,16,0.5)', fontSize: 12 },
          grid: { vertLines: { color: 'rgba(26,20,16,0.05)' }, horzLines: { color: 'rgba(26,20,16,0.05)' } },
          crosshair: { mode: 0, vertLine: { color: 'rgba(26,20,16,0.2)', width: 1, style: 2 }, horzLine: { color: 'rgba(26,20,16,0.2)', width: 1, style: 2 } },
          rightPriceScale: { borderColor: 'rgba(26,20,16,0.08)' },
          timeScale: { borderColor: 'rgba(26,20,16,0.08)', timeVisible: true },
          handleScroll: { vertTouchDrag: false },
        });
        chartInstanceRef.current = chart;
        const baseValue = market?.rawValue || 1000;
        const now = Math.floor(Date.now() / 1000);
        const daySeconds = 86400;
        // Seed based on marketId so the same market always shows the same chart
        const seed = (marketId || 'default').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const rand = seededRand(seed);
        const data = [];
        for (let i = 90; i >= 0; i--) {
          const time = now - i * daySeconds;
          const volatility = baseValue * 0.015;
          const trend = (90 - i) * (baseValue * 0.0001);
          const open = baseValue + trend + (rand() - 0.5) * volatility;
          const close = open + (rand() - 0.5) * volatility;
          const high = Math.max(open, close) + rand() * volatility * 0.5;
          const low = Math.min(open, close) - rand() * volatility * 0.5;
          data.push({ time, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2) });
        }
        const candleSeries = chart.addCandlestickSeries({
          upColor: '#1E4D3A', downColor: '#C24916', borderUpColor: '#1E4D3A', borderDownColor: '#C24916', wickUpColor: '#1E4D3A', wickDownColor: '#C24916',
        });
        candleSeries.setData(data);
        const volumeSeries = chart.addHistogramSeries({ color: 'rgba(26,20,16,0.08)', priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        const randVol = seededRand(seed + 1);
        volumeSeries.setData(data.map(d => ({ time: d.time, value: randVol() * 1000000 + 100000, color: d.close >= d.open ? 'rgba(30,77,58,0.25)' : 'rgba(194,73,22,0.2)' })));
        chart.timeScale().fitContent();
        const resizeObserver = new ResizeObserver(() => {
          if (chartRef.current && chartInstanceRef.current) {
            chart.applyOptions({ width: chartRef.current.clientWidth, height: chartRef.current.clientHeight });
          }
        });
        resizeObserver.observe(chartRef.current);
        return () => resizeObserver.disconnect();
      } catch (e) { logger.error('Chart init error:', e); }
    };
    initChart();
    return () => { cancelled = true; if (chartInstanceRef.current) { chartInstanceRef.current.remove(); chartInstanceRef.current = null; } };
  }, [marketId, market?.rawValue]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '500px' }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', top: '0.75rem', left: '0.75rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        background: 'rgba(232,170,11,0.15)', border: '1px solid rgba(232,170,11,0.3)',
        borderRadius: '8px', padding: '0.3rem 0.65rem',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#9A6E00', fontWeight: 600 }}>{t('tradingChart.simulatedData')}</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--ink-mute)' }}>{t('tradingChart.tradingViewUnavailable')}</span>
      </div>
    </div>
  );
};

// ─── Alert Creator ────────────────────────────────────────────────────
const AlertCreator = ({ assetName, assetId, alerts, setAlerts, onClose, showToast }) => {
  const { t } = useTranslation();
  const [condition, setCondition] = useState('crossing');
  const [value, setValue] = useState('');
  const [trigger, setTrigger] = useState('once');

  const existingAlerts = alerts.filter(a => a.assetId === assetId);

  const handleCreate = () => {
    if (!value) return;
    const newAlert = { id: Date.now(), assetId, assetName, condition, value: parseFloat(value), trigger, createdAt: new Date().toISOString(), active: true };
    const updated = [...alerts, newAlert];
    setAlerts(updated);
    saveAlerts(updated);
    setValue('');
    showToast(t('alertModal.alertCreatedOn', { name: assetName }));
  };

  const handleDelete = (alertId) => {
    const updated = alerts.filter(a => a.id !== alertId);
    setAlerts(updated);
    saveAlerts(updated);
    showToast(t('alertModal.alertDeleted'));
  };

  const conditionLabels = { crossing: t('alertModal.conditions.crossingOf'), above: t('alertModal.conditions.above'), below: t('alertModal.conditions.below'), pct_up: t('alertModal.conditions.pctUp'), pct_down: t('alertModal.conditions.pctDown') };
  const inputSt = { width: '100%', background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.12)', borderRadius: '8px', padding: '0.4rem 0.65rem', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.1)', borderRadius: '14px', padding: '1rem', boxShadow: 'var(--shadow-warm)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Bell style={{ width: '14px', height: '14px', color: 'var(--terracotta)' }} />
          {t('alertModal.alertTitle', { name: assetName })}
        </h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex' }}>
          <X style={{ width: '15px', height: '15px' }} />
        </button>
      </div>

      {existingAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('alertModal.activeAlerts')}</div>
          {existingAlerts.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--cream-deep)', borderRadius: '8px', padding: '0.4rem 0.65rem' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                <span style={{ color: 'var(--terracotta)' }}>{conditionLabels[a.condition]}</span> {a.value}
                <span style={{ marginLeft: '0.5rem', color: 'var(--ink-mute)', fontSize: '0.7rem' }}>({a.trigger === 'once' ? '1x' : '∞'})</span>
              </div>
              <button onClick={() => handleDelete(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex', transition: 'color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--terracotta)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; }}>
                <Trash2 style={{ width: '12px', height: '12px' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--ink-mute)', display: 'block', marginBottom: '0.25rem' }}>{t('alertModal.condition')}</label>
          <select value={condition} onChange={e => setCondition(e.target.value)} style={inputSt}>
            <option value="crossing">{t('alertModal.conditions.crossing')}</option>
            <option value="above">{t('alertModal.conditions.above')}</option>
            <option value="below">{t('alertModal.conditions.below')}</option>
            <option value="pct_up">{t('alertModal.conditions.pctUp')}</option>
            <option value="pct_down">{t('alertModal.conditions.pctDown')}</option>
          </select>
        </div>
        <div>
          <label style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--ink-mute)', display: 'block', marginBottom: '0.25rem' }}>{t('alertModal.value')}</label>
          <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder={t('alertModal.pricePlaceholder')} style={inputSt} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {['once', 'always'].map(tr => (
          <button key={tr} onClick={() => setTrigger(tr)} style={{
            flex: 1, padding: '0.4rem 0.5rem',
            background: trigger === tr ? 'rgba(194,73,22,0.08)' : 'var(--cream-deep)',
            color: trigger === tr ? 'var(--terracotta)' : 'var(--ink-mute)',
            border: trigger === tr ? '1.5px solid rgba(194,73,22,0.25)' : '1.5px solid rgba(26,20,16,0.1)',
            borderRadius: '8px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {tr === 'once' ? t('alertModal.once') : t('alertModal.always')}
          </button>
        ))}
      </div>

      <button onClick={handleCreate} disabled={!value} style={{
        padding: '0.5rem', background: !value ? 'var(--cream-deep)' : 'var(--terracotta)',
        color: !value ? 'var(--ink-mute)' : 'var(--cream)', border: 'none', borderRadius: '8px',
        fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.78rem',
        cursor: !value ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
      }}>
        {t('alertModal.createAlert')}
      </button>
    </div>
  );
};

// ─── Indicators Panel ─────────────────────────────────────────────────
const IndicatorsPanel = ({ activeIndicators, setActiveIndicators, onClose }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const allLabel = t('indicators.all');
  const [activeCategory, setActiveCategory] = useState(allLabel);

  // Translate category and description at render time
  const translatedIndicators = INDICATORS_LIST.map(ind => ({
    ...ind,
    category: t(`indicators.categories.${ind.catKey}`, ind.catKey),
    desc: t(`indicators.desc.${ind.descKey}`, ind.name),
  }));
  const categories = [allLabel, ...new Set(translatedIndicators.map(i => i.category))];
  const filtered = translatedIndicators.filter(ind => {
    const matchSearch = !search || ind.name.toLowerCase().includes(search.toLowerCase()) || ind.desc.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === allLabel || ind.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.1)', borderRadius: '14px', padding: '0.85rem', boxShadow: 'var(--shadow-warm)', maxHeight: '400px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)' }}>{t('indicators.title')}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', display: 'flex' }}>
          <X style={{ width: '15px', height: '15px' }} />
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'var(--ink-mute)' }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('indicators.searchPlaceholder')}
          style={{ width: '100%', paddingLeft: '1.75rem', paddingRight: '0.6rem', paddingTop: '0.4rem', paddingBottom: '0.4rem', background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.1)', borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '2px' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            padding: '0.2rem 0.6rem', borderRadius: '999px', border: 'none', whiteSpace: 'nowrap',
            background: activeCategory === cat ? 'var(--ink)' : 'transparent',
            color: activeCategory === cat ? 'var(--cream)' : 'var(--ink-mute)',
            fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {cat}
          </button>
        ))}
      </div>

      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {filtered.map(ind => {
          const isActive = activeIndicators.includes(ind.id);
          return (
            <button key={ind.id}
              onClick={() => setActiveIndicators(prev => isActive ? prev.filter(i => i !== ind.id) : [...prev, ind.id])}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.65rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                background: isActive ? 'rgba(194,73,22,0.06)' : 'transparent',
                border: isActive ? '1.5px solid rgba(194,73,22,0.2)' : '1.5px solid transparent',
                transition: 'all 0.15s',
              }}>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem', color: isActive ? 'var(--terracotta)' : 'var(--ink-soft)' }}>{ind.name}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--ink-mute)' }}>{ind.desc}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '999px', background: isActive ? 'rgba(194,73,22,0.1)' : 'var(--cream-deep)', color: isActive ? 'var(--terracotta)' : 'var(--ink-mute)' }}>
                {ind.category}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Watchlist ────────────────────────────────────────────────────────
const WATCHLIST_CATEGORIES = [
  { id: 'favoris', icon: '⭐' },
  { id: 'indices', icon: '📊' },
  { id: 'actions', icon: '🏢' },
  { id: 'devises', icon: '💱' },
  { id: 'ressources', icon: '⛏️' },
];

const Watchlist = ({ markets, selectedMarket, onSelectMarket, selectedCategory, setSelectedCategory, favorites, toggleFavorite }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const favoriteItems = useMemo(() => {
    const items = [];
    favorites.forEach(fav => {
      const mkt = markets?.find(m => m.id === fav);
      if (mkt) { items.push({ type: 'index', data: mkt }); return; }
      const stock = AFRICAN_STOCKS.find(s => s.id === fav);
      if (stock) { items.push({ type: 'stock', data: stock }); return; }
      const fx = AFRICAN_CURRENCIES.find(c => c.id === fav);
      if (fx) { items.push({ type: 'forex', data: fx }); return; }
      const res = AFRICAN_RESOURCES.find(r => r.id === fav);
      if (res) { items.push({ type: 'resource', data: res }); return; }
    });
    return items;
  }, [favorites, markets]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Category tabs */}
      <div style={{ padding: '0.5rem 0.5rem 0.35rem', borderBottom: '1.5px solid rgba(26,20,16,0.08)' }}>
        <div style={{ display: 'flex', gap: '0.2rem' }}>
          {WATCHLIST_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem',
              padding: '0.35rem 0.2rem', borderRadius: '8px',
              background: selectedCategory === cat.id ? 'rgba(194,73,22,0.08)' : 'transparent',
              color: selectedCategory === cat.id ? 'var(--terracotta)' : 'var(--ink-mute)',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '0.7rem' }}>{cat.icon}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.58rem', fontWeight: 700, lineHeight: 1 }}>{t(`watchlist.categories.${cat.id}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0.35rem 0.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', width: '11px', height: '11px', color: 'var(--ink-mute)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('watchlist.searchPlaceholder')}
            style={{ width: '100%', paddingLeft: '1.5rem', paddingRight: '0.5rem', paddingTop: '0.3rem', paddingBottom: '0.3rem', background: 'var(--cream-deep)', border: '1px solid rgba(26,20,16,0.1)', borderRadius: '6px', fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Top movers for indices */}
      {selectedCategory === 'indices' && markets && markets.length > 0 && !search && (
        <div style={{ padding: '0.35rem 0.5rem 0.5rem', borderBottom: '1.5px solid rgba(26,20,16,0.06)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem', fontWeight: 700 }}>{t('watchlist.topMovers')}</div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {[...markets]
              .filter(m => typeof m.changePercent === 'number')
              .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
              .slice(0, 4)
              .map(m => {
                const isUp = m.changePercent >= 0;
                return (
                  <button key={m.id} onClick={() => onSelectMarket(m.id, 'index')} style={{
                    flex: 1, borderRadius: '8px', padding: '0.3rem 0.2rem', textAlign: 'center',
                    background: selectedMarket === m.id ? 'rgba(194,73,22,0.06)' : 'transparent',
                    border: selectedMarket === m.id ? '1.5px solid rgba(194,73,22,0.2)' : '1px solid transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <div style={{ fontSize: '0.8rem' }}>{COUNTRY_FLAGS[m.id]}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, color: isUp ? 'var(--forest)' : 'var(--terracotta)' }}>
                      {isUp ? '+' : ''}{m.changePercent?.toFixed(1)}%
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {(() => {
          const s = search.toLowerCase();
          let rendered = null;

          if (selectedCategory === 'favoris') {
            if (favoriteItems.length === 0) {
              return (
                <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                  <Star style={{ width: '28px', height: '28px', color: 'var(--ink-mute)', opacity: 0.3, margin: '0 auto 0.5rem', display: 'block' }} />
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>{t('watchlist.noFavorites')}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--ink-mute)', opacity: 0.7, marginTop: '0.2rem' }}>{t('watchlist.clickStarToAdd')}</div>
                </div>
              );
            }
            const filtered = favoriteItems.filter(item => {
              if (!search) return true;
              if (item.type === 'index') return item.data.code?.toLowerCase().includes(s) || item.data.country?.toLowerCase().includes(s);
              return item.data.name?.toLowerCase().includes(s);
            });
            rendered = filtered.map(item => {
              if (item.type === 'index') return <WatchlistIndex key={item.data.id} market={item.data} selectedMarket={selectedMarket} onSelectMarket={onSelectMarket} favorites={favorites} toggleFavorite={toggleFavorite} />;
              if (item.type === 'stock') return <WatchlistStock key={item.data.id} stock={item.data} selectedMarket={selectedMarket} onSelectMarket={onSelectMarket} favorites={favorites} toggleFavorite={toggleFavorite} />;
              if (item.type === 'forex') return <WatchlistForex key={item.data.id} currency={item.data} selectedMarket={selectedMarket} onSelectMarket={onSelectMarket} favorites={favorites} toggleFavorite={toggleFavorite} />;
              if (item.type === 'resource') return <WatchlistResource key={item.data.id} resource={item.data} selectedMarket={selectedMarket} onSelectMarket={onSelectMarket} favorites={favorites} toggleFavorite={toggleFavorite} />;
              return null;
            });
            return filtered.length === 0 ? <EmptySearchResult search={search} /> : rendered;
          }

          if (selectedCategory === 'indices') {
            const filtered = (markets || []).filter(m => !search || m.code?.toLowerCase().includes(s) || m.country?.toLowerCase().includes(s));
            if (filtered.length === 0) return <EmptySearchResult search={search} />;
            return filtered.map(market => <WatchlistIndex key={market.id} market={market} selectedMarket={selectedMarket} onSelectMarket={onSelectMarket} favorites={favorites} toggleFavorite={toggleFavorite} />);
          }

          if (selectedCategory === 'actions') {
            const filtered = AFRICAN_STOCKS.filter(x => !search || x.name.toLowerCase().includes(s) || x.country.toLowerCase().includes(s) || x.sector.toLowerCase().includes(s));
            if (filtered.length === 0) return <EmptySearchResult search={search} />;
            return filtered.map(stock => <WatchlistStock key={stock.id} stock={stock} selectedMarket={selectedMarket} onSelectMarket={onSelectMarket} favorites={favorites} toggleFavorite={toggleFavorite} />);
          }

          if (selectedCategory === 'devises') {
            const filtered = AFRICAN_CURRENCIES.filter(c => !search || c.name.toLowerCase().includes(s) || c.desc.toLowerCase().includes(s));
            if (filtered.length === 0) return <EmptySearchResult search={search} />;
            return filtered.map(currency => <WatchlistForex key={currency.id} currency={currency} selectedMarket={selectedMarket} onSelectMarket={onSelectMarket} favorites={favorites} toggleFavorite={toggleFavorite} />);
          }

          if (selectedCategory === 'ressources') {
            const filtered = AFRICAN_RESOURCES.filter(r => !search || r.name.toLowerCase().includes(s) || r.category.toLowerCase().includes(s));
            if (filtered.length === 0) return <EmptySearchResult search={search} />;
            return filtered.map(resource => <WatchlistResource key={resource.id} resource={resource} selectedMarket={selectedMarket} onSelectMarket={onSelectMarket} favorites={favorites} toggleFavorite={toggleFavorite} />);
          }

          return null;
        })()}
      </div>
    </div>
  );
};

// ─── Empty state for watchlist search ────────────────────────────────
const EmptySearchResult = ({ search }) => {
  const { t } = useTranslation();
  return (
    <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
      <Search style={{ width: '26px', height: '26px', color: 'var(--ink-mute)', opacity: 0.3, margin: '0 auto 0.5rem', display: 'block' }} />
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>
        {search ? t('watchlist.noResultsFor', { search }) : t('watchlist.nothingToShow')}
      </div>
      {search && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--ink-mute)', opacity: 0.7, marginTop: '0.2rem' }}>
          {t('watchlist.tryAnotherTerm')}
        </div>
      )}
    </div>
  );
};

// ─── Watchlist item sub-components ───────────────────────────────────
const itemBase = {
  display: 'flex', alignItems: 'center', gap: '0.35rem',
  padding: '0.4rem 0.5rem',
  cursor: 'pointer', transition: 'all 0.15s',
  borderLeft: '2px solid transparent',
};

const WatchlistIndex = ({ market, selectedMarket, onSelectMarket, favorites, toggleFavorite }) => {
  const tvInfo = TV_SYMBOLS[market.id];
  const isPositive = market.changePercent >= 0;
  const isFav = favorites.includes(market.id);
  const isSelected = selectedMarket === market.id;
  return (
    <div style={{ ...itemBase, background: isSelected ? 'rgba(194,73,22,0.04)' : 'transparent', borderLeftColor: isSelected ? 'var(--terracotta)' : 'transparent' }}>
      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(market.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', flexShrink: 0 }}>
        <Star style={{ width: '11px', height: '11px', color: isFav ? '#E8AA0B' : 'rgba(26,20,16,0.2)', fill: isFav ? '#E8AA0B' : 'transparent' }} />
      </button>
      <button onClick={() => onSelectMarket(market.id, 'index')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', minWidth: 0 }}>
        <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{COUNTRY_FLAGS[market.id]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.72rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{market.code}</span>
            {tvInfo?.available && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--forest)', flexShrink: 0 }} />}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--ink-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{market.country}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ink-soft)' }}>
            {typeof market.rawValue === 'number' ? market.rawValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : market.indexValue}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 700, color: isPositive ? 'var(--forest)' : 'var(--terracotta)' }}>
            {isPositive ? '+' : ''}{market.changePercent?.toFixed(2)}%
          </div>
        </div>
      </button>
    </div>
  );
};

const WatchlistStock = ({ stock, selectedMarket, onSelectMarket, favorites, toggleFavorite }) => {
  const isFav = favorites.includes(stock.id);
  const isSelected = selectedMarket === stock.id;
  return (
    <div style={{ ...itemBase, background: isSelected ? 'rgba(194,73,22,0.04)' : 'transparent', borderLeftColor: isSelected ? 'var(--terracotta)' : 'transparent' }}>
      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(stock.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', flexShrink: 0 }}>
        <Star style={{ width: '11px', height: '11px', color: isFav ? '#E8AA0B' : 'rgba(26,20,16,0.2)', fill: isFav ? '#E8AA0B' : 'transparent' }} />
      </button>
      <button onClick={() => onSelectMarket(stock.id, 'stock')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', minWidth: 0 }}>
        <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{stock.flag}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.72rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.name}</span>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--forest)', flexShrink: 0 }} />
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--ink-mute)' }}>{stock.sector} · {stock.country}</div>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '0.1rem 0.3rem', background: 'var(--cream-deep)', color: 'var(--ink-mute)', borderRadius: '4px', flexShrink: 0 }}>{stock.symbol.split(':')[1]}</span>
      </button>
    </div>
  );
};

const WatchlistForex = ({ currency, selectedMarket, onSelectMarket, favorites, toggleFavorite }) => {
  const isFav = favorites.includes(currency.id);
  const isSelected = selectedMarket === currency.id;
  return (
    <div style={{ ...itemBase, background: isSelected ? 'rgba(194,73,22,0.04)' : 'transparent', borderLeftColor: isSelected ? 'var(--terracotta)' : 'transparent' }}>
      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(currency.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', flexShrink: 0 }}>
        <Star style={{ width: '11px', height: '11px', color: isFav ? '#E8AA0B' : 'rgba(26,20,16,0.2)', fill: isFav ? '#E8AA0B' : 'transparent' }} />
      </button>
      <button onClick={() => onSelectMarket(currency.id, 'forex')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', minWidth: 0 }}>
        <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{currency.flag}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.72rem', color: 'var(--ink)' }}>{currency.name}</span>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--forest)', flexShrink: 0 }} />
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--ink-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currency.desc}</div>
        </div>
      </button>
    </div>
  );
};

const WatchlistResource = ({ resource, selectedMarket, onSelectMarket, favorites, toggleFavorite }) => {
  const isFav = favorites.includes(resource.id);
  const isSelected = selectedMarket === resource.id;
  return (
    <div style={{ ...itemBase, background: isSelected ? 'rgba(194,73,22,0.04)' : 'transparent', borderLeftColor: isSelected ? 'var(--terracotta)' : 'transparent' }}>
      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(resource.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', flexShrink: 0 }}>
        <Star style={{ width: '11px', height: '11px', color: isFav ? '#E8AA0B' : 'rgba(26,20,16,0.2)', fill: isFav ? '#E8AA0B' : 'transparent' }} />
      </button>
      <button onClick={() => onSelectMarket(resource.id, 'resource')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', minWidth: 0 }}>
        <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{resource.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.72rem', color: 'var(--ink)' }}>{resource.name}</span>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--forest)', flexShrink: 0 }} />
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', color: 'var(--ink-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resource.desc} · {resource.category}</div>
        </div>
      </button>
    </div>
  );
};

// ─── Main TradingTab ──────────────────────────────────────────────────
const TradingTab = ({ markets }) => {
  const { t, i18n } = useTranslation();
  const chartAreaRef = useRef(null);
  const [selectedMarket, setSelectedMarket] = useState('egx');
  const [selectedType, setSelectedType] = useState('index');
  const [selectedCategory, setSelectedCategory] = useState('indices');
  const [interval, setInterval] = useState('D');
  const [chartType, setChartType] = useState('1');
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [showIndicators, setShowIndicators] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showChartTypes, setShowChartTypes] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [alerts, setAlerts] = useState(loadAlerts);
  const [toast, setToast] = useState(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { if (isMobile) setSidebarVisible(false); }, [isMobile]);

  const showToastMsg = useCallback((msg) => { setToast(msg); }, []);

  const toggleFavorite = useCallback((id) => {
    setFavorites(prev => {
      const updated = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      saveFavorites(updated);
      return updated;
    });
  }, []);

  const handleSelectMarket = useCallback((id, type) => {
    setSelectedMarket(id);
    setSelectedType(type);
    if (isMobile) setSidebarVisible(false);
  }, [isMobile]);

  const resolvedAsset = useMemo(() => {
    if (selectedType === 'stock') {
      const stock = AFRICAN_STOCKS.find(s => s.id === selectedMarket);
      if (stock) return { tvSymbol: stock.symbol, name: stock.name, subtitle: `${stock.sector} · ${stock.country}`, flag: stock.flag, hasTradingView: true, assetId: stock.id };
    }
    if (selectedType === 'forex') {
      const fx = AFRICAN_CURRENCIES.find(c => c.id === selectedMarket);
      if (fx) return { tvSymbol: fx.symbol, name: fx.name, subtitle: fx.desc, flag: fx.flag, hasTradingView: true, assetId: fx.id };
    }
    if (selectedType === 'resource') {
      const res = AFRICAN_RESOURCES.find(r => r.id === selectedMarket);
      if (res) return { tvSymbol: res.symbol, name: res.name, subtitle: `${res.desc} · ${res.category}`, flag: res.icon, hasTradingView: true, assetId: res.id };
    }
    const market = markets?.find(m => m.id === selectedMarket);
    const tvInfo = TV_SYMBOLS[selectedMarket];
    return {
      tvSymbol: tvInfo?.symbol || null,
      name: tvInfo?.name || market?.code || selectedMarket,
      subtitle: market?.country || '',
      flag: COUNTRY_FLAGS[selectedMarket] || '📊',
      hasTradingView: tvInfo?.available && tvInfo?.symbol,
      marketData: market,
      assetId: selectedMarket,
    };
  }, [selectedMarket, selectedType, markets]);

  const market = resolvedAsset.marketData || markets?.find(m => m.id === selectedMarket);
  const hasTradingView = resolvedAsset.hasTradingView;

  const chartTypes = useMemo(() => CHART_TYPES_BASE.map(ct => ({
    ...ct,
    label: t(`trading.chartTypes.${ct.key}`, ct.label || ct.key),
  })), [t]);

  const tvStudies = useMemo(() => {
    const studyMap = {
      RSI: 'RSI@tv-basicstudies', MACD: 'MACD@tv-basicstudies', BB: 'BB@tv-basicstudies',
      EMA: 'MAExp@tv-basicstudies', SMA: 'MASimple@tv-basicstudies', VWAP: 'VWAP@tv-basicstudies',
      ATR: 'ATR@tv-basicstudies', ADX: 'ADX@tv-basicstudies', STOCH: 'Stochastic@tv-basicstudies',
      ICHIMOKU: 'IchimokuCloud@tv-basicstudies', OBV: 'OBV@tv-basicstudies', MFI: 'MFI@tv-basicstudies',
    };
    return activeIndicators.map(id => studyMap[id]).filter(Boolean);
  }, [activeIndicators]);

  const handleScreenshot = useCallback(async () => {
    try {
      const area = chartAreaRef.current;
      if (!area) return;
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(area, { backgroundColor: '#FAF3E8', useCORS: true, allowTaint: true });
      const link = document.createElement('a');
      link.download = `PENDO_${resolvedAsset.name}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToastMsg(t('tradingChart.screenshotDownloaded'));
    } catch (e) {
      logger.error('Screenshot error:', e);
      showToastMsg(t('tradingChart.screenshotError'));
    }
  }, [resolvedAsset.name, showToastMsg, t]);

  const currentAlertCount = alerts.filter(a => a.assetId === resolvedAsset.assetId).length;

  const toolbarBtnBase = {
    display: 'flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.3rem 0.5rem', borderRadius: '6px', border: 'none',
    fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
  };

  return (
    <div style={{
      display: 'flex',
      ...(fullscreen ? { position: 'fixed', inset: 0, zIndex: 50 } : { height: 'calc(100vh - 180px)', minHeight: '600px' }),
      borderRadius: '14px', overflow: 'hidden',
      border: '1.5px solid rgba(26,20,16,0.08)',
      background: 'var(--cream)',
    }}>

      {/* ─── Main Chart Area ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.25rem',
          padding: '0.4rem 0.6rem',
          background: 'var(--cream-glow)',
          borderBottom: '1.5px solid rgba(26,20,16,0.08)',
          overflowX: 'auto', flexShrink: 0,
        }}>
          {/* Timeframes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', marginRight: '0.5rem' }}>
            {TIMEFRAMES_BASE.map(tf => (
              <button key={tf.value} onClick={() => setInterval(tf.value)} style={{
                ...toolbarBtnBase,
                background: interval === tf.value ? 'var(--ink)' : 'transparent',
                color: interval === tf.value ? 'var(--cream)' : 'var(--ink-mute)',
              }}>
                {t(`trading.timeframes.${tf.key}`, tf.key.toUpperCase())}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '18px', background: 'rgba(26,20,16,0.1)', margin: '0 0.25rem' }} />

          {/* Chart type */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowChartTypes(!showChartTypes)} style={{
              ...toolbarBtnBase,
              background: showChartTypes ? 'var(--cream-deep)' : 'transparent',
              color: 'var(--ink-soft)',
            }}>
              <BarChart3 style={{ width: '13px', height: '13px' }} />
              <span className="hidden sm:inline" style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem' }}>{chartTypes.find(c => c.value === chartType)?.label}</span>
              <ChevronDown style={{ width: '11px', height: '11px' }} />
            </button>
            {showChartTypes && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: '10px', padding: '0.35rem', zIndex: 50, minWidth: '140px', boxShadow: 'var(--shadow-warm)' }}>
                {chartTypes.map(ct => (
                  <button key={ct.value} onClick={() => { setChartType(ct.value); setShowChartTypes(false); }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.6rem', background: chartType === ct.value ? 'var(--cream-deep)' : 'transparent',
                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '0.78rem',
                    color: chartType === ct.value ? 'var(--ink)' : 'var(--ink-mute)',
                    transition: 'all 0.15s',
                  }}>
                    <span>{ct.icon}</span>{ct.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ width: '1px', height: '18px', background: 'rgba(26,20,16,0.1)', margin: '0 0.25rem' }} />

          {/* Indicators */}
          <button onClick={() => { setShowIndicators(!showIndicators); setShowAlert(false); }} style={{
            ...toolbarBtnBase,
            background: showIndicators ? 'rgba(194,73,22,0.08)' : 'transparent',
            color: showIndicators ? 'var(--terracotta)' : 'var(--ink-mute)',
          }}>
            <Activity style={{ width: '13px', height: '13px' }} />
            <span className="hidden sm:inline">{t('trading.indicators')}</span>
            {activeIndicators.length > 0 && (
              <span style={{ background: 'var(--terracotta)', color: 'var(--cream)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: '999px' }}>{activeIndicators.length}</span>
            )}
          </button>

          {/* Alert */}
          <button onClick={() => { setShowAlert(!showAlert); setShowIndicators(false); }} style={{
            ...toolbarBtnBase,
            background: showAlert ? 'rgba(194,73,22,0.08)' : 'transparent',
            color: showAlert ? 'var(--terracotta)' : 'var(--ink-mute)',
          }}>
            <Bell style={{ width: '13px', height: '13px' }} />
            <span className="hidden sm:inline">{t('trading.alert')}</span>
            {currentAlertCount > 0 && (
              <span style={{ background: 'var(--terracotta)', color: 'var(--cream)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, padding: '0.05rem 0.35rem', borderRadius: '999px' }}>{currentAlertCount}</span>
            )}
          </button>

          <div style={{ flex: 1 }} />

          {/* Right actions */}
          {[
            { title: t('tradingChart.screenshot'), onClick: handleScreenshot, icon: <Camera style={{ width: '13px', height: '13px' }} /> },
            { title: t('watchlist.title'), onClick: () => setSidebarVisible(!sidebarVisible), icon: sidebarVisible ? <Eye style={{ width: '13px', height: '13px' }} /> : <EyeOff style={{ width: '13px', height: '13px' }} /> },
            { title: fullscreen ? t('tradingChart.exitFullscreen') : t('tradingChart.fullscreen'), onClick: () => setFullscreen(!fullscreen), icon: fullscreen ? <Minimize2 style={{ width: '13px', height: '13px' }} /> : <Maximize2 style={{ width: '13px', height: '13px' }} /> },
          ].map(({ title, onClick, icon }) => (
            <button key={title} onClick={onClick} title={title} style={{
              ...toolbarBtnBase, color: 'var(--ink-mute)', padding: '0.3rem 0.4rem',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.background = 'var(--cream-deep)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-mute)'; e.currentTarget.style.background = 'transparent'; }}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Asset Info Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.5rem 0.85rem',
          background: 'var(--cream-deep)',
          borderBottom: '1.5px solid rgba(26,20,16,0.08)',
          overflowX: 'auto', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <span style={{ fontSize: '1.15rem' }}>{resolvedAsset.flag}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--ink)' }}>{resolvedAsset.name}</span>
                {hasTradingView && (
                  <span style={{ background: 'rgba(30,77,58,0.1)', color: 'var(--forest)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px' }}>TradingView</span>
                )}
                {resolvedAsset.tvSymbol && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--ink-mute)' }}>{resolvedAsset.tvSymbol}</span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--ink-mute)' }}>{resolvedAsset.subtitle}</div>
            </div>
          </div>

          {market && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginLeft: 'auto' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>
                {typeof market.rawValue === 'number' ? market.rawValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) : market.indexValue}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.25rem 0.6rem', borderRadius: '8px',
                background: market.changePercent >= 0 ? 'rgba(30,77,58,0.08)' : 'rgba(194,73,22,0.08)',
              }}>
                {market.changePercent >= 0
                  ? <TrendingUp style={{ width: '11px', height: '11px', color: 'var(--forest)' }} />
                  : <TrendingDown style={{ width: '11px', height: '11px', color: 'var(--terracotta)' }} />
                }
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: market.changePercent >= 0 ? 'var(--forest)' : 'var(--terracotta)' }}>
                  {market.change}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ink-mute)' }}>
                {market.status === 'open' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--forest)' }} />{t('trading.open')}
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(26,20,16,0.2)' }} />{t('trading.closed')}
                  </span>
                )}
                <span className="hidden md:flex" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock style={{ width: '11px', height: '11px' }} />
                  {market.openTime}-{market.closeTime}
                </span>
              </div>
            </div>
          )}

          <button onClick={() => toggleFavorite(resolvedAsset.assetId)} style={{ marginLeft: 'auto', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}>
            <Star style={{ width: '16px', height: '16px', color: favorites.includes(resolvedAsset.assetId) ? '#E8AA0B' : 'rgba(26,20,16,0.2)', fill: favorites.includes(resolvedAsset.assetId) ? '#E8AA0B' : 'transparent', transition: 'all 0.15s' }} />
          </button>
        </div>

        {/* Chart + floating panels */}
        <div style={{ position: 'relative', flex: 1 }} ref={chartAreaRef}>
          <div style={{ position: 'absolute', inset: 0 }}>
            {hasTradingView && resolvedAsset.tvSymbol ? (
              <TradingViewWidget symbol={resolvedAsset.tvSymbol} interval={interval} chartType={chartType} indicators={tvStudies} fullscreen={fullscreen} locale={i18n.language} />
            ) : (
              <CustomChart marketId={selectedMarket} markets={markets} />
            )}
          </div>

          {showIndicators && (
            <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', width: '280px', zIndex: 40, maxWidth: 'calc(100% - 1rem)' }}>
              <IndicatorsPanel activeIndicators={activeIndicators} setActiveIndicators={setActiveIndicators} onClose={() => setShowIndicators(false)} />
            </div>
          )}

          {showAlert && (
            <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', width: '300px', zIndex: 40, maxWidth: 'calc(100% - 1rem)' }}>
              <AlertCreator assetName={resolvedAsset.name} assetId={resolvedAsset.assetId} alerts={alerts} setAlerts={setAlerts} onClose={() => setShowAlert(false)} showToast={showToastMsg} />
            </div>
          )}
        </div>
      </div>

      {/* ─── Sidebar (Watchlist) ─── */}
      {sidebarVisible && (
        <div style={{
          ...(isMobile ? { position: 'absolute', right: 0, top: 0, bottom: 0, zIndex: 40, boxShadow: 'var(--shadow-warm)' } : {}),
          width: '220px', background: 'var(--cream-glow)', borderLeft: '1.5px solid rgba(26,20,16,0.08)', display: 'flex', flexDirection: 'column',
        }}>
          {isMobile && (
            <button onClick={() => setSidebarVisible(false)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 50, padding: '0.3rem', background: 'var(--cream-deep)', border: '1px solid rgba(26,20,16,0.1)', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}>
              <X style={{ width: '14px', height: '14px', color: 'var(--ink-soft)' }} />
            </button>
          )}
          <Watchlist
            markets={markets}
            selectedMarket={selectedMarket}
            onSelectMarket={handleSelectMarket}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
          />
        </div>
      )}

      {isMobile && sidebarVisible && (
        <div onClick={() => setSidebarVisible(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(26,20,16,0.4)', zIndex: 30 }} />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default TradingTab;
