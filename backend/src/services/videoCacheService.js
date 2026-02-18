import db from '../config/database.js';
import { listObjects, isVideoFile } from './s3Service.js';
import { measureDbQuery, recordCacheHit, recordCacheMiss } from './metricsService.js';

/**
 * Video Cache Service
 * Manages video metadata caching with search/pagination
 * Cache TTL: 5 minutes
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getDisplayNameFromKey(key, prefix = '') {
  let relative = key;

  if (prefix) {
    relative = key.substring(prefix.length).replace(/^\//, '');
  }

  const slashIndex = relative.indexOf('/');
  if (slashIndex > 0) {
    return relative.substring(0, slashIndex);
  }

  return relative;
}

/**
 * Get cache status for a library
 * @param {number} libraryId
 * @returns {Object} { fresh: boolean, cachedAt: string|null }
 */
function getCacheStatus(libraryId) {
  const result = measureDbQuery('video_cache.get_cache_status', () =>
    db.prepare(`
      SELECT MAX(cached_at) as latest
      FROM video_cache
      WHERE library_id = ?
    `).get(libraryId)
  );

  if (!result.latest) {
    return { fresh: false, cachedAt: null };
  }

  const age = Date.now() - new Date(result.latest).getTime();
  return {
    fresh: age < CACHE_TTL_MS,
    cachedAt: result.latest
  };
}

/**
 * Refresh cache from S3
 * @param {number} libraryId
 * @param {S3Client} s3Client
 * @param {string} bucket
 * @param {string} pathPrefix
 * @returns {Promise<number>} Number of videos cached
 */
async function refreshCache(libraryId, s3Client, bucket, pathPrefix = '') {
  console.log(`Refreshing cache for library ${libraryId} from S3...`);

  // Fetch from S3 using existing s3Service.listObjects()
  const objects = await listObjects(s3Client, bucket, pathPrefix);

  // Filter to video files only using existing s3Service.isVideoFile()
  const videos = objects.filter(obj => isVideoFile(obj.Key));

  console.log(`Found ${videos.length} videos in S3 for library ${libraryId}`);

  // Update cache with transaction
  const insert = db.prepare(`
    INSERT OR REPLACE INTO video_cache (library_id, key, size, last_modified, cached_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const transaction = db.transaction((videos) => {
    // Clear old entries for this library
    db.prepare('DELETE FROM video_cache WHERE library_id = ?').run(libraryId);

    // Insert new entries
    for (const video of videos) {
      insert.run(libraryId, video.Key, video.Size, video.LastModified.toISOString());
    }
  });

  transaction(videos);

  console.log(`Cache refreshed for library ${libraryId}: ${videos.length} videos`);

  return videos.length;
}

/**
 * Refresh cache for a library immediately
 * @param {number} libraryId
 * @param {Object} options - { s3Client, bucket, pathPrefix }
 * @returns {Promise<number>} Number of videos cached
 */
export async function refreshLibraryCache(libraryId, options = {}) {
  const {
    s3Client,
    bucket,
    pathPrefix = ''
  } = options;

  if (!s3Client || !bucket) {
    throw new Error('Missing required refresh options: s3Client and bucket');
  }

  return refreshCache(libraryId, s3Client, bucket, pathPrefix);
}

/**
 * Get cached videos with search, pagination, and sorting
 * @param {number} libraryId
 * @param {Object} options - { s3Client, bucket, pathPrefix, prefix, search, page, limit, sort, order, forceRefresh }
 * @returns {Promise<Object>} { videos: Array, total: number, cached: boolean, cachedAt: string }
 */
export async function getCachedVideos(libraryId, options = {}) {
  const {
    s3Client,
    bucket,
    pathPrefix = '',
    prefix = '',
    search = '',
    page = 1,
    limit = 50,
    sort = 'date',
    order = 'desc',
    forceRefresh = false
  } = options;

  // Check cache freshness
  const cacheStatus = getCacheStatus(libraryId);

  // Refresh if stale or forced
  if (!cacheStatus.fresh || forceRefresh) {
    recordCacheMiss(libraryId, { forcedRefresh: forceRefresh });
    await refreshCache(libraryId, s3Client, bucket, pathPrefix);
    // Update cache status after refresh
    cacheStatus.cachedAt = new Date().toISOString();
    cacheStatus.fresh = true;
  } else {
    recordCacheHit(libraryId);
  }

  // Build SQL query
  let sql = 'SELECT * FROM video_cache WHERE library_id = ?';
  const params = [libraryId];

  // Apply prefix filter (for folder navigation)
  if (prefix) {
    sql += ' AND key LIKE ?';
    params.push(`${prefix}%`);
  }

  // Apply search filter (case-insensitive)
  if (search) {
    sql += ' AND LOWER(key) LIKE LOWER(?)';
    params.push(`%${search}%`);
  }

  // Get total count
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const { total } = measureDbQuery('video_cache.count_filtered', () =>
    db.prepare(countSql).get(...params)
  );

  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let videos = [];

  if (sort === 'name') {
    // For natural case-insensitive sorting by displayed name, sort in-memory then paginate.
    const allFilteredVideos = measureDbQuery('video_cache.list_filtered', () =>
      db.prepare(sql).all(...params)
    );

    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base'
    });

    allFilteredVideos.sort((a, b) => {
      const aName = getDisplayNameFromKey(a.key, prefix);
      const bName = getDisplayNameFromKey(b.key, prefix);
      return collator.compare(aName, bName);
    });

    if (sortOrder === 'DESC') {
      allFilteredVideos.reverse();
    }

    const offset = (page - 1) * limit;
    videos = allFilteredVideos.slice(offset, offset + limit);
  } else {
    const sortColumn = {
      'size': 'size',
      'date': 'last_modified'
    }[sort] || 'last_modified';

    sql += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, (page - 1) * limit);

    videos = measureDbQuery('video_cache.list_filtered', () =>
      db.prepare(sql).all(...params)
    );
  }

  return {
    videos,
    total,
    cached: true,
    cachedAt: cacheStatus.cachedAt
  };
}

/**
 * Invalidate cache for a library (force refresh on next request)
 * @param {number} libraryId
 */
export function invalidateCache(libraryId) {
  const result = db.prepare('DELETE FROM video_cache WHERE library_id = ?').run(libraryId);

  if (result.changes > 0) {
    console.log(`Invalidated cache for library ${libraryId}: ${result.changes} entries removed`);
  }
}

/**
 * Get cache statistics (for debugging)
 * @returns {Object}
 */
export function getCacheStats() {
  const result = db.prepare(`
    SELECT
      library_id,
      COUNT(*) as video_count,
      MAX(cached_at) as latest_cache,
      MIN(cached_at) as oldest_cache
    FROM video_cache
    GROUP BY library_id
  `).all();

  return result;
}
