# Docker Quick Start Guide

Get the Media Stream application running with Docker in 5 minutes!

## Prerequisites

- Ubuntu server (or any Linux with Docker support)
- Docker and Docker Compose installed
- Ports 80 and 3000 available

## Super Quick Start

### 1. Install Docker (if not already installed)

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Deploy the Application

```bash
# Navigate to the project directory
cd media-stream

# Run the deployment script
./deploy.sh

# Choose option 1: Build and start containers
```

That's it! The application will be available at:
- **Frontend**: http://your-server-ip
- **Backend**: http://your-server-ip:3000

## Manual Deployment

If you prefer manual control:

```bash
# 1. Set up environment variables
cp .env.example .env

# Generate secure keys
export JWT_SECRET=$(openssl rand -hex 32)
export ENCRYPTION_KEY=$(openssl rand -hex 32)

# Update .env file
cat > .env << EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
EOF

# 2. Build and start
docker compose build
docker compose up -d

# 3. Check status
docker compose ps
docker compose logs -f
```

## Common Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart
docker compose restart

# Check status
docker compose ps

# Backup database
docker compose cp backend:/app/database.sqlite ./backup.sqlite
```

## Using the Application

1. Open http://your-server-ip in your browser
2. Register a new account
3. Add your S3/Garage library
4. Start streaming videos!

## Troubleshooting

### Can't access the application?

```bash
# Check if containers are running
docker compose ps

# View logs
docker compose logs

# Check firewall
sudo ufw allow 80/tcp
```

### Need to see detailed logs?

```bash
# Backend logs
docker compose logs backend -f

# Frontend logs
docker compose logs frontend -f
```

### Database issues?

```bash
# Access backend container
docker compose exec backend sh

# Check database
ls -la /app/database.sqlite
```

## Updating the Application

```bash
# Stop containers
docker compose down

# Rebuild (if code changed)
docker compose build --no-cache

# Start again
docker compose up -d
```

## Production Deployment Tips

1. **Use HTTPS**: Set up SSL with Let's Encrypt (see DOCKER_DEPLOYMENT.md)
2. **Backup regularly**: Schedule database backups
3. **Monitor logs**: Use `docker compose logs -f`
4. **Set resource limits**: Edit docker-compose.yml to add CPU/memory limits
5. **Secure environment variables**: Never commit .env to git

## Full Documentation

For complete deployment guide including:
- HTTPS setup with Let's Encrypt
- Advanced configuration
- Monitoring and troubleshooting
- Security best practices

See: **[DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)**

## Architecture

```
┌─────────────────┐
│   Nginx (80)    │  Frontend Container
│   React App     │
└────────┬────────┘
         │ /api
         ↓
┌─────────────────┐
│  Node.js (3000) │  Backend Container
│  Express API    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  SQLite DB      │  Volume/Bind Mount
│  database.sqlite│
└─────────────────┘
```

## Need Help?

1. Check logs: `docker compose logs -f`
2. Verify status: `docker compose ps`
3. Test backend: `curl http://localhost:3000/health`
4. Read full guide: [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
