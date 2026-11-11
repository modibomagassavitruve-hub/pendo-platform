# PENDO Backend — Architecture

## Vue d'ensemble

```
pendo-backend/
├── api/
│   └── index.js              # Wrapper Vercel (re-export server-complete)
├── config/
│   ├── africanExchanges.js    # Données des bourses africaines
│   └── database.js            # Configuration PostgreSQL/Supabase
├── middleware/
│   ├── auth.js                # Auth modulaire (legacy, non utilisé par server-complete)
│   ├── errorHandler.js        # Gestionnaire d'erreurs global
│   ├── rateLimiter.js         # Rate limiter (legacy)
│   ├── security.js            # ★ NOUVEAU — Auth, CORS, rate limit, cron secret
│   ├── translationMiddleware.js
│   └── validation.js          # Validation des entrées
├── routes/                    # Routes modulaires (legacy, non utilisé par server-complete)
│   ├── auth.js, chat.js, forum.js, news.js, opportunities.js, portfolio.js...
│   └── ...30 fichiers
├── utils/
│   ├── autoTranslate.js       # Google Translate API wrapper
│   ├── articleScraper.js      # Scraping d'articles pour enrichissement
│   ├── logger.js              # Logger structuré
│   └── translationHelper.js   # Helpers de traduction
├── tests/
│   ├── security.test.js       # ★ NOUVEAU — 22 tests de sécurité
│   └── ...anciens tests
├── server-complete.js         # ★ MONOLITHE PRINCIPAL (3674 lignes) — déployé en prod
├── vercel.json                # Config Vercel (functions, rewrites, crons)
├── package.json
├── .eslintrc.json             # ★ NOUVEAU
├── .prettierrc                # ★ NOUVEAU
└── jest.config.js
```

## Architecture actuelle

Le backend est un **monolithe Express** dans `server-complete.js` qui inclut :
- 69+ routes API
- Données statiques (marchés, actions, pays africains)
- Logique de collecte RSS et enrichissement
- Système de traduction automatique (22 langues)
- Portfolio virtuel, forum, chat, analytics

### Pourquoi un monolithe ?
La contrainte Vercel Hobby impose un seul point d'entrée serverless via `api/index.js`. Le fichier `server-complete.js` est importé et re-exporté comme une seule fonction Vercel avec `maxDuration: 60s`.

## Sécurité (v19-SECURITY)

| Protection | Implémentation | Fichier |
|---|---|---|
| Auth JWT | `authenticateToken()` / `optionalAuth()` | server-complete.js L36-54 |
| Cron/Admin auth | `verifyCronSecret()` — vérifie `x-vercel-cron` ou `CRON_SECRET` | server-complete.js L38-50 |
| Identity | `getUserId()` — JWT only, **plus de header x-user-id** | server-complete.js L56-58 |
| CORS | Whitelist explicite — **plus de regex wildcard** | server-complete.js L78-92 |
| Rate limiting | In-memory rate limiter sur /auth/login et /auth/register | server-complete.js L95-113 |
| Portfolio | `authenticateToken` sur buy/sell/reset (plus de `optionalAuth`) | server-complete.js L2561-2565 |

### Variables d'environnement requises

| Variable | Description | Obligatoire |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Oui |
| `JWT_SECRET` | Secret pour signer les JWT | Oui (production) |
| `CRON_SECRET` | Secret pour protéger les endpoints admin | Recommandé |
| `NODE_ENV` | `production` en prod | Oui |

## Cron Jobs

| Cron | Schedule | Durée | Description |
|---|---|---|---|
| `/api/cron/collect-all` | 06h00 UTC | ~29s | Collecte opportunités + news + enrichissement |
| `/api/cron/translate-content` | 07h00 UTC | ~45s | Traduction automatique avec auto-chaining |

## Roadmap de refactoring

### Phase prochaine : Extraction modulaire
1. Extraire les données statiques dans `data/markets.js`, `data/countries.js`
2. Créer `services/rss.js`, `services/translation.js`, `services/enrichment.js`
3. Migrer les routes vers `routes/` en important depuis `server-complete.js`
4. Ajouter TypeScript progressivement

### Contrainte Vercel
Toute extraction doit s'assurer que `vercel.json > includeFiles` couvre les nouveaux fichiers.
