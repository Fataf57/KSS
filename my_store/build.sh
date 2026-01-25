#!/usr/bin/env bash
# Script de build pour le déploiement sur Render

set -o errexit  # Exit on error

echo "Installation des dépendances..."
pip install -r requirements.txt

echo "Collecte des fichiers statiques..."
python manage.py collectstatic --noinput

echo "Application des migrations..."
python manage.py migrate --noinput

echo "Build terminé avec succès!"

