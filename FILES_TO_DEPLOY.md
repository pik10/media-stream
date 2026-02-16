# Files to Deploy to Server

## Essential Files Only

You need to copy these files to your Ubuntu server:

```
media-stream/
├── backend/
│   ├── src/                    # All backend source code
│   ├── package.json            # Dependencies
│   ├── Dockerfile              # Container config
│   └── .dockerignore           # Build optimization
│
├── frontend/
│   ├── src/                    # All frontend source code
│   ├── package.json            # Dependencies
│   ├── vite.config.js          # Build config
│   ├── index.html              # HTML template
│   ├── Dockerfile              # Container config
│   ├── nginx.conf              # Nginx config
│   └── .dockerignore           # Build optimization
│
├── docker-compose.yml          # Orchestration
├── .env.example                # Environment template
├── deploy.sh                   # Deployment script
└── CADDY_SETUP.md             # Setup instructions
```

## DO NOT Copy

**Exclude these (they'll be created/generated):**
- `node_modules/` (both backend and frontend)
- `backend/database.sqlite` (will be created on server)
- `frontend/dist/` (build output)
- `.env` (will be generated)
- `.git/` (if present)
- Any `.log` files

## Quick Copy Commands

### Option 1: Using rsync (Recommended)

```bash
# From your local machine
cd /path/to/local

rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'database.sqlite' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '*.log' \
  media-stream/ user@your-server:/home/user/media-stream/
```

### Option 2: Using scp

```bash
# From your local machine
cd /path/to/local

scp -r media-stream user@your-server:/home/user/
```

### Option 3: Create a tarball

```bash
# On local machine
cd /path/to/local

# Create tarball (excluding unnecessary files)
tar -czf media-stream.tar.gz \
  --exclude='node_modules' \
  --exclude='database.sqlite' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='*.log' \
  media-stream/

# Copy to server
scp media-stream.tar.gz user@your-server:/home/user/

# On server, extract
ssh user@your-server
cd /home/user
tar -xzf media-stream.tar.gz
```

## File Sizes (Approximate)

- Backend source: ~50 KB
- Frontend source: ~100 KB
- Total to copy: ~200 KB (excluding node_modules)

After deployment, Docker images will be ~175 MB total.

## Verification After Copy

On your server, verify the structure:

```bash
cd /home/user/media-stream

# Check main files exist
ls -la docker-compose.yml deploy.sh

# Check backend structure
ls -la backend/src/
ls -la backend/package.json

# Check frontend structure
ls -la frontend/src/
ls -la frontend/package.json

# Make deploy script executable
chmod +x deploy.sh
```

## Complete Deployment Steps

1. **Copy files to server** (using one of the methods above)

2. **SSH to server:**
   ```bash
   ssh user@your-server
   cd /home/user/media-stream
   ```

3. **Deploy:**
   ```bash
   ./deploy.sh
   # Choose option 1
   ```

4. **Configure Caddy** (see CADDY_SETUP.md)

5. **Access app** at your domain

## Minimal Required Structure

If you want to copy absolutely minimal files:

```
media-stream/
├── backend/
│   ├── src/           # REQUIRED
│   ├── package.json   # REQUIRED
│   └── Dockerfile     # REQUIRED
├── frontend/
│   ├── src/           # REQUIRED
│   ├── package.json   # REQUIRED
│   ├── index.html     # REQUIRED
│   ├── vite.config.js # REQUIRED
│   ├── Dockerfile     # REQUIRED
│   └── nginx.conf     # REQUIRED
├── docker-compose.yml # REQUIRED
└── deploy.sh          # REQUIRED
```

Everything else is optional (but helpful for documentation).
