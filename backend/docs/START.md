# 🚀 GUIDE DE DÉMARRAGE RAPIDE PENDO

## Démarrage normal

```bash
npm start
```

## 🔧 En cas d'erreur "better-sqlite3" / Node.js version

Si tu vois cette erreur :
```
Error: The module '/Users/.../better-sqlite3.node'
was compiled against a different Node.js version
```

**Solution simple** :
```bash
npm run fix-sqlite
npm start
```

## ✅ Vérification que tout fonctionne

```bash
# Vérifier l'intégrité des données
npm run verify

# Tester l'API
curl http://localhost:3001/api/status
```

## 📊 Endpoints principaux

- **Status** : http://localhost:3001/api/status
- **Opportunités** : http://localhost:3001/api/opportunities
- **Actualités** : http://localhost:3001/api/news/latest
- **Marchés** : http://localhost:3001/api/markets
- **Actions BRVM** : http://localhost:3001/api/stocks

## 🗄️ Réinitialiser les données

**Méthode rapide** (recommandée) :
```bash
npm run reset-data
```

**Ou méthode manuelle** :
```bash
# Remplir avec données complètes
npm run seed-data

# Vérifier
npm run verify

# Redémarrer
npm start
```

## 📝 Données actuelles

- ✅ 44 opportunités (31 pays africains)
- ✅ 34 actualités (15 catégories)
- ✅ 45 actions BRVM
- ✅ Toutes les régions africaines couvertes

## 🆘 Problèmes courants

### Le serveur ne démarre pas
```bash
# Tuer les processus existants
lsof -ti:3001 | xargs kill -9

# Recompiler better-sqlite3
npm run fix-sqlite

# Redémarrer
npm start
```

### Données manquantes
```bash
npm run seed-data
```

### Vérifier l'état
```bash
npm run verify
```

## 📚 Documentation complète

- `DONNEES_PENDO.md` - Structure base de données
- `scripts/README.md` - Guide des scripts
- `SOLUTION_COMPLETE.md` - Vue d'ensemble

---

**Port** : 3001
**Base de données** : `data/pendo.db` (SQLite)
**Version Node.js recommandée** : v20.x
