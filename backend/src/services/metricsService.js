/**
 * Lightweight in-memory metrics for operational visibility.
 * No external dependencies and no database schema changes.
 */

const MAX_SAMPLES = 200;
const SLOW_DB_QUERY_MS = parseInt(process.env.SLOW_DB_QUERY_MS || '100', 10);

const requestStats = new Map();
const dbStats = new Map();
const cacheStats = {
  hits: 0,
  misses: 0,
  forcedRefreshes: 0,
  byLibrary: new Map()
};

function percentile(samples, p) {
  if (!samples || samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[index] * 100) / 100;
}

function average(samples) {
  if (!samples || samples.length === 0) return 0;
  const total = samples.reduce((sum, n) => sum + n, 0);
  return Math.round((total / samples.length) * 100) / 100;
}

function pushSample(arr, value) {
  arr.push(value);
  if (arr.length > MAX_SAMPLES) {
    arr.shift();
  }
}

function normalizePath(path) {
  return path
    .replace(/[0-9]+/g, ':id')
    .replace(/[a-f0-9]{16,}/gi, ':token');
}

function getLibraryEntry(libraryId) {
  const key = String(libraryId);
  if (!cacheStats.byLibrary.has(key)) {
    cacheStats.byLibrary.set(key, { hits: 0, misses: 0, forcedRefreshes: 0 });
  }
  return cacheStats.byLibrary.get(key);
}

export function recordRequestMetric(method, path, statusCode, durationMs) {
  const key = `${method} ${normalizePath(path)}`;
  const current = requestStats.get(key) || {
    count: 0,
    errors: 0,
    samples: []
  };

  current.count += 1;
  if (statusCode >= 400) current.errors += 1;
  pushSample(current.samples, durationMs);
  requestStats.set(key, current);
}

export function measureDbQuery(queryName, fn) {
  const start = process.hrtime.bigint();
  const result = fn();
  const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

  const current = dbStats.get(queryName) || {
    count: 0,
    slowCount: 0,
    samples: []
  };

  current.count += 1;
  if (durationMs >= SLOW_DB_QUERY_MS) {
    current.slowCount += 1;
    console.warn(`[db-slow] ${queryName} ${durationMs.toFixed(2)}ms`);
  }
  pushSample(current.samples, durationMs);
  dbStats.set(queryName, current);

  return result;
}

export function recordCacheHit(libraryId) {
  cacheStats.hits += 1;
  getLibraryEntry(libraryId).hits += 1;
}

export function recordCacheMiss(libraryId, { forcedRefresh = false } = {}) {
  cacheStats.misses += 1;
  const entry = getLibraryEntry(libraryId);
  entry.misses += 1;

  if (forcedRefresh) {
    cacheStats.forcedRefreshes += 1;
    entry.forcedRefreshes += 1;
  }
}

export function getMetricsSnapshot() {
  const requestMetrics = Array.from(requestStats.entries()).map(([endpoint, stat]) => ({
    endpoint,
    count: stat.count,
    errors: stat.errors,
    errorRatePct: stat.count ? Math.round((stat.errors / stat.count) * 10000) / 100 : 0,
    avgMs: average(stat.samples),
    p50Ms: percentile(stat.samples, 50),
    p95Ms: percentile(stat.samples, 95),
    p99Ms: percentile(stat.samples, 99)
  }));

  const dbMetrics = Array.from(dbStats.entries()).map(([query, stat]) => ({
    query,
    count: stat.count,
    slowCount: stat.slowCount,
    avgMs: average(stat.samples),
    p95Ms: percentile(stat.samples, 95),
    p99Ms: percentile(stat.samples, 99)
  }));

  const perLibrary = Array.from(cacheStats.byLibrary.entries()).map(([libraryId, stat]) => ({
    libraryId: parseInt(libraryId, 10),
    ...stat
  }));

  const totalCacheEvents = cacheStats.hits + cacheStats.misses;
  return {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    requests: requestMetrics,
    db: dbMetrics,
    cache: {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      forcedRefreshes: cacheStats.forcedRefreshes,
      hitRatePct: totalCacheEvents ? Math.round((cacheStats.hits / totalCacheEvents) * 10000) / 100 : 0,
      byLibrary: perLibrary
    }
  };
}
