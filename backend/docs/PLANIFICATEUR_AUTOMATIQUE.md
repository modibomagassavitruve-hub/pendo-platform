# Planificateur Automatique PENDO

## Vue d'ensemble

Le planificateur automatique génère et met à jour automatiquement les opportunités d'investissement et les actualités financières pour l'application PENDO.

## Configuration

### Fichiers impliqués

- **`services/scheduler.js`** - Service principal de planification
- **`services/comprehensiveAfricaOpportunitiesCollector.js`** - Générateur d'opportunités
- **`services/newsService.js`** - Gestionnaire d'actualités
- **`server.js`** (lignes 1418-1420) - Intégration dans le serveur

### Dépendances

- `node-cron` - Planification des tâches (déjà installé dans package.json)
- `better-sqlite3` - Base de données SQLite

## Fonctionnement

### 1. Démarrage automatique

Le planificateur démarre automatiquement avec le serveur :

```javascript
// server.js (ligne 1419)
const scheduler = require('./services/scheduler');
scheduler.start();
```

### 2. Génération initiale

Au démarrage du serveur :
- **Opportunités** : Vérification du nombre d'opportunités. Si < 100, génération automatique
- **Actualités** : Mise à jour immédiate

### 3. Planification récurrente

#### Opportunités d'investissement
- **Fréquence** : Quotidien à 6h00 (fuseau horaire Africa/Abidjan UTC+0)
- **Cron expression** : `'0 6 * * *'`
- **Action** : Génère de nouvelles opportunités pour les 54 pays africains
- **Secteurs** : Finance, Énergie, Tech, Agriculture, Immobilier, Mines
- **Données préservées** : Les anciennes opportunités sont conservées (INSERT OR IGNORE)

#### Actualités financières
- **Fréquence** : Toutes les heures
- **Cron expression** : `'0 * * * *'`
- **Action** : Récupération et mise à jour des actualités
- **Données préservées** : Les anciennes actualités sont conservées

## Commandes disponibles

### Vérifier le statut

```javascript
const scheduler = require('./services/scheduler');
const status = scheduler.getStatus();
console.log(status);
// {
//   opportunities: 'Actif (quotidien à 6h00)',
//   news: 'Actif (toutes les heures)',
//   jobCount: 2
// }
```

### Forcer une génération manuelle

#### Opportunités
```javascript
scheduler.forceGenerateOpportunities()
  .then(stats => console.log(stats));
```

#### Actualités
```javascript
scheduler.forceUpdateNews()
  .then(count => console.log(count));
```

### Arrêter le planificateur

```javascript
scheduler.stop();
```

## Scripts de test

### Test du planificateur
```bash
node scripts/test_scheduler.js
```

### Test de préservation des données
```bash
node scripts/test_data_preservation.js
```

### Correction du contenu des actualités (si nécessaire)
```bash
node scripts/fix_news_content.js
```

## Logs

Le planificateur affiche des logs détaillés :

```
⏰ DÉMARRAGE DU PLANIFICATEUR AUTOMATIQUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ Opportunités planifiées : Quotidien à 6h00 (Africa/Abidjan)
   ✅ Actualités planifiées : Toutes les heures
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Planificateur démarré avec succès
```

Lors de l'exécution planifiée :

```
💼 [CRON] Génération quotidienne des opportunités
📅 05/01/2026 06:00:00
   ⏳ Génération en cours...
   ✅ Génération terminée en 28.5s
   📊 144 nouvelles opportunités générées
```

## Données générées

### Opportunités d'investissement

- **54 pays africains** couverts
- **6 secteurs principaux** :
  - Finance (Fintech, Banque, Assurance, Micro-finance, Mobile Money)
  - Énergie (Solaire, Éolien, Hydro, Biomasse, Pétrole & Gaz)
  - Tech (E-commerce, EdTech, HealthTech, LogisticsTech)
  - Agriculture (Agritech, Transformation, Export, Élevage, Aquaculture)
  - Immobilier (Résidentiel, Commercial)
  - Mines (Or)

- **Descriptions détaillées** (774-1238 caractères)
- **Données réalistes** : investissements, retours, métriques, partenaires
- **Titres spécifiques** par sous-secteur (pas de "Néobanque" générique)

### Actualités

- **Sources multiples** agrégées
- **Contenu détaillé** généré pour chaque article
- **Catégories** : marchés, secteurs, analyses, tendances

## Architecture

```
server.js
    ↓
scheduler.js (services/)
    ├── comprehensiveAfricaOpportunitiesCollector.js
    │   └── Génère opportunités pour 54 pays × 6 secteurs
    │
    └── newsService.js
        └── Récupère et génère actualités détaillées
```

## Troubleshooting

### Le planificateur ne démarre pas
```bash
# Vérifier l'import
node -e "const s = require('./services/scheduler'); console.log('OK');"
```

### Vérifier que node-cron est installé
```bash
npm list node-cron
```

### Voir les jobs actifs
```javascript
const scheduler = require('./services/scheduler');
console.log(scheduler.getStatus());
```

### Forcer une mise à jour immédiate
```javascript
const scheduler = require('./services/scheduler');
await scheduler.forceGenerateOpportunities();
await scheduler.forceUpdateNews();
```

## Maintenance

### Backup automatique
Le service de backup automatique sauvegarde la base de données quotidiennement à 2h00 UTC (configuré dans server.js lignes 1274-1279).

### Nettoyage
Les anciennes données ne sont pas automatiquement supprimées. Pour un nettoyage manuel :

```sql
-- Supprimer les opportunités de plus de 6 mois
DELETE FROM investment_opportunities
WHERE created_at < datetime('now', '-6 months');

-- Supprimer les actualités de plus de 3 mois
DELETE FROM news
WHERE published_at < datetime('now', '-3 months');
```

## Performances

- **Génération d'opportunités** : ~28-35 secondes pour 144 opportunités
- **Mise à jour actualités** : ~2-5 secondes
- **Impact mémoire** : Minimal (singleton pattern)
- **Impact CPU** : Négligeable en dehors des périodes de génération

## Sécurité

- Pas d'exposition d'endpoints publics pour forcer la génération
- Validation des données avant insertion
- Protection contre les injections SQL (prepared statements)
- Logs détaillés pour audit

## Évolutions futures

- [ ] Notifications lors de la génération d'opportunités
- [ ] Dashboard admin pour gérer le planificateur
- [ ] Métriques de performance
- [ ] Gestion d'erreurs avec retry automatique
- [ ] Webhooks pour signaler les nouvelles opportunités
