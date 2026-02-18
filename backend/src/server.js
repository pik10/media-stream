import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import librariesRoutes from './routes/libraries.js';
import videosRoutes from './routes/videos.js';
import streamRoutes from './routes/stream.js';
import adminRoutes from './routes/admin.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import './config/database.js'; // Initialize database
import { startCleanupTask, stopCleanupTask } from './services/s3ConnectionPool.js';
import { recordRequestMetric } from './services/metricsService.js';

// Start S3 connection pool cleanup
startCleanupTask();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'ENCRYPTION_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('ERROR: Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('\nPlease set these variables in your .env file or environment.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - Required when behind reverse proxy (Caddy, nginx, etc.)
// This allows Express to correctly read X-Forwarded-For, X-Forwarded-Proto headers
// Critical for rate limiting and getting real client IPs
app.set('trust proxy', 1);

// Middleware - Security Headers
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for React
      styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"], // API calls
      mediaSrc: ["'self'", "blob:"], // Video streaming
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"], // Prevent embedding in iframes
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  // HTTP Strict Transport Security - Force HTTPS
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },
  // Prevent MIME type sniffing
  noSniff: true,
  // Enable XSS filter in browsers
  xssFilter: true,
  // Don't send referrer for cross-origin requests
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  // Disable DNS prefetching
  dnsPrefetchControl: {
    allow: false
  },
  // Hide X-Powered-By header
  hidePoweredBy: true,
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: {
    policy: 'cross-origin' // Needed for S3 video streaming
  },
  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: {
    policy: 'same-origin'
  },
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false // Set to false for video streaming compatibility
}));

// Configure CORS to allow only specific origin
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging + latency metrics
const SLOW_REQUEST_MS = parseInt(process.env.SLOW_REQUEST_MS || '1000', 10);
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  const startIso = new Date().toISOString();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const path = req.originalUrl.split('?')[0];
    recordRequestMetric(req.method, path, res.statusCode, durationMs);

    const logLine = `${startIso} - ${req.method} ${path} ${res.statusCode} ${durationMs.toFixed(2)}ms`;
    if (durationMs >= SLOW_REQUEST_MS) {
      console.warn(`[slow-request] ${logLine}`);
    } else {
      console.log(logLine);
    }
  });

  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes); // Auth routes have their own stricter rate limiting
app.use('/api/libraries', apiLimiter, librariesRoutes);
app.use('/api/videos', apiLimiter, videosRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/admin', adminRoutes); // Admin routes (require admin auth)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log full error details for debugging
  console.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Don't expose stack traces or internal details in production
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /health`);
  console.log(`  POST /api/auth/register`);
  console.log(`  POST /api/auth/login`);
  console.log(`  GET  /api/auth/me`);
  console.log(`  GET  /api/libraries`);
  console.log(`  POST /api/libraries`);
  console.log(`  DELETE /api/libraries/:id`);
  console.log(`  POST /api/libraries/:id/test`);
  console.log(`  GET  /api/videos/:libraryId`);
  console.log(`  GET  /api/stream/:libraryId/:encodedKey`);
  console.log(`\n`);
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('\nSIGTERM received, shutting down gracefully...');
  stopCleanupTask();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  stopCleanupTask();
  process.exit(0);
});

export default app;
