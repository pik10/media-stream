# How to Update Your Deployment

Guide for applying local code changes to your running Docker containers.

## Quick Update (Automated)

Use the update script:

```bash
cd /path/to/local/media-stream
./update-deployment.sh user@your-server.com:/path/to/media-stream
```

This will:
1. Copy updated files to server
2. Rebuild containers
3. Restart the application

## Manual Update Process

If you prefer to do it manually:

### Step 1: Make Changes Locally

Edit files in `/path/to/local/media-stream/`

### Step 2: Copy to Server

```bash
cd /path/to/local/media-stream

rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'data' \
  --exclude '.git' \
  backend/ user@your-server.com:/path/to/media-stream/backend/

# Or for frontend changes:
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  frontend/ user@your-server.com:/path/to/media-stream/frontend/
```

### Step 3: Rebuild on Server

```bash
ssh user@your-server.com
cd /path/to/media-stream

# Stop containers
docker compose down

# Rebuild (use --no-cache to ensure fresh build)
docker compose build --no-cache

# Or rebuild just one service:
# docker compose build --no-cache backend
# docker compose build --no-cache frontend

# Start containers
docker compose up -d

# Check status
docker compose ps
docker compose logs -f
```

## Different Update Scenarios

### Scenario 1: Backend Code Changes Only

If you only changed backend code (src/routes, src/services, etc.):

```bash
# Copy backend files
rsync -avz backend/src/ user@your-server.com:/path/to/media-stream/backend/src/

# On server
ssh user@your-server.com
cd /path/to/media-stream
docker compose stop backend
docker compose build --no-cache backend
docker compose up -d backend
docker compose logs -f backend
```

### Scenario 2: Frontend Code Changes Only

If you only changed frontend code (src/components, src/pages, etc.):

```bash
# Copy frontend files
rsync -avz frontend/src/ user@your-server.com:/path/to/media-stream/frontend/src/

# On server
ssh user@your-server.com
cd /path/to/media-stream
docker compose stop frontend
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Scenario 3: Dependency Changes (package.json)

If you added/updated dependencies:

```bash
# Copy package.json
rsync -avz backend/package.json user@your-server.com:/path/to/media-stream/backend/

# On server - MUST rebuild with --no-cache
ssh user@your-server.com
cd /path/to/media-stream
docker compose down
docker compose build --no-cache backend
docker compose up -d
```

### Scenario 4: Docker Configuration Changes

If you changed Dockerfile or docker-compose.yml:

```bash
# Copy configuration
rsync -avz docker-compose.yml user@your-server.com:/path/to/media-stream/
rsync -avz backend/Dockerfile user@your-server.com:/path/to/media-stream/backend/

# On server - full rebuild required
ssh user@your-server.com
cd /path/to/media-stream
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Scenario 5: Database Schema Changes

If you changed database schema:

```bash
# ⚠️ WARNING: This will reset the database!

# On server
ssh user@your-server.com
cd /path/to/media-stream

# Backup database first!
cp data/database.sqlite data/database.backup.sqlite

# Remove old database (or rename to keep backup)
rm data/database.sqlite

# Restart backend to create new schema
docker compose restart backend
```

## Quick Commands Reference

```bash
# Full update (everything)
./update-deployment.sh user@your-server.com:/path/to/media-stream

# Copy all files
rsync -avz --exclude 'node_modules' --exclude 'data' ./ user@your-server.com:/path/to/media-stream/

# Rebuild everything
docker compose down && docker compose build --no-cache && docker compose up -d

# Rebuild just backend
docker compose build --no-cache backend && docker compose up -d backend

# Rebuild just frontend
docker compose build --no-cache frontend && docker compose up -d frontend

# View logs
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# Check status
docker compose ps
```

## When to Use --no-cache

Use `--no-cache` when:
- ✅ You changed dependencies (package.json)
- ✅ Build seems to use old code
- ✅ You want to ensure completely fresh build
- ✅ First time after major changes

Don't need `--no-cache` when:
- ❌ Quick iteration on same code
- ❌ Only changed source files (not dependencies)
- ❌ Want faster builds during development

## Testing Changes Locally First

Before deploying to server, test locally:

```bash
# Stop your dev servers
# (Stop the npm start and npm run dev processes)

# Build and run with Docker locally
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up

# Test at http://localhost

# When satisfied, deploy to server
```

## Rollback to Previous Version

If something goes wrong:

```bash
# On server
ssh user@your-server.com
cd /path/to/media-stream

# Stop containers
docker compose down

# Restore from backup (if you have one)
# Or re-copy old version from your local machine

# Rebuild and restart
docker compose build --no-cache
docker compose up -d
```

## Best Practices

1. **Always test locally first** before deploying to production
2. **Backup database** before major changes: `cp data/database.sqlite data/database.backup.sqlite`
3. **Use version control** (git) to track changes
4. **Check logs** after deployment: `docker compose logs -f`
5. **Keep .env secrets safe** - never commit to git
6. **Use --no-cache** when in doubt - it's safer but slower

## Troubleshooting After Update

### Containers won't start

```bash
# Check logs
docker compose logs

# Try clean rebuild
docker compose down
docker system prune -f
docker compose build --no-cache
docker compose up -d
```

### Old code still running

```bash
# Force rebuild without cache
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Changes not appearing

```bash
# Verify files were copied
ssh user@your-server.com 'ls -la /path/to/media-stream/backend/src/'

# Check if container rebuilt
docker images | grep media-stream

# Rebuild with verbose output
docker compose build --no-cache --progress=plain
```

## Development Workflow

Recommended workflow for making changes:

```bash
# 1. Make changes locally
vim backend/src/routes/auth.js

# 2. Test locally (without Docker)
cd backend && npm start

# 3. When working, test with Docker locally
docker compose build backend
docker compose up

# 4. Deploy to server
./update-deployment.sh user@your-server.com:/path/to/media-stream

# 5. Monitor logs
ssh user@your-server.com 'cd /path/to/media-stream && docker compose logs -f'
```

## Quick Update Checklist

- [ ] Made and tested changes locally
- [ ] Backed up database (if schema changes)
- [ ] Copied files to server
- [ ] Rebuilt containers
- [ ] Checked logs for errors
- [ ] Tested application works
- [ ] Verified database intact
