#!/bin/bash
# Script de démarrage du backend PENDO avec Node 20

# Utiliser Node 20 de Homebrew
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

echo "🚀 Démarrage du backend PENDO avec Node $(node --version)"

# Se placer dans le répertoire du backend
cd "$(dirname "$0")"

# Démarrer le serveur
/opt/homebrew/opt/node@20/bin/node server.js
