#!/bin/bash

echo "=========================================="
echo "🔍 Vérification de la connexion Frontend-Backend"
echo "=========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Backend Django accessible
echo "1. Test de connexion au backend Django..."
if curl -s -f -o /dev/null http://127.0.0.1:8000/api/stock-entries/; then
    echo -e "${GREEN}✅ Backend Django est accessible sur http://127.0.0.1:8000${NC}"
else
    echo -e "${RED}❌ Backend Django non accessible${NC}"
    echo "   Vérifiez que le serveur est démarré:"
    echo "   cd my_store && python3 manage.py runserver"
    exit 1
fi
echo ""

# Test 2: Endpoint Stock Entries
echo "2. Test de l'endpoint /api/stock-entries/..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/stock-entries/)
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Endpoint /api/stock-entries/ répond (Status: $STATUS)${NC}"
    COUNT=$(curl -s http://127.0.0.1:8000/api/stock-entries/ | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data))" 2>/dev/null || echo "?")
    echo "   Nombre d'entrées de stock: $COUNT"
else
    echo -e "${RED}❌ Endpoint /api/stock-entries/ retourne: $STATUS${NC}"
fi
echo ""

# Test 3: Endpoint Stock Details
echo "3. Test de l'endpoint /api/stock-entries/details/..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/stock-entries/details/)
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Endpoint /api/stock-entries/details/ répond (Status: $STATUS)${NC}"
else
    echo -e "${RED}❌ Endpoint /api/stock-entries/details/ retourne: $STATUS${NC}"
fi
echo ""

# Test 4: Headers CORS
echo "4. Vérification des headers CORS..."
CORS_ORIGIN=$(curl -s -I -H "Origin: http://localhost:8080" http://127.0.0.1:8000/api/stock-entries/ | grep -i "access-control-allow-origin" || echo "")
if [ -n "$CORS_ORIGIN" ]; then
    echo -e "${GREEN}✅ Headers CORS présents${NC}"
    echo "   $CORS_ORIGIN"
else
    echo -e "${YELLOW}⚠️  Headers CORS non détectés (peut être normal pour certaines requêtes)${NC}"
fi
echo ""

# Test 5: Configuration frontend
echo "5. Vérification de la configuration frontend..."
if [ -f "react-app/src/config/api.ts" ]; then
    echo -e "${GREEN}✅ Fichier de configuration API trouvé${NC}"
    API_URL=$(grep "API_BASE_URL" react-app/src/config/api.ts | head -1)
    echo "   $API_URL"
else
    echo -e "${RED}❌ Fichier de configuration API non trouvé${NC}"
fi
echo ""

# Test 6: Ports utilisés
echo "6. Vérification des ports..."
if lsof -ti:8000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Port 8000 est utilisé (probablement Django)${NC}"
else
    echo -e "${YELLOW}⚠️  Port 8000 n'est pas utilisé${NC}"
fi

if lsof -ti:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Port 8080 est utilisé (probablement React/Vite)${NC}"
else
    echo -e "${YELLOW}⚠️  Port 8080 n'est pas utilisé${NC}"
fi
echo ""

# Test 7: Test d'une requête complète
echo "7. Test d'une requête complète GET..."
RESPONSE=$(curl -s http://127.0.0.1:8000/api/stock-entries/ | head -c 200)
if [ -n "$RESPONSE" ]; then
    echo -e "${GREEN}✅ Requête réussie${NC}"
    echo "   Aperçu de la réponse: ${RESPONSE}..."
else
    echo -e "${RED}❌ Aucune réponse reçue${NC}"
fi
echo ""

echo "=========================================="
echo "✅ Vérification terminée!"
echo "=========================================="
echo ""
echo "Pour tester depuis le navigateur, ouvrez:"
echo "  file://$(pwd)/test_connection.html"
echo ""
echo "Ou testez directement depuis votre application React."

