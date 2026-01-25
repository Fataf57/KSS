#!/usr/bin/env bash
# Script pour pousser les changements vers GitHub

set -e

echo "🚀 Mise à jour du dépôt GitHub pour Render"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "render.yaml" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Afficher l'état actuel
echo "📋 État actuel du dépôt :"
git status --short
echo ""

# Demander confirmation
read -p "Voulez-vous ajouter tous les fichiers et pousser vers GitHub? (o/n): " CONFIRM

if [ "$CONFIRM" != "o" ] && [ "$CONFIRM" != "O" ]; then
    echo "❌ Opération annulée"
    exit 0
fi

# Ajouter tous les fichiers
echo "📝 Ajout des fichiers..."
git add .

# Afficher ce qui sera commité
echo ""
echo "📦 Fichiers qui seront commités :"
git status --short
echo ""

# Créer le commit
echo "💾 Création du commit..."
git commit -m "Configuration pour déploiement Render - Correction render.yaml et ajout fichiers de configuration" || {
    echo "⚠️  Aucun changement à commiter (peut-être déjà commité?)"
    exit 0
}

# Pousser vers GitHub
echo "📤 Envoi vers GitHub..."
git push origin main

echo ""
echo "✅ Fichiers poussés vers GitHub avec succès!"
echo ""
echo "📋 Prochaines étapes :"
echo "1. Allez sur https://dashboard.render.com"
echo "2. Si vous avez un Blueprint, il détectera automatiquement les changements"
echo "3. Sinon, créez un nouveau Blueprint et connectez le dépôt Fataf57/KSS"
echo ""
echo "🔗 Votre dépôt : https://github.com/Fataf57/KSS"

