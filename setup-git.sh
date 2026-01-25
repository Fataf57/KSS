#!/usr/bin/env bash
# Script pour initialiser Git et connecter à un dépôt GitHub

set -e

echo "🚀 Configuration Git pour déploiement Render"
echo ""

# Demander l'URL du dépôt GitHub
read -p "Entrez l'URL de votre dépôt GitHub (ex: https://github.com/username/repo.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ Erreur: URL du dépôt requise"
    exit 1
fi

# Initialiser Git si pas déjà fait
if [ ! -d ".git" ]; then
    echo "📦 Initialisation du dépôt Git..."
    git init
    echo "✅ Dépôt Git initialisé"
else
    echo "ℹ️  Dépôt Git déjà initialisé"
fi

# Vérifier si un remote existe déjà
if git remote get-url origin &>/dev/null; then
    echo "⚠️  Un remote 'origin' existe déjà"
    read -p "Voulez-vous le remplacer? (o/n): " REPLACE
    if [ "$REPLACE" = "o" ] || [ "$REPLACE" = "O" ]; then
        git remote remove origin
        echo "✅ Ancien remote supprimé"
    else
        echo "❌ Opération annulée"
        exit 1
    fi
fi

# Ajouter le remote
echo "🔗 Ajout du remote GitHub..."
git remote add origin "$REPO_URL"
echo "✅ Remote ajouté: $REPO_URL"

# Ajouter tous les fichiers
echo "📝 Ajout des fichiers..."
git add .

# Faire le commit initial
echo "💾 Création du commit initial..."
git commit -m "Configuration initiale pour déploiement Render" || {
    echo "⚠️  Aucun changement à commiter (peut-être déjà commité?)"
}

# Demander si on veut pousser
read -p "Voulez-vous pousser vers GitHub maintenant? (o/n): " PUSH
if [ "$PUSH" = "o" ] || [ "$PUSH" = "O" ]; then
    echo "📤 Envoi vers GitHub..."
    git branch -M main 2>/dev/null || true
    git push -u origin main || {
        echo "⚠️  Erreur lors du push. Essayez manuellement:"
        echo "   git push -u origin main"
        echo "   ou"
        echo "   git push -u origin main --force"
    }
    echo "✅ Configuration terminée!"
else
    echo "ℹ️  Pour pousser plus tard, utilisez:"
    echo "   git push -u origin main"
fi

echo ""
echo "✅ Configuration Git terminée!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Allez sur https://render.com"
echo "2. Créez un nouveau Blueprint"
echo "3. Connectez votre dépôt GitHub"
echo "4. Render détectera automatiquement render.yaml"
echo ""
echo "📖 Pour plus d'informations, consultez GITHUB_DEPLOY.md"

