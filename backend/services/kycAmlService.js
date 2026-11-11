/**
 * PENDO - Service KYC/AML (Know Your Customer / Anti-Money Laundering)
 *
 * Conformité réglementaire:
 * - CREPMF (UEMOA)
 * - CENTIF (Cellule Nationale de Traitement des Informations Financières)
 * - FATF/GAFI (Financial Action Task Force)
 * - Directive AML EU (si applicable)
 *
 * Fonctionnalités:
 * 1. Vérification documents d'identité (ID, Passeport, Permis)
 * 2. Proof of Address (facture, bail, attestation)
 * 3. Selfie matching (Face vs ID photo)
 * 4. Liveness detection (anti-spoofing)
 * 5. Sanctions screening (OFAC, UN, EU, CENTIF)
 * 6. PEP check (Politically Exposed Persons)
 * 7. Source of funds verification
 * 8. Ongoing monitoring (re-KYC périodique)
 * 9. Enhanced Due Diligence (EDD) for high-risk
 * 10. AML transaction monitoring
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

class KycAmlService {
  constructor() {
    const dbPath = path.join(__dirname, '../data/pendo.db');
    this.db = new Database(dbPath);
    this.initializeTables();

    // Niveaux KYC
    this.KYC_LEVELS = {
      NONE: 0,           // Pas de KYC
      BASIC: 1,          // Email + téléphone vérifiés
      STANDARD: 2,       // + Document ID vérifié
      ENHANCED: 3,       // + Proof of address + Selfie
      FULL: 4            // + Source of funds + EDD si nécessaire
    };

    // Statuts vérification
    this.VERIFICATION_STATUS = {
      PENDING: 'pending',
      IN_REVIEW: 'in_review',
      APPROVED: 'approved',
      REJECTED: 'rejected',
      EXPIRED: 'expired'
    };

    // Types de documents
    this.DOCUMENT_TYPES = {
      NATIONAL_ID: 'national_id',        // Carte d'identité nationale
      PASSPORT: 'passport',              // Passeport
      DRIVERS_LICENSE: 'drivers_license', // Permis de conduire
      RESIDENCE_PERMIT: 'residence_permit', // Titre de séjour
      UTILITY_BILL: 'utility_bill',      // Facture (eau, électricité)
      BANK_STATEMENT: 'bank_statement',  // Relevé bancaire
      LEASE_AGREEMENT: 'lease_agreement', // Bail
      SELFIE: 'selfie'                   // Photo selfie
    };

    // Listes de sanctions (simulées - en prod, APIs externes)
    this.SANCTIONS_LISTS = {
      OFAC: 'ofac',      // US Treasury
      UN: 'un',          // Nations Unies
      EU: 'eu',          // Union Européenne
      CENTIF: 'centif'   // Afrique de l'Ouest
    };

    // Pays à haut risque AML (FATF Grey/Black list)
    this.HIGH_RISK_COUNTRIES = [
      'AF', 'IR', 'KP', 'SY', 'YE', // Blacklist exemples
      'MM', 'PK', 'ZW' // Greylist exemples (à vérifier régulièrement)
    ];
  }

  initializeTables() {
    // Table des profils KYC utilisateurs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kyc_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,

        -- Niveau KYC
        kyc_level INTEGER DEFAULT 0, -- 0-4
        kyc_status TEXT DEFAULT 'pending', -- pending, approved, rejected

        -- Informations personnelles
        first_name TEXT,
        last_name TEXT,
        date_of_birth DATE,
        nationality TEXT, -- Code pays ISO
        country_of_residence TEXT,
        city TEXT,
        address TEXT,
        postal_code TEXT,

        -- Contact
        phone_verified BOOLEAN DEFAULT 0,
        email_verified BOOLEAN DEFAULT 0,

        -- Vérifications
        identity_verified BOOLEAN DEFAULT 0,
        address_verified BOOLEAN DEFAULT 0,
        selfie_verified BOOLEAN DEFAULT 0,
        liveness_verified BOOLEAN DEFAULT 0,

        -- Sanctions & PEP
        sanctions_checked BOOLEAN DEFAULT 0,
        sanctions_match BOOLEAN DEFAULT 0,
        sanctions_details TEXT, -- JSON
        pep_checked BOOLEAN DEFAULT 0,
        is_pep BOOLEAN DEFAULT 0,
        pep_details TEXT, -- JSON

        -- Source of funds
        source_of_funds TEXT,
        occupation TEXT,
        employer TEXT,
        annual_income_range TEXT,
        wealth_source TEXT,

        -- Risk scoring
        risk_score INTEGER DEFAULT 50, -- 0-100
        risk_level TEXT DEFAULT 'medium', -- low, medium, high, very_high

        -- Enhanced Due Diligence
        requires_edd BOOLEAN DEFAULT 0,
        edd_completed BOOLEAN DEFAULT 0,
        edd_notes TEXT,

        -- Dates
        kyc_started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        kyc_approved_at DATETIME,
        kyc_rejected_at DATETIME,
        last_review_date DATETIME,
        next_review_date DATETIME, -- Re-KYC périodique

        -- Metadata
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Table des documents KYC uploadés
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kyc_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        kyc_profile_id INTEGER NOT NULL,

        -- Document
        document_type TEXT NOT NULL, -- national_id, passport, etc.
        document_number TEXT,
        document_country TEXT, -- Pays émetteur
        issue_date DATE,
        expiry_date DATE,

        -- Fichiers
        front_image_path TEXT, -- Photo recto
        back_image_path TEXT,  -- Photo verso
        selfie_image_path TEXT, -- Selfie

        -- Extraction données (OCR)
        extracted_data TEXT, -- JSON avec données extraites
        ocr_confidence REAL, -- Confiance OCR 0-1

        -- Vérification
        verification_status TEXT DEFAULT 'pending',
        verified_at DATETIME,
        verified_by INTEGER, -- User ID du vérificateur
        rejection_reason TEXT,

        -- Face matching
        face_match_score REAL, -- Score 0-1 (selfie vs ID photo)
        face_match_threshold REAL DEFAULT 0.85,

        -- Liveness detection
        liveness_score REAL,
        liveness_passed BOOLEAN DEFAULT 0,

        -- Metadata
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,

        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (kyc_profile_id) REFERENCES kyc_profiles(id)
      )
    `);

    // Table screening sanctions
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sanctions_screening (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        kyc_profile_id INTEGER NOT NULL,

        -- Recherche
        search_query TEXT, -- Nom recherché
        search_date DATETIME DEFAULT CURRENT_TIMESTAMP,

        -- Listes consultées
        lists_checked TEXT, -- JSON array: [OFAC, UN, EU, CENTIF]

        -- Résultats
        matches_found BOOLEAN DEFAULT 0,
        match_count INTEGER DEFAULT 0,
        matches_details TEXT, -- JSON array de matches

        -- Action
        false_positive BOOLEAN DEFAULT 0,
        cleared_by INTEGER, -- User ID du compliance officer
        cleared_at DATETIME,
        notes TEXT,

        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (kyc_profile_id) REFERENCES kyc_profiles(id)
      )
    `);

    // Table PEP (Politically Exposed Persons)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pep_screening (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        kyc_profile_id INTEGER NOT NULL,

        -- Recherche
        search_date DATETIME DEFAULT CURRENT_TIMESTAMP,

        -- Résultats
        is_pep BOOLEAN DEFAULT 0,
        pep_type TEXT, -- domestic, foreign, international_organization
        pep_position TEXT, -- Position politique
        pep_country TEXT,
        pep_since_date DATE,

        -- Relatives & Associates (RCA)
        is_rca BOOLEAN DEFAULT 0,
        rca_relation TEXT, -- Relation avec PEP

        -- Risk
        pep_risk_level TEXT DEFAULT 'high', -- high, very_high

        -- Enhanced Due Diligence
        edd_required BOOLEAN DEFAULT 1,
        edd_completed BOOLEAN DEFAULT 0,

        -- Action
        approval_required BOOLEAN DEFAULT 1,
        approved_by INTEGER,
        approved_at DATETIME,

        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (kyc_profile_id) REFERENCES kyc_profiles(id)
      )
    `);

    // Table des changements KYC (audit trail)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kyc_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        kyc_profile_id INTEGER,

        -- Changement
        action_type TEXT NOT NULL, -- document_upload, verification, status_change, etc.
        old_value TEXT,
        new_value TEXT,
        description TEXT,

        -- Metadata
        performed_by INTEGER, -- User ID (système ou compliance officer)
        ip_address TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('✅ Tables KYC/AML initialisées');
  }

  /**
   * 1. CRÉER PROFIL KYC
   */
  createKycProfile(userId, personalInfo) {
    const {
      firstName,
      lastName,
      dateOfBirth,
      nationality,
      countryOfResidence,
      city,
      address,
      postalCode,
      phoneNumber,
      email
    } = personalInfo;

    // Calculer risk score initial
    const initialRiskScore = this.calculateInitialRiskScore({
      nationality,
      countryOfResidence
    });

    const stmt = this.db.prepare(`
      INSERT INTO kyc_profiles (
        user_id, first_name, last_name, date_of_birth,
        nationality, country_of_residence, city, address, postal_code,
        kyc_level, risk_score, risk_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const riskLevel = this.getRiskLevelFromScore(initialRiskScore);

    const result = stmt.run(
      userId,
      firstName,
      lastName,
      dateOfBirth,
      nationality,
      countryOfResidence,
      city,
      address,
      postalCode,
      initialRiskScore,
      riskLevel
    );

    // Audit log
    this.logKycAction(userId, result.lastInsertRowid, 'profile_created', null, 'KYC profile created');

    return {
      kycProfileId: result.lastInsertRowid,
      kycLevel: 1,
      riskScore: initialRiskScore,
      riskLevel
    };
  }

  /**
   * 2. UPLOADER DOCUMENT D'IDENTITÉ
   */
  async uploadIdentityDocument(userId, documentData) {
    const {
      documentType,
      documentNumber,
      documentCountry,
      issueDate,
      expiryDate,
      frontImagePath,
      backImagePath,
      ipAddress
    } = documentData;

    const kycProfile = this.db.prepare('SELECT * FROM kyc_profiles WHERE user_id = ?').get(userId);
    if (!kycProfile) {
      throw new Error('KYC profile not found. Create profile first.');
    }

    // Simuler extraction OCR (en prod: API Jumio, Onfido, etc.)
    const extractedData = await this.performOCR(frontImagePath, backImagePath, documentType);

    const stmt = this.db.prepare(`
      INSERT INTO kyc_documents (
        user_id, kyc_profile_id, document_type, document_number,
        document_country, issue_date, expiry_date,
        front_image_path, back_image_path,
        extracted_data, ocr_confidence, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      kycProfile.id,
      documentType,
      documentNumber,
      documentCountry,
      issueDate,
      expiryDate,
      frontImagePath,
      backImagePath,
      JSON.stringify(extractedData.data),
      extractedData.confidence,
      ipAddress
    );

    // Audit log
    this.logKycAction(userId, kycProfile.id, 'document_uploaded', null, `${documentType} uploaded`);

    return {
      documentId: result.lastInsertRowid,
      extractedData: extractedData.data,
      confidence: extractedData.confidence,
      requiresReview: extractedData.confidence < 0.8
    };
  }

  /**
   * 3. VÉRIFIER SELFIE + FACE MATCHING
   */
  async verifySelfie(userId, documentId, selfiePath) {
    const document = this.db.prepare('SELECT * FROM kyc_documents WHERE id = ?').get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Simuler face matching (en prod: API face recognition)
    const faceMatchResult = await this.performFaceMatch(document.front_image_path, selfiePath);

    // Simuler liveness detection
    const livenessResult = await this.performLivenessCheck(selfiePath);

    const passed = faceMatchResult.score >= 0.85 && livenessResult.passed;

    // Mettre à jour document
    this.db.prepare(`
      UPDATE kyc_documents
      SET selfie_image_path = ?,
          face_match_score = ?,
          liveness_score = ?,
          liveness_passed = ?,
          verification_status = ?
      WHERE id = ?
    `).run(
      selfiePath,
      faceMatchResult.score,
      livenessResult.score,
      livenessResult.passed ? 1 : 0,
      passed ? 'approved' : 'rejected',
      documentId
    );

    if (passed) {
      // Mettre à jour KYC profile
      this.db.prepare(`
        UPDATE kyc_profiles
        SET selfie_verified = 1,
            liveness_verified = ?,
            identity_verified = 1,
            kyc_level = CASE WHEN kyc_level < 2 THEN 2 ELSE kyc_level END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(livenessResult.passed ? 1 : 0, document.kyc_profile_id);

      this.logKycAction(userId, document.kyc_profile_id, 'selfie_verified', null, 'Selfie verified successfully');
    }

    return {
      passed,
      faceMatchScore: faceMatchResult.score,
      livenessScore: livenessResult.score,
      livenessPassed: livenessResult.passed,
      message: passed ?
        'Vérification selfie réussie' :
        `Échec vérification: ${faceMatchResult.score < 0.85 ? 'Face mismatch' : 'Liveness failed'}`
    };
  }

  /**
   * 4. SANCTIONS SCREENING
   */
  async screenSanctions(userId) {
    const kycProfile = this.db.prepare('SELECT * FROM kyc_profiles WHERE user_id = ?').get(userId);
    if (!kycProfile) {
      throw new Error('KYC profile not found');
    }

    const searchQuery = `${kycProfile.first_name} ${kycProfile.last_name}`;

    // Simuler recherche dans listes sanctions (en prod: APIs ComplyAdvantage, Dow Jones, etc.)
    const matches = await this.searchSanctionsLists(searchQuery, kycProfile);

    const hasMatches = matches.length > 0;

    // Enregistrer résultat
    const stmt = this.db.prepare(`
      INSERT INTO sanctions_screening (
        user_id, kyc_profile_id, search_query,
        lists_checked, matches_found, match_count, matches_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      kycProfile.id,
      searchQuery,
      JSON.stringify(['OFAC', 'UN', 'EU', 'CENTIF']),
      hasMatches ? 1 : 0,
      matches.length,
      JSON.stringify(matches)
    );

    // Mettre à jour KYC profile
    this.db.prepare(`
      UPDATE kyc_profiles
      SET sanctions_checked = 1,
          sanctions_match = ?,
          sanctions_details = ?,
          risk_score = risk_score + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      hasMatches ? 1 : 0,
      hasMatches ? JSON.stringify(matches) : null,
      hasMatches ? 50 : 0, // +50 risk si match
      kycProfile.id
    );

    this.logKycAction(userId, kycProfile.id, 'sanctions_screened', null,
      hasMatches ? `${matches.length} sanctions matches found` : 'No sanctions matches');

    return {
      checked: true,
      matchesFound: hasMatches,
      matchCount: matches.length,
      matches,
      requiresReview: hasMatches
    };
  }

  /**
   * 5. PEP CHECK (Politically Exposed Persons)
   */
  async screenPEP(userId) {
    const kycProfile = this.db.prepare('SELECT * FROM kyc_profiles WHERE user_id = ?').get(userId);
    if (!kycProfile) {
      throw new Error('KYC profile not found');
    }

    // Simuler recherche PEP (en prod: API PEP databases)
    const pepResult = await this.searchPEPDatabases(kycProfile);

    const isPEP = pepResult.found;

    // Enregistrer résultat
    if (isPEP) {
      this.db.prepare(`
        INSERT INTO pep_screening (
          user_id, kyc_profile_id, is_pep, pep_type,
          pep_position, pep_country, edd_required
        ) VALUES (?, ?, 1, ?, ?, ?, 1)
      `).run(
        userId,
        kycProfile.id,
        pepResult.type,
        pepResult.position,
        pepResult.country
      );
    }

    // Mettre à jour KYC profile
    this.db.prepare(`
      UPDATE kyc_profiles
      SET pep_checked = 1,
          is_pep = ?,
          pep_details = ?,
          requires_edd = CASE WHEN ? = 1 THEN 1 ELSE requires_edd END,
          risk_score = risk_score + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      isPEP ? 1 : 0,
      isPEP ? JSON.stringify(pepResult) : null,
      isPEP ? 1 : 0,
      isPEP ? 30 : 0, // +30 risk si PEP
      kycProfile.id
    );

    this.logKycAction(userId, kycProfile.id, 'pep_screened', null,
      isPEP ? `PEP detected: ${pepResult.position}` : 'No PEP match');

    return {
      checked: true,
      isPEP,
      pepDetails: isPEP ? pepResult : null,
      requiresEDD: isPEP
    };
  }

  /**
   * 6. VÉRIFIER SOURCE OF FUNDS
   */
  verifySourceOfFunds(userId, sourceData) {
    const {
      sourceOfFunds,      // salary, business, inheritance, investment, etc.
      occupation,
      employer,
      annualIncomeRange,  // <10M, 10-50M, 50-100M, 100M+
      wealthSource,
      supportingDocuments // Fichiers preuves
    } = sourceData;

    const kycProfile = this.db.prepare('SELECT * FROM kyc_profiles WHERE user_id = ?').get(userId);
    if (!kycProfile) {
      throw new Error('KYC profile not found');
    }

    // Mettre à jour profil
    this.db.prepare(`
      UPDATE kyc_profiles
      SET source_of_funds = ?,
          occupation = ?,
          employer = ?,
          annual_income_range = ?,
          wealth_source = ?,
          kyc_level = CASE WHEN kyc_level < 3 THEN 3 ELSE kyc_level END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      sourceOfFunds,
      occupation,
      employer,
      annualIncomeRange,
      wealthSource,
      kycProfile.id
    );

    this.logKycAction(userId, kycProfile.id, 'source_of_funds_verified', null,
      `Source of funds: ${sourceOfFunds}`);

    return {
      verified: true,
      kycLevel: 3,
      message: 'Source of funds enregistrée'
    };
  }

  /**
   * 7. APPROUVER/REJETER KYC
   */
  approveOrRejectKYC(userId, decision, reviewedBy, notes = null) {
    const kycProfile = this.db.prepare('SELECT * FROM kyc_profiles WHERE user_id = ?').get(userId);
    if (!kycProfile) {
      throw new Error('KYC profile not found');
    }

    const approved = decision === 'approve';

    this.db.prepare(`
      UPDATE kyc_profiles
      SET kyc_status = ?,
          kyc_approved_at = ?,
          kyc_rejected_at = ?,
          kyc_level = CASE WHEN ? = 1 THEN 4 ELSE kyc_level END,
          next_review_date = CASE WHEN ? = 1 THEN DATE('now', '+2 years') ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      approved ? 'approved' : 'rejected',
      approved ? new Date().toISOString() : null,
      !approved ? new Date().toISOString() : null,
      approved ? 1 : 0,
      approved ? 1 : 0,
      kycProfile.id
    );

    this.logKycAction(userId, kycProfile.id, approved ? 'kyc_approved' : 'kyc_rejected',
      kycProfile.kyc_status, notes || '', reviewedBy);

    return {
      status: approved ? 'approved' : 'rejected',
      kycLevel: approved ? 4 : kycProfile.kyc_level,
      message: approved ?
        'KYC approuvé - Niveau FULL atteint' :
        `KYC rejeté: ${notes}`,
      nextReviewDate: approved ? new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null
    };
  }

  /**
   * 8. OBTENIR STATUT KYC
   */
  getKYCStatus(userId) {
    const kycProfile = this.db.prepare(`
      SELECT * FROM kyc_profiles WHERE user_id = ?
    `).get(userId);

    if (!kycProfile) {
      return {
        hasProfile: false,
        kycLevel: 0,
        status: 'not_started',
        message: 'KYC non démarré'
      };
    }

    const documents = this.db.prepare(`
      SELECT * FROM kyc_documents WHERE user_id = ? ORDER BY uploaded_at DESC
    `).all(userId);

    const sanctionsScreening = this.db.prepare(`
      SELECT * FROM sanctions_screening WHERE user_id = ? ORDER BY search_date DESC LIMIT 1
    `).get(userId);

    const pepScreening = this.db.prepare(`
      SELECT * FROM pep_screening WHERE user_id = ? ORDER BY search_date DESC LIMIT 1
    `).get(userId);

    // Calculer progression
    const checks = {
      personalInfo: !!(kycProfile.first_name && kycProfile.last_name && kycProfile.date_of_birth),
      phoneVerified: kycProfile.phone_verified === 1,
      emailVerified: kycProfile.email_verified === 1,
      identityDocument: kycProfile.identity_verified === 1,
      selfieVerified: kycProfile.selfie_verified === 1,
      addressVerified: kycProfile.address_verified === 1,
      sanctionsScreened: kycProfile.sanctions_checked === 1,
      pepScreened: kycProfile.pep_checked === 1,
      sourceOfFunds: !!kycProfile.source_of_funds
    };

    const completedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    const progressPct = (completedChecks / totalChecks) * 100;

    return {
      hasProfile: true,
      kycLevel: kycProfile.kyc_level,
      kycStatus: kycProfile.kyc_status,
      riskScore: kycProfile.risk_score,
      riskLevel: kycProfile.risk_level,
      checks,
      progress: {
        completed: completedChecks,
        total: totalChecks,
        percentage: progressPct.toFixed(0)
      },
      documents: documents.map(d => ({
        id: d.id,
        type: d.document_type,
        status: d.verification_status,
        uploadedAt: d.uploaded_at
      })),
      sanctionsClean: !kycProfile.sanctions_match,
      isPEP: kycProfile.is_pep === 1,
      requiresEDD: kycProfile.requires_edd === 1,
      nextReviewDate: kycProfile.next_review_date
    };
  }

  // ========== FONCTIONS HELPERS (Simulation - En prod: APIs externes) ==========

  /**
   * Simuler OCR extraction
   */
  async performOCR(frontImagePath, backImagePath, documentType) {
    // En production: API Jumio, Onfido, AWS Textract, Google Cloud Vision, etc.

    // Simulation
    return {
      data: {
        documentType,
        documentNumber: 'CI' + Math.random().toString().substring(2, 10),
        firstName: 'Extracted',
        lastName: 'Name',
        dateOfBirth: '1990-01-15',
        nationality: 'CI',
        issueDate: '2020-01-01',
        expiryDate: '2030-01-01'
      },
      confidence: 0.95 // 95% confiance
    };
  }

  /**
   * Simuler face matching
   */
  async performFaceMatch(idPhotoPath, selfiePath) {
    // En production: AWS Rekognition, Face++, Microsoft Azure Face API, etc.

    // Simulation: Score élevé si même user
    const score = 0.88 + Math.random() * 0.10; // 88-98%

    return {
      score,
      passed: score >= 0.85
    };
  }

  /**
   * Simuler liveness detection
   */
  async performLivenessCheck(selfiePath) {
    // En production: iProov, Onfido, Jumio, etc.

    // Simulation
    const score = 0.90 + Math.random() * 0.10; // 90-100%

    return {
      score,
      passed: score >= 0.85
    };
  }

  /**
   * Rechercher dans listes sanctions
   */
  async searchSanctionsLists(searchQuery, kycProfile) {
    // En production: ComplyAdvantage, Dow Jones, LexisNexis, WorldCheck, etc.

    // Simulation: Aucun match pour la plupart des users
    const hasMatch = Math.random() < 0.02; // 2% false positive rate

    if (!hasMatch) {
      return [];
    }

    // Simuler un match
    return [{
      list: 'OFAC',
      name: searchQuery,
      matchScore: 0.75,
      country: kycProfile.nationality,
      reason: 'Name similarity',
      likelyFalsePositive: true
    }];
  }

  /**
   * Rechercher dans bases PEP
   */
  async searchPEPDatabases(kycProfile) {
    // En production: Dow Jones PEP list, LexisNexis, etc.

    // Simulation: Très peu de PEPs
    const isPEP = Math.random() < 0.005; // 0.5%

    if (!isPEP) {
      return { found: false };
    }

    return {
      found: true,
      type: 'domestic',
      position: 'Minister of Finance',
      country: kycProfile.nationality,
      since: '2020-01-01'
    };
  }

  /**
   * Calculer risk score initial
   */
  calculateInitialRiskScore(data) {
    let score = 50; // Base 50

    // Pays à haut risque
    if (this.HIGH_RISK_COUNTRIES.includes(data.nationality)) {
      score += 30;
    }
    if (this.HIGH_RISK_COUNTRIES.includes(data.countryOfResidence)) {
      score += 20;
    }

    // Limiter 0-100
    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Convertir risk score en level
   */
  getRiskLevelFromScore(score) {
    if (score >= 80) return 'very_high';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Logger action KYC (audit trail)
   */
  logKycAction(userId, kycProfileId, actionType, oldValue, description, performedBy = null) {
    this.db.prepare(`
      INSERT INTO kyc_audit_log (
        user_id, kyc_profile_id, action_type, old_value, description, performed_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, kycProfileId, actionType, oldValue, description, performedBy);
  }
}

module.exports = KycAmlService;
