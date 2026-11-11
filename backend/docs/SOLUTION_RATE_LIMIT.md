# 🚦 Solution au problème du Rate Limiter

## Problème rencontré

Lors des tests intensifs de l'API, le **rate limiter** (limiteur de débit) bloque les requêtes avec le message:
```json
{
  "success": false,
  "error": "Trop de requêtes. Veuillez patienter avant de réessayer.",
  "retryAfter": "2026-01-05T22:57:23.101Z"
}
```

## Solution immédiate

**Redémarrer le backend** pour réinitialiser les compteurs du rate limiter:

```bash
# Arrêter le backend
lsof -ti:3001 | xargs kill -9

# Redémarrer
cd pendo-backend
npm start
```

## Explication

Le rate limiter est une protection contre les abus et les attaques DDoS. Il limite le nombre de requêtes par IP dans une fenêtre de temps donnée.

Lors de nos tests, nous avons fait de nombreuses requêtes API en peu de temps, ce qui a déclenché la protection.

## Vérifier le rate limiter

Le rate limiter est configuré dans `/middleware/rateLimiter.js`

Exemple de configuration typique:
```javascript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requêtes par fenêtre
  message: 'Trop de requêtes. Veuillez patienter avant de réessayer.'
});
```

## Pour le développement

### Option 1: Augmenter les limites (recommandé en dev)

Modifier `middleware/rateLimiter.js` pour avoir des limites plus permissives en développement:

```javascript
const isDevelopment = process.env.NODE_ENV !== 'production';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 100, // 1000 en dev, 100 en prod
  message: 'Trop de requêtes. Veuillez patienter avant de réessayer.'
});
```

### Option 2: Désactiver en développement (non recommandé)

Ajouter dans `server.js`:
```javascript
if (process.env.NODE_ENV !== 'production') {
  console.log('⚠️ Rate limiting disabled in development mode');
} else {
  app.use('/api/', generalLimiter);
}
```

## Pour éviter le blocage lors des tests

1. **Attendre entre les requêtes** - Ne pas faire 100 requêtes en 10 secondes
2. **Utiliser les scripts de test** - Ils sont optimisés pour éviter le rate limit
3. **Redémarrer le backend** si bloqué

## Symptômes du rate limit actif

- Message "Trop de requêtes"
- Frontend affiche "0 articles" ou "Aucune opportunité trouvée"
- L'API retourne `success: false`
- Le champ `retryAfter` indique quand réessayer

## Vérification rapide

```bash
# Tester si rate limit actif
curl http://localhost:3001/api/status

# Si bloqué, vous verrez:
# {"success": false, "error": "Trop de requêtes..."}

# Si OK, vous verrez:
# {"success": true, "data": {"status": "online"...}}
```

---

**En résumé** : Le rate limiter protège l'API en production. En développement, augmentez les limites ou redémarrez simplement le backend si bloqué.
