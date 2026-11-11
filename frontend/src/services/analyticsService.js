/**
 * Service d'analytics pour la phase bêta
 * Collecte les événements d'utilisation de l'application
 */

import { API_URL } from '../config';
import logger from '../utils/logger';

class AnalyticsService {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.startTime = Date.now();
    this.pageViews = 0;
    this.actions = 0;
    this._started = false;

    // Différer le démarrage après le rendu initial
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => this._init());
    } else {
      setTimeout(() => this._init(), 3000);
    }
  }

  _init() {
    if (this._started) return;
    this._started = true;
    this.startSession();
    window.addEventListener('beforeunload', () => this.endSession());
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getUserId() {
    // Récupérer l'ID utilisateur depuis le localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || null;
  }

  getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';

    if (/mobile/i.test(ua)) deviceType = 'mobile';
    else if (/tablet/i.test(ua)) deviceType = 'tablet';

    return {
      deviceType,
      browser: this.getBrowser(),
      os: this.getOS(),
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language
    };
  }

  getBrowser() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('SamsungBrowser') > -1) return 'Samsung Internet';
    if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
    if (ua.indexOf('Trident') > -1) return 'IE';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    return 'Unknown';
  }

  getOS() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Win') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'MacOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('like Mac') > -1) return 'iOS';
    return 'Unknown';
  }

  async startSession() {
    try {
      const deviceInfo = this.getDeviceInfo();
      await fetch(`${API_URL}/analytics/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          sessionId: this.sessionId,
          deviceInfo
        }),
      });
    } catch (error) {
      logger.error('Erreur démarrage session analytics:', error);
    }
  }

  async endSession() {
    try {
      await fetch(`${API_URL}/analytics/session/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          pagesVisited: this.pageViews,
          actionsCount: this.actions
        }),
      });
    } catch (error) {
      logger.error('Erreur fin session analytics:', error);
    }
  }

  async trackEvent(eventType, eventName, additionalData = {}) {
    this.actions++;

    try {
      const deviceInfo = this.getDeviceInfo();

      await fetch(`${API_URL}/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          sessionId: this.sessionId,
          eventType,
          eventName,
          pageUrl: window.location.href,
          component: additionalData.component,
          actionData: additionalData,
          deviceType: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os
        }),
      });
    } catch (error) {
      logger.error('Erreur tracking event:', error);
    }
  }

  trackPageView(pageName) {
    this.pageViews++;
    this.trackEvent('page_view', pageName, {
      component: pageName,
      referrer: document.referrer
    });
  }

  trackClick(element, label) {
    this.trackEvent('click', label, {
      component: element,
      label
    });
  }

  trackFeature(featureName, featureCategory = 'general') {
    if (!this.userId) return; // Besoin d'être connecté

    fetch(`${API_URL}/analytics/feature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: this.userId,
        featureName,
        featureCategory
      }),
    }).catch(error => {
      logger.error('Erreur tracking feature:', error);
    });
  }

  trackSearch(query, resultsCount) {
    this.trackEvent('search', 'search_performed', {
      component: 'search',
      query,
      resultsCount
    });
  }

  trackTransaction(type, symbol, amount) {
    this.trackEvent('transaction', type, {
      component: 'portfolio',
      symbol,
      amount,
      transactionType: type
    });
  }

  trackError(errorMessage, errorStack) {
    this.trackEvent('error', 'application_error', {
      component: 'error_boundary',
      errorMessage,
      errorStack
    });
  }

  // Helpers pour les features courantes
  trackPortfolioView() {
    this.trackPageView('portfolio');
    this.trackFeature('portfolio_view', 'portfolio');
  }

  trackStockView(symbol) {
    this.trackPageView(`stock_${symbol}`);
    this.trackFeature('stock_view', 'stocks');
  }

  trackMarketView(market) {
    this.trackPageView(`market_${market}`);
    this.trackFeature('market_view', 'markets');
  }

  trackOpportunityView(opportunityId) {
    this.trackPageView(`opportunity_${opportunityId}`);
    this.trackFeature('opportunity_view', 'opportunities');
  }
}

// Créer une instance singleton
const analyticsService = new AnalyticsService();

export default analyticsService;
