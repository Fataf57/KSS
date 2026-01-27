# Dépannage : Erreur de connexion depuis le frontend

## Problème
La connexion fonctionne sur l'admin Django (`/admin/`) mais échoue depuis le frontend React (`/login`).

## Causes possibles

### 1. Variable d'environnement VITE_API_BASE_URL

**Problème** : Les variables d'environnement Vite sont injectées au moment du BUILD, pas au runtime.

**Solution** : Vérifiez que la variable est correctement configurée dans Render :

1. Allez dans le service frontend sur Render
2. Ouvrez "Environment"
3. Vérifiez que `VITE_API_BASE_URL` est défini et vaut : `https://super-dkf-backend.onrender.com/api`
4. Si elle n'est pas là ou incorrecte, ajoutez-la manuellement
5. **Redéployez le frontend** (les variables Vite nécessitent un rebuild)

### 2. Configuration CORS

**Vérification** : Assurez-vous que CORS autorise bien le frontend.

Dans `settings.py`, `CORS_ALLOWED_ORIGINS` doit contenir :
```python
CORS_ALLOWED_ORIGINS = [
    "https://super-dkf-frontend.onrender.com",
]
```

**Solution** : Vérifiez dans Render que la variable `CORS_ALLOWED_ORIGINS` est bien définie.

### 3. URL de l'API incorrecte

**Test** : Ouvrez la console du navigateur (F12) sur https://super-dkf-frontend.onrender.com/login

Vérifiez :
- L'URL complète de la requête dans l'onglet Network
- Les erreurs dans la console

L'URL devrait être : `https://super-dkf-backend.onrender.com/api/auth/login/`

### 4. Erreur CORS dans la console

Si vous voyez une erreur CORS dans la console :
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solution** : Vérifiez que `CORS_ALLOWED_ORIGINS` contient exactement l'URL du frontend (avec `https://`).

## Solutions à appliquer

### Solution 1 : Vérifier et corriger les variables d'environnement

1. **Backend** (super-dkf-backend) :
   - `CORS_ALLOWED_ORIGINS` = `https://super-dkf-frontend.onrender.com`
   - Redémarrez le service

2. **Frontend** (super-dkf-frontend) :
   - `VITE_API_BASE_URL` = `https://super-dkf-backend.onrender.com/api`
   - **Redéployez** (pas juste redémarrer, il faut rebuild)

### Solution 2 : Vérifier l'endpoint de login

L'endpoint devrait être accessible à :
```
POST https://super-dkf-backend.onrender.com/api/auth/login/
```

Testez avec curl ou Postman :
```bash
curl -X POST https://super-dkf-backend.onrender.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"VOTRE_MOT_DE_PASSE"}'
```

### Solution 3 : Activer les logs pour déboguer

Ajoutez des logs dans `AuthContext.tsx` pour voir l'URL exacte utilisée :

```typescript
const login = async (username: string, password: string) => {
  const url = getApiUrl("auth/login/");
  console.log("URL de connexion:", url); // Ajoutez cette ligne
  console.log("VITE_API_BASE_URL:", import.meta.env.VITE_API_BASE_URL); // Et celle-ci
  
  try {
    const response = await fetch(url, {
      // ...
    });
    // ...
  }
};
```

## Vérifications rapides

1. ✅ L'admin Django fonctionne → Le backend est OK
2. ❌ Le frontend ne peut pas se connecter → Problème de communication frontend/backend

**Vérifiez dans l'ordre** :
1. Console du navigateur (F12) → Erreurs ?
2. Onglet Network → Quelle URL est appelée ?
3. Variables d'environnement Render → Sont-elles correctes ?
4. CORS → Le frontend est-il autorisé ?

## Commandes utiles

Pour tester l'endpoint directement :
```bash
# Test de l'endpoint de login
curl -X POST https://super-dkf-backend.onrender.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"VOTRE_MOT_DE_PASSE"}'
```

Si ça fonctionne avec curl mais pas depuis le frontend → C'est un problème CORS ou de configuration frontend.

