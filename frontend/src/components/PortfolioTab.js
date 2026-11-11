import { useTranslation } from 'react-i18next';
import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { getLocale } from '../utils/locale';
import logger from '../utils/logger';

const PortfolioTab = () => {
  const { t } = useTranslation();
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState('BUY');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [quantity, setQuantity] = useState('');
  const [prices, setPrices] = useState({});
  const [message, setMessage] = useState(null);

  const fetchPortfolio = async () => {
    try {
      const [portfolioRes, transactionsRes, pricesRes] = await Promise.all([
        fetch(`${API_URL}/portfolio`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('pendo_token') || ''}` } }),
        fetch(`${API_URL}/portfolio/transactions`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('pendo_token') || ''}` } }),
        fetch(`${API_URL}/markets/prices`)
      ]);
      
      const portfolioData = await portfolioRes.json();
      const transactionsData = await transactionsRes.json();
      const pricesData = await pricesRes.json();
      
      if (portfolioData.success) setPortfolio(portfolioData.data);
      if (transactionsData.success) setTransactions(transactionsData.data);
      if (pricesData.success) setPrices(pricesData.data);
    } catch (error) {
      logger.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTrade = async () => {
    if (!selectedMarket || !quantity) return;
    
    const endpoint = tradeType === 'BUY' ? '/api/portfolio/buy' : '/api/portfolio/sell';
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('pendo_token') || ''}` },
        body: JSON.stringify({ market_id: selectedMarket, quantity: parseFloat(quantity) })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setShowTradeModal(false);
        setQuantity('');
        fetchPortfolio();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('portfolio.transactionError') });
    }
    
    setTimeout(() => setMessage(null), 3000);
  };

  const handleReset = async () => {
    if (!window.confirm(t('portfolio.resetConfirm'))) return;
    
    try {
      await fetch(`${API_URL}/portfolio/reset`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('pendo_token') || ''}` } });
      fetchPortfolio();
      setMessage({ type: 'success', text: t('portfolio.portfolioReset') });
    } catch (error) {
      setMessage({ type: 'error', text: t('common.error') });
    }
    
    setTimeout(() => setMessage(null), 3000);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(getLocale(), {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Résumé du portefeuille */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg opacity-90">💼 {t('portfolio.virtualPortfolio')}</h2>
            <p className="text-4xl font-bold mt-2">{formatCurrency(portfolio?.total_value || 0)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setTradeType('BUY'); setShowTradeModal(true); }}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium"
            >
              📈 {t('portfolio.buy')}
            </button>
            <button
              onClick={() => { setTradeType('SELL'); setShowTradeModal(true); }}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium"
            >
              📉 {t('portfolio.sell')}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-75">{t('portfolio.availableBalance')}</p>
            <p className="text-xl font-semibold">{formatCurrency(portfolio?.current_balance || 0)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-75">{t('portfolio.assetValue')}</p>
            <p className="text-xl font-semibold">{formatCurrency((portfolio?.total_value || 0) - (portfolio?.current_balance || 0))}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-75">{t('portfolio.profitLoss')}</p>
            <p className={`text-xl font-semibold ${portfolio?.total_profit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {portfolio?.total_profit >= 0 ? '+' : ''}{formatCurrency(portfolio?.total_profit || 0)}
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-sm opacity-75">{t('portfolio.performance')}</p>
            <p className={`text-xl font-semibold ${portfolio?.total_profit_percent >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {portfolio?.total_profit_percent >= 0 ? '+' : ''}{portfolio?.total_profit_percent?.toFixed(2) || 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">📊 {t('portfolio.myPositions')} ({portfolio?.holdings_count || 0})</h3>
          <button onClick={handleReset} className="text-sm text-gray-400 hover:text-red-400">
            🔄 {t('portfolio.resetPortfolio')}
          </button>
        </div>
        
        {portfolio?.holdings?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 text-sm border-b border-gray-700">
                  <th className="text-left py-3">{t('portfolio.market')}</th>
                  <th className="text-right py-3">{t('portfolio.quantity')}</th>
                  <th className="text-right py-3">{t('portfolio.avgPrice')}</th>
                  <th className="text-right py-3">{t('portfolio.currentPrice')}</th>
                  <th className="text-right py-3">{t('portfolio.value')}</th>
                  <th className="text-right py-3">{t('portfolio.profitLoss')}</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((holding, i) => (
                  <tr key={i} className="border-b border-gray-700/50">
                    <td className="py-4">
                      <div className="font-medium text-white">{holding.market_id?.toUpperCase()}</div>
                      <div className="text-sm text-gray-400">{holding.market_info?.name}</div>
                    </td>
                    <td className="text-right text-white">{holding.quantity?.toFixed(2)}</td>
                    <td className="text-right text-gray-300">{holding.average_price?.toFixed(2)}</td>
                    <td className="text-right text-white">{holding.current_price?.toFixed(2)}</td>
                    <td className="text-right text-white font-medium">{formatCurrency(holding.market_value)}</td>
                    <td className={`text-right font-medium ${holding.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {holding.profit >= 0 ? '+' : ''}{formatCurrency(holding.profit)}
                      <div className="text-xs">({holding.profit_percent >= 0 ? '+' : ''}{holding.profit_percent?.toFixed(2)}%)</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>{t('messages.noPosition')}</p>
          </div>
        )}
      </div>

      {/* Transactions récentes */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📜 {t('portfolio.recentTransactions')}</h3>
        
        {transactions.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transactions.slice(0, 10).map((tx, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${tx.type === 'BUY' ? '📈' : '📉'}`}></span>
                  <div>
                    <div className="text-white font-medium">
                      {tx.type === 'BUY' ? t('portfolio.buyAction') : t('portfolio.sellAction')} {tx.market_id?.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-400">{formatDate(tx.executed_at)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${tx.type === 'BUY' ? 'text-red-400' : 'text-green-400'}`}>
                    {tx.type === 'BUY' ? '-' : '+'}{formatCurrency(tx.total)}
                  </div>
                  <div className="text-sm text-gray-400">{tx.quantity} @ {tx.price?.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>{t('messages.noTransaction')}</p>
          </div>
        )}
      </div>

      {/* Modal de trading */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                {tradeType === 'BUY' ? '📈 ' + t('portfolio.buy') : '📉 ' + t('portfolio.sell')}
              </h3>
              <button onClick={() => setShowTradeModal(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">{t('portfolio.market')}</label>
                <select
                  value={selectedMarket}
                  onChange={(e) => setSelectedMarket(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600"
                >
                  <option value="">{t('portfolio.selectMarket')}</option>
                  {Object.entries(prices).map(([id, info]) => (
                    <option key={id} value={id}>
                      {id.toUpperCase()} - {info.name} ({info.current?.toFixed(2)} {info.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">{t('portfolio.quantity')}</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600"
                />
              </div>
              
              {selectedMarket && quantity && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex justify-between text-gray-400">
                    <span>{t('portfolio.unitPrice')}:</span>
                    <span className="text-white">{prices[selectedMarket]?.current?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 mt-2">
                    <span>{t('portfolio.estimatedTotal')}:</span>
                    <span className="text-white font-bold">
                      {formatCurrency((prices[selectedMarket]?.current || 0) * parseFloat(quantity || 0))}
                    </span>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleTrade}
                disabled={!selectedMarket || !quantity}
                className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
                  tradeType === 'BUY'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {tradeType === 'BUY' ? t('portfolio.confirmBuy') : t('portfolio.confirmSell')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioTab;
