#!/bin/bash

# Script to update deployment after making code changes
# Usage: ./update-deployment.sh user@server:/path/to/media-stream

set -e

if [ -z "$1" ]; then
    echo "Usage: ./update-deployment.sh user@server:/path/to/media-stream"
    echo ""
    echo "Example:"
    echo "  ./update-deployment.sh user@your-server.com:/path/to/media-stream"
    exit 1
fi

DESTINATION="$1"
SERVER="${DESTINATION%:*}"
PATH_ON_SERVER="${DESTINATION#*:}"

echo "========================================="
echo "Media Stream - Update Deployment"
echo "========================================="
echo ""
echo "This will:"
echo "1. Copy updated files to server"
echo "2. Rebuild containers with changes"
echo "3. Restart the application"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Step 1: Copying files to server..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'database.sqlite' \
    --exclude 'data' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude 'backup-*.sqlite' \
    ./ "$DESTINATION/"

echo ""
echo "Step 2: Rebuilding and restarting on server..."
ssh "$SERVER" << EOF
    cd "$PATH_ON_SERVER"

    echo "Stopping containers..."
    docker compose down

    echo "Rebuilding containers..."
    docker compose build --no-cache

    echo "Starting containers..."
    docker compose up -d

    echo "Waiting for containers to start..."
    sleep 5

    echo ""
    echo "Container status:"
    docker compose ps

    echo ""
    echo "Backend logs (last 10 lines):"
    docker compose logs --tail=10 backend
EOF

echo ""
echo "========================================="
echo "✓ Deployment updated!"
echo "========================================="
echo ""
echo "To view logs:"
echo "  ssh $SERVER 'cd $PATH_ON_SERVER && docker compose logs -f'"
echo ""
