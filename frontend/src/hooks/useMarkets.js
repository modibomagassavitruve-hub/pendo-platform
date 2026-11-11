import { useState, useEffect, useRef } from 'react';
import { FALLBACK_MARKETS } from '../data/fallbackData';
import { API_URL } from '../config';
import logger from '../utils/logger';

// API_URL déjà inclut /api, donc on l'utilise directement
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

export const useMarkets = () => {
  const [markets, setMarkets] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState({ connected: false, message: '' });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [apiUrl, setApiUrl] = useState(API_URL);
  const intervalRef = useRef(null);

  const checkApiStatus = async () => {
    // Léger — un seul appel rapide, pas de retry
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${API_URL}/status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setApiStatus({ connected: true, message: 'Backend connecté', data: result.data });
          return;
        }
      }
      setApiStatus({ connected: false, message: 'Backend inaccessible' });
    } catch {
      setApiStatus({ connected: false, message: 'Backend offline - Mode démo' });
      loadFallbackData();
    }
  };

  const loadMarkets = async (retries = 1) => {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(`${API_URL}/markets`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setMarkets(result.data.markets);
            setLastUpdate(new Date(result.data.lastUpdate));
            setApiStatus({ connected: true, message: 'Données chargées' });
            return;
          }
        }
        if (attempt > retries) loadFallbackData();
      } catch (error) {
        logger.error(`Markets load attempt ${attempt} failed:`, error.message);
        if (attempt > retries) {
          setApiStatus({ connected: false, message: 'Backend offline - Mode démo' });
          loadFallbackData();
        } else {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
  };

  const loadFallbackData = () => {
    setMarkets(FALLBACK_MARKETS);
    setLastUpdate(new Date());
  };

  const refreshMarkets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        setMarkets(result.data.markets);
        setLastUpdate(new Date(result.data.lastUpdate));
        setApiStatus({ connected: true, message: 'Collecte réussie !' });
      } else {
        setApiStatus({ connected: false, message: 'Erreur de collecte' });
      }
    } catch (error) {
      setApiStatus({ connected: false, message: 'Backend inaccessible' });
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && apiStatus.connected) {
      intervalRef.current = setInterval(() => {
        loadMarkets();
      }, AUTO_REFRESH_INTERVAL);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, apiStatus.connected]);

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  return {
    markets,
    lastUpdate,
    loading,
    apiStatus,
    apiUrl,
    setApiUrl,
    checkApiStatus,
    loadMarkets,
    refreshMarkets,
    loadFallbackData,
    autoRefresh,
    toggleAutoRefresh
  };
};
