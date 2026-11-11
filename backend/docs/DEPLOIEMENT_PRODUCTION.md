# 🚀 Guide de Déploiement en Production - PENDO Backend

## Vue d'ensemble

Ce guide vous explique comment déployer le backend PENDO avec le planificateur automatique sur différentes plateformes cloud.

---

## 📋 Prérequis

- [ ] Code pushé sur GitHub/GitLab
- [ ] Compte sur une plateforme cloud (Railway, Render, Heroku, etc.)
- [ ] Variables d'environnement préparées

---

## 🎯 Option 1: Railway (Recommandé)

### Avantages
- ✅ Gratuit jusqu'à 500h/mois
- ✅ Déploiement automatique depuis GitHub
- ✅ Variables d'environnement faciles
- ✅ Volumes persistants inclus
- ✅ Logs en temps réel

### Étapes de déploiement

#### 1. Installation Railway CLI
```bash
npm install -g @railway/cli
railway login
```

#### 2. Initialiser le projet
```bash
cd /Users/magassamodibo/PENDO/pendo-backend
railway init
```

#### 3. Configurer les variables d'environnement
```bash
# Sur le dashboard Railway ou via CLI
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set JWT_SECRET=votre_secret_super_securise_changez_moi
```

#### 4. Créer un volume persistant pour la base de données
Sur le dashboard Railway:
- Aller dans "Settings" → "Volumes"
- Créer un volume monté sur `/app/data`

#### 5. Déployer
```bash
railway up
```

#### 6. Vérifier le déploiement
```bash
railway logs
```

Votre API sera disponible sur: `https://votre-app.railway.app`

---

## 🎯 Option 2: Render

### Avantages
- ✅ Tier gratuit permanent
- ✅ SSL automatique
- ✅ Déploiement depuis GitHub

### Étapes de déploiement

