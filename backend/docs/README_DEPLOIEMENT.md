# 🌍 PENDO - Plateforme d'Investissement Africain

**Version multi-plateforme : Web + Mobile (iOS & Android)**

PENDO est une plateforme complète d'investissement et d'information financière pour l'Afrique, offrant un accès aux opportunités d'investissement, actualités financières, et données boursières du continent africain.

---

## 🚀 Démarrage rapide

### Installation locale

```bash
# Cloner le repository
git clone https://github.com/votre-username/pendo-platform.git
cd pendo-platform

# Backend
cd pendo-backend
npm install
cp .env.example .env
npm run init-db
npm start

# Frontend (nouveau terminal)
cd pendo-frontend
npm install
npm start
```

**URLs locales:**
- Backend: http://localhost:3001
- Frontend: http://localhost:3000

---

## 📊 Données disponibles

- ✅ **73 opportunités** d'investissement (33 pays africains)
- ✅ **99 actualités** financières (20 catégories)
- ✅ **45 actions BRVM**
- ✅ Couverture complète de l'Afrique

---

## 📦 Déploiement

### 1. Préparer le code

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Backend sur Railway

1. Aller sur [railway.app](https://railway.app)
2. Connecter GitHub
3. Déployer le repo
4. Ajouter PostgreSQL
5. Configurer les variables d'environnement
6. Migrer: `railway run npm run migrate`

### 3. Frontend sur Vercel

1. Aller sur [vercel.com](https://vercel.com)
2. Importer depuis GitHub
3. Root: `pendo-frontend`
4. Framework: Create React App
5. Déployer

**Voir [PLAN_COMPLET_DEPLOIEMENT.md](PLAN_COMPLET_DEPLOIEMENT.md) pour le guide détaillé.**

---

## 📱 Application Mobile

En cours de développement (React Native)
- iOS + Android
- Lancement prévu: Février 2026

---

## 📚 Documentation

- [Guide de déploiement complet](PLAN_COMPLET_DEPLOIEMENT.md)
- [Documentation des données](pendo-backend/DONNEES_PENDO.md)
- [Guide de démarrage](pendo-backend/START.md)
- [Scripts disponibles](pendo-backend/scripts/README.md)

---

## 🌐 Endpoints API

```
GET /api/opportunities?limit=100    # Opportunités
GET /api/news/latest?limit=200      # Actualités
GET /api/stocks                     # Actions BRVM
GET /api/markets                    # Marchés
```

---

**Fait avec 🧡 pour démocratiser l'investissement en Afrique**
