import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { decrypt } from '../utils/encryption.js';
import { isVideoFile } from '../services/s3Service.js';
import { getOrCreateClient } from '../services/s3ConnectionPool.js';
import { getCachedVideos, invalidateCache } from '../services/videoCacheService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Helper function to process cached videos for folder view
 * Separates videos into folders and files based on current navigation prefix
 */
function processItemsForFolderView(cachedVideos, fullPrefix, requestedPrefix) {
  const items = [];
  const folders = new Set();

  for (const video of cachedVideos) {
    // Remove the full prefix from the key to get relative path
    let relativePath = video.key;
    if (fullPrefix) {
      relativePath = video.key.substring(fullPrefix.length).replace(/^\//, '');
    }

    // Skip if empty
    if (!relativePath) continue;

    // Check if this is a folder (contains a slash after removing prefix)
    const slashIndex = relativePath.indexOf('/');
    if (slashIndex > 0) {
      // This is a file in a subfolder, add the folder name
      const folderName = relativePath.substring(0, slashIndex);
      folders.add(folderName);
    } else if (slashIndex === -1) {
      // This is a file in the current directory
      items.push({
        type: 'file',
        name: relativePath,
        key: video.key,
        size: video.size,
        lastModified: video.last_modified
      });
    }
  }

  // Add folders to items
  folders.forEach(folderName => {
    items.unshift({
      type: 'folder',
      name: folderName,
      key: fullPrefix ? `${fullPrefix}/${folderName}` : folderName
    });
  });

  return items;
}

/**
 * GET /api/videos/:libraryId
 * List videos in a library with search, pagination, sorting, and caching
 * Query params: prefix, search, page, limit, sort, order, refresh
 */
router.get('/:libraryId', async (req, res) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const {
      prefix = '',
      search = '',
      page = 1,
      limit = 50,
      sort = 'date',
      order = 'desc',
      refresh = false
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const forceRefresh = refresh === 'true' || refresh === '1';

    // Validate sort parameters
    const validSorts = ['name', 'size', 'date'];
    const sortBy = validSorts.includes(sort) ? sort : 'date';
    const sortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Get library and verify ownership
    const library = db.prepare(`
      SELECT * FROM libraries WHERE id = ? AND user_id = ?
    `).get(libraryId, req.user.userId);

    if (!library) {
      return res.status(404).json({ error: 'Library not found' });
    }

    // Decrypt credentials
    const accessKey = decrypt(library.access_key_encrypted);
    const secretKey = decrypt(library.secret_key_encrypted);

    // Validate decrypted credentials
    if (!accessKey || !secretKey) {
      console.error('Failed to decrypt credentials for library:', libraryId);
      return res.status(500).json({ error: 'Library configuration error' });
    }

    // Get S3 client from pool
    const s3Client = getOrCreateClient(req.user.userId, libraryId, {
      endpoint: library.endpoint,
      region: library.region,
      accessKeyId: accessKey,
      secretAccessKey: secretKey
    });

    // Combine library path prefix with requested prefix
    const fullPrefix = library.path_prefix
      ? `${library.path_prefix}/${prefix}`.replace(/\/+/g, '/').replace(/^\//, '')
      : prefix;

    // Get videos from cache
    const result = await getCachedVideos(libraryId, {
      s3Client,
      bucket: library.bucket,
      pathPrefix: library.path_prefix || '',
      prefix: fullPrefix,
      search,
      page: pageNum,
      limit: limitNum,
      sort: sortBy,
      order: sortOrder,
      forceRefresh
    });

    // Process for folder structure
    let items = processItemsForFolderView(result.videos, fullPrefix, prefix);

    if (sortBy === 'name') {
      const collator = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: 'base'
      });
      const direction = sortOrder === 'asc' ? 1 : -1;
      const compareByName = (a, b) => direction * collator.compare(a.name, b.name);

      const folders = items.filter(item => item.type === 'folder').sort(compareByName);
      const files = items.filter(item => item.type === 'file').sort(compareByName);
      items = [...folders, ...files];
    }

    res.json({
      libraryId,
      prefix,
      search,
      sort: sortBy,
      order: sortOrder,
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
        hasMore: pageNum * limitNum < result.total
      },
      cache: {
        cached: result.cached,
        cachedAt: result.cachedAt
      }
    });
  } catch (error) {
    console.error('List videos error:', error);

    // Provide more helpful error messages based on error type
    let errorMessage = 'Failed to list videos';
    let statusCode = 500;

    if (error.Code === 'NoSuchBucket' || error.name === 'NoSuchBucket') {
      errorMessage = 'S3 bucket not found. Please check your library configuration.';
      statusCode = 404;
    } else if (error.Code === 'InvalidAccessKeyId' || error.name === 'InvalidAccessKeyId') {
      errorMessage = 'Invalid S3 credentials. Please update your library settings.';
      statusCode = 403;
    } else if (error.Code === 'AccessDenied' || error.name === 'AccessDenied') {
      errorMessage = 'Access denied to S3 bucket. Please check your credentials and bucket permissions.';
      statusCode = 403;
    } else if (error.Code === 'SignatureDoesNotMatch' || error.name === 'SignatureDoesNotMatch') {
      errorMessage = 'Invalid S3 secret key. Please update your library settings.';
      statusCode = 403;
    } else if (error.message && error.message.includes('decrypt')) {
      errorMessage = 'Library configuration error. Credentials could not be decrypted.';
      statusCode = 500;
    }

    res.status(statusCode).json({ error: errorMessage });
  }
});

/**
 * POST /api/videos/:libraryId/refresh
 * Manually refresh cache for a library
 */
router.post('/:libraryId/refresh', async (req, res) => {
  try {
    const libraryId = parseInt(req.params.libraryId);

    // Verify ownership
    const library = db.prepare(`
      SELECT * FROM libraries WHERE id = ? AND user_id = ?
    `).get(libraryId, req.user.userId);

    if (!library) {
      return res.status(404).json({ error: 'Library not found' });
    }

    // Invalidate cache
    invalidateCache(libraryId);

    res.json({
      success: true,
      message: 'Cache invalidated. Next request will refresh from S3.'
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({ error: 'Failed to refresh cache' });
  }
});

export default router;
