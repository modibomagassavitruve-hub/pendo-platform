# 📚 DOCUMENTATION COMPLÈTE DES DONNÉES PENDO

> Guide de référence pour la structure de la base de données et la gestion des données de la plateforme PENDO

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Structure de la base de données](#structure-de-la-base-de-données)
3. [Scripts de gestion](#scripts-de-gestion)
4. [Procédures de maintenance](#procédures-de-maintenance)
5. [Résolution des problèmes](#résolution-des-problèmes)

---

## 🌍 Vue d'ensemble

### Localisation de la base de données

```
📁 pendo-backend/
  └── 📁 data/
      └── 📄 pendo.db (SQLite)
```

**IMPORTANT** : La base de données est dans `data/pendo.db` et NON à la racine du projet!

### Statistiques actuelles

- **Opportunités d'investissement** : 44 (couvrant 31 pays africains)
- **Actualités financières** : 34 (15 catégories)
- **Actions boursières** : 45 (BRVM principalement)
- **Marchés/Indices** : 17+ marchés africains

---

## 🗄️ Structure de la base de données

### Tables principales

#### 1. `investment_opportunities`

Opportunités d'investissement africaines avec tous les détails.

**Colonnes clés** :
- `id` : Identifiant unique
- `title` : Titre de l'opportunité
- `slug` : URL-friendly slug (UNIQUE)
- `sector` : Secteur (Énergie, Tech, Finance, Agriculture, etc.)
- `subsector` : Sous-secteur plus précis
- `country` : Code pays ISO (CI, NG, KE, etc.)
- `country_name` : Nom complet du pays
- `region` : Région africaine (Afrique de l'Ouest, etc.)
- `summary` : Résumé court (1-2 lignes)
- `description` : Description détaillée
- `opportunity_type` : Type d'opportunité (Startup, Infrastructure, etc.)
- `min_investment` : Investissement minimum (USD)
- `max_investment` : Investissement maximum (USD)
- `expected_return_min` : Rendement minimum attendu (%)
- `expected_return_max` : Rendement maximum attendu (%)
- `investment_horizon` : Durée d'investissement
- `risk_level` : Niveau de risque (low, medium, high)
- `company_name` : Nom de l'entreprise/projet
- `company_size` : Taille (Startup, PME, Grande entreprise)
- `stage` : Stade (Seed, Series A, Expansion, etc.)
- `market_size_usd` : Taille du marché
- `source_name` : Source de l'information
- `status` : Statut (active, closed, pending, funded)
- `published_at` : Date de publication
- `is_verified` : Opportunité vérifiée (1/0)

**Tables associées** :
- `opportunity_tags` : Tags de catégorisation
- `opportunity_highlights` : Points clés à mettre en avant
- `opportunity_metrics` : Métriques financières détaillées
- `user_opportunity_watchlist` : Favoris des utilisateurs

#### 2. `news`

Actualités financières africaines.

**Colonnes clés** :
- `id` : Identifiant unique
- `title` : Titre de l'actualité
- `summary` : Résumé court
- `content` : Contenu complet
- `category` : Catégorie (Marchés, Fintech, Crypto, Énergie, etc.)
- `source` : Source de l'information
- `country` : Code pays principal concerné
- `published_at` : Date de publication
- `created_at` : Date de création

**Catégories disponibles** :
- Marchés, Finance, Fintech, Crypto
- Énergie, Agriculture, Industrie
- Tech, E-commerce, Infrastructure
- Santé, Transport, Tourisme
- Commerce, Éducation

#### 3. `stocks`

Actions boursières (principalement BRVM).

**Colonnes clés** :
- `id` : Identifiant unique
- `ticker` : Code boursier (SNTS, SGBC, etc.)
- `name` : Nom court
- `full_name` : Nom complet de l'entreprise
- `exchange_id` : Identifiant de la bourse
- `sector_id` : Identifiant du secteur
- `country` : Code pays
- `country_name` : Nom du pays
- `isin` : Code ISIN international

**Tables associées** :
- `stock_prices` : Prix en temps réel ou historiques
- `stock_history` : Historique complet
- `stock_fundamentals` : Données fondamentales
- `exchanges` : Bourses (BRVM, NSE, JSE, etc.)
- `sectors` : Secteurs économiques

#### 4. `indices`

Indices et marchés boursiers africains.

**Colonnes clés** :
- `id` : Code du marché (BRVM, NSE, JSE, etc.)
- `name` : Nom du marché
- `country` : Pays principal
- `type` : Type (index, exchange)

---

## 🛠️ Scripts de gestion

### 1. `seedCompleteAfricaData.js` - Remplissage complet des données

**Usage** :
```bash
node scripts/seedCompleteAfricaData.js
```

**Fonction** :
- Nettoie les anciennes opportunités et actualités
- Insert 44+ opportunités couvrant 31 pays africains
- Insère 34+ actualités récentes et diversifiées
- Génère automatiquement les tags
- Affiche des statistiques complètes

**Quand l'utiliser** :
- Initialisation de la base de données
- Réinitialisation après corruption
- Mise à jour majeure du contenu

**Secteurs d'opportunités couverts** :
- Agriculture (7)
- Énergie (7)
- Finance (6)
- Tech (6)
- Mines (5)
- Tourisme (4)
- Industrie, Infrastructure, Commerce, Santé, Transport, Éducation

**Régions couvertes** :
- Afrique de l'Ouest (12 opportunités)
- Afrique de l'Est (10 opportunités)
- Afrique Australe (8 opportunités)
- Afrique du Nord (5 opportunités)
- Afrique Centrale (5 opportunités)
- Océan Indien (3 opportunités)
- Pan-Africain (1 opportunité)

### 2. `verifyDataIntegrity.js` - Vérification de l'intégrité

**Usage** :
```bash
node scripts/verifyDataIntegrity.js
```

**Fonction** :
- Vérifie l'existence de toutes les tables requises
- Contrôle la cohérence des données (montants, dates, etc.)
- Valide la couverture géographique et sectorielle
- Teste les requêtes SQL des endpoints API
- Affiche des recommandations d'amélioration

**Vérifications effectuées** :
- [x] Tables existantes
- [x] Opportunités (quantité, régions, secteurs, champs obligatoires)
- [x] Actualités (quantité, catégories, champs obligatoires)
- [x] Actions boursières (quantité, prix, validité)
- [x] Marchés/Indices (quantité)
- [x] Simulation des endpoints API
- [x] Performance (taille DB, index)

**Code de sortie** :
- `0` : Toutes les vérifications passées ✅
- `1` : Erreurs critiques détectées ❌

**Utiliser AVANT** :
- Démarrage du serveur en production
- Après toute modification de données
- Après migration ou restauration

### 3. `initDatabase.js` - Initialisation des tables de base

**Usage** :
```bash
npm run init-db
```

**Fonction** :
- Crée les tables de base (stocks, exchanges, sectors)
- Insère les 45 entreprises BRVM
- Insère 6 secteurs économiques
- Insère 2 indices

**Utiliser pour** :
- Première initialisation du projet
- Reconstruction de la structure de base

### 4. `addOpportunitiesTable.js` - Création des tables opportunités

**Usage** :
```bash
node scripts/addOpportunitiesTable.js
```

**Fonction** :
- Crée les 4 tables liées aux opportunités
- Insère 6 opportunités de démonstration

**Note** : Ce script est maintenant obsolète, utiliser `seedCompleteAfricaData.js` à la place.

---

## 🔧 Procédures de maintenance

### Initialisation complète d'une nouvelle installation

```bash
# 1. Créer la structure de base
npm run init-db

# 2. Remplir avec les données complètes
node scripts/seedCompleteAfricaData.js

# 3. Vérifier l'intégrité
node scripts/verifyDataIntegrity.js

# 4. Démarrer le serveur
npm start
```

### Mise à jour des données

```bash
# 1. Arrêter le serveur si nécessaire
lsof -ti:3001 | xargs kill

# 2. Exécuter le script de seed
node scripts/seedCompleteAfricaData.js

# 3. Vérifier
node scripts/verifyDataIntegrity.js

# 4. Redémarrer
npm start
```

### Sauvegarde de la base de données

```bash
# Créer une copie de sauvegarde
cp data/pendo.db data/pendo.db.backup-$(date +%Y%m%d-%H%M%S)

# Restaurer depuis une sauvegarde
cp data/pendo.db.backup-YYYYMMDD-HHMMSS data/pendo.db
```

### Vérification quotidienne

Créer un cronjob pour vérifier l'intégrité :

```bash
# Ajouter au crontab
0 2 * * * cd /path/to/pendo-backend && node scripts/verifyDataIntegrity.js >> logs/integrity-$(date +\%Y\%m\%d).log 2>&1
```

---

## 🚨 Résolution des problèmes

### Problème : "no such table: investment_opportunities"

**Cause** : Tables opportunités non créées

**Solution** :
```bash
node scripts/seedCompleteAfricaData.js
```

### Problème : "no such column: s.symbol"

**Cause** : Utilisation de colonnes inexistantes dans les requêtes SQL

**Solution** : Vérifier que les requêtes utilisent bien les colonnes correctes :
- Utiliser `s.ticker` au lieu de `s.symbol`
- Utiliser `s.exchange_id` au lieu de `s.exchange`
- Utiliser `s.sector_id` au lieu de `s.sector`
- Utiliser `LEFT JOIN stock_prices sp` pour accéder à `sp.price`, `sp.change_percent`, etc.

### Problème : L'API retourne des données obsolètes/manquantes

**Cause** : Cache côté serveur ou données non rechargées

**Solution** :
```bash
# Redémarrer le backend
lsof -ti:3001 | xargs kill
npm start
```

### Problème : Opportunités ou actualités manquantes

**Diagnostic** :
```bash
# Vérifier le contenu
node scripts/verifyDataIntegrity.js

# Compter manuellement
sqlite3 data/pendo.db "SELECT COUNT(*) FROM investment_opportunities"
sqlite3 data/pendo.db "SELECT COUNT(*) FROM news"
```

**Solution** :
```bash
node scripts/seedCompleteAfricaData.js
```

### Problème : Erreur "UNIQUE constraint failed: investment_opportunities.slug"

**Cause** : Tentative d'insertion d'une opportunité avec un slug existant

**Solution** : Le script `seedCompleteAfricaData.js` nettoie d'abord les données. Si erreur persiste :
```bash
sqlite3 data/pendo.db "DELETE FROM investment_opportunities"
node scripts/seedCompleteAfricaData.js
```

---

## 📊 Endpoints API et requêtes SQL

### GET /api/opportunities

**Requête SQL** :
```sql
SELECT
    id, title, slug, sector, subsector, country, country_name, region,
    summary, opportunity_type, min_investment, max_investment,
    expected_return_min, expected_return_max, investment_horizon,
    risk_level, company_name, company_size, stage, market_size_usd,
    source_name, image_url, logo_url, status, deadline, published_at,
    views, saves, is_verified
FROM investment_opportunities
WHERE status = 'active'
ORDER BY published_at DESC
LIMIT 20
```

### GET /api/opportunities/stats

**Requête SQL** :
```sql
SELECT sector, COUNT(*) as count
FROM investment_opportunities
WHERE status = 'active'
GROUP BY sector
ORDER BY count DESC
```

### GET /api/news/latest

**Requête SQL** :
```sql
SELECT id, title, category, summary, content, source, country, published_at
FROM news
ORDER BY published_at DESC
LIMIT 20
```

### GET /api/stocks

**Requête SQL** :
```sql
SELECT
    s.id, s.ticker, s.name, s.full_name, s.exchange_id, s.sector_id,
    s.isin, s.country, s.country_name,
    sp.price, sp.change_percent, sp.volume, sp.timestamp as last_update
FROM stocks s
LEFT JOIN stock_prices sp ON s.id = sp.stock_id
    AND sp.timestamp = (SELECT MAX(timestamp) FROM stock_prices WHERE stock_id = s.id)
WHERE s.exchange_id = 'BRVM'
ORDER BY s.ticker
```

### GET /api/markets

**Requête SQL** :
```sql
SELECT * FROM indices ORDER BY name
```

---

## 🎯 Objectifs de qualité des données

### Opportunités

- [x] Au moins 40 opportunités
- [x] Au moins 30 pays africains couverts
- [x] Toutes les 5 régions africaines représentées
- [x] Au moins 10 secteurs différents
- [x] Chaque région avec au moins 5 opportunités
- [x] Données vérifiées (is_verified = 1)
- [x] Tags pertinents pour chaque opportunité

### Actualités

- [x] Au moins 30 actualités
- [x] Au moins 10 catégories différentes
- [x] Dates variées (simulation flux d'actualité)
- [x] Contenu complet et informatif
- [x] Sources crédibles

### Actions boursières

- [ ] Au moins 50 actions (actuellement 45)
- [ ] Prix à jour pour toutes les actions
- [ ] Données fondamentales complètes
- [ ] Historique des prix

---

## 📝 Notes importantes

### ⚠️ Erreurs à éviter

1. **NE JAMAIS** modifier la base à la racine du projet (`pendo.db`) - utiliser `data/pendo.db`
2. **NE JAMAIS** exécuter de scripts SQL directement sans vérifier la structure
3. **TOUJOURS** vérifier l'intégrité après modification (`verifyDataIntegrity.js`)
4. **TOUJOURS** faire une sauvegarde avant modification majeure

### ✅ Bonnes pratiques

1. **Utiliser les scripts fournis** plutôt que des modifications manuelles
2. **Vérifier après chaque changement** avec `verifyDataIntegrity.js`
3. **Documenter** toute modification de structure
4. **Tester les endpoints** après mise à jour des données
5. **Maintenir la cohérence** entre les données (montants, dates, etc.)

### 🔄 Workflow recommandé

```
Modification des données
        ↓
Exécuter seedCompleteAfricaData.js
        ↓
Exécuter verifyDataIntegrity.js
        ↓
Vérifier les endpoints API (curl ou Postman)
        ↓
Redémarrer le backend
        ↓
Tester le frontend
```

---

## 📞 Support

En cas de problème avec les données :

1. Consulter cette documentation
2. Exécuter `verifyDataIntegrity.js` pour diagnostic
3. Vérifier les logs du serveur backend
4. Réinitialiser avec `seedCompleteAfricaData.js` si nécessaire

---

**Dernière mise à jour** : 2026-01-05
**Version** : 1.0.0
**Auteur** : Claude (Assistant IA - Anthropic)
