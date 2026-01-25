#!/usr/bin/env bash
# Script de build pour le frontend React

set -o errexit  # Exit on error

echo "Installation des dépendances..."
npm install

echo "Build de l'application React..."
npm run build

echo "Build terminé avec succès!"

