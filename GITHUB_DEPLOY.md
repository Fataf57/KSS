# Guide : Déployer depuis un autre dépôt GitHub

Ce guide vous explique comment connecter ce projet à votre autre dépôt GitHub et le déployer sur Render.

## Étape 1 : Initialiser Git (si pas déjà fait)

Si le projet n'est pas encore un dépôt Git :

```bash
cd "/home/ouedraogo/Documents/Rep_coffre/Super-Dkf-main (1)"
git init
```

## Étape 2 : Connecter à votre dépôt GitHub

### Option A : Si votre dépôt GitHub est vide

```bash
# Ajouter tous les fichiers
git add .

# Faire le premier commit
git commit -m "Configuration initiale pour déploiement Render"

# Ajouter votre dépôt GitHub comme remote
git remote add origin https://github.com/VOTRE_USERNAME/VOTRE_REPO.git

# Pousser vers GitHub
git branch -M main
git push -u origin main
```

### Option B : Si votre dépôt GitHub contient déjà des fichiers

```bash
# Ajouter votre dépôt GitHub comme remote
git remote add origin https://github.com/VOTRE_USERNAME/VOTRE_REPO.git

# Récupérer les fichiers existants
git fetch origin

# Fusionner avec la branche principale (si nécessaire)
git merge origin/main --allow-unrelated-histories

# Ajouter les nouveaux fichiers
git add .

# Commiter les changements
git commit -m "Ajout configuration Render"

# Pousser vers GitHub
git push origin main
```

### Option C : Remplacer complètement le dépôt distant

Si vous voulez remplacer l'ancien remote :

```bash
# Supprimer l'ancien remote (si existe)
git remote remove origin

# Ajouter votre nouveau dépôt
git remote add origin https://github.com/VOTRE_USERNAME/VOTRE_REPO.git

# Pousser vers le nouveau dépôt
git push -u origin main --force
```

## Étape 3 : Vérifier la connexion

```bash
# Voir les remotes configurés
git remote -v

# Devrait afficher quelque chose comme :
# origin  https://github.com/VOTRE_USERNAME/VOTRE_REPO.git (fetch)
# origin  https://github.com/VOTRE_USERNAME/VOTRE_REPO.git (push)
```

## Étape 4 : Déployer sur Render

1. **Connectez-vous à Render** : https://render.com

2. **Créez un nouveau Blueprint** :
   - Cliquez sur "New" → "Blueprint"
   - Connectez votre compte GitHub
   - Sélectionnez votre dépôt GitHub
   - Render détectera automatiquement le fichier `render.yaml`

3. **Configurez le Blueprint** :
   - Render créera automatiquement :
     - Le service backend Django
     - Le service frontend React
     - La base de données PostgreSQL
   - Les variables d'environnement seront configurées automatiquement

4. **Ajustez les URLs** (après le premier déploiement) :
   - Une fois les services créés, notez les URLs réelles :
     - Backend : `https://super-dkf-backend-XXXX.onrender.com`
     - Frontend : `https://super-dkf-frontend-XXXX.onrender.com`
   - Mettez à jour les variables d'environnement dans Render :
     - **Backend** → Environment :
       - `ALLOWED_HOSTS` : `super-dkf-backend-XXXX.onrender.com`
       - `CORS_ALLOWED_ORIGINS` : `https://super-dkf-frontend-XXXX.onrender.com`
     - **Frontend** → Environment :
       - `VITE_API_BASE_URL` : `https://super-dkf-backend-XXXX.onrender.com/api`

## Étape 5 : Créer un superutilisateur Django

Après le déploiement, créez un compte administrateur :

1. Allez dans le service backend sur Render
2. Ouvrez la console Shell
3. Exécutez :
   ```bash
   cd my_store
   python manage.py createsuperuser
   ```

## Commandes Git utiles

```bash
# Voir l'état des fichiers
git status

# Ajouter des fichiers modifiés
git add .

# Commiter les changements
git commit -m "Description des changements"

# Pousser vers GitHub
git push origin main

# Récupérer les dernières modifications
git pull origin main
```

## Dépannage

### Erreur : "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
```

### Erreur : "failed to push some refs"
```bash
git pull origin main --allow-unrelated-histories
git push origin main
```

### Changer l'URL du dépôt distant
```bash
git remote set-url origin https://github.com/VOTRE_USERNAME/NOUVEAU_REPO.git
```

## Notes importantes

- ⚠️ **Ne commitez JAMAIS** :
  - Le fichier `db.sqlite3` (base de données locale)
  - Les fichiers `.env` (variables d'environnement)
  - Les dossiers `node_modules/` et `__pycache__/`
  - Le dossier `dist/` (build du frontend)

- ✅ **Fichiers importants à commiter** :
  - `render.yaml` (configuration Render)
  - `requirements.txt` (dépendances Python)
  - `package.json` (dépendances Node)
  - Tous les fichiers source (`.py`, `.tsx`, `.ts`, etc.)
  - Les scripts de build (`build.sh`, `start.sh`)

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans le dashboard Render
2. Vérifiez que toutes les variables d'environnement sont correctement configurées
3. Assurez-vous que les migrations Django ont été exécutées

