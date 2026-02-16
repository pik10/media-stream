# Security Improvements Summary

This document outlines the security improvements implemented on 2026-02-16.

## Changes Implemented

### 1. ✅ Fixed CORS Configuration
**File**: `backend/src/server.js`

**What Changed**:
- Replaced `app.use(cors())` with restricted origin configuration
- Now only accepts requests from the configured frontend URL

**Configuration**:
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

**Required Environment Variable**:
- `FRONTEND_URL` - The URL of your frontend application (e.g., `https://yourdomain.com`)
- Defaults to `http://localhost:5173` for local development

---

### 2. ✅ Removed Hardcoded Default Secrets
**Files**:
- `backend/src/server.js`
- `backend/src/services/authService.js`
- `backend/src/utils/encryption.js`

**What Changed**:
- Removed fallback default values for `JWT_SECRET` and `ENCRYPTION_KEY`
- Added startup validation that fails if these are not set
- Application will not start without proper secrets configured

**Required Environment Variables**:
- `JWT_SECRET` - Secret key for signing JWT tokens (must be a strong random string)
- `ENCRYPTION_KEY` - Key for encrypting S3 credentials in database (must be a strong random string)

**Generate Secure Secrets**:
```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -base64 32
```

---

### 3. ✅ Added Rate Limiting to All API Endpoints
**Files**:
- `backend/src/middleware/rateLimiter.js` (new file)
- `backend/src/server.js`
- `backend/src/routes/auth.js`

**What Changed**:
- Created centralized rate limiting middleware
- Applied different limits to different endpoint types
- All API routes are now protected from abuse

**Rate Limits**:
- Authentication endpoints: **5 requests per minute** (strict)
- General API endpoints (libraries, videos): **100 requests per minute**
- Streaming endpoints: **50 requests per minute**

**Response**: Returns HTTP 429 when limit exceeded with retry headers

---

### 4. ✅ Added Request Body Size Limits
**File**: `backend/src/server.js`

**What Changed**:
- Added 10MB limit to JSON and URL-encoded request bodies
- Prevents memory exhaustion attacks

**Configuration**:
```javascript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

---

### 5. ✅ Improved Error Handling
**File**: `backend/src/server.js`

**What Changed**:
- Global error handler no longer exposes stack traces in production
- Detailed errors logged server-side for debugging
- Generic errors shown to users in production

**Behavior**:
- **Development**: Full error messages and stack traces
- **Production**: Generic "Internal server error" message only
- All errors logged with context (path, method, IP, timestamp)

---

### 6. ✅ Added Account Lockout
**Files**:
- `backend/src/services/loginAttemptTracker.js` (new file)
- `backend/src/services/authService.js`

**What Changed**:
- Tracks failed login attempts per username
- Temporarily locks accounts after too many failures
- Prevents brute force attacks

**Lockout Policy**:
- Maximum attempts: **5 failed logins**
- Lockout duration: **15 minutes**
- Attempt window: **15 minutes** (resets after this period)
- Warning given at 3rd and 4th failed attempts

**Features**:
- Automatic cleanup of old entries (prevents memory leaks)
- Clear lockout on successful login
- Informative error messages with time remaining

---

## Deployment Instructions

### Docker Deployment

1. **Update Environment Variables**

Create or update your `.env` file in the project root:

```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Set frontend URL
FRONTEND_URL=https://yourdomain.com

# Add to .env file
echo "JWT_SECRET=${JWT_SECRET}" >> .env
echo "ENCRYPTION_KEY=${ENCRYPTION_KEY}" >> .env
echo "FRONTEND_URL=https://yourdomain.com" >> .env
```

2. **Update docker-compose.yml** (if needed)

Your existing docker-compose.yml should already have:
```yaml
environment:
  - JWT_SECRET=${JWT_SECRET}
  - ENCRYPTION_KEY=${ENCRYPTION_KEY}
  - NODE_ENV=production
```

Add the frontend URL:
```yaml
environment:
  - JWT_SECRET=${JWT_SECRET}
  - ENCRYPTION_KEY=${ENCRYPTION_KEY}
  - FRONTEND_URL=${FRONTEND_URL}
  - NODE_ENV=production
```

3. **Rebuild and Deploy**

```bash
# Stop existing containers
docker-compose down

