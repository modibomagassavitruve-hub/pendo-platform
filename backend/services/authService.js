/**
 * Service d'authentification PENDO
 * Gestion complète de l'authentification utilisateur
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Fonction pour générer un secret sécurisé
const getSecureJwtSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: JWT_SECRET must be set in production environment!');
  }
  console.warn('WARNING: JWT_SECRET not set. Using auto-generated secret (not suitable for production).');
  return crypto.randomBytes(64).toString('hex');
};

class AuthService {
  constructor(db) {
    this.db = db;
    this.JWT_SECRET = getSecureJwtSecret();
    this.JWT_EXPIRES_IN = '7d';
    this.REFRESH_TOKEN_EXPIRES_IN = '30d';
    this.MAX_LOGIN_ATTEMPTS = 5;
    this.LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(userData) {
    const { email, password, first_name, last_name, phone, country } = userData;

    // Vérifier si l'email existe déjà
    const existingUser = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      throw new Error('Un compte existe déjà avec cet email');
    }

    // Valider le mot de passe
    if (password.length < 8) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères');
    }

    // Hasher le mot de passe
    const password_hash = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const result = this.db.prepare(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, country)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email, password_hash, first_name, last_name, phone || null, country || null);

    const userId = result.lastInsertRowid;

    // Créer les préférences par défaut
    this.db.prepare(`
      INSERT INTO user_preferences (user_id) VALUES (?)
    `).run(userId);

    // Générer token de vérification email
    const verificationToken = this.generateVerificationToken(userId, 'email_verification');

    // Log de l'activité
    this.logActivity(userId, 'register', 'Création du compte');

    return {
      userId,
      email,
      verificationToken,
      message: 'Compte créé avec succès'
    };
  }

  /**
   * Connexion utilisateur
   */
  async login(email, password, ipAddress, userAgent) {
    // Vérifier les tentatives de connexion
    if (this.isAccountLocked(email, ipAddress)) {
      throw new Error('Trop de tentatives de connexion. Compte temporairement verrouillé.');
    }

    // Récupérer l'utilisateur
    const user = this.db.prepare(`
      SELECT id, email, password_hash, first_name, last_name, is_active, is_verified, role
      FROM users WHERE email = ?
    `).get(email);

    if (!user) {
      this.logLoginAttempt(email, ipAddress, false);
      throw new Error('Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      this.logLoginAttempt(email, ipAddress, false);
      throw new Error('Email ou mot de passe incorrect');
    }

    // Vérifier si le compte est actif
    if (!user.is_active) {
      throw new Error('Compte désactivé. Contactez le support.');
    }

    // Log tentative réussie
    this.logLoginAttempt(email, ipAddress, true);

    // Générer les tokens
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken();

    // Créer la session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
    this.db.prepare(`
      INSERT INTO user_sessions (user_id, token, refresh_token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, token, refreshToken, ipAddress, userAgent, expiresAt.toISOString());

    // Mettre à jour last_login
    this.db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // Log de l'activité
    this.logActivity(user.id, 'login', 'Connexion réussie');

    // Retourner les données utilisateur (sans password_hash)
    delete user.password_hash;

    return {
      user,
      token,
      refreshToken,
      expiresIn: this.JWT_EXPIRES_IN
    };
  }

  /**
   * Déconnexion
   */
  logout(token) {
    const session = this.db.prepare('SELECT id, user_id FROM user_sessions WHERE token = ?').get(token);

    if (session) {
      this.db.prepare('UPDATE user_sessions SET is_active = 0 WHERE token = ?').run(token);
      this.logActivity(session.user_id, 'logout', 'Déconnexion');
    }

    return { success: true, message: 'Déconnexion réussie' };
  }

  /**
   * Vérifier un token JWT
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);

      // Vérifier que la session existe et est active
      const session = this.db.prepare(`
        SELECT s.*, u.is_active, u.email, u.role
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.is_active = 1 AND s.expires_at > datetime('now')
      `).get(token);

      if (!session || !session.is_active) {
        throw new Error('Session invalide ou expirée');
      }

      // Mettre à jour last_activity
      this.db.prepare('UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = ?').run(token);

      return {
        valid: true,
        user: {
          id: decoded.userId,
          email: session.email,
          role: session.role
        }
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Rafraîchir le token
   */
  async refreshAccessToken(refreshToken) {
    const session = this.db.prepare(`
      SELECT s.*, u.email, u.first_name, u.last_name, u.role
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.refresh_token = ? AND s.is_active = 1 AND s.expires_at > datetime('now')
    `).get(refreshToken);

    if (!session) {
      throw new Error('Refresh token invalide ou expiré');
    }

    // Générer nouveau access token
    const user = {
      id: session.user_id,
      email: session.email,
      first_name: session.first_name,
      last_name: session.last_name,
      role: session.role
    };

    const newToken = this.generateToken(user);

    // Mettre à jour la session
    this.db.prepare('UPDATE user_sessions SET token = ?, last_activity = CURRENT_TIMESTAMP WHERE refresh_token = ?')
      .run(newToken, refreshToken);

    return {
      token: newToken,
      expiresIn: this.JWT_EXPIRES_IN
    };
  }

  /**
   * Récupérer le profil utilisateur
   */
  getUserProfile(userId) {
    const user = this.db.prepare(`
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.phone, u.country,
        u.profile_image, u.is_verified, u.role, u.created_at, u.last_login,
        p.language, p.currency, p.timezone, p.theme,
        p.notifications_email, p.notifications_push, p.notifications_sms
      FROM users u
      LEFT JOIN user_preferences p ON u.id = p.user_id
      WHERE u.id = ?
    `).get(userId);

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    return user;
  }

  /**
   * Mettre à jour le profil
   */
  updateProfile(userId, updates) {
    const allowedFields = ['first_name', 'last_name', 'phone', 'country', 'profile_image'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('Aucun champ valide à mettre à jour');
    }

    values.push(userId);

    this.db.prepare(`
      UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(...values);

    this.logActivity(userId, 'profile_update', 'Mise à jour du profil');

    return this.getUserProfile(userId);
  }

  /**
   * Changer le mot de passe
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = this.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Vérifier le mot de passe actuel
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Mot de passe actuel incorrect');
    }

    // Valider le nouveau mot de passe
    if (newPassword.length < 8) {
      throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères');
    }

    // Hasher et sauvegarder
    const password_hash = await bcrypt.hash(newPassword, 12);
    this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, userId);

    // Invalider toutes les sessions sauf celle en cours
    this.logActivity(userId, 'password_change', 'Changement de mot de passe');

    return { success: true, message: 'Mot de passe changé avec succès' };
  }

  /**
   * Mettre à jour les préférences
   */
  updatePreferences(userId, preferences) {
    const allowedFields = [
      'language', 'currency', 'timezone', 'theme',
      'notifications_email', 'notifications_push', 'notifications_sms', 'newsletter'
    ];

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(preferences)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      throw new Error('Aucune préférence valide à mettre à jour');
    }

    values.push(userId);

    this.db.prepare(`
      UPDATE user_preferences SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?
    `).run(...values);

    return { success: true, message: 'Préférences mises à jour' };
  }

  /**
   * Générer un token JWT
   */
  generateToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  /**
   * Générer un refresh token
   */
  generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Générer un token de vérification
   */
  generateVerificationToken(userId, type) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    this.db.prepare(`
      INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(userId, token, type, expiresAt.toISOString());

    return token;
  }

  /**
   * Vérifier si un compte est verrouillé
   */
  isAccountLocked(email, ipAddress) {
    const since = new Date(Date.now() - this.LOCKOUT_DURATION).toISOString();

    const attempts = this.db.prepare(`
      SELECT COUNT(*) as count FROM login_attempts
      WHERE (email = ? OR ip_address = ?)
      AND success = 0
      AND attempted_at > ?
    `).get(email, ipAddress, since);

    return attempts.count >= this.MAX_LOGIN_ATTEMPTS;
  }

  /**
   * Logger une tentative de connexion
   */
  logLoginAttempt(email, ipAddress, success) {
    this.db.prepare(`
      INSERT INTO login_attempts (email, ip_address, success)
      VALUES (?, ?, ?)
    `).run(email, ipAddress, success ? 1 : 0);

    // Nettoyer les vieilles tentatives (> 24h)
    this.db.prepare(`
      DELETE FROM login_attempts
      WHERE attempted_at < datetime('now', '-24 hours')
    `).run();
  }

  /**
   * Logger l'activité utilisateur
   */
  logActivity(userId, action, details = null, ipAddress = null, userAgent = null) {
    this.db.prepare(`
      INSERT INTO user_activity_log (user_id, action, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, action, details, ipAddress, userAgent);
  }

  /**
   * Obtenir l'historique d'activité
   */
  getActivityLog(userId, limit = 50) {
    return this.db.prepare(`
      SELECT action, details, ip_address, created_at
      FROM user_activity_log
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);
  }
}

module.exports = AuthService;
