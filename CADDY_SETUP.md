# Media Stream with Existing Caddy (Proxy Network)

Setup guide for running Media Stream containers with your existing Caddy reverse proxy using the `proxy` Docker network.

## Architecture

Your setup uses:
- **`proxy` network**: Shared network where Caddy accesses containers
- **`default` network**: Internal network for frontend-backend communication

## Quick Setup

### 1. Verify Proxy Network Exists

Your Caddy container should already be on the `proxy` network. Verify:

```bash
docker network inspect proxy
```

You should see your Caddy container listed.

### 2. Deploy Media Stream Containers

```bash
cd media-stream
./deploy.sh
# Choose option 1: Build and start containers
```

This will:
- Start containers on both `proxy` and `default` networks
- No ports exposed to host
- Accessible only via Caddy

### 3. Configure Your Caddyfile

Add this to your existing Caddyfile:

```caddy
media.your-domain.com {
    # Frontend - React app
    reverse_proxy media-stream-frontend:80

    # API and streaming
    reverse_proxy /api/* media-stream-backend:3000 {
        # CRITICAL: Disable buffering for video streaming
        flush_interval -1
    }

    encode gzip

    log {
        output file /var/log/caddy/media-stream.log
    }
}
```

**Important**: Use the **container names**:
- `media-stream-frontend`
- `media-stream-backend`

### 4. Reload Caddy

```bash
# If Caddy is in Docker
docker exec <caddy-container-name> caddy reload --config /etc/caddy/Caddyfile

# If Caddy is on host
sudo systemctl reload caddy
```

### 5. Access Your App

Visit: `https://media.your-domain.com`

## Verification

### Check Containers Are Running

```bash
docker compose ps

# Should show both containers as "Up"
# No port mappings should be displayed
```

### Check Networks

```bash
# Verify both containers are on proxy network
docker network inspect proxy | grep -A 5 media-stream

# Should show:
# - media-stream-frontend
# - media-stream-backend
```

### Test Backend Health

```bash
# From Caddy container
docker exec <caddy-container> wget -qO- http://media-stream-backend:3000/health

# Should return: {"status":"ok",...}
```

## Network Structure

```
Internet
   ↓
[Caddy Container]
   ↓
━━━━━━━━━━━━━━━━━━━━━━━━
 proxy network (external)
━━━━━━━━━━━━━━━━━━━━━━━━
   ↓              ↓
[Frontend]  [Backend]
   ↓              ↓
━━━━━━━━━━━━━━━━━━━━━━━━
 default network (internal)
━━━━━━━━━━━━━━━━━━━━━━━━
   Frontend ←→ Backend
```

## Example Caddyfile

```caddy
# Your existing services...
example.com {
    reverse_proxy some-container:8080
}

# Media Stream app
media.example.com {
    reverse_proxy media-stream-frontend:80
    reverse_proxy /api/* media-stream-backend:3000 {
        flush_interval -1
    }
    encode gzip
}

# Alternative: different subdomain
stream.example.com {
    reverse_proxy media-stream-frontend:80
    reverse_proxy /api/* media-stream-backend:3000 {
        flush_interval -1
    }
    encode gzip
}
```

## Troubleshooting

### Error: network proxy declared as external, but could not be found

The `proxy` network doesn't exist. Create it:

```bash
docker network create proxy

# Then restart containers
cd media-stream
docker compose down
docker compose up -d
```

### Caddy can't reach containers

Verify Caddy is on the proxy network:

```bash
docker network inspect proxy
```

If Caddy is not listed, connect it:

```bash
docker network connect proxy <caddy-container-name>
```

### Frontend can't reach backend

This should work automatically via the `default` network. Check:

```bash
# Test from frontend container
docker exec media-stream-frontend wget -qO- http://media-stream-backend:3000/health
```

If it fails, check logs:

```bash
docker compose logs backend
docker compose logs frontend
```

### Need different network name?

Edit `docker-compose.yml` and change:

```yaml
networks:
  proxy:
    external: true
    name: your-network-name  # Change this
```

## Security Benefits

✅ No ports exposed to host
✅ Only accessible via Caddy reverse proxy
✅ Isolated networks (proxy for external, default for internal)
✅ HTTPS automatically handled by Caddy
✅ Backend not directly accessible from proxy network (only via frontend)

## Container Communication

- **Frontend ↔ Backend**: Uses `default` network (internal)
- **Caddy → Frontend**: Uses `proxy` network
- **Caddy → Backend**: Uses `proxy` network (for /api/* routes)

## Complete Docker Compose Networks

Your final setup will have:

```
media-stream/docker-compose.yml:
  - proxy (external) - shared with Caddy
  - default (created) - internal communication

Caddy container:
  - proxy (existing)
  - [other networks you have]

Other containers:
  - default (their own)
  - [possibly proxy if they need Caddy access]
```

## Quick Reference

```bash
# Verify proxy network exists
docker network inspect proxy

# Deploy containers
cd media-stream && ./deploy.sh

# Check status
docker compose ps

# View logs
docker compose logs -f

# Test from Caddy
docker exec <caddy-container> wget -qO- http://media-stream-backend:3000/health

# Reload Caddy
docker exec <caddy-container> caddy reload --config /etc/caddy/Caddyfile
```

## Notes

- Both containers are on `proxy` network for Caddy access
- Both containers also on `default` network for inter-container communication
- Container names used for DNS resolution within Docker networks
- `flush_interval -1` is critical for video streaming
- Caddy automatically gets Let's Encrypt certificates
