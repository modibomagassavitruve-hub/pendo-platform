# 🚀 PENDO Backend - Guide de Démarrage Rapide

## Installation

```bash
cd pendo-backend
npm install
```

## Démarrage du Serveur

```bash
npm start
# ou
node server.js
```

Le serveur démarre sur `http://localhost:5000`

## Test Rapide

### 1. Tester Toutes les Bourses

```bash
node test-markets.js
```

**Résultat attendu:**
- Collecte de 17 bourses actives
- Statistiques par source
- Tendances du marché
- Détails par bourse

### 2. Tester une Bourse Spécifique

```bash
# Ghana
node test-markets.js gse

# Botswana
node test-markets.js bse

# Zambie
node test-markets.js luse
```

### 3. Lister Toutes les Bourses

```bash
node test-markets.js --list
```

## Utilisation dans le Code

### Collecter Toutes les Bourses

```javascript
const { collectAllMarkets } = require('./services/scraper');

async function getMarkets() {
  const markets = await collectAllMarkets();
  console.log(`${markets.length} bourses collectées`);

  markets.forEach(market => {
    console.log(`${market.name}: ${market.value} (${market.change})`);
  });
}

getMarkets();
```

### Collecter une Bourse Spécifique

```javascript
const { fetchExchangeData } = require('./services/scraper');

async function getGhana() {
  const gse = await fetchExchangeData('gse');

  if (gse) {
    console.log(`GSE: ${gse.value} (${gse.change})`);
  } else {
    console.log('Échec de la collecte');
  }
}

getGhana();
```

### Accéder à la Configuration

```javascript
const { getExchange, getAllExchanges } = require('./config/africanExchanges');

// Récupérer une bourse
const gse = getExchange('gse');
console.log(gse.name);        // "GSE Composite"
console.log(gse.country);     // "Ghana"
console.log(gse.tradingHours); // { open: '10:00', close: '15:00', ... }

// Récupérer toutes les bourses
const all = getAllExchanges();
console.log(Object.keys(all)); // ['jse', 'nse_ng', 'egx', ...]
```

## IDs des Bourses

| ID | Nom | Pays |
|----|-----|------|
| `jse` | JSE All Share | Afrique du Sud |
| `nse_ng` | NGX All Share | Nigeria |
| `egx` | EGX 30 | Égypte |
| `brvm` | BRVM Composite | UEMOA |
| `nse_ke` | NSE 20 | Kenya |
| `masi` | MASI | Maroc |
| `gse` | GSE Composite | Ghana |
| `bse` | BSE DCI | Botswana |
| `luse` | LASI | Zambie |
| `zse` | ZSE All Share | Zimbabwe |
| `sem` | SEMDEX | Maurice |
| `dse` | DSE All Share | Tanzanie |
| `use` | USE All Share | Ouganda |
| `rse` | RSE All Share | Rwanda |
| `bvmt` | TUNINDEX | Tunisie |
| `nsx` | NSX Overall | Namibie |
| `mse` | MSE All Share | Malawi |

## Format des Données

Chaque bourse retourne:

```javascript
{
  id: "gse",                  // ID unique
  name: "GSE Composite",      // Nom de l'indice
  country: "Ghana",           // Pays
  value: "3,245.67",         // Valeur (formatée)
  change: "+2.34%",          // Variation (formatée)
  positive: true,            // Hausse/baisse
  volume: "N/A",             // Volume
  source: "AFX Kwayisi API"  // Source
}
```

## Endpoints API

### GET /api/markets

Récupère toutes les bourses

```bash
curl http://localhost:5000/api/markets
```

**Réponse:**
```json
{
  "success": true,
  "count": 17,
  "markets": [
    {
      "id": "gse",
      "name": "GSE Composite",
      "country": "Ghana",
      "value": "3,245.67",
      "change": "+2.34%",
      "positive": true,
      "source": "AFX Kwayisi API"
    },
    ...
  ]
}
```

### GET /api/markets/:id

Récupère une bourse spécifique

```bash
curl http://localhost:5000/api/markets/gse
```

## Dépannage

### Problème: Aucune Donnée Collectée

**Causes possibles:**
1. Problème de connexion internet
2. Sources de données temporairement indisponibles
3. Rate limiting

**Solution:**
- Vérifier la connexion internet
- Réessayer dans quelques minutes
- Le système utilise automatiquement le fallback

### Problème: Données en Simulation

**Cause:**
- Sources réelles indisponibles

**Solution:**
- Normal en mode fallback
- Vérifier les logs pour voir quelle source a échoué
- Tester manuellement les URLs des sources

### Problème: Timeout

**Cause:**
- Réseau lent
- Source lente à répondre

**Solution:**
- Augmenter le timeout dans `services/scraper.js`:
  ```javascript
  timeout: 10000 // 10 secondes (par défaut)
  ```

## Structure du Projet

```
pendo-backend/
├── config/
│   └── africanExchanges.js    # Configuration des bourses
├── services/
│   └── scraper.js              # Service de collecte
├── data/                       # Données temporaires
├── server.js                   # Serveur Express
├── test-markets.js             # Script de test
├── README.md                   # Documentation complète
├── QUICK_START.md              # Ce fichier
└── package.json                # Dépendances npm
```

## Prochaines Étapes

1. ✅ Tester la collecte avec `node test-markets.js`
2. ✅ Démarrer le serveur avec `npm start`
3. ✅ Tester l'API avec `curl` ou Postman
4. ✅ Intégrer dans le frontend PENDO
5. 📋 Configurer le cache Redis (optionnel)
6. 📋 Mettre en place le monitoring (optionnel)

## Support

- Documentation complète: `README.md`
- Résumé d'implémentation: `IMPLEMENTATION_SUMMARY.md`
- Issues: Créer une issue avec les logs d'erreur

## Licence

PENDO Backend - Tous droits réservés © 2024
