# Guide : Mettre à jour votre dépôt GitHub pour Render

Votre dépôt est déjà connecté à : **https://github.com/Fataf57/KSS.git**

## Étapes pour mettre à jour GitHub

### 1. Ajouter tous les fichiers modifiés et nouveaux

```bash
cd "/home/ouedraogo/Documents/Rep_coffre/Super-Dkf-main (1)"
git add .
```

Cette commande ajoute :
- `render.yaml` (corrigé)
- `RENDER_FIX.md` (guide de dépannage)
- `render-alternative.yaml` (version alternative)
- Tous les autres fichiers de configuration créés

### 2. Vérifier ce qui sera commité

```bash
git status
```

Vous devriez voir tous les fichiers qui seront ajoutés au commit.

### 3. Créer un commit

```bash
git commit -m "Configuration pour déploiement Render - Correction render.yaml"
```

### 4. Pousser vers GitHub

```bash
git push origin main
```

## Commandes complètes (copier-coller)

Exécutez ces commandes dans l'ordre :

```bash
cd "/home/ouedraogo/Documents/Rep_coffre/Super-Dkf-main (1)"
git add .
git commit -m "Configuration pour déploiement Render - Correction render.yaml et ajout fichiers de configuration"
git push origin main
```

## Après avoir poussé vers GitHub

1. **Allez sur Render** : https://dashboard.render.com
2. **Si vous avez déjà un Blueprint** :
   - Render devrait détecter automatiquement les nouveaux changements
   - Ou cliquez sur "Manual Deploy" → "Deploy latest commit"
3. **Si vous créez un nouveau Blueprint** :
   - Cliquez sur "New" → "Blueprint"
   - Connectez votre compte GitHub
   - Sélectionnez le dépôt : **Fataf57/KSS**
   - Render détectera automatiquement le fichier `render.yaml`

## Vérification

Pour vérifier que tout est bien poussé :

```bash
git log --oneline -1
```

Vous devriez voir votre dernier commit.

## Dépannage

### Erreur : "Your branch is ahead of 'origin/main'"
Cela signifie que vous avez des commits locaux non poussés. Exécutez :
```bash
git push origin main
```

### Erreur : "Permission denied"
Vérifiez que vous êtes authentifié avec GitHub :
```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

### Voir l'URL du dépôt distant
```bash
git remote -v
```

## Fichiers importants à commiter

✅ **À commiter** :
- `render.yaml` (configuration Render)
- `my_store/requirements.txt` (dépendances Python)
- `my_store/my_store/settings.py` (configuration Django)
- `my_store/start.sh` et `my_store/build.sh` (scripts)
- `react-app/package.json` (dépendances Node)
- Tous les fichiers source (`.py`, `.tsx`, etc.)

❌ **Ne PAS commiter** (déjà dans .gitignore) :
- `db.sqlite3`
- `node_modules/`
- `__pycache__/`
- `.env`
- `dist/`

