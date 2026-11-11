# Dockerfile pour PENDO Backend
FROM node:20-alpine

# Informations
LABEL maintainer="PENDO Team"
LABEL description="Backend API pour PENDO - African Financial Markets"

# Créer répertoire app
WORKDIR /app

# Copier package files
COPY package*.json ./

# Installer dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Créer répertoires nécessaires
RUN mkdir -p data backups logs

# Exposer le port
EXPOSE 3001

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3001

# Commande de démarrage
CMD ["node", "server.js"]
