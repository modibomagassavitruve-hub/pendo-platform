/**
 * PENDO - Routes API KYC/AML
 * Système de vérification Know Your Customer / Anti-Money Laundering
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration multer pour upload de documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/kyc');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Seuls les fichiers JPEG, PNG et PDF sont acceptés'));
  }
});

function createKycRouter(db, requireAuth, kycAmlService) {
  /**
   * POST /api/kyc/profile/create
   * Créer un profil KYC pour un utilisateur
   */
  router.post('/profile/create', requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const personalInfo = req.body;

      // Vérifier que l'utilisateur n'a pas déjà un profil KYC
      const existingProfile = db.prepare(`
        SELECT id FROM kyc_profiles WHERE user_id = ?
      `).get(userId);

      if (existingProfile) {
        return res.status(400).json({
          success: false,
          error: 'Un profil KYC existe déjà pour cet utilisateur'
        });
      }

      const result = kycAmlService.createKycProfile(userId, personalInfo);

      res.json({
        success: true,
        message: 'Profil KYC créé avec succès',
        profile: result
      });
    } catch (error) {
      console.error('Erreur création profil KYC:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/kyc/document/upload
   * Upload d'un document d'identité (ID, Passeport, Permis)
   */
  router.post('/document/upload', requireAuth, upload.single('document'), async (req, res) => {
    try {
      const userId = req.user.userId;
      const { documentType, documentNumber, expiryDate } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Aucun document fourni'
        });
      }

      if (!documentType || !documentNumber) {
        return res.status(400).json({
          success: false,
          error: 'Type de document et numéro requis'
        });
      }

      const documentData = {
        documentType,
        documentNumber,
        expiryDate,
        documentPath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      };

      const result = await kycAmlService.uploadIdentityDocument(userId, documentData);

      res.json({
        success: true,
        message: 'Document uploadé et vérifié avec succès',
        document: result
      });
    } catch (error) {
      console.error('Erreur upload document:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/kyc/selfie/verify
   * Vérifier selfie contre document d'identité
   */
  router.post('/selfie/verify', requireAuth, upload.single('selfie'), async (req, res) => {
    try {
      const userId = req.user.userId;
      const { documentId } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Aucun selfie fourni'
        });
      }

      if (!documentId) {
        return res.status(400).json({
          success: false,
          error: 'ID du document requis'
        });
      }

      const result = await kycAmlService.verifySelfie(
        userId,
        parseInt(documentId),
        req.file.path
      );

      res.json({
        success: true,
        message: result.passed ? 'Selfie vérifié avec succès' : 'Vérification selfie échouée',
        verification: result
      });
    } catch (error) {
      console.error('Erreur vérification selfie:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/kyc/sanctions/screen
   * Screening sanctions (OFAC, UN, EU, CENTIF)
   */
  router.post('/sanctions/screen', requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;

      const result = await kycAmlService.screenSanctions(userId);

      if (result.matchesFound.length > 0) {
        // Alerte compliance si des matches sont trouvés
        console.warn(`⚠️ SANCTIONS MATCH TROUVÉ - User ${userId}:`, result.matchesFound);
      }

      res.json({
        success: true,
        message: result.matchesFound.length > 0
          ? 'Correspondances sanctions détectées - Revue compliance requise'
          : 'Aucune correspondance sanctions',
        screening: result
      });
    } catch (error) {
      console.error('Erreur sanctions screening:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/kyc/pep/screen
   * Screening PEP (Politically Exposed Persons)
   */
  router.post('/pep/screen', requireAuth, async (req, res) => {
    try {
      const userId = req.user.userId;

      const result = await kycAmlService.screenPEP(userId);

      if (result.isPEP) {
        console.warn(`⚠️ PEP DÉTECTÉ - User ${userId}:`, result.pepDetails);
      }

      res.json({
        success: true,
        message: result.isPEP
          ? 'Utilisateur identifié comme PEP - Enhanced Due Diligence requise'
          : 'Utilisateur non-PEP',
        screening: result
      });
    } catch (error) {
      console.error('Erreur PEP screening:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/kyc/source-of-funds
   * Vérifier source des fonds
   */
  router.post('/source-of-funds', requireAuth, upload.array('documents', 5), async (req, res) => {
    try {
      const userId = req.user.userId;
      const { sourceType, description, amount } = req.body;

      if (!sourceType || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Type de source et montant requis'
        });
      }

      const documentsPath = req.files ? req.files.map(f => f.path) : [];

      const result = await kycAmlService.verifySourceOfFunds(
        userId,
        sourceType,
        parseFloat(amount),
        description,
        documentsPath
      );

      res.json({
        success: true,
        message: result.verified
          ? 'Source des fonds vérifiée'
          : 'Source des fonds en attente de vérification',
        verification: result
      });
    } catch (error) {
      console.error('Erreur vérification source fonds:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/kyc/status/:userId
   * Obtenir statut KYC d'un utilisateur
   */
  router.get('/status/:userId', requireAuth, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Vérifier accès: utilisateur lui-même ou admin/compliance
      if (req.user.userId !== userId && req.user.role !== 'admin' && req.user.role !== 'compliance') {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé'
        });
      }

      const profile = db.prepare(`
        SELECT * FROM kyc_profiles WHERE user_id = ?
      `).get(userId);

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Aucun profil KYC trouvé'
        });
      }

      // Compter documents vérifiés
      const documentsCount = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified
        FROM kyc_documents
        WHERE user_id = ?
      `).get(userId);

      // Derniers screenings
      const lastSanctionsScreen = db.prepare(`
        SELECT * FROM sanctions_screening
        WHERE user_id = ?
        ORDER BY screened_at DESC
        LIMIT 1
      `).get(userId);

      const lastPepScreen = db.prepare(`
        SELECT * FROM pep_screening
        WHERE user_id = ?
        ORDER BY screened_at DESC
        LIMIT 1
      `).get(userId);

      res.json({
        success: true,
        kyc: {
          ...profile,
          documents: documentsCount,
          lastSanctionsScreen,
          lastPepScreen
        }
      });
    } catch (error) {
      console.error('Erreur récupération statut KYC:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/kyc/approve
   * Approuver/rejeter KYC (compliance officer uniquement)
   */
  router.post('/approve', requireAuth, (req, res) => {
    try {
      // Vérifier rôle compliance/admin
      if (req.user.role !== 'admin' && req.user.role !== 'compliance') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux compliance officers'
        });
      }

      const { userId, action, kycLevel, notes } = req.body;

      if (!userId || !action || !['approve', 'reject', 'request_more_info'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'userId et action (approve/reject/request_more_info) requis'
        });
      }

      const profile = db.prepare(`
        SELECT * FROM kyc_profiles WHERE user_id = ?
      `).get(userId);

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Profil KYC introuvable'
        });
      }

      // Mise à jour du statut
      const newStatus = action === 'approve' ? 'verified' :
                       action === 'reject' ? 'rejected' : 'pending';

      const newKycLevel = action === 'approve' && kycLevel ? kycLevel : profile.kyc_level;

      db.prepare(`
        UPDATE kyc_profiles
        SET
          kyc_status = ?,
          kyc_level = ?,
          verified_at = CASE WHEN ? = 'verified' THEN datetime('now') ELSE verified_at END,
          updated_at = datetime('now')
        WHERE user_id = ?
      `).run(newStatus, newKycLevel, newStatus, userId);

      // Audit log
      db.prepare(`
        INSERT INTO kyc_audit_log (user_id, action, performed_by, details, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        userId,
        `kyc_${action}`,
        req.user.userId,
        JSON.stringify({ kycLevel: newKycLevel, notes }),
        req.ip
      );

      res.json({
        success: true,
        message: `KYC ${action === 'approve' ? 'approuvé' : action === 'reject' ? 'rejeté' : 'mis en attente'}`,
        kyc: {
          userId,
          status: newStatus,
          kycLevel: newKycLevel
        }
      });
    } catch (error) {
      console.error('Erreur approbation KYC:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/kyc/documents/:userId
   * Obtenir documents KYC d'un utilisateur
   */
  router.get('/documents/:userId', requireAuth, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Vérifier accès
      if (req.user.userId !== userId && req.user.role !== 'admin' && req.user.role !== 'compliance') {
        return res.status(403).json({
          success: false,
          error: 'Accès non autorisé'
        });
      }

      const documents = db.prepare(`
        SELECT
          id,
          document_type,
          document_number,
          verification_status,
          extracted_data,
          confidence_score,
          expiry_date,
          uploaded_at,
          verified_at
        FROM kyc_documents
        WHERE user_id = ?
        ORDER BY uploaded_at DESC
      `).all(userId);

      res.json({
        success: true,
        count: documents.length,
        documents: documents.map(doc => ({
          ...doc,
          extracted_data: doc.extracted_data ? JSON.parse(doc.extracted_data) : null
        }))
      });
    } catch (error) {
      console.error('Erreur récupération documents:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/kyc/pending-reviews
   * Obtenir liste des KYC en attente de revue (compliance officers)
   */
  router.get('/pending-reviews', requireAuth, (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'compliance') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux compliance officers'
        });
      }

      const { riskLevel, limit = 50 } = req.query;

      let query = `
        SELECT
          kp.*,
          u.email,
          u.phone,
          (SELECT COUNT(*) FROM kyc_documents WHERE user_id = kp.user_id AND verification_status = 'verified') as verified_docs,
          (SELECT COUNT(*) FROM kyc_documents WHERE user_id = kp.user_id) as total_docs
        FROM kyc_profiles kp
        JOIN users u ON kp.user_id = u.id
        WHERE kp.kyc_status IN ('pending', 'under_review')
      `;

      const params = [];

      if (riskLevel) {
        query += ` AND kp.risk_level = ?`;
        params.push(riskLevel);
      }

      query += ` ORDER BY kp.risk_score DESC, kp.created_at ASC LIMIT ?`;
      params.push(parseInt(limit));

      const pendingReviews = db.prepare(query).all(...params);

      res.json({
        success: true,
        count: pendingReviews.length,
        pendingReviews
      });
    } catch (error) {
      console.error('Erreur récupération revues en attente:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/kyc/high-risk
   * Obtenir liste des profils à haut risque (compliance officers)
   */
  router.get('/high-risk', requireAuth, (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'compliance') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux compliance officers'
        });
      }

      const { limit = 100 } = req.query;

      const highRiskProfiles = db.prepare(`
        SELECT
          kp.*,
          u.email,
          u.phone,
          ss.matches_found as sanctions_matches,
          ps.is_pep
        FROM kyc_profiles kp
        JOIN users u ON kp.user_id = u.id
        LEFT JOIN (
          SELECT user_id, matches_found
          FROM sanctions_screening
          WHERE id IN (
            SELECT MAX(id) FROM sanctions_screening GROUP BY user_id
          )
        ) ss ON kp.user_id = ss.user_id
        LEFT JOIN (
          SELECT user_id, is_pep
          FROM pep_screening
          WHERE id IN (
            SELECT MAX(id) FROM pep_screening GROUP BY user_id
          )
        ) ps ON kp.user_id = ps.user_id
        WHERE kp.risk_level IN ('high', 'very_high')
           OR ss.matches_found > 0
           OR ps.is_pep = 1
        ORDER BY kp.risk_score DESC
        LIMIT ?
      `).all(parseInt(limit));

      res.json({
        success: true,
        count: highRiskProfiles.length,
        highRiskProfiles
      });
    } catch (error) {
      console.error('Erreur récupération profils haut risque:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/kyc/stats
   * Statistiques KYC globales (admin/compliance)
   */
  router.get('/stats', requireAuth, (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'compliance') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux administrateurs'
        });
      }

      const stats = {
        totalProfiles: db.prepare(`SELECT COUNT(*) as count FROM kyc_profiles`).get().count,
        byStatus: {},
        byLevel: {},
        byRiskLevel: {},
        pendingReviews: db.prepare(`
          SELECT COUNT(*) as count
          FROM kyc_profiles
          WHERE kyc_status IN ('pending', 'under_review')
        `).get().count,
        highRiskCount: db.prepare(`
          SELECT COUNT(*) as count
          FROM kyc_profiles
          WHERE risk_level IN ('high', 'very_high')
        `).get().count,
        pepCount: db.prepare(`
          SELECT COUNT(DISTINCT user_id) as count
          FROM pep_screening
          WHERE is_pep = 1
        `).get().count,
        sanctionsMatches: db.prepare(`
          SELECT COUNT(DISTINCT user_id) as count
          FROM sanctions_screening
          WHERE matches_found > 0
        `).get().count
      };

      // Par statut
      const byStatus = db.prepare(`
        SELECT kyc_status, COUNT(*) as count
        FROM kyc_profiles
        GROUP BY kyc_status
      `).all();
      byStatus.forEach(row => {
        stats.byStatus[row.kyc_status] = row.count;
      });

      // Par niveau KYC
      const byLevel = db.prepare(`
        SELECT kyc_level, COUNT(*) as count
        FROM kyc_profiles
        GROUP BY kyc_level
      `).all();
      byLevel.forEach(row => {
        stats.byLevel[`level_${row.kyc_level}`] = row.count;
      });

      // Par niveau de risque
      const byRiskLevel = db.prepare(`
        SELECT risk_level, COUNT(*) as count
        FROM kyc_profiles
        GROUP BY risk_level
      `).all();
      byRiskLevel.forEach(row => {
        stats.byRiskLevel[row.risk_level] = row.count;
      });

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Erreur récupération stats KYC:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/kyc/info
   * Informations sur le système KYC/AML
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      info: {
        name: 'PENDO KYC/AML System',
        version: '1.0.0',
        description: 'Système de vérification Know Your Customer / Anti-Money Laundering conforme CENTIF',
        kycLevels: {
          0: 'None - Aucune vérification',
          1: 'Basic - Informations de base',
          2: 'Standard - Document d\'identité vérifié',
          3: 'Enhanced - Selfie + screening sanctions/PEP',
          4: 'Full - Source de fonds vérifiée + EDD'
        },
        supportedDocuments: [
          'ID Card (Carte d\'identité)',
          'Passport (Passeport)',
          'Driver License (Permis de conduire)',
          'Residence Permit (Titre de séjour)'
        ],
        screeningLists: [
          'OFAC (US Office of Foreign Assets Control)',
          'UN Security Council Sanctions',
          'EU Sanctions',
          'CENTIF (Cellule Nationale de Traitement des Informations Financières)'
        ],
        riskFactors: [
          'High-risk country',
          'PEP (Politically Exposed Person)',
          'Sanctions match',
          'Large transaction patterns',
          'Unusual source of funds',
          'Cash-intensive business'
        ],
        complianceStandards: [
          'CENTIF (UEMOA)',
          'GAFI/FATF recommendations',
          'CREPMF regulations',
          'Basel AML Index'
        ]
      }
    });
  });

  return router;
}

module.exports = createKycRouter;
