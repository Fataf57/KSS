#!/usr/bin/env bash
# Script de démarrage pour le déploiement sur Render

set -o errexit  # Exit on error

echo "Application des migrations..."
python manage.py migrate --noinput

echo "Démarrage du serveur Gunicorn..."
exec gunicorn my_store.wsgi:application

