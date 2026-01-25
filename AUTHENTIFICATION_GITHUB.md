# Authentification GitHub pour pousser les changements

Le commit a été créé avec succès, mais le push nécessite une authentification.

## Option 1 : Token d'accès personnel (Recommandé)

### 1. Créer un token GitHub

1. Allez sur GitHub : https://github.com/settings/tokens
2. Cliquez sur "Generate new token" → "Generate new token (classic)"
3. Donnez un nom au token (ex: "Render Deployment")
4. Sélectionnez les permissions :
   - ✅ `repo` (accès complet aux dépôts)
5. Cliquez sur "Generate token"
6. **Copiez le token** (vous ne pourrez plus le voir après)

### 2. Utiliser le token pour pousser

**Méthode A : Dans l'URL (temporaire)**
```bash
git push https://VOTRE_TOKEN@github.com/Fataf57/KSS.git main
```

**Méthode B : Configurer Git Credential Helper (permanent)**
```bash
# Configurer le credential helper
git config --global credential.helper store

# Pousser (Git vous demandera le token une fois)
git push origin main
# Username: Fataf57
# Password: [collez votre token ici]
```

## Option 2 : Utiliser SSH (Plus sécurisé)

### 1. Générer une clé SSH (si vous n'en avez pas)

```bash
ssh-keygen -t ed25519 -C "votre.email@example.com"
```

### 2. Ajouter la clé à GitHub

1. Copiez le contenu de votre clé publique :
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

2. Allez sur GitHub : https://github.com/settings/keys
3. Cliquez sur "New SSH key"
4. Collez votre clé publique
5. Sauvegardez

### 3. Changer l'URL du remote en SSH

```bash
git remote set-url origin git@github.com:Fataf57/KSS.git
git push origin main
```

## Option 3 : Utiliser GitHub CLI

Si vous avez `gh` installé :

```bash
gh auth login
git push origin main
```

## Option 4 : Pousser via l'interface GitHub

Si vous préférez ne pas utiliser la ligne de commande :

1. Allez sur https://github.com/Fataf57/KSS
2. Cliquez sur "Upload files"
3. Glissez-déposez les fichiers modifiés
4. Créez un commit directement sur GitHub

## Vérification

Après avoir poussé, vérifiez sur GitHub :

```bash
git log --oneline -1
```

Et visitez : https://github.com/Fataf57/KSS pour voir vos changements.

## Commandes rapides

Une fois authentifié, vous pouvez simplement utiliser :

```bash
git push origin main
```

## Dépannage

### Erreur : "Permission denied"
- Vérifiez que votre token a les bonnes permissions
- Vérifiez que vous utilisez le bon nom d'utilisateur

### Erreur : "Repository not found"
- Vérifiez que le dépôt existe : https://github.com/Fataf57/KSS
- Vérifiez que vous avez les droits d'écriture

### Voir l'URL actuelle du remote
```bash
git remote -v
```

