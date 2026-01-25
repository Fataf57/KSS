# Guide de déploiement sur Render

Ce guide explique comment déployer l'application Super-DKF sur Render.

## Structure du projet

- **Backend**: Django REST Framework dans `my_store/`
- **Frontend**: React avec Vite dans `react-app/`
- **Base de données**: PostgreSQL (fournie par Render)

## Prérequis

1. Un compte Render (https://render.com)
2. Un dépôt Git (GitHub, GitLab, ou Bitbucket)

## Étapes de déploiement

### 1. Préparer le dépôt Git

Assurez-vous que tous les fichiers sont commités et poussés vers votre dépôt Git.

### 2. Déployer via render.yaml (Recommandé)

Le fichier `render.yaml` configure automatiquement tous les services nécessaires.

1. Connectez-vous à Render
2. Allez dans le Dashboard
3. Cliquez sur "New" → "Blueprint"
4. Connectez votre dépôt Git
5. Render détectera automatiquement le fichier `render.yaml` et créera tous les services

### 3. Configuration manuelle (Alternative)

Si vous préférez configurer manuellement :

#### Backend Django

1. Créez un nouveau **Web Service**
2. Connectez votre dépôt Git
3. Configuration :
   - **Name**: `super-dkf-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `cd my_store && pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - **Start Command**: `cd my_store && gunicorn my_store.wsgi:application`
   - **Region**: Frankfurt (ou votre choix)

4. Variables d'environnement :
   - `SECRET_KEY`: Générez une clé secrète Django
   - `DEBUG`: `False`
   - `ALLOWED_HOSTS`: `votre-backend.onrender.com`
   - `DATABASE_URL`: (sera automatiquement fourni si vous créez une base de données)
   - `CORS_ALLOWED_ORIGINS`: `https://votre-frontend.onrender.com`

#### Frontend React

1. Créez un nouveau **Web Service**
2. Connectez votre dépôt Git
3. Configuration :
   - **Name**: `super-dkf-frontend`
   - **Environment**: `Node`
   - **Build Command**: `cd react-app && npm install && npm run build`
   - **Start Command**: `cd react-app && npm run preview`
   - **Region**: Frankfurt (ou votre choix)

4. Variables d'environnement :
   - `VITE_API_BASE_URL`: `https://votre-backend.onrender.com/api`
   - `NODE_VERSION`: `20.18.0`

#### Base de données PostgreSQL

1. Créez une nouvelle **PostgreSQL Database**
2. Configuration :
   - **Name**: `super-dkf-db`
   - **Database**: `super_dkf`
   - **User**: `super_dkf_user`
   - **Region**: Frankfurt (ou votre choix)

3. Connectez la base de données au service backend via la variable `DATABASE_URL`

### 4. Migrations de la base de données

Après le premier déploiement, exécutez les migrations :

1. Allez dans le service backend sur Render
2. Ouvrez la console Shell
3. Exécutez :
   ```bash
   cd my_store
   python manage.py migrate
   python manage.py createsuperuser
   ```

### 5. Configuration CORS

Assurez-vous que `CORS_ALLOWED_ORIGINS` dans le backend contient l'URL exacte de votre frontend (avec `https://`).

### 6. Variables d'environnement importantes

#### Backend
- `SECRET_KEY`: Clé secrète Django (générée automatiquement si non fournie)
- `DEBUG`: `False` en production
- `ALLOWED_HOSTS`: Domaine du backend
- `DATABASE_URL`: URL de connexion PostgreSQL (fournie automatiquement)
- `CORS_ALLOWED_ORIGINS`: URL du frontend

#### Frontend
- `VITE_API_BASE_URL`: URL complète de l'API backend (avec `/api` à la fin)

## Notes importantes

1. **Plan gratuit**: Les services sur le plan gratuit s'endorment après 15 minutes d'inactivité. Le premier démarrage peut prendre 30-60 secondes.

2. **Base de données**: La base de données PostgreSQL sur le plan gratuit est supprimée après 90 jours d'inactivité. Pensez à faire des sauvegardes régulières.

3. **Fichiers statiques**: Les fichiers statiques Django sont servis via WhiteNoise.

4. **Médias**: Pour les fichiers médias (images uploadées), vous devrez configurer un service de stockage externe (AWS S3, Cloudinary, etc.) en production.

## Dépannage

### Le backend ne démarre pas
- Vérifiez les logs dans le dashboard Render
- Assurez-vous que toutes les variables d'environnement sont correctement configurées
- Vérifiez que les migrations ont été exécutées

### Le frontend ne peut pas se connecter au backend
- Vérifiez que `VITE_API_BASE_URL` est correctement configuré
- Vérifiez que `CORS_ALLOWED_ORIGINS` contient l'URL du frontend
- Vérifiez que le backend est en cours d'exécution

### Erreurs de base de données
- Vérifiez que `DATABASE_URL` est correctement configuré
- Exécutez les migrations : `python manage.py migrate`
- Vérifiez les logs pour plus de détails

## Support

Pour plus d'aide, consultez la documentation Render : https://render.com/docs

