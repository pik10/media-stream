# 🎬 Media Stream

A secure, full-stack web application for streaming videos from S3-compatible storage with user authentication, library management, and enterprise-grade security features.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)

## ✨ Features

### 🔐 Security First
- **JWT Authentication** with secure token management
- **Account Lockout** - 5 failed attempts = 15-minute lockout
- **Rate Limiting** - Protects against brute force attacks
- **Password Security** - bcrypt with cost factor 12
- **Encrypted Credentials** - AES-256 encryption for S3 credentials at rest
- **Security Headers** - Helmet.js with CSP, HSTS, and more
- **CORS Protection** - Configurable origin restrictions
- **Input Validation** - Joi schema validation on all endpoints

### 🎥 Video Streaming
- **HTTP Range Requests** - Efficient seeking and partial content delivery
- **Large File Support** - Stream videos of any size without memory issues
- **Multiple Formats** - MP4, MKV, WebM, AVI, MOV, and more
- **S3 Compatibility** - Works with AWS S3, MinIO, Garage, and other S3-compatible storage

### 📚 Library Management
- **Multi-Library Support** - Connect to multiple S3 buckets
- **Folder Navigation** - Browse nested directories in S3 with breadcrumb navigation
- **Connection Testing** - Verify S3 credentials before saving
- **Secure Storage** - Credentials encrypted and never exposed to frontend

### 🚀 Performance & Scalability
- **Video Metadata Caching** - 5-minute cache reduces S3 API calls by 95%+
- **S3 Connection Pooling** - Reuses connections for better performance
- **Playback Health Metrics** - Admin dashboard tracks server failures vs client aborts
- **Pagination** - Load 50 items per page for smooth browsing
- **Lazy Loading** - Progressive rendering reduces initial load time
- **Database-Level Filtering** - Fast search and sorting with indexed queries

### 🎨 User Experience
- **Dark Theme** - Easy on the eyes
- **Responsive Design** - Works on desktop and mobile
- **Fast Navigation** - React Router with client-side routing
- **Real-time Feedback** - Loading states and error messages
- **Search Functionality** - Find videos instantly across all libraries
- **Multi-Sort Options** - Sort by name, size, or date (ascending/descending)
- **Smart Breadcrumbs** - Navigate folder structure with library name display

## 🚀 Quick Start

### Docker Deployment (Recommended)

Deploy in 5 minutes using Docker Compose:

```bash
git clone https://github.com/pik10/media-stream.git
cd media-stream
./deploy.sh
```

See **[DOCKER_QUICK_START.md](DOCKER_QUICK_START.md)** for detailed Docker deployment guide.

### Manual Installation

#### Prerequisites
- Node.js 18+
- S3-compatible storage with credentials

#### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment** (create `.env` file)
   ```env
   PORT=3000
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-change-this
   ENCRYPTION_KEY=your-super-secret-encryption-key-change-this
   FRONTEND_URL=http://localhost:5173
   ```

3. **Start backend**
   ```bash
   npm start
   ```

#### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open browser** → `http://localhost:5173`

## 📖 Usage

1. **Register** - Create a new account
2. **Login** - Sign in with your credentials
3. **Add Library** - Configure S3 connection:
   - Library Name
   - S3 Endpoint (e.g., `https://s3.amazonaws.com`)
   - Region (e.g., `us-east-1`)
   - Bucket Name
   - Access Key & Secret Key
   - Path Prefix (optional)
4. **Test Connection** - Verify credentials work
5. **Browse Videos** - Navigate your S3 bucket with folder structure
6. **Search** - Type keywords and press Enter to find videos
7. **Sort** - Choose sort field (Name/Size/Date) and order (↑↓)
8. **Paginate** - Browse large collections 50 items at a time
9. **Stream** - Click any video to start playback

## 🏗️ Architecture

### Tech Stack

**Backend**
- Node.js 24 LTS + Express
- SQLite database with better-sqlite3 (synchronous, faster)
- AWS SDK v3 for S3 with connection pooling
- Video metadata caching (5-minute TTL)
- JWT + bcrypt for authentication
- AES-256-GCM for encryption
- Helmet.js + express-rate-limit

**Frontend**
- React 18 with Vite
- React Router v6
- Axios for API calls
- HTML5 Video Player
- Nginx (production)

**Deployment**
- Docker + Docker Compose
- Caddy reverse proxy with automatic HTTPS
- Multi-stage builds for optimized images

### Streaming Architecture

```
┌─────────┐      JWT Token      ┌─────────┐     Auth & Decrypt    ┌────────┐
│ Browser │ ─────────────────> │ Backend │ ──────────────────> │   S3   │
│         │                      │         │                      │        │
│ Video   │ <─ Range Requests ─ │ Proxy   │ <── Stream Chunks ── │ Bucket │
└─────────┘                      └─────────┘                      └────────┘
```

