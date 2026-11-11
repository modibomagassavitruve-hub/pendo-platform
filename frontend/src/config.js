/**
 * Configuration centralisée de PENDO
 * Utilise les variables d'environnement pour la configuration
 */

// Détecter si on est en développement local uniquement
const isDev = window.location.hostname === 'localhost' ||
              window.location.hostname.startsWith('192.168') ||
              window.location.hostname.startsWith('127.0.0.1');

// URL de l'API backend - Utilise la variable d'environnement ou Vercel en production
const API_BASE_URL = isDev
  ? 'http://localhost:3001'
  : (process.env.REACT_APP_API_URL || 'https://pendo-backend.vercel.app');

export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;

// Supabase public (read-only anon key — safe for frontend bundles)
export const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://wocokkiumjyjiaahdkph.supabase.co';
export const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvY29ra2l1bWp5amlhYWhka3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NDc4MTIsImV4cCI6MjA4NDUyMzgxMn0.oTqIl3TVEYmaxQ76yiihS9ZlLpsDNbmkA6gJ7s_Y5P4';

// Configuration de l'application
export const APP_CONFIG = {
  name: process.env.REACT_APP_NAME || 'PENDO',
  version: process.env.REACT_APP_VERSION || '1.0.0',
  env: process.env.REACT_APP_ENV || (isDev ? 'development' : 'production'),
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  enablePWA: process.env.REACT_APP_ENABLE_PWA === 'true',
};

// Helper pour savoir si on est en production
export const isProduction = () => APP_CONFIG.env === 'production';
export const isDevelopment = () => isDev;

export default {
  API_URL,
  SOCKET_URL,
  ...APP_CONFIG,
};
