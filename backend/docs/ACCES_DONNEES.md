# 📊 ACCÈS AUX DONNÉES PENDO - Guide Complet

> Toutes les données sont maintenant accessibles via l'API. Ce guide montre comment accéder à TOUTES les données.

**Dernière mise à jour** : 2026-01-05
**Serveur** : http://localhost:3001

---

## ✅ État actuel des données

- **Opportunités** : 44 (couvrant 31 pays, 12 secteurs, 7 régions)
- **Actualités** : 99 (65 de décembre + 34 nouvelles)
- **Actions BRVM** : 45
- **Marchés** : 2 indices

---

## 🔗 Endpoints API - Comment accéder à TOUTES les données

### 1. Opportunités d'investissement

#### Obtenir les 20 premières (par défaut)
```bash
curl http://localhost:3001/api/opportunities
```

#### Obtenir TOUTES les 44 opportunités
```bash
curl 'http://localhost:3001/api/opportunities?limit=100'
```

**Résultat** :
```json
{
  "total": 44,
  "pays_couverts": 31,
  "secteurs": 12,
  "regions": 7
}
```

#### Filtrer par secteur
```bash
# Opportunités dans l'énergie
curl 'http://localhost:3001/api/opportunities?sector=Énergie&limit=100'

# Opportunités dans la tech
curl 'http://localhost:3001/api/opportunities?sector=Tech&limit=100'
```

#### Filtrer par pays
```bash
# Opportunités au Sénégal
curl 'http://localhost:3001/api/opportunities?country=SN&limit=100'

# Opportunités au Kenya
curl 'http://localhost:3001/api/opportunities?country=KE&limit=100'
```

#### Filtrer par région
```bash
# Ne fonctionne pas actuellement - besoin d'ajouter le filtre region dans le router
```

---

### 2. Actualités financières

#### Obtenir les 20 dernières (par défaut)
```bash
curl http://localhost:3001/api/news/latest
```

#### Obtenir TOUTES les 99 actualités
```bash
curl 'http://localhost:3001/api/news/latest?limit=200'
```

**Résultat** :
```json
{
  "total": 99
}
```

Les 99 actualités incluent :
- **65 actualités de décembre** (données historiques restaurées)
- **34 actualités nouvelles** (données complètes Afrique)

#### Obtenir les actualités les plus récentes
```bash
# 50 actualités les plus récentes
curl 'http://localhost:3001/api/news/latest?limit=50'
```

---

### 3. Actions boursières (BRVM)

#### Obtenir toutes les actions
```bash
curl http://localhost:3001/api/stocks
```

**Résultat** : 45 actions de la BRVM

#### Filtrer par secteur
```bash
curl 'http://localhost:3001/api/stocks?sector=Banques'
```

---

### 4. Marchés et indices

#### Obtenir tous les marchés
```bash
curl http://localhost:3001/api/markets
```

**Résultat** : 2 indices (BRVM Composite, BRVM 30)

---

## 🎨 Utilisation dans le Frontend

### React - Exemple pour afficher TOUTES les opportunités

```javascript
// Obtenir toutes les opportunités
const response = await fetch('http://localhost:3001/api/opportunities?limit=100');
const data = await response.json();
console.log(`${data.data.length} opportunités chargées`);

// Afficher
data.data.forEach(opp => {
  console.log(`${opp.title} - ${opp.country_name}`);
});
```

### React - Exemple pour afficher TOUTES les actualités

```javascript
// Obtenir toutes les actualités
const response = await fetch('http://localhost:3001/api/news/latest?limit=200');
const data = await response.json();
console.log(`${data.count} actualités chargées`);

// Afficher
data.data.forEach(news => {
  console.log(`${news.title} - ${news.category}`);
});
```

---

## 📋 Paramètres de requête disponibles

### Pour `/api/opportunities`

| Paramètre | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `limit` | number | Nombre max de résultats (défaut: 20) | `?limit=100` |
| `offset` | number | Pagination (défaut: 0) | `?offset=20` |
| `sector` | string | Filtrer par secteur | `?sector=Énergie` |
| `country` | string | Filtrer par code pays | `?country=SN` |
| `risk_level` | string | Filtrer par risque (low/medium/high) | `?risk_level=low` |
| `status` | string | Statut (active/closed/pending/funded) | `?status=active` |
| `search` | string | Recherche textuelle | `?search=solaire` |
| `sort` | string | Tri (newest/oldest/return_high/return_low) | `?sort=return_high` |

### Pour `/api/news/latest`

| Paramètre | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `limit` | number | Nombre max de résultats (défaut: 20) | `?limit=200` |

### Pour `/api/stocks`

| Paramètre | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `sector` | string | Filtrer par secteur | `?sector=Banques` |
| `exchange` | string | Filtrer par bourse | `?exchange=BRVM` |

---

## 🔍 Vérification de l'intégrité des données

### Vérifier que toutes les données sont présentes

