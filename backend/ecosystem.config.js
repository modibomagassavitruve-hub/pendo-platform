/**
 * Configuration PM2 pour PENDO Backend
 * Production Process Manager
 */

module.exports = {
  apps: [{
    name: 'pendo-api',
    script: 'server.js',
    cwd: '/opt/pendo/pendo-backend',
    instances: 2, // Nombre d'instances (mode cluster)
    exec_mode: 'cluster',

    // Variables d'environnement
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },

    // Logs
    error_file: '/opt/pendo/logs/pm2-error.log',
    out_file: '/opt/pendo/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Performance
    max_memory_restart: '1G', // Redémarrer si utilisation mémoire > 1GB

    // Redémarrage automatique
    autorestart: true,
    max_restarts: 10, // Maximum 10 redémarrages avant arrêt définitif
    min_uptime: '10s', // Temps minimum avant de considérer un redémarrage

    // Watch (désactivé en production)
    watch: false,

    // Ignore certains dossiers
    ignore_watch: ['node_modules', 'logs', 'data', 'backups'],

    // Stratégie de déploiement
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,

    // Cron pour redémarrage automatique (optionnel)
    // cron_restart: '0 4 * * *', // Redémarrer tous les jours à 4h00
  }],

  // Configuration de déploiement (optionnel)
  deploy: {
    production: {
      user: 'deploy',
      host: 'votre-serveur.com',
      ref: 'origin/main',
      repo: 'git@github.com:votre-username/pendo.git',
      path: '/opt/pendo',
      'post-deploy': 'cd pendo-backend && npm ci --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /opt/pendo'
    }
  }
};
