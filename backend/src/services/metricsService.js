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
const streamStats = {
  started: 0,
  active: 0,
  completed: 0,
  clientAborted: 0,
  earlyClientAborted: 0,
  upstreamErrors: 0,
  invalidRange: 0,
  notFound: 0,
  otherErrors: 0,
  byStatus: new Map(),
  byLibrary: new Map(),
  samples: [],
  events: []
};
const STREAM_EVENT_RETENTION_MS = 60 * 60 * 1000; // 1 hour
const STREAM_MAX_EVENTS = 5000;
const EARLY_CLIENT_ABORT_MS = 2000;

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

function getStreamLibraryEntry(libraryId) {
  const key = String(libraryId);
  if (!streamStats.byLibrary.has(key)) {
    streamStats.byLibrary.set(key, {
      started: 0,
      completed: 0,
      clientAborted: 0,
      earlyClientAborted: 0,
      upstreamErrors: 0,
      invalidRange: 0,
      notFound: 0,
      otherErrors: 0
    });
  }
  return streamStats.byLibrary.get(key);
}

function pruneOldStreamEvents(nowMs) {
  const cutoff = nowMs - STREAM_EVENT_RETENTION_MS;
  while (streamStats.events.length > 0 && streamStats.events[0].timestamp < cutoff) {
    streamStats.events.shift();
  }
  if (streamStats.events.length > STREAM_MAX_EVENTS) {
    streamStats.events.splice(0, streamStats.events.length - STREAM_MAX_EVENTS);
  }
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

export function recordStreamStart(libraryId) {
  streamStats.started += 1;
  streamStats.active += 1;
  getStreamLibraryEntry(libraryId).started += 1;
}

export function recordStreamOutcome(libraryId, outcome, statusCode, durationMs) {
  const nowMs = Date.now();
  pruneOldStreamEvents(nowMs);
  const safeDurationMs = Math.max(0, Number(durationMs || 0));
  pushSample(streamStats.samples, safeDurationMs);

  if (streamStats.active > 0) {
    streamStats.active -= 1;
  }

  if (statusCode !== undefined && statusCode !== null) {
    const statusKey = String(statusCode);
    streamStats.byStatus.set(statusKey, (streamStats.byStatus.get(statusKey) || 0) + 1);
  }

  streamStats.events.push({
    timestamp: nowMs,
    libraryId,
    outcome,
    statusCode: statusCode ?? null,
    durationMs: safeDurationMs
  });

  const libraryEntry = getStreamLibraryEntry(libraryId);
  switch (outcome) {
    case 'completed':
      streamStats.completed += 1;
      libraryEntry.completed += 1;
      break;
    case 'client_aborted':
      streamStats.clientAborted += 1;
      libraryEntry.clientAborted += 1;
      if (safeDurationMs < EARLY_CLIENT_ABORT_MS) {
        streamStats.earlyClientAborted += 1;
        libraryEntry.earlyClientAborted += 1;
      }
      break;
    case 'upstream_error':
      streamStats.upstreamErrors += 1;
      libraryEntry.upstreamErrors += 1;
      break;
    case 'invalid_range':
      streamStats.invalidRange += 1;
      libraryEntry.invalidRange += 1;
      break;
    case 'not_found':
      streamStats.notFound += 1;
      libraryEntry.notFound += 1;
      break;
    default:
      streamStats.otherErrors += 1;
      libraryEntry.otherErrors += 1;
      break;
  }
}

export function getMetricsSnapshot() {
  const nowMs = Date.now();
  pruneOldStreamEvents(nowMs);
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
  const streamByLibrary = Array.from(streamStats.byLibrary.entries()).map(([libraryId, stat]) => ({
    libraryId: parseInt(libraryId, 10),
    ...stat
  }));
  const streamStatus = Array.from(streamStats.byStatus.entries()).map(([statusCode, count]) => ({
    statusCode: parseInt(statusCode, 10),
    count
  }));
  streamStatus.sort((a, b) => b.count - a.count);

  const totalCacheEvents = cacheStats.hits + cacheStats.misses;
  const totalHardFailures = streamStats.upstreamErrors + streamStats.invalidRange + streamStats.notFound + streamStats.otherErrors;
  const totalStreamOutcomes = streamStats.completed + streamStats.clientAborted + streamStats.upstreamErrors + streamStats.invalidRange + streamStats.notFound + streamStats.otherErrors;
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
    },
    stream: {
      started: streamStats.started,
      active: streamStats.active,
      completed: streamStats.completed,
      clientAborted: streamStats.clientAborted,
      earlyClientAborted: streamStats.earlyClientAborted,
      upstreamErrors: streamStats.upstreamErrors,
      invalidRange: streamStats.invalidRange,
      notFound: streamStats.notFound,
      otherErrors: streamStats.otherErrors,
      hardFailures: totalHardFailures,
      hardFailureRatePct: totalStreamOutcomes ? Math.round((totalHardFailures / totalStreamOutcomes) * 10000) / 100 : 0,
      clientAbortRatePct: totalStreamOutcomes ? Math.round((streamStats.clientAborted / totalStreamOutcomes) * 10000) / 100 : 0,
      earlyClientAbortRatePct: totalStreamOutcomes ? Math.round((streamStats.earlyClientAborted / totalStreamOutcomes) * 10000) / 100 : 0,
      completionRatePct: totalStreamOutcomes ? Math.round((streamStats.completed / totalStreamOutcomes) * 10000) / 100 : 0,
      issueRatePct: totalStreamOutcomes ? Math.round(((streamStats.clientAborted + streamStats.upstreamErrors + streamStats.invalidRange + streamStats.notFound + streamStats.otherErrors) / totalStreamOutcomes) * 10000) / 100 : 0,
      avgDurationMs: average(streamStats.samples),
      p95DurationMs: percentile(streamStats.samples, 95),
      byStatus: streamStatus,
      byLibrary: streamByLibrary
    }
  };
}