# Rebuild with new code
docker-compose build

# Start containers
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

4. **Verify Deployment**

```bash
# Check health
curl http://localhost:3000/health

# Verify it's running
docker-compose ps

# Check logs for startup validation
docker-compose logs backend | grep "Server running"
```

---

## Testing the Changes

### Test 1: CORS Protection
```bash
# Should fail from unauthorized origin
curl -H "Origin: https://evil.com" http://localhost:3000/api/auth/me

# Should work from authorized origin
curl -H "Origin: https://yourdomain.com" http://localhost:3000/api/auth/me
```

### Test 2: Missing Secrets
```bash
# Temporarily unset secrets to test validation
unset JWT_SECRET
npm start

# Should see error:
# "ERROR: Missing required environment variables: JWT_SECRET"
```

### Test 3: Rate Limiting
```bash
# Make 6 login attempts rapidly
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done

# 6th request should return 429 Too Many Requests
```

### Test 4: Account Lockout
```bash
# Make 5 failed login attempts
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"wrongpassword"}'
  sleep 1
done

# Next attempt should show lockout message
```

### Test 5: Request Size Limit
```bash
# Try to send oversized request (>10MB)
dd if=/dev/zero bs=1M count=11 | curl -X POST \
  http://localhost:3000/api/libraries \
  -H "Content-Type: application/json" \
  --data-binary @-

# Should return 413 Payload Too Large
```

---

## Security Improvements Summary

### Before
- ❌ CORS allowed all origins
- ❌ Default secrets in code
- ❌ No rate limiting on most endpoints
- ❌ No request size limits
- ❌ Stack traces exposed in production
- ❌ No brute force protection

### After
- ✅ CORS restricted to specific origin
- ✅ Secrets validated on startup
- ✅ Rate limiting on all endpoints
- ✅ 10MB request size limit
- ✅ Production errors sanitized
- ✅ Account lockout after 5 failed attempts

---

## What's Still Recommended

These security improvements are complete, but for full production security, also consider:

7. **Security Headers** - Add CSP, HSTS (requires testing)
8. **Monitoring & Alerting** - Set up logging and alerts
9. **HTTPS Enforcement** - Ensure Caddy redirects HTTP to HTTPS
10. **Password Requirements** - Stronger password policies
11. **Session Management** - Token revocation mechanism
12. **Security Audits** - Regular penetration testing

---

## Known Security Exception (Accepted Risk)

**Recorded**: 2026-02-16  
**Scope**: `backend` production dependencies (`npm audit --omit=dev`)

### Exception Summary

- Remaining audit findings: **5 high**
- Root cause: transitive dependency chain from `sqlite3@5.1.7` to `tar@6.x`
- Chain: `sqlite3 -> node-gyp -> make-fetch-happen -> cacache -> tar`

### Why This Is Accepted (Temporary)

- As of 2026-02-16, `sqlite3@5.1.7` is the latest release and still depends on `tar@^6.1.11`.
- `npm audit` does not provide a safe non-breaking remediation path for this chain.
- Forcing fixes (`npm audit fix --force`) would apply breaking dependency changes without controlled app-level validation.

### Risk Context

- The vulnerable package is not directly used by application request handlers.
- It is pulled in through install/build tooling paths used by `sqlite3`.
- Runtime exposure is lower than a direct API/library vulnerability, but the issue should still be tracked and reviewed.

### Compensating Controls

- Keep backend dependencies updated on a regular schedule.
- Restrict build/deploy permissions to trusted environments.
- Continue using containerized deployment and least-privilege host access.
- Re-run `npm audit --omit=dev` on each backend dependency update.

### Review Trigger

- Re-evaluate immediately when a new `sqlite3` release changes this dependency chain.
- Also re-evaluate if migrating from `sqlite3` to another maintained database driver.

---

## Rollback Instructions

If you need to rollback these changes:

```bash
# Restore from git (if committed before changes)
git checkout HEAD~1

# Or rebuild from backup
docker-compose down
docker-compose build
docker-compose up -d
```

---

## Support

For issues or questions:
- Check logs: `docker-compose logs backend`
- Review error messages in console
- Ensure environment variables are set correctly
- Verify CORS origin matches your frontend URL
