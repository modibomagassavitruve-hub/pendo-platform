# Service de Mise à Jour des Opportunités d'Investissement

## Vue d'ensemble

Le service `OpportunitiesUpdater` gère la mise à jour hebdomadaire automatique des opportunités d'investissement sur la plateforme PENDO.

## Fonctionnalités

### 1. Mise à jour automatique hebdomadaire
- **Fréquence**: Chaque lundi à 6h00 UTC
- **Tâche cron**: `0 6 * * 1`
- **Processus**:
  - Vérification des opportunités expirées (deadline dépassée)
  - Récupération de nouvelles opportunités (à implémenter via web scraping)
  - Mise à jour des statistiques (vues, favoris, etc.)
  - Archivage des opportunités fermées depuis plus de 6 mois

### 2. Mise à jour manuelle
Vous pouvez forcer une mise à jour manuellement via:

**API Endpoint**:
```bash
curl -X POST http://localhost:3001/api/opportunities/refresh
```

**Ligne de commande**:
```bash
cd /Users/magassamodibo/PENDO/pendo-backend/services
node opportunitiesUpdater.js
```

## Architecture

### Fichiers principaux

1. **`services/opportunitiesUpdater.js`**
   - Service de mise à jour
   - Gestion du cycle de vie des opportunités
   - Connexion à la base de données SQLite

2. **`server.js`**
   - Configuration du cron job hebdomadaire
   - Endpoint API pour mise à jour manuelle
   - Intégration du service dans le serveur Express

### Statuts des opportunités

- `active`: Opportunité active et disponible
- `pending`: En attente de validation
- `closed`: Fermée (deadline passée ou objectif atteint)
- `funded`: Objectif de financement atteint
- `archived`: Fermée depuis plus de 6 mois

## Sources de données (à implémenter)

Le service est prévu pour scraper les données depuis:

1. **African Development Bank (AfDB)**
   - Projets d'infrastructure
   - Programmes de développement

2. **African Business Magazine**
   - Opportunités d'entreprises
   - Levées de fonds

3. **IFC (International Finance Corporation)**
   - Projets de développement privé
   - Investissements infrastructure

4. **TechCrunch Africa**
   - Startups tech
   - Levées de fonds tech

5. **Disrupt Africa**
   - Ecosystem startup africain
   - Nouvelles opportunités tech

6. **Autres sources spécialisées**:
   - West Africa Real Estate Review (immobilier)
   - Africa Healthcare Report (santé)
   - Mining Weekly Africa (mines)
   - Commodities Africa (matières premières)
   - EdTech Africa Review (éducation)

## Implémentation du Web Scraping

### Structure recommandée

```javascript
class OpportunitiesUpdater {
  async scrapeAfDB() {
    // Scraper African Development Bank
    // Retourne tableau d'opportunités
  }

  async scrapeAfricanBusiness() {
    // Scraper African Business Magazine
  }

  async scrapeTechCrunch() {
    // Scraper TechCrunch Africa
  }

  async scrapeIFC() {
    // Scraper IFC Projects
  }

  async fetchNewOpportunities(stats) {
    const sources = await Promise.all([
      this.scrapeAfDB(),
      this.scrapeAfricanBusiness(),
      this.scrapeTechCrunch(),
      this.scrapeIFC(),
    ]);

    for (const opportunity of sources.flat()) {
      this.insertOrUpdateOpportunity(opportunity, stats);
    }
  }
}
```

### Librairies recommandées

```json
{
  "dependencies": {
    "cheerio": "^1.0.0",      // Parsing HTML
    "axios": "^1.6.0",        // HTTP requests
    "puppeteer": "^21.0.0"    // Pour sites JavaScript
  }
}
```

## Configuration

### Modifier la fréquence

Dans `server.js`, section `setupCronJobs()`:

```javascript
// Quotidien à 6h00
cron.schedule('0 6 * * *', async () => { ... });

// Tous les lundis et jeudis à 8h00
cron.schedule('0 8 * * 1,4', async () => { ... });

// Toutes les 6 heures
cron.schedule('0 */6 * * *', async () => { ... });
```

### Format des opportunités

Chaque opportunité doit respecter ce format:

```javascript
{
  title: "Titre de l'opportunité",
  slug: "titre-opportunite-2024",
  sector: "Finance",
  subsector: "Fintech",
  country: "CI",
  country_name: "Côte d'Ivoire",
  region: "Afrique de l'Ouest",
  summary: "Résumé court...",
  description: "Description détaillée...",
  opportunity_type: "company", // ou "project"
  min_investment: 500000,
  max_investment: 5000000,
  expected_return_min: 25,
  expected_return_max: 45,
  investment_horizon: "medium", // short, medium, long
  risk_level: "medium", // low, medium, high, very_high
  company_name: "Nom société",
  company_size: "sme", // startup, sme, large
  stage: "growth", // early, growth, mature
  market_size_usd: 45000000000,
  source_name: "Source",
  source_url: "https://...",
  status: "active"
}
```

## Monitoring

### Logs

Le service génère des logs détaillés:

```
🚀 Démarrage de la mise à jour hebdomadaire des opportunités...
📅 Date: 27/12/2025 06:00:00

🔍 Vérification des opportunités expirées...
   ✓ 3 opportunités expirées désactivées

📥 Recherche de nouvelles opportunités...
   ✓ 15 nouvelles opportunités ajoutées
   ✓ 8 opportunités mises à jour

📊 Mise à jour des statistiques...
   ✓ 42 opportunités actualisées

🧹 Nettoyage des anciennes opportunités...
   ✓ 5 opportunités archivées

✅ Mise à jour terminée avec succès!
📊 Statistiques:
   - Opportunités mises à jour: 8
   - Nouvelles opportunités: 15
   - Opportunités désactivées: 3
   - Erreurs: 0
```

### Statistiques API

```bash
curl http://localhost:3001/api/opportunities/stats
```

## Maintenance

### Tester le service

```bash
# Exécuter manuellement
cd services
node opportunitiesUpdater.js

# Vérifier les logs
tail -f logs/opportunities-update.log

# Vérifier la base de données
sqlite3 ../pendo.db "SELECT COUNT(*) as total, status FROM investment_opportunities GROUP BY status;"
```

### Dépannage

**Problème**: Cron job ne s'exécute pas
- Vérifier que le serveur est démarré
- Vérifier les logs du serveur
- Vérifier le fuseau horaire

**Problème**: Erreurs de scraping
- Vérifier la connectivité internet
- Vérifier que les sites sources sont accessibles
- Adapter les sélecteurs CSS si structure HTML a changé

## Prochaines étapes

1. ✅ Service de base créé
2. ✅ Cron job hebdomadaire configuré
3. ✅ API endpoint manuel ajouté
4. ⏳ Implémenter le web scraping des sources
5. ⏳ Ajouter système de notifications (nouvelles opportunités)
6. ⏳ Créer dashboard admin pour monitoring
7. ⏳ Ajouter tests automatisés

## Support

Pour toute question ou problème:
- Consulter les logs du serveur
- Vérifier la documentation des sources de données
- Contacter l'équipe technique PENDO
