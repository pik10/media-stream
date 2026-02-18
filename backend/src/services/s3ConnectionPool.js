import { createS3Client } from './s3Service.js';

/**
 * S3 Connection Pool Service
 * Manages reusable S3Client instances to avoid recreating connections
 * Clients are keyed by userId-libraryId combination
 */

const clientPool = new Map(); // key: "userId-libraryId", value: { client, createdAt, lastUsed }
const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
let cleanupInterval;

/**
 * Get or create S3 client from pool
 * @param {number} userId - User ID
 * @param {number} libraryId - Library ID
 * @param {Object} credentials - S3 credentials (endpoint, region, accessKeyId, secretAccessKey)
 * @returns {S3Client}
 */
export function getOrCreateClient(userId, libraryId, credentials) {
  const key = `${userId}-${libraryId}`;
  const cached = clientPool.get(key);

  // Reuse if exists
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.client;
  }

  // Create new client using existing s3Service.createS3Client()
  // Note: createS3Client expects accessKey/secretKey, not accessKeyId/secretAccessKey
  const client = createS3Client({
    endpoint: credentials.endpoint,
    region: credentials.region,
    accessKey: credentials.accessKeyId,
    secretKey: credentials.secretAccessKey
  });

  clientPool.set(key, {
    client,
    createdAt: Date.now(),
    lastUsed: Date.now()
  });

  console.log(`Created new S3 client for user ${userId}, library ${libraryId} (pool size: ${clientPool.size})`);

  return client;
}

/**
 * Invalidate all clients for a specific library
 * @param {number} libraryId - Library ID
 */
export function invalidateLibrary(libraryId) {
  let removedCount = 0;

  for (const [key, _] of clientPool) {
    if (key.endsWith(`-${libraryId}`)) {
      clientPool.delete(key);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(`Invalidated ${removedCount} S3 client(s) for library ${libraryId}`);
  }
}

/**
 * Clean up idle clients (not used in IDLE_TIMEOUT)
 */
function cleanupIdleClients() {
  const now = Date.now();
  let removedCount = 0;

  for (const [key, entry] of clientPool) {
    if (now - entry.lastUsed > IDLE_TIMEOUT) {
      clientPool.delete(key);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(`Cleaned up ${removedCount} idle S3 client(s) (pool size: ${clientPool.size})`);
  }
}

/**
 * Start cleanup task (called from server.js)
 */
export function startCleanupTask() {
  if (cleanupInterval) {
    console.warn('S3 connection pool cleanup task already running');
    return;
  }

  cleanupInterval = setInterval(cleanupIdleClients, 5 * 60 * 1000); // Every 5 minutes
  console.log('S3 connection pool cleanup task started (5 minute interval)');
}

/**
 * Stop cleanup task (for graceful shutdown)
 */
export function stopCleanupTask() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('S3 connection pool cleanup task stopped');
  }
}

/**
 * Get pool statistics (for debugging)
 */
export function getPoolStats() {
  const stats = {
    size: clientPool.size,
    clients: []
  };

  for (const [key, entry] of clientPool) {
    stats.clients.push({
      key,
      ageMs: Date.now() - entry.createdAt,
      idleMs: Date.now() - entry.lastUsed
    });
  }

  return stats;
}
