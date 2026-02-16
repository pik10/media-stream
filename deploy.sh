#!/bin/bash

# Media Stream Docker Deployment Script
# This script helps deploy the application quickly

set -e

echo "========================================="
echo "Media Stream Docker Deployment"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed!"
    echo "Please install Docker first. See DOCKER_DEPLOYMENT.md for instructions."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed!"
    echo "Please install Docker Compose first. See DOCKER_DEPLOYMENT.md for instructions."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."

    # Generate secure random keys
    JWT_SECRET=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)

    cat > .env << EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
EOF

    echo "✓ Generated secure .env file"
    echo ""
    echo "IMPORTANT: Save these keys somewhere safe!"
    echo "JWT_SECRET=$JWT_SECRET"
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
    echo ""
else
    echo "✓ .env file already exists"
    echo ""
fi

# Ask user what to do
echo "What would you like to do?"
echo "1) Build and start containers"
echo "2) Stop containers"
echo "3) Restart containers"
echo "4) View logs"
echo "5) Rebuild from scratch"
echo "6) Backup database"
echo "7) Exit"
echo ""
read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        echo "Building and starting containers..."
        docker compose build
        docker compose up -d
        echo ""
        echo "✓ Containers started successfully!"
        echo ""
        echo "Access your application at:"
        echo "  Frontend: http://localhost (or http://your-server-ip)"
        echo "  Backend:  http://localhost:3000/health"
        echo ""
        echo "To view logs: docker compose logs -f"
        ;;
    2)
        echo "Stopping containers..."
        docker compose down
        echo "✓ Containers stopped"
        ;;
    3)
        echo "Restarting containers..."
        docker compose restart
        echo "✓ Containers restarted"
        ;;
    4)
        echo "Showing logs (Ctrl+C to exit)..."
        docker compose logs -f
        ;;
    5)
        echo "Rebuilding from scratch..."
        docker compose down
        docker compose build --no-cache
        docker compose up -d
        echo "✓ Rebuild complete!"
        ;;
    6)
        BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sqlite"
        echo "Creating database backup: $BACKUP_FILE"
        docker compose cp backend:/app/database.sqlite "./$BACKUP_FILE" 2>/dev/null || cp ./backend/database.sqlite "./$BACKUP_FILE"
        echo "✓ Database backed up to $BACKUP_FILE"
        ;;
    7)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice!"
        exit 1
        ;;
esac
