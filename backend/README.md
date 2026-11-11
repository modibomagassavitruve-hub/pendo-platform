# PENDO — Backend API

API Node.js / Express de **PENDO**, la plateforme dédiée aux marchés financiers africains.
Elle collecte, stocke et sert les données de **21 bourses africaines**, l'actualité
économique et les opportunités d'investissement du continent.

Front : [`pendo-frontend`](https://github.com/modibomagassavitruve-hub/pendo-frontend) ·
démo : https://pendo-frontend.vercel.app

## Ce que fait l'API

- **Collecte** — scrapers et clients API (Twelve Data, Yahoo Finance en secours, sites de
  bourses africaines) pour les cotations, les news et les opportunités
- **Planification** — collecte automatique via GitHub Actions (`.github/workflows/`) et
  endpoints cron
- **Données marché** — historiques, indicateurs techniques, screener, anomalies, matières
  premières
- **Utilisateurs** — authentification, portefeuille, alertes, notifications
- **Communauté** — chat temps réel (Socket.io) et forum
- **Traduction** — contenus FR / EN / AR

~30 routes (`routes/`) et ~45 services (`services/`).

## Stack

Node.js · Express · SQLite (better-sqlite3) / PostgreSQL · Cheerio · Axios · Socket.io ·
Jest · déployé sur Vercel / Railway / Render

## Lancer en local

```bash
npm install
cp .env.example .env     # clés API, base de données
npm run init-db          # crée le schéma
npm run seed-data        # données de démonstration
npm start                # http://localhost:3001
```

Autres commandes : `npm test`, `npm run lint`, `npm run scrape`, `npm run verify`.

## Structure

```
server-complete.js   point d'entrée (npm start)
api/                 entrée serverless Vercel
routes/              endpoints REST
services/            scrapers, collecte, logique métier
config/              bourses africaines, base de données
middleware/          authentification
migrations/          schéma SQL
scripts/             initialisation, seed, maintenance (legacy/ et debug/ : scripts ponctuels)
tests/               tests Jest
docs/                architecture, déploiement, données
```

Documentation détaillée : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`docs/README_DEPLOIEMENT.md`](docs/README_DEPLOIEMENT.md).

---

Conçu et développé par **Modibo Magassa** —
[LinkedIn](https://www.linkedin.com/in/modibo-magassa-608a39141/)
