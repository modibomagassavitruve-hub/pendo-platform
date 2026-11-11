#!/bin/bash
# Script de déploiement PENDO Backend

echo "🚀 Déploiement PENDO Backend..."
echo ""

# Vérifier qu'on est dans le bon dossier
if [ ! -f "server-complete.js" ]; then
    echo "❌ Erreur: server-complete.js non trouvé"
    echo "   Assurez-vous d'être dans le dossier pendo-backend"
    exit 1
fi

# Ajouter les fichiers
git add server-complete.js package.json

# Créer le commit
git commit -m "Deploy complete server with all features

- Added server-complete.js with all API routes
- Updated package.json to use server-complete.js
- Includes: markets, stocks, opportunities, news, portfolio,
  indicators, auth, forum, chat, notifications, analytics"

# Pousser vers GitHub
echo ""
echo "📤 Push vers GitHub..."
echo "   (Entrez vos identifiants GitHub si demandé)"
echo ""

git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Déploiement réussi!"
    echo "🌐 Vercel va automatiquement redéployer votre application"
    echo ""
    echo "📱 Frontend: https://pendo-frontend.vercel.app"
    echo "🔧 Backend:  https://pendo-backend.vercel.app"
else
    echo ""
    echo "❌ Erreur lors du push"
    echo "   Vérifiez vos identifiants GitHub"
fi
