# 🛠️ Scripts PENDO - Guide d'utilisation

Ce dossier contient tous les scripts de gestion des données de la plateforme PENDO.

---

## 📋 Liste des scripts

### 1️⃣ **seedCompleteAfricaData.js** ⭐ (RECOMMANDÉ)

**Le script principal pour remplir la base avec des données complètes couvrant toute l'Afrique.**

```bash
node scripts/seedCompleteAfricaData.js
```

**Ce qu'il fait** :
- ✅ Nettoie les anciennes opportunités et actualités
- ✅ Insère **44+ opportunités** d'investissement couvrant **31 pays africains**
- ✅ Insère **34+ actualités** financières récentes
- ✅ Génère automatiquement les tags
- ✅ Couvre **toutes les 5 régions africaines**
- ✅ Couvre **12 secteurs économiques**

**Couverture géographique** :
- Afrique de l'Ouest : 12 opportunités
- Afrique de l'Est : 10 opportunités
- Afrique Australe : 8 opportunités
- Afrique du Nord : 5 opportunités
- Afrique Centrale : 5 opportunités
- Océan Indien : 3 opportunités
- Pan-Africain : 1 opportunité

**Quand l'utiliser** :
- ✅ Première initialisation
- ✅ Réinitialisation complète des données
- ✅ Après corruption de la base
- ✅ Pour passer d'une version démo à une version complète

---

### 2️⃣ **verifyDataIntegrity.js** 🔍 (CRITIQUE)

**Script de vérification de l'intégrité des données - À exécuter régulièrement !**

```bash
node scripts/verifyDataIntegrity.js
```

**Ce qu'il vérifie** :
- ✅ Existence de toutes les tables requises
- ✅ Quantité minimum d'opportunités (40+)
- ✅ Couverture géographique (25+ pays)
- ✅ Diversité sectorielle (8+ secteurs)
- ✅ Cohérence des données (montants, dates, rendements)
- ✅ Actualités (30+, 8+ catégories)
- ✅ Actions boursières et prix
- ✅ Simulation des endpoints API
- ✅ Performance de la base

**Code de sortie** :
- `0` = Tout est OK ✅
- `1` = Erreurs détectées ❌

**Quand l'utiliser** :
- ✅ **AVANT** chaque démarrage en production
- ✅ **APRÈS** toute modification de données
- ✅ **QUOTIDIENNEMENT** en cronjob
- ✅ **AVANT** chaque déploiement

**Exemple de cronjob** :
```bash
# Vérifier chaque jour à 2h du matin
0 2 * * * cd /path/to/pendo-backend && node scripts/verifyDataIntegrity.js >> logs/integrity-$(date +\%Y\%m\%d).log 2>&1
```

---

### 3️⃣ **initDatabase.js**

**Script d'initialisation de la structure de base.**

```bash
npm run init-db
# OU
node scripts/initDatabase.js
```

**Ce qu'il fait** :
- Crée les tables de base (stocks, exchanges, sectors, news)
- Insère 45 entreprises BRVM
- Insère 6 secteurs économiques
- Insère 2 indices boursiers

**Quand l'utiliser** :
- ✅ Première installation du projet
- ✅ Reconstruction de la structure après suppression accidentelle

**Note** : Ce script NE crée PAS les tables d'opportunités. Utiliser ensuite `seedCompleteAfricaData.js`.

---

### 4️⃣ **addOpportunitiesTable.js** (OBSOLÈTE)

```bash
node scripts/addOpportunitiesTable.js
```

**Statut** : ⚠️ **OBSOLÈTE** - Utiliser `seedCompleteAfricaData.js` à la place

Ce script ne crée que 6 opportunités de démo. Préférer le script complet.

---

### 5️⃣ **addMoreOpportunities.js** (OBSOLÈTE)

```bash
node scripts/addMoreOpportunities.js
```

**Statut** : ⚠️ **OBSOLÈTE** - Utiliser `seedCompleteAfricaData.js` à la place

---

### 6️⃣ **addMoreNews.js** (OBSOLÈTE)

```bash
node scripts/addMoreNews.js
```

