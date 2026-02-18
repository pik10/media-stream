import db from '../config/database.js';
import { decrypt } from '../utils/encryption.js';
import { getOrCreateClient } from './s3ConnectionPool.js';
import { refreshLibraryCache } from './videoCacheService.js';

const jobQueue = [];
const latestJobs = new Map(); // key: userId-libraryId => job
let processing = false;
let nextJobId = 1;

function getJobKey(userId, libraryId) {
  return `${userId}-${libraryId}`;
}

async function runRefreshJob(job) {
  const library = db.prepare(`
    SELECT id, user_id, endpoint, region, bucket, access_key_encrypted, secret_key_encrypted, path_prefix
    FROM libraries
    WHERE id = ? AND user_id = ?
  `).get(job.libraryId, job.userId);

  if (!library) {
    throw new Error('Library not found');
  }

  const accessKey = decrypt(library.access_key_encrypted);
  const secretKey = decrypt(library.secret_key_encrypted);

  if (!accessKey || !secretKey) {
    throw new Error('Failed to decrypt library credentials');
  }

  const s3Client = getOrCreateClient(job.userId, job.libraryId, {
    endpoint: library.endpoint,
    region: library.region,
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  });

  const cachedVideos = await refreshLibraryCache(job.libraryId, {
    s3Client,
    bucket: library.bucket,
    pathPrefix: library.path_prefix || ''
  });

  return { cachedVideos };
}

async function processQueue() {
  if (processing) return;
  processing = true;

  try {
    while (jobQueue.length > 0) {
      const job = jobQueue.shift();
      if (!job || job.status !== 'queued') continue;

      job.status = 'running';
      job.startedAt = new Date().toISOString();
      job.error = null;

      try {
        const result = await runRefreshJob(job);
        job.status = 'completed';
        job.result = result;
      } catch (error) {
        job.status = 'failed';
        job.error = error.message || 'Refresh job failed';
        console.error(`Refresh job failed for library ${job.libraryId}:`, error);
      } finally {
        job.finishedAt = new Date().toISOString();
      }
    }
  } finally {
    processing = false;
  }
}

export function enqueueLibraryRefresh(userId, libraryId) {
  const key = getJobKey(userId, libraryId);
  const existing = latestJobs.get(key);

  if (existing && (existing.status === 'queued' || existing.status === 'running')) {
    return { enqueued: false, job: existing };
  }

  const job = {
    id: nextJobId++,
    userId,
    libraryId,
    status: 'queued',
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    result: null,
    error: null
  };

  latestJobs.set(key, job);
  jobQueue.push(job);
  processQueue();

  return { enqueued: true, job };
}

export function getLibraryRefreshStatus(userId, libraryId) {
  const job = latestJobs.get(getJobKey(userId, libraryId));

  if (!job) {
    return { status: 'idle' };
  }

  return {
    status: job.status,
    job: {
      id: job.id,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      result: job.result,
      error: job.error
    }
  };
}

export function getRefreshQueueStats() {
  return {
    processing,
    queued: jobQueue.length
  };
}

export function getRefreshJobsSnapshot(limit = 20) {
  const jobs = Array.from(latestJobs.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const counts = {
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0
  };

  jobs.forEach((job) => {
    if (counts[job.status] !== undefined) {
      counts[job.status] += 1;
    }
  });

  return {
    counts,
    recent: jobs.slice(0, limit).map((job) => ({
      id: job.id,
      userId: job.userId,
      libraryId: job.libraryId,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      result: job.result,
      error: job.error
    }))
  };
}
