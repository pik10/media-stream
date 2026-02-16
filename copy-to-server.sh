#!/bin/bash

# Script to copy Media Stream application to server
# Usage: ./copy-to-server.sh user@server-ip:/destination/path

set -e

if [ -z "$1" ]; then
    echo "Usage: ./copy-to-server.sh user@server-ip:/destination/path"
    echo ""
    echo "Example:"
    echo "  ./copy-to-server.sh user@192.168.1.100:/path/to/media-stream"
    echo "  ./copy-to-server.sh user@example.com:/home/user/apps/media-stream"
    exit 1
fi

DESTINATION="$1"

echo "========================================="
echo "Media Stream - Copy to Server"
echo "========================================="
echo ""
echo "Copying files to: $DESTINATION"
echo ""

# Use rsync to copy, excluding unnecessary files
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude 'database.sqlite' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude '.gitignore' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude 'backup-*.sqlite' \
    ./ "$DESTINATION/"

echo ""
echo "✓ Files copied successfully!"
echo ""
echo "Next steps:"
echo "1. SSH to your server:"
echo "   ssh ${DESTINATION%:*}"
echo ""
echo "2. Navigate to the directory:"
echo "   cd ${DESTINATION#*:}"
echo ""
echo "3. Make deploy script executable:"
echo "   chmod +x deploy.sh"
echo ""
echo "4. Deploy the application:"
echo "   ./deploy.sh"
echo ""
echo "5. Configure Caddy (see CADDY_SETUP.md)"
echo ""
