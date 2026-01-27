# Installation locale des dépendances

## Problème
L'erreur `ModuleNotFoundError: No module named 'dj_database_url'` indique que les dépendances ne sont pas installées localement.

## Solution

### Option 1 : Installer toutes les dépendances (Recommandé)

```bash
cd "/home/ouedraogo/Documents/Rep_coffre/Super-Dkf-main (1)/my_store"
pip install -r requirements.txt
```

### Option 2 : Installer uniquement dj-database-url

```bash
pip install dj-database-url==2.1.0
```

### Option 3 : Utiliser un environnement virtuel (Meilleure pratique)

```bash
# Créer un environnement virtuel
cd "/home/ouedraogo/Documents/Rep_coffre/Super-Dkf-main (1)/my_store"
python3 -m venv venv

# Activer l'environnement virtuel
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

## Après l'installation

Vous pourrez exécuter les migrations :

```bash
python manage.py migrate
```

## Note

- Sur Render, toutes les dépendances sont automatiquement installées via `requirements.txt`
- En local, vous devez les installer manuellement
- L'utilisation d'un environnement virtuel est recommandée pour éviter les conflits