**Benefits:**
- ✅ S3 credentials never exposed to frontend
- ✅ Full access control and authentication
- ✅ HTTP Range support for video seeking
- ✅ Audit trail of all video access

## 🔒 Security Features

### Authentication & Authorization
- JWT tokens with 24-hour expiry
- Case-insensitive username authentication
- Password hashing with bcrypt (cost: 12)
- Account lockout after failed login attempts
- Library ownership verification

### Rate Limiting
- Auth endpoints: 5 requests/minute
- API endpoints: 100 requests/minute
- No rate limiting on video streaming (already authenticated)

### Data Protection
- S3 credentials encrypted at rest (AES-256)
- Secure key management with environment variables
- HTTPS enforcement in production
- CORS restricted to configured frontend URL

### Security Headers
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## 📊 API Documentation

### Authentication
```
POST /api/auth/register    - Register new user
POST /api/auth/login       - Login and receive JWT token
GET  /api/auth/me          - Get current user info
PUT  /api/auth/change-password - Change password
```

### Libraries
```
GET    /api/libraries       - List all user's libraries
POST   /api/libraries       - Add new library
DELETE /api/libraries/:id   - Delete library
POST   /api/libraries/:id/test - Test S3 connection
```

### Videos
```
GET  /api/videos/:libraryId        - List videos with advanced filtering
     Query params:
       ?prefix=      - Browse folders (e.g., "Movies/Action")
       ?search=      - Search videos (e.g., "avengers")
       ?page=        - Page number (default: 1)
       ?limit=       - Items per page (default: 50, max: 200)
       ?sort=        - Sort by: name, size, date (default: date)
       ?order=       - Order: asc, desc (default: desc)
       ?refresh=     - Force cache refresh: true, false
POST /api/videos/:libraryId/refresh - Manually refresh cache
GET  /api/stream/:libraryId/:key   - Stream video with Range support
```

## 🐳 Docker Deployment

### Quick Deploy
```bash
./deploy.sh
```

### Custom Configuration

**docker-compose.yml**
```yaml
services:
  backend:
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - FRONTEND_URL=https://videos.yourdomain.com
```

### Production with Caddy

See **[CADDY_SETUP.md](CADDY_SETUP.md)** for reverse proxy configuration with automatic HTTPS.

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev  # Auto-reload with --watch
```

### Frontend Development
```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

### Building for Production
```bash
cd frontend
npm run build  # Outputs to dist/
```

## 📝 Database Schema

### Users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Libraries
```sql
CREATE TABLE libraries (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  region TEXT NOT NULL,
  bucket TEXT NOT NULL,
  access_key_encrypted TEXT NOT NULL,
  secret_key_encrypted TEXT NOT NULL,
  path_prefix TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Video Cache
```sql
CREATE TABLE video_cache (
  id INTEGER PRIMARY KEY,
  library_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  size INTEGER,
  last_modified DATETIME,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(library_id, key),
  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_video_cache_library_id ON video_cache(library_id);
CREATE INDEX idx_video_cache_cached_at ON video_cache(cached_at);
CREATE INDEX idx_video_cache_key ON video_cache(key);
CREATE INDEX idx_video_cache_library_cached ON video_cache(library_id, cached_at);
```

## 🎞️ Supported Video Formats

MP4, MKV, WebM, AVI, MOV, M4V, FLV, WMV, MPEG, MPG

## 🐛 Troubleshooting

### Videos won't play
- ✓ Verify S3 credentials are correct
- ✓ Check bucket name and endpoint URL
- ✓ Ensure videos are accessible in S3
- ✓ Check browser console for errors

### Authentication issues
- ✓ Verify `JWT_SECRET` is set in backend `.env`
- ✓ Check token is stored in localStorage
- ✓ Ensure backend is running on correct port

### S3 connection fails
- ✓ Use "Test Connection" button to diagnose
- ✓ Verify endpoint URL includes `https://`
- ✓ Check region matches S3 configuration
- ✓ Ensure access key has read permissions

### Search/sorting not working
- ✓ Click "↻ Refresh from S3" to update cache
- ✓ Check that videos exist in S3 bucket
- ✓ Verify cache is enabled (check response includes `cache.cachedAt`)

### Performance issues with large libraries
- ✓ Use pagination (shows 50 items at a time)
- ✓ Cache automatically refreshes every 5 minutes
- ✓ Organize videos into folders for easier navigation
- ✓ Use search to narrow down results

### Playback metrics interpretation
- ✓ In **Admin → Performance → Playback Health**, prioritize **Server Failure Rate** and **Hard Failures**
- ✓ High `499` / **Client Aborts** can be normal on iPhone Safari due to range-request churn
- ✓ Investigate buffering using **Upstream Errors**, `5xx`, and sustained early abort spikes

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 👨‍💻 Author

**pik10** - [GitHub](https://github.com/pik10/media-stream)

---

Built with ❤️ using React, Node.js, and S3
