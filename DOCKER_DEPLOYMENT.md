# Docker Deployment Guide

This guide will help you deploy the Media Stream application on your Ubuntu server using Docker.

## Prerequisites

### 1. Install Docker on Ubuntu

```bash
# Update package list
sudo apt update

# Install dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 2. Add your user to docker group (optional, to run without sudo)

```bash
sudo usermod -aG docker $USER
newgrp docker
```

## Deployment Steps

### 1. Copy Files to Your Server

Transfer the entire `media-stream` directory to your Ubuntu server:

```bash
# From your local machine
scp -r /path/to/local/media-stream your-user@your-server-ip:/home/your-user/

# Or use rsync for better performance
rsync -avz --progress /path/to/local/media-stream your-user@your-server-ip:/home/your-user/
```

### 2. Set Up Environment Variables

```bash
cd /path/to/media-stream

# Copy the example environment file
cp .env.example .env

# Generate secure random keys
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Update .env file with the generated keys
cat > .env << EOF
NODE_ENV=production
PORT=3000
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
EOF

# Show the generated keys (save these somewhere safe!)
echo "Generated JWT_SECRET: $JWT_SECRET"
echo "Generated ENCRYPTION_KEY: $ENCRYPTION_KEY"
```

### 3. Build and Start the Containers

```bash
# Build the Docker images
docker compose build

# Start the services
docker compose up -d

# Check if containers are running
docker compose ps

# View logs
docker compose logs -f
```

The application will be available at:
- **Frontend**: http://your-server-ip (port 80)
- **Backend API**: http://your-server-ip:3000

### 4. Verify Deployment

```bash
# Check backend health
curl http://localhost:3000/health

# Check if containers are healthy
docker compose ps
```

## Managing the Application

### Start/Stop/Restart

```bash
# Stop all services
docker compose stop

# Start all services
docker compose start

# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend
```

### View Logs

```bash
# View all logs
docker compose logs

# Follow logs (real-time)
docker compose logs -f

# View specific service logs
docker compose logs backend
docker compose logs frontend

# View last 100 lines
docker compose logs --tail=100
```

### Update the Application

```bash
# Pull latest changes (if using git)
git pull

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Stop and Remove Everything

```bash
# Stop and remove containers
docker compose down

# Stop, remove containers, and remove volumes (WARNING: deletes database)
docker compose down -v
```

## Database Management

### Backup Database

```bash
# Copy database from container
docker compose cp backend:/app/database.sqlite ./backup-$(date +%Y%m%d-%H%M%S).sqlite

# Or backup from volume
cp ./backend/database.sqlite ./backup-$(date +%Y%m%d-%H%M%S).sqlite
```

### Restore Database

```bash
# Stop backend
docker compose stop backend

# Restore database
cp ./backup-YYYYMMDD-HHMMSS.sqlite ./backend/database.sqlite

# Start backend
docker compose start backend
```

## Firewall Configuration

If you have a firewall enabled (UFW), allow the necessary ports:

```bash
# Allow HTTP
sudo ufw allow 80/tcp

# Allow backend API (optional, if you want external access)
sudo ufw allow 3000/tcp

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Setting Up HTTPS with Let's Encrypt (Optional)

### Using Nginx Reverse Proxy

1. Install Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

2. Update docker-compose.yml to expose different port:
```yaml
frontend:
  ports:
    - "8080:80"  # Change from 80:80
```

3. Create Nginx configuration on host:
```bash
sudo nano /etc/nginx/sites-available/media-stream
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
}
```

4. Enable and get certificate:
```bash
sudo ln -s /etc/nginx/sites-available/media-stream /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring

### Check Resource Usage

```bash
# Container stats
docker stats

# Specific container
docker stats media-stream-backend
```

### Health Checks

```bash
# Check backend health
curl http://localhost:3000/health

# Check if all services are up
docker compose ps
```

## Troubleshooting

### Container won't start

```bash
# View detailed logs
docker compose logs backend
docker compose logs frontend

# Check container status
docker compose ps

# Restart specific service
docker compose restart backend
```

### Database issues

```bash
# Access backend container
docker compose exec backend sh

# Check database file
ls -la /app/database.sqlite

# Check permissions
chmod 644 /app/database.sqlite
```

### Port already in use

```bash
# Check what's using port 80
sudo lsof -i :80

# Kill process if needed
sudo kill -9 <PID>

# Or change port in docker-compose.yml
```

### Cannot connect to backend

```bash
# Check if backend is running
docker compose ps backend

# Check backend logs
docker compose logs backend

# Test backend directly
docker compose exec backend wget -O- http://localhost:3000/health
```

## Performance Optimization

### Limit Container Resources

Edit `docker-compose.yml`:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

### Enable Log Rotation

```yaml
backend:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

## Auto-Start on Boot

Docker containers with `restart: unless-stopped` will automatically start when the server reboots.

To enable Docker to start on boot:
```bash
sudo systemctl enable docker
```

## Security Best Practices

1. **Use strong secrets**: Generate random JWT_SECRET and ENCRYPTION_KEY
2. **Keep Docker updated**: `sudo apt update && sudo apt upgrade`
3. **Use HTTPS**: Set up SSL certificates with Let's Encrypt
4. **Firewall**: Only expose necessary ports
5. **Regular backups**: Backup database regularly
6. **Monitor logs**: Check logs for suspicious activity
7. **Update application**: Keep the app and dependencies updated

## Quick Reference

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart
docker compose restart

# Rebuild
docker compose build --no-cache

# Check status
docker compose ps

# Backup database
docker compose cp backend:/app/database.sqlite ./backup.sqlite
```

## Support

If you encounter issues:
1. Check the logs: `docker compose logs -f`
2. Verify containers are running: `docker compose ps`
3. Test backend health: `curl http://localhost:3000/health`
4. Check firewall settings: `sudo ufw status`
5. Verify environment variables: `cat .env`
