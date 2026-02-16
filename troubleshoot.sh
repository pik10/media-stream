#!/bin/bash

echo "========================================="
echo "Media Stream Troubleshooting"
echo "========================================="
echo ""

echo "1. Checking if containers are running..."
docker compose ps
echo ""

echo "2. Checking container networks..."
echo "   Backend networks:"
docker inspect media-stream-backend --format='{{range $key, $value := .NetworkSettings.Networks}}{{$key}} {{end}}'
echo ""
echo "   Frontend networks:"
docker inspect media-stream-frontend --format='{{range $key, $value := .NetworkSettings.Networks}}{{$key}} {{end}}'
echo ""

echo "3. Checking backend health..."
docker exec media-stream-backend wget -qO- http://localhost:3000/health 2>/dev/null || echo "   ✗ Backend health check failed"
echo ""

echo "4. Checking if backend is accessible from frontend..."
docker exec media-stream-frontend wget -qO- http://media-stream-backend:3000/health 2>/dev/null || echo "   ✗ Cannot reach backend from frontend"
echo ""

echo "5. Checking proxy network..."
docker network inspect proxy | grep -A 3 "Containers" || echo "   ✗ Proxy network not found or no containers"
echo ""

echo "6. Backend logs (last 20 lines):"
docker compose logs --tail=20 backend
echo ""

echo "========================================="
echo "Common Issues and Solutions:"
echo "========================================="
echo ""
echo "Issue: Containers not on proxy network"
echo "Fix: docker compose down && docker compose up -d"
echo ""
echo "Issue: Backend not responding"
echo "Fix: docker compose logs backend"
echo ""
echo "Issue: Wrong Caddyfile config"
echo "Check: Container names should be 'media-stream-backend' and 'media-stream-frontend'"
echo ""