```bash
# Opportunités dans la base
sqlite3 data/pendo.db "SELECT COUNT(*) FROM investment_opportunities"
# Résultat attendu: 44

# Actualités dans la base
sqlite3 data/pendo.db "SELECT COUNT(*) FROM news"
# Résultat attendu: 99

# Actions dans la base
sqlite3 data/pendo.db "SELECT COUNT(*) FROM stocks"
# Résultat attendu: 45
```

### Vérifier la couverture géographique

```bash
# Pays couverts par les opportunités
sqlite3 data/pendo.db "SELECT DISTINCT country_name FROM investment_opportunities ORDER BY country_name"
# Résultat attendu: 31 pays

# Secteurs couverts
sqlite3 data/pendo.db "SELECT sector, COUNT(*) as count FROM investment_opportunities GROUP BY sector ORDER BY count DESC"
# Résultat attendu: 12 secteurs
```

### Script de vérification automatique

```bash
npm run verify
```

Ce script vérifie :
- ✅ Toutes les tables existent
- ✅ Au moins 40 opportunités
- ✅ Au moins 30 actualités
- ✅ Au moins 25 pays couverts
- ✅ Cohérence des données
- ✅ Performance de la base

---

## 🚀 Démarrage rapide

### 1. Démarrer le backend

```bash
cd pendo-backend
npm start
```

Le serveur démarre sur http://localhost:3001

### 2. Tester que toutes les données sont accessibles

```bash
# Test complet
echo "Opportunités:" && curl -s 'http://localhost:3001/api/opportunities?limit=100' | jq '{total: (.data | length)}'
echo "Actualités:" && curl -s 'http://localhost:3001/api/news/latest?limit=200' | jq '{total: .count}'
echo "Actions:" && curl -s 'http://localhost:3001/api/stocks' | jq '{total: (.data | length)}'
```

**Résultats attendus** :
```
Opportunités:
{
  "total": 44
}
Actualités:
{
  "total": 99
}
Actions:
{
  "total": 45
}
```

---

## 📊 Statistiques détaillées

### Opportunités par région

```bash
sqlite3 data/pendo.db "SELECT region, COUNT(*) as count FROM investment_opportunities GROUP BY region ORDER BY count DESC"
```

**Résultat** :
- Afrique de l'Ouest : 12 opportunités
- Afrique de l'Est : 10 opportunités
- Afrique Australe : 8 opportunités
- Afrique du Nord : 5 opportunités
- Afrique Centrale : 5 opportunités
- Océan Indien : 3 opportunités
- Pan-Africain : 1 opportunité

### Opportunités par secteur

```bash
sqlite3 data/pendo.db "SELECT sector, COUNT(*) as count FROM investment_opportunities GROUP BY sector ORDER BY count DESC"
```

**Résultat** :
- Agriculture : 7
- Énergie : 7
- Finance : 6
- Tech : 6
- Mines : 5
- Tourisme : 4
- + 6 autres secteurs

### Actualités par catégorie

```bash
sqlite3 data/pendo.db "SELECT category, COUNT(*) as count FROM news GROUP BY category ORDER BY count DESC"
```

**Résultat** : 15 catégories différentes

---

## ⚠️ Points importants

### 1. Limite par défaut

Par défaut, les endpoints retournent un nombre limité de résultats :
- **Opportunités** : 20 par défaut
- **Actualités** : 20 par défaut

**Pour obtenir TOUTES les données, utiliser le paramètre `limit`** :
- Opportunités : `?limit=100`
- Actualités : `?limit=200`

### 2. Données historiques préservées

Les 99 actualités incluent :
- **65 actualités de décembre** (restaurées depuis la sauvegarde)
- **34 actualités nouvelles** (ajoutées avec les données complètes Afrique)

Aucune donnée n'a été perdue lors de la fusion.

### 3. Pagination

Pour afficher beaucoup de données, utiliser la pagination :

```javascript
// Page 1 (0-19)
fetch('http://localhost:3001/api/opportunities?limit=20&offset=0')

// Page 2 (20-39)
fetch('http://localhost:3001/api/opportunities?limit=20&offset=20')

// Page 3 (40-59)
fetch('http://localhost:3001/api/opportunities?limit=20&offset=40')
```

---

## 🔧 Maintenance

### Réinitialiser les données

```bash
npm run seed-data
```

⚠️ **ATTENTION** : Ce script supprime les données actuelles. Pour préserver les données historiques, utiliser plutôt le script de fusion.

### Vérifier l'intégrité

```bash
npm run verify
```

### Sauvegarder la base

```bash
cp data/pendo.db data/pendo.db.backup-$(date +%Y%m%d-%H%M%S)
```

---

## 📞 Support

En cas de problème :
1. Vérifier que le backend est démarré : `curl http://localhost:3001/api/status`
2. Vérifier les données dans la base : `npm run verify`
3. Consulter les logs : `tail -f /tmp/pendo-backend.log`

---

**Tout est maintenant accessible ! Les 44 opportunités et 99 actualités sont disponibles via l'API.**
