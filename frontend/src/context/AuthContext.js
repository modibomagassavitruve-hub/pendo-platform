import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_URL as BASE_API_URL } from '../config';
import logger from '../utils/logger';

const AuthContext = createContext(null);
const AUTH_URL = `${BASE_API_URL}/auth`;

// ── Token expiry check (decode JWT payload without library) ────────────
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('pendo_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger le profil utilisateur au démarrage (with token expiry check)
  useEffect(() => {
    const savedToken = localStorage.getItem('pendo_token');
    if (savedToken && !isTokenExpired(savedToken)) {
      loadUserProfile();
    } else if (savedToken) {
      // Token expired — clean up silently
      localStorage.removeItem('pendo_token');
      setToken(null);
      setLoading(false);
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line
  }, []);

  // Charger le profil
  const loadUserProfile = async () => {
    const savedToken = localStorage.getItem('pendo_token');
    if (!savedToken) { setLoading(false); return; }
    try {
      const response = await fetch(`${AUTH_URL}/me`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.data);
      } else {
        logout();
      }
    } catch (err) {
      logger.error('Erreur chargement profil:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Inscription
  const register = async (userData) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${AUTH_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await response.json();
      if (data.success) {
        return { success: true, data: data.data };
      } else {
        setError(data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      const errorMsg = "Erreur lors de l'inscription";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Connexion
  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data.success) {
        const { token: newToken, user: userData } = data.data;
        localStorage.setItem('pendo_token', newToken);
        setToken(newToken);
        setUser(userData);
        return { success: true };
      } else {
        setError(data.error);
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMsg = 'Erreur lors de la connexion';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  // Déconnexion
  const logout = async () => {
    try {
      const savedToken = localStorage.getItem('pendo_token');
      if (savedToken) {
        await fetch(`${AUTH_URL}/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
      }
    } catch (err) {
      logger.error('Erreur déconnexion:', err);
    } finally {
      localStorage.removeItem('pendo_token');
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  // Mettre à jour le profil
  const updateProfile = async (updates) => {
    setError(null);
    try {
      const savedToken = localStorage.getItem('pendo_token');
      const response = await fetch(`${AUTH_URL}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${savedToken}` },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (data.success) { setUser(data.data); return { success: true }; }
      else { setError(data.error); return { success: false, error: data.error }; }
    } catch (error) {
      const errorMsg = 'Erreur lors de la mise à jour du profil';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Changer le mot de passe
  const changePassword = async (currentPassword, newPassword) => {
    setError(null);
    try {
      const savedToken = localStorage.getItem('pendo_token');
      const response = await fetch(`${AUTH_URL}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${savedToken}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();
      if (data.success) return { success: true };
      else { setError(data.error); return { success: false, error: data.error }; }
    } catch (error) {
      const errorMsg = 'Erreur lors du changement de mot de passe';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Mettre à jour les préférences
  const updatePreferences = async (preferences) => {
    setError(null);
    try {
      const savedToken = localStorage.getItem('pendo_token');
      const response = await fetch(`${AUTH_URL}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${savedToken}` },
        body: JSON.stringify(preferences)
      });
      const data = await response.json();
      if (data.success) { await loadUserProfile(); return { success: true }; }
      else { setError(data.error); return { success: false, error: data.error }; }
    } catch (error) {
      const errorMsg = 'Erreur lors de la mise à jour des préférences';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    updatePreferences,
    clearError: () => setError(null)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