#### 1. Créer un compte
Allez sur [render.com](https://render.com) et connectez votre GitHub

#### 2. Créer un nouveau Web Service
- Cliquez "New +" → "Web Service"
- Sélectionnez votre repo `pendo-backend`
- Configuration:
  - **Name**: `pendo-backend`
  - **Environment**: `Node`
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
  - **Plan**: `Free`

#### 3. Variables d'environnement
Dans la section "Environment":
```
NODE_ENV=production
PORT=10000
JWT_SECRET=votre_secret_super_securise
```

#### 4. Ajouter un disque persistant
- Dans "Advanced" → "Disks"
- Créer un disque monté sur `/app/data`
- Taille: 1GB (gratuit)

#### 5. Déployer
Cliquez "Create Web Service" et Render déploiera automatiquement.

---

## 🎯 Option 3: Heroku

### Étapes de déploiement

#### 1. Installation Heroku CLI
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ou télécharger depuis heroku.com/cli
```

#### 2. Se connecter et créer l'app
```bash
heroku login
heroku create pendo-backend-prod
```

#### 3. Configurer les variables d'environnement
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=votre_secret_super_securise
```

#### 4. Ajouter un Procfile
Créez `Procfile` à la racine:
```
web: node server.js
```

#### 5. Déployer
```bash
git push heroku main
```

#### 6. Voir les logs
```bash
heroku logs --tail
```

---

## 🎯 Option 4: VPS (DigitalOcean, Linode, AWS EC2)

### Configuration manuelle sur un serveur Ubuntu

#### 1. Se connecter au serveur
```bash
ssh root@votre-ip-serveur
```

#### 2. Installer Node.js
```bash
# Installer Node 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer PM2 pour gérer le processus
sudo npm install -g pm2
```

#### 3. Cloner le projet
```bash
cd /var/www
git clone https://github.com/votre-username/pendo-backend.git
cd pendo-backend
npm install
```

#### 4. Configurer les variables d'environnement
```bash
nano .env
```

Ajouter:
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=votre_secret_super_securise
DATABASE_PATH=/var/www/pendo-backend/data/pendo.db
```

#### 5. Initialiser la base de données
```bash
mkdir -p data
node scripts/initDatabase.js
```

#### 6. Démarrer avec PM2
```bash
pm2 start server.js --name pendo-backend
pm2 save
pm2 startup
```

#### 7. Configurer Nginx comme reverse proxy
```bash
sudo apt install nginx

# Créer la configuration
sudo nano /etc/nginx/sites-available/pendo
```

Ajouter:
```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activer:
```bash
sudo ln -s /etc/nginx/sites-available/pendo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 8. Configurer SSL avec Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

---

## 🔒 Sécurité en Production

### 1. Variables d'environnement sécurisées

Ne JAMAIS commit ces fichiers:
- `.env`
- `.env.production`
- `data/pendo.db`

Assurez-vous que `.gitignore` contient:
```
.env*
data/*.db
node_modules/
```

### 2. Générer un JWT secret sécurisé

```bash
# Générer un secret aléatoire
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Utilisez le résultat comme `JWT_SECRET`

### 3. Configurer CORS en production

Modifier `server.js`:
```javascript
const CONFIG = {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://votre-frontend.com',
    credentials: true
  }
};
```

### 4. Activer rate limiting strict
Les rate limiters sont déjà configurés dans le code.

---

## 📊 Vérification du Planificateur en Production

### 1. Vérifier que le serveur démarre correctement

Vous devriez voir dans les logs:
```
⏰ DÉMARRAGE DU PLANIFICATEUR AUTOMATIQUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ Opportunités planifiées : Quotidien à 6h00 (Africa/Abidjan)
   ✅ Actualités planifiées : Toutes les heures
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Planificateur démarré avec succès
```

### 2. Tester l'API de statut

```bash
curl https://votre-app.railway.app/api/status
```

Réponse attendue:
```json
{
  "success": true,
  "data": {
    "status": "online",
    "database": "connected",
    "stocks_count": 425,
    "uptime": 3600
  }
}
```

### 3. Vérifier les opportunités

```bash
curl https://votre-app.railway.app/api/opportunities?limit=5
```

### 4. Vérifier les actualités

```bash
curl https://votre-app.railway.app/api/news/latest
```

---

## 🔧 Monitoring et Logs

### Railway
```bash
railway logs --tail
```

### Render
Logs disponibles dans le dashboard web

### Heroku
```bash
heroku logs --tail
```

### VPS (avec PM2)
```bash
pm2 logs pendo-backend
pm2 monit
```

---

## 🐛 Troubleshooting

### Le planificateur ne démarre pas

**Vérifier les logs:**
```bash
# Railway
railway logs | grep "PLANIFICATEUR"

# PM2
pm2 logs pendo-backend | grep "PLANIFICATEUR"
```

**Solution:** Vérifier que `node-cron` est installé:
```bash
npm list node-cron
```

### Base de données vide après redémarrage

**Problème:** Volume persistant non configuré

**Solution:**
- Railway/Render: Créer un volume persistant monté sur `/app/data`
- VPS: Utiliser un chemin absolu pour la base de données

### Les jobs cron ne s'exécutent pas

**Vérifier le fuseau horaire:**
```javascript
// Dans scheduler.js, le timezone est configuré à 'Africa/Abidjan'
```

**Tester manuellement:**
```bash
# Via API (si vous ajoutez un endpoint)
curl -X POST https://votre-app.railway.app/api/opportunities/refresh
```

### Erreur "ECONNREFUSED" lors de la génération

**Problème:** Timeout réseau

**Solution:** Augmenter le timeout dans `scheduler.js`:
```javascript
// Ajouter dans les fonctions de génération
const timeout = setTimeout(() => {
  console.log('Timeout atteint, nouvelle tentative...');
}, 60000); // 60 secondes
```

---

## 📈 Optimisations Production

### 1. Activer la compression
Déjà configuré dans `server.js` via le middleware `compression()`

### 2. Caching
Utiliser Redis pour le caching des opportunités:
```bash
# Sur Railway/Render
# Ajouter un service Redis
railway add redis
```

### 3. Base de données PostgreSQL (optionnel)

Pour une meilleure scalabilité:
```bash
railway add postgresql
```

Puis migrer de SQLite vers PostgreSQL.

### 4. Backup automatique

Le service de backup est déjà configuré (ligne 1274-1279 dans `server.js`).
Les backups sont créés quotidiennement à 2h00 UTC.

Pour sauvegarder sur S3/Cloud Storage:
```javascript
// Modifier services/backupService.js pour upload vers cloud
```

---

## ✅ Checklist de Déploiement

- [ ] Code pushé sur GitHub
- [ ] Variables d'environnement configurées
- [ ] Volume persistant créé pour la base de données
- [ ] JWT_SECRET généré de façon sécurisée
- [ ] CORS configuré avec votre domaine frontend
- [ ] Déploiement effectué
- [ ] Logs vérifiés (planificateur démarré)
- [ ] API testée (`/api/status`, `/api/opportunities`, `/api/news`)
- [ ] Premier job cron vérifié (attendre 6h00 ou tester manuellement)
- [ ] Monitoring configuré
- [ ] Backups vérifiés

---

## 🆘 Support

En cas de problème:

1. Vérifier les logs de la plateforme
2. Tester l'API localement d'abord
3. Vérifier que toutes les variables d'environnement sont définies
4. Consulter la documentation de votre plateforme cloud

---

## 📝 Prochaines Étapes

Une fois déployé:

1. ✅ Connecter le frontend à l'API en production
2. ✅ Configurer un nom de domaine personnalisé
3. ✅ Mettre en place des alertes (Sentry, LogRocket)
4. ✅ Activer le monitoring (Datadog, New Relic)
5. ✅ Planifier les backups réguliers

---

**Votre backend PENDO est maintenant prêt pour la production ! 🚀**
