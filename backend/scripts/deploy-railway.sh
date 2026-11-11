#!/bin/bash

# Script de déploiement rapide sur Railway
# Usage: ./scripts/deploy-railway.sh

echo "🚀 DÉPLOIEMENT PENDO BACKEND SUR RAILWAY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Vérifier si Railway CLI est installé
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI n'est pas installé"
    echo "📦 Installation de Railway CLI..."
    npm install -g @railway/cli
fi

# Vérifier si l'utilisateur est connecté
echo ""
echo "🔐 Vérification de la connexion Railway..."
railway whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Non connecté à Railway"
    echo "🔑 Connexion à Railway..."
    railway login
fi

# Vérifier si le projet est initialisé
echo ""
echo "📋 Vérification du projet Railway..."
railway status &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Projet Railway non initialisé"
    echo "📦 Initialisation du projet..."
    railway init
fi

# Configurer les variables d'environnement essentielles
echo ""
echo "⚙️  Configuration des variables d'environnement..."

# Générer un JWT secret sécurisé si pas déjà configuré
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

echo "  ✓ NODE_ENV=production"
railway variables set NODE_ENV=production

echo "  ✓ PORT=3001"
railway variables set PORT=3001

echo "  ✓ JWT_SECRET (généré automatiquement)"
railway variables set JWT_SECRET=$JWT_SECRET

echo "  ✓ DATABASE_PATH=/app/data/pendo.db"
railway variables set DATABASE_PATH=/app/data/pendo.db

# Demander l'URL du frontend
echo ""
read -p "🌐 Entrez l'URL de votre frontend (ex: https://pendo.com): " FRONTEND_URL
if [ ! -z "$FRONTEND_URL" ]; then
    echo "  ✓ FRONTEND_URL=$FRONTEND_URL"
    railway variables set FRONTEND_URL=$FRONTEND_URL
fi

# Vérifier que les changements sont commités
echo ""
echo "📝 Vérification des changements Git..."
if [[ -n $(git status -s) ]]; then
    echo "⚠️  Changements non commités détectés"
    read -p "Voulez-vous commit et push les changements? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Deploy: Update configuration for Railway"
        git push
    fi
fi

# Déployer
echo ""
echo "🚀 Déploiement en cours..."
railway up

# Attendre un peu pour que le déploiement démarre
sleep 5

# Afficher les logs
echo ""
echo "📊 Logs de déploiement (Ctrl+C pour quitter):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
railway logs

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "📋 Prochaines étapes:"
echo "  1. Vérifier les logs: railway logs"
echo "  2. Ouvrir l'app: railway open"
echo "  3. Tester l'API: curl https://votre-app.railway.app/api/status"
echo ""
echo "💡 Commandes utiles:"
echo "  - Voir les variables: railway variables"
echo "  - Voir les logs: railway logs --tail"
echo "  - Statut du projet: railway status"
echo "  - Ouvrir dans le navigateur: railway open"
echo ""
