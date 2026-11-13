import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocale } from '../utils/locale';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart, Plus,
  ArrowUpRight, ArrowDownRight, AlertCircle, Star, Eye, Clock,
  Download, FileSpreadsheet
} from 'lucide-react';
import { exportPortfolioPDF, exportPortfolioExcel, exportTransactionsExcel } from '../utils/exportUtils';
import TransactionModal from './TransactionModal';
import PortfolioPerformanceChart from './PortfolioPerformanceChart';
import StopLossManager from './StopLossManager';
import TechnicalIndicators from './TechnicalIndicators';
import PositionSizingCalculator from './PositionSizingCalculator';
import { SkeletonStatGrid, SkeletonChart, SkeletonTable } from './ui/SkeletonLoader';
import logger from '../utils/logger';

const PortfolioTabEnhanced = ({ onOpenLogin }) => {
  const { token, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [portfolioData, setPortfolioData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated) loadPortfolioData();
  }, [isAuthenticated]);

  const loadPortfolioData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [summaryRes, transactionsRes, watchlistRes] = await Promise.all([
        fetch(`${API_URL}/portfolio/summary`, { headers }),
        fetch(`${API_URL}/portfolio/transactions?limit=10`, { headers }),
        fetch(`${API_URL}/portfolio/watchlist`, { headers })
      ]);
      for (const r of [summaryRes, transactionsRes, watchlistRes]) {
        if (!r.ok) throw new Error(`HTTP ${r.status} on ${r.url}`);
      }
      const [summaryData, transactionsData, watchlistData] = await Promise.all([
        summaryRes.json(), transactionsRes.json(), watchlistRes.json()
      ]);
      if (summaryData.success) setPortfolioData(summaryData.data);
      if (transactionsData.success) setTransactions(transactionsData.data);
      if (watchlistData.success) setWatchlist(watchlistData.data);
    } catch (error) {
      logger.error('Erreur chargement portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '0 XOF';
    return new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(value);
  };

  const formatPercent = (value) => {
    if (!value) return '0%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💼</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
          {t('auth.loginRequired') || 'Connexion requise'}
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', maxWidth: '400px', lineHeight: 1.6 }}>
          {t('auth.loginToPortfolio') || 'Connectez-vous pour gérer votre portefeuille, suivre vos transactions et analyser vos performances.'}
        </p>
        {onOpenLogin && (
          <button onClick={onOpenLogin} style={{ marginTop: '1.5rem', padding: '0.65rem 1.5rem', borderRadius: '999px', border: 'none', background: 'var(--accent, #c9a227)', color: '#fff', fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer' }}>
            {t('auth.loginOrRegister', 'Se connecter / Créer un compte')}
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <SkeletonStatGrid count={4} />
        <SkeletonChart />
        <SkeletonTable />
      </div>
    );
  }

  const summary = portfolioData?.summary || {};
  const holdings = portfolioData?.holdings || [];
  const portfolio = portfolioData?.portfolio || {};

  const btnBase = {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1.5px solid rgba(26,20,16,0.1)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '0.4rem' }}>{t('portfolio.title')}</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', color: 'var(--ink)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {t('portfolio.trackInvestments')}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => exportPortfolioPDF(holdings, summary)} disabled={holdings.length === 0}
            style={{ ...btnBase, background: 'var(--cream-deep)', color: 'var(--ink-soft)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-deep)'; }}
          >
            <Download style={{ width: '1rem', height: '1rem' }} />PDF
          </button>
          <button onClick={() => exportPortfolioExcel(holdings, summary)} disabled={holdings.length === 0}
            style={{ ...btnBase, background: 'var(--cream-deep)', color: 'var(--ink-soft)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-deep)'; }}
          >
            <FileSpreadsheet style={{ width: '1rem', height: '1rem' }} />Excel
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
            style={{ ...btnBase, background: 'var(--ink)', color: 'var(--cream)', border: 'none' }}
          >
            <Plus style={{ width: '1rem', height: '1rem' }} />
            {t('portfolio.newTransaction')}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total value — terracotta accent */}
        <div style={{ background: 'var(--terracotta)', borderRadius: 'var(--radius-md)', padding: '1.25rem', color: 'var(--cream)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', opacity: 0.75 }}>{t('portfolio.totalValue')}</span>
            <DollarSign style={{ width: '1.1rem', height: '1.1rem', opacity: 0.7 }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1.6rem', fontVariantNumeric: 'tabular-nums', marginBottom: '0.25rem' }}>
            {formatCurrency(summary.portfolioValue)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', opacity: 0.7 }}>
            {t('portfolio.availableBalance')}: {formatCurrency(summary.cashBalance)}
          </div>
        </div>

        {/* Gain/Loss */}
        <div style={{
          borderRadius: 'var(--radius-md)', padding: '1.25rem',
          background: summary.totalGainLoss >= 0 ? 'rgba(30,77,58,0.08)' : 'rgba(194,73,22,0.08)',
          border: `1.5px solid ${summary.totalGainLoss >= 0 ? 'rgba(30,77,58,0.2)' : 'rgba(194,73,22,0.2)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>{t('portfolio.gainLoss')}</span>
            {summary.totalGainLoss >= 0
              ? <TrendingUp style={{ width: '1.1rem', height: '1.1rem', color: 'var(--forest)' }} />
              : <TrendingDown style={{ width: '1.1rem', height: '1.1rem', color: 'var(--terracotta)' }} />
            }
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1.5rem', color: summary.totalGainLoss >= 0 ? 'var(--forest)' : 'var(--terracotta)', fontVariantNumeric: 'tabular-nums', marginBottom: '0.25rem' }}>
            {formatCurrency(summary.totalGainLoss)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: summary.totalGainLoss >= 0 ? 'var(--forest)' : 'var(--terracotta)' }}>
            {formatPercent(summary.totalGainLossPercent)}
          </div>
        </div>

        {/* Total cost */}
        <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>{t('portfolio.investmentCost')}</span>
            <PieChart style={{ width: '1.1rem', height: '1.1rem', color: 'var(--ink-mute)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', marginBottom: '0.25rem' }}>
            {formatCurrency(summary.totalCost)}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>
            {t('portfolio.acquisitionCost')}
          </div>
        </div>

        {/* Positions count */}
        <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>{t('portfolio.positions')}</span>
            <Star style={{ width: '1.1rem', height: '1.1rem', color: 'var(--ink-mute)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1.5rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', marginBottom: '0.25rem' }}>
            {summary.numberOfHoldings || 0}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>
            {t('portfolio.holdingShares')}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(26,20,16,0.08)', overflowX: 'auto' }} className="scrollbar-hide">
        {['overview', 'transactions', 'watchlist', 'trading-tools'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.75rem 1.25rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                fontSize: '0.8rem',
                color: isActive ? 'var(--terracotta)' : 'var(--ink-mute)',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--terracotta)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'overview' ? t('portfolio.overview') :
               tab === 'transactions' ? t('portfolio.transactions') :
               tab === 'watchlist' ? t('portfolio.watchlist') :
               t('portfolio.tradingTools')}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <PortfolioPerformanceChart />

          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.15rem', color: 'var(--ink)', marginBottom: '1rem' }}>
              {t('portfolio.myPositions')}
            </h3>
            {holdings.length === 0 ? (
              <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center' }}>
                <PieChart style={{ width: '3rem', height: '3rem', color: 'var(--ink-mute)', opacity: 0.3, display: 'block', margin: '0 auto 1rem' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.15rem', color: 'var(--ink-soft)', marginBottom: '0.5rem' }}>
                  {t('portfolio.noPosition')}
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  {t('portfolio.startInvesting')}
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
                  style={{ padding: '0.65rem 1.5rem', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  {t('portfolio.addTransaction')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {holdings.map((holding, idx) => (
                  <HoldingRow key={idx} holding={holding} formatCurrency={formatCurrency} formatPercent={formatPercent} t={t} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.15rem', color: 'var(--ink)' }}>{t('portfolio.transactionHistory')}</h3>
            <button
              onClick={() => exportTransactionsExcel(transactions)}
              disabled={transactions.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--cream-deep)', border: '1.5px solid rgba(26,20,16,0.1)', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-soft)', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-glow)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream-deep)'; }}
            >
              <FileSpreadsheet style={{ width: '0.875rem', height: '0.875rem' }} />
              {t('portfolio.exportExcel')}
            </button>
          </div>
          {transactions.length === 0 ? (
            <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center' }}>
              <Clock style={{ width: '3rem', height: '3rem', color: 'var(--ink-mute)', opacity: 0.3, display: 'block', margin: '0 auto 0.75rem' }} />
              <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>{t('messages.noTransaction')}</p>
              <button
                onClick={() => setShowAddModal(true)}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--terracotta)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--ink)'; }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.25rem', background: 'var(--ink)', color: 'var(--cream)', border: 'none', borderRadius: '10px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                <Plus style={{ width: '0.9rem', height: '0.9rem' }} />
                {t('portfolio.addTransaction')}
              </button>
            </div>
          ) : (
            <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cream-deep)', borderBottom: '1px solid rgba(26,20,16,0.08)' }}>
                    {[t('transaction.date'), t('transaction.type'), 'Ticker', t('portfolio.quantity'), t('market.price'), t('transaction.total')].map((h, i) => (
                      <th key={i} style={{ padding: '0.75rem 1rem', textAlign: i > 2 ? 'right' : 'left', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < transactions.length - 1 ? '1px solid rgba(26,20,16,0.04)' : 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream-deep)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                        {new Date(tx.transaction_date).toLocaleDateString(getLocale())}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.55rem', borderRadius: '99px',
                          fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600,
                          background: tx.transaction_type === 'buy' ? 'rgba(30,77,58,0.1)' : 'rgba(194,73,22,0.1)',
                          color: tx.transaction_type === 'buy' ? 'var(--forest)' : 'var(--terracotta)',
                          border: tx.transaction_type === 'buy' ? '1px solid rgba(30,77,58,0.2)' : '1px solid rgba(194,73,22,0.2)',
                        }}>
                          {tx.transaction_type === 'buy' ? t('portfolio.buyAction') : t('portfolio.sellAction')}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '0.8rem', color: 'var(--ink)' }}>{tx.ticker}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>{tx.quantity}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(tx.price)}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '0.8rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(tx.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'watchlist' && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.15rem', color: 'var(--ink)', marginBottom: '1rem' }}>{t('portfolio.followedStocks')}</h3>
          {watchlist.length === 0 ? (
            <div style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center' }}>
              <Eye style={{ width: '3rem', height: '3rem', color: 'var(--ink-mute)', opacity: 0.3, display: 'block', margin: '0 auto 0.75rem' }} />
              <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>{t('messages.noWatchlist')}</p>
              <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', fontSize: '0.78rem', opacity: 0.8 }}>
                {t('portfolio.watchlistHint', { defaultValue: 'Cliquez sur l\u2019\u00e9toile d\u2019une action dans l\u2019onglet Trading pour l\u2019ajouter ici.' })}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {watchlist.map((item, idx) => (
                <WatchlistRow key={idx} item={item} formatCurrency={formatCurrency} formatPercent={formatPercent} t={t} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'trading-tools' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.25rem', color: 'var(--ink)', marginBottom: '0.35rem' }}>{t('portfolio.tradingSection.title')}</h3>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-mute)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{t('portfolio.tradingSection.description')}</p>
          </div>
          {[
            { icon: AlertCircle, title: 'Stop Loss & Take Profit', content: <StopLossManager /> },
            { icon: TrendingUp, title: t('portfolio.tradingSection.technicalIndicators'), content: <TechnicalIndicators /> },
            { icon: PieChart, title: t('portfolio.tradingSection.positionCalculator'), content: <PositionSizingCalculator /> },
          ].map(({ icon: Icon, title, content }, i) => (
            <div key={i} style={{ background: 'var(--cream-glow)', border: '1.5px solid rgba(26,20,16,0.08)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '1.05rem', color: 'var(--ink)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon style={{ width: '1.1rem', height: '1.1rem', color: 'var(--terracotta)' }} />
                {title}
              </h4>
              {content}
            </div>
          ))}
        </div>
      )}

      <TransactionModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={loadPortfolioData} />
    </div>
  );
};

const HoldingRow = ({ holding, formatCurrency, formatPercent, t }) => {
  const [hovered, setHovered] = React.useState(false);
  const isGain = holding.gain_loss >= 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--cream-glow)',
        border: hovered ? '1.5px solid rgba(194,73,22,0.25)' : '1.5px solid rgba(26,20,16,0.08)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.25rem',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>
              {holding.market_id}
            </h4>
            <span style={{ padding: '0.15rem 0.5rem', background: 'var(--cream-deep)', color: 'var(--ink-mute)', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
              {holding.stock_name || 'N/A'}
            </span>
            {holding.sector && (
              <span style={{ padding: '0.15rem 0.5rem', background: 'rgba(59,130,246,0.08)', color: '#1D4ED8', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                {holding.sector}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: t('portfolio.quantity'), value: holding.quantity },
              { label: t('portfolio.avgPrice'), value: formatCurrency(holding.average_price) },
              { label: t('portfolio.currentPrice'), value: formatCurrency(holding.current_price) },
              { label: t('portfolio.value'), value: formatCurrency(holding.current_value) },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--ink-mute)', marginBottom: '0.2rem' }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '0.8rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1.25rem', color: isGain ? 'var(--forest)' : 'var(--terracotta)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(holding.gain_loss)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', color: isGain ? 'var(--forest)' : 'var(--terracotta)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 500 }}>
            {isGain ? <ArrowUpRight style={{ width: '0.875rem', height: '0.875rem' }} /> : <ArrowDownRight style={{ width: '0.875rem', height: '0.875rem' }} />}
            {formatPercent(holding.gain_loss_percent)}
          </div>
        </div>
      </div>
    </div>
  );
};

const WatchlistRow = ({ item, formatCurrency, formatPercent, t }) => {
  const [hovered, setHovered] = React.useState(false);
  const isGain = item.daily_change >= 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--cream-glow)',
        border: hovered ? '1.5px solid rgba(194,73,22,0.25)' : '1.5px solid rgba(26,20,16,0.08)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.25rem',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h4 style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>{item.ticker}</h4>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ink-mute)' }}>{item.stock_name}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '1.1rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(item.current_price)}
          </div>
          {item.daily_change !== null && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', color: isGain ? 'var(--forest)' : 'var(--terracotta)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 500 }}>
              {isGain ? <ArrowUpRight style={{ width: '0.75rem', height: '0.75rem' }} /> : <ArrowDownRight style={{ width: '0.75rem', height: '0.75rem' }} />}
              {formatPercent(item.daily_change)}
            </div>
          )}
        </div>
      </div>
      {item.target_price && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(26,20,16,0.06)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
            <span style={{ color: 'var(--ink-mute)' }}>{t('portfolio.targetPrice')}</span>
            <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{formatCurrency(item.target_price)}</span>
          </div>
          {item.distance_to_target && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--ink-mute)' }}>{t('portfolio.distance')}</span>
              <span style={{ color: item.distance_to_target >= 0 ? 'var(--forest)' : 'var(--terracotta)', fontWeight: 500 }}>
                {formatPercent(item.distance_to_target)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortfolioTabEnhanced;
