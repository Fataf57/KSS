# Super-Dkf

Application complète de gestion avec backend Django et frontend React.

## Structure du projet

- `my_store/` - Backend Django REST API
- `react-app/` - Frontend React (TypeScript/Vite) - **Dossier principal du frontend**
- `carton-central-main/` - Ancien dossier frontend (peut être supprimé)

## Prérequis

- Python 3.10+
- Node.js 18+ et npm
- SQLite (par défaut) ou PostgreSQL (optionnel)

## Installation et démarrage

### Backend Django

```bash
cd my_store
python3 -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver
```

Le backend sera accessible sur `http://127.0.0.1:8000`

### Frontend React

```bash
cd react-app
npm install
npm run dev
```

Le frontend sera accessible sur `http://localhost:8080`

## Configuration

### URL de l'API

L'URL de base de l'API est configurée dans `react-app/src/config/api.ts` et peut être modifiée via le fichier `.env` dans `react-app/`.

Le fichier `.env` est créé automatiquement avec la valeur par défaut :
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

**Note**: Tous les appels API utilisent maintenant la fonction `getApiUrl()` depuis `@/config/api` pour une configuration centralisée.

### Proxy Vite

Le serveur de développement Vite est configuré avec un proxy vers l'API Django. Les requêtes vers `/api` sont automatiquement redirigées vers `http://127.0.0.1:8000`.

### CORS

Les paramètres CORS dans Django (`my_store/my_store/settings.py`) sont configurés pour autoriser les requêtes depuis :
- `http://localhost:8080`
- `http://127.0.0.1:8080`
- `http://[::1]:8080` (IPv6)

## Technologies utilisées

- **Backend**: Django 5.2, Django REST Framework, CORS Headers
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI
- **Base de données**: SQLite (développement) / PostgreSQL (production)

## Fonctionnalités

- Gestion des stocks (entrées, détails)
- Gestion des clients et suivi des chargements
- Gestion des produits
- Gestion des commandes
- Gestion des ventes
- Gestion des factures
- Gestion des dépenses

