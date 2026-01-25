# Correction de l'erreur Render.yaml

## Problème
L'erreur `unknown type "pg"` indique que Render ne reconnaît pas le type `pg` pour les bases de données PostgreSQL.

## Solution 1 : Type corrigé (recommandé)

J'ai corrigé le fichier `render.yaml` en remplaçant `type: pg` par `type: postgresql`.

**Fichier corrigé :** `render.yaml`

Si cette solution ne fonctionne toujours pas, utilisez la Solution 2.

## Solution 2 : Créer la base de données manuellement

Si le type `postgresql` n'est toujours pas reconnu, créez la base de données manuellement :

### Étapes :

1. **Déployez d'abord les services web** (backend et frontend) avec le fichier `render-alternative.yaml` :
   - Renommez `render.yaml` en `render-backup.yaml`
   - Renommez `render-alternative.yaml` en `render.yaml`
   - Commitez et poussez vers GitHub
   - Déployez sur Render

2. **Créez la base de données PostgreSQL manuellement** :
   - Allez sur https://dashboard.render.com
   - Cliquez sur "New +" → "PostgreSQL"
   - Configurez :
     - **Name**: `super-dkf-db`
     - **Database**: `super_dkf`
     - **User**: `super_dkf_user`
     - **Region**: Frankfurt
     - **Plan**: Free
   - Cliquez sur "Create Database"

3. **Connectez la base de données au backend** :
   - Allez dans votre service backend `super-dkf-backend`
   - Ouvrez l'onglet "Environment"
   - Ajoutez la variable d'environnement :
     - **Key**: `DATABASE_URL`
     - **Value**: Copiez la "Internal Database URL" ou "External Database URL" de votre base de données PostgreSQL
   - Sauvegardez

4. **Redémarrez le service backend** pour que les changements prennent effet.

## Vérification

Pour vérifier que tout fonctionne :

1. Les services backend et frontend doivent être en cours d'exécution (statut "Live")
2. La base de données doit être active
3. Les logs du backend ne doivent pas afficher d'erreurs de connexion à la base de données

## Types de services supportés par Render

Selon la documentation Render, les types de services supportés dans `render.yaml` sont :
- `web` - Service web (backend/frontend)
- `worker` - Service worker
- `cron` - Tâches planifiées
- `postgresql` - Base de données PostgreSQL (peut varier selon la version de Render)

Si `postgresql` ne fonctionne pas, utilisez la Solution 2 (création manuelle).