**Statut** : ⚠️ **OBSOLÈTE** - Utiliser `seedCompleteAfricaData.js` à la place

---

## 🚀 Procédures recommandées

### Installation complète d'un nouveau projet

```bash
# 1. Initialiser la structure de base
npm run init-db

# 2. Remplir avec toutes les données africaines
node scripts/seedCompleteAfricaData.js

# 3. Vérifier l'intégrité
node scripts/verifyDataIntegrity.js

# 4. Si tout est OK, démarrer le serveur
npm start
```

### Réinitialisation des données

```bash
# 1. Arrêter le serveur
lsof -ti:3001 | xargs kill

# 2. (Optionnel) Sauvegarder la base actuelle
cp data/pendo.db data/pendo.db.backup-$(date +%Y%m%d-%H%M%S)

# 3. Réinitialiser
node scripts/seedCompleteAfricaData.js

# 4. Vérifier
node scripts/verifyDataIntegrity.js

# 5. Redémarrer
npm start
```

### Vérification quotidienne automatique

Ajouter au `crontab` :

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne
0 2 * * * cd /Users/magassamodibo/PENDO/pendo-backend && node scripts/verifyDataIntegrity.js >> logs/integrity-$(date +\%Y\%m\%d).log 2>&1
```

---

## 🔍 Diagnostic des problèmes courants

### ❌ "no such table: investment_opportunities"

**Solution** :
```bash
node scripts/seedCompleteAfricaData.js
```

### ❌ "no such column: s.symbol"

**Cause** : Requête SQL utilisant de mauvaises colonnes

**Solution** : Vérifier que le code utilise :
- `s.ticker` (et non `s.symbol`)
- `s.exchange_id` (et non `s.exchange`)
- `LEFT JOIN stock_prices sp` pour accéder aux prix

### ❌ API retourne 0 opportunités alors qu'il y en a dans la base

**Solution** :
```bash
# Redémarrer le backend pour vider le cache
lsof -ti:3001 | xargs kill
npm start
```

### ❌ "UNIQUE constraint failed: investment_opportunities.slug"

**Solution** :
```bash
# Le script nettoie d'abord, mais si l'erreur persiste :
sqlite3 data/pendo.db "DELETE FROM investment_opportunities"
node scripts/seedCompleteAfricaData.js
```

---

## 📊 Vérification manuelle

### Compter les opportunités

```bash
sqlite3 data/pendo.db "SELECT COUNT(*) FROM investment_opportunities"
```

### Compter les actualités

```bash
sqlite3 data/pendo.db "SELECT COUNT(*) FROM news"
```

### Voir les pays couverts

```bash
sqlite3 data/pendo.db "SELECT DISTINCT country_name FROM investment_opportunities ORDER BY country_name"
```

### Voir les secteurs

```bash
sqlite3 data/pendo.db "SELECT sector, COUNT(*) as count FROM investment_opportunities GROUP BY sector ORDER BY count DESC"
```

---

## 📝 Notes importantes

### ⚠️ Chemin de la base de données

La base de données est dans **`data/pendo.db`** et NON à la racine !

Tous les scripts utilisent le bon chemin :
```javascript
const dbPath = path.join(__dirname, '..', 'data', 'pendo.db');
```

### ✅ Workflow recommandé

```
Modification nécessaire
        ↓
Exécuter seedCompleteAfricaData.js
        ↓
Exécuter verifyDataIntegrity.js
        ↓
Si OK → Redémarrer backend
        ↓
Tester les endpoints API
        ↓
Tester le frontend
```

### 🎯 Objectifs de qualité

- **Opportunités** : 40+ couvrant 30+ pays africains
- **Actualités** : 30+ avec 10+ catégories
- **Actions** : 45+ avec prix à jour
- **Couverture** : Toutes les 5 régions africaines

---

## 📚 Documentation complète

Voir **`DONNEES_PENDO.md`** pour la documentation complète :
- Structure détaillée de la base de données
- Tous les endpoints API et leurs requêtes SQL
- Procédures de maintenance
- Résolution de problèmes

---

**Dernière mise à jour** : 2026-01-05
**Auteur** : Claude (Assistant IA - Anthropic)
