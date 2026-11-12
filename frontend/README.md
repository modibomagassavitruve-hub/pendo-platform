# PENDO — Frontend

> La première plateforme africaine dédiée aux marchés financiers du continent.

**Démo en ligne : https://pendo-frontend.vercel.app**

PENDO réunit en un seul endroit les cours, l'actualité économique et les opportunités
d'investissement de **17 bourses africaines** (JSE, NGX, EGX, BRVM, NSE Kenya, Casablanca,
GSE…), avec une ambition à la Bloomberg pour l'Afrique.

## Fonctionnalités

- **Marchés** — cotations, graphiques interactifs, fiches par bourse et par valeur
- **Actualités** — agrégation des news économiques africaines, par pays et par secteur
- **Opportunités** — immobilier, finance, santé, tech, énergie, mines, tourisme, consommation
- **Portefeuille & alertes** — suivi de positions, notifications de seuil
- **Calendrier économique**, analytics, export PDF / Excel
- **Communauté** — chat et forum
- **Trilingue** — français, anglais, arabe (i18next, RTL)
- **PWA** — installable sur mobile

## Stack

React 18 · React Router · Tailwind CSS · Recharts & Lightweight Charts · i18next ·
Socket.io · Framer Motion · déployé sur Vercel

Le backend (Node.js / Express, scrapers, collecte planifiée) est dans
[`pendo-backend`](https://github.com/modibomagassavitruve-hub/pendo-backend).

## Lancer en local

```bash
npm install
cp .env.example .env.development   # renseigner REACT_APP_API_URL
npm start                           # http://localhost:3000
```

## Structure

```
src/
  components/   onglets (Markets, News, Opportunities, Portfolio…), Chat, Forum
  locales/      traductions FR / EN / AR
  services/     appels à l'API backend
public/         manifest PWA, service worker, sitemap
scripts/        synchronisation des traductions
```

Guides : `START_HERE.md`, [`docs/DEPLOIEMENT_VERCEL_GUIDE.md`](docs/DEPLOIEMENT_VERCEL_GUIDE.md).

---

Conçu et développé par **Modibo Magassa** —
[LinkedIn](https://www.linkedin.com/in/modibo-magassa-608a39141/)
