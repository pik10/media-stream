import express from 'express';
import Joi from 'joi';
import { authenticateToken } from '../middleware/auth.js';
import { getCachedVideos } from '../services/videoCacheService.js';
import { enqueueLibraryRefresh, getLibraryRefreshStatus } from '../services/scanJobService.js';
import { getOwnedLibrary, getOwnedLibraryS3Context } from '../services/libraryAccessService.js';
import { createStreamToken } from '../services/authService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

const streamTokenSchema = Joi.object({
  key: Joi.string().min(1).required()
});

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
      const castData = parseCast(video.meta_cast_json);

      // This is a file in the current directory
      items.push({
        type: 'file',
        name: relativePath,
        key: video.key,
        size: video.size,
        lastModified: video.last_modified,
        metadata: {
          title: video.meta_title || null,
          year: video.meta_year || null,
          plot: video.meta_plot || null,
          posterUrl: video.meta_poster_url || null,
          backdropUrl: video.meta_backdrop_url || null,
          imdbRating: video.meta_imdb_rating || null,
          voteCount: video.meta_vote_count || null,
          releaseDate: video.meta_release_date || null,
          runtimeMinutes: video.meta_runtime_minutes || null,
          genres: parseGenres(video.meta_genres_json),
          cast: castData.cast,
          castPeople: castData.castPeople,
          director: video.meta_director || null,
          certification: video.meta_certification || null,
          tagline: video.meta_tagline || null,
          source: video.meta_source || null,
          fetchedAt: video.meta_fetched_at || null
        }
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

function parseList(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseCast(value) {
  const parsed = parseList(value);
  if (parsed.length === 0) {
    return { cast: [], castPeople: [] };
  }

  const castPeople = parsed
    .map((entry) => {
      if (typeof entry === 'string') {
        const name = `${entry}`.trim();
        return name ? { name, profileUrl: null } : null;
      }
      if (!entry || typeof entry !== 'object') return null;

      const name = `${entry.name || ''}`.trim();
      if (!name) return null;

      const profileUrl = typeof entry.profileUrl === 'string' && entry.profileUrl
        ? entry.profileUrl
        : null;

      return { name, profileUrl };
    })
    .filter(Boolean);

  return {
    cast: castPeople.map((person) => person.name),
    castPeople
  };
}

function parseGenres(value) {
  return parseList(value);
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

    const { library, s3Client } = getOwnedLibraryS3Context(libraryId, req.user.userId);

    // Combine library path prefix with requested prefix
    const fullPrefix = library.path_prefix
      ? `${library.path_prefix}/${prefix}`.replace(/\/+/g, '/').replace(/^\//, '')
      : prefix;

    // Get all matching videos from cache, then paginate folder-view items below.
    const result = await getCachedVideos(libraryId, {
      s3Client,
      bucket: library.bucket,
      pathPrefix: library.path_prefix || '',
      prefix: fullPrefix,
      search,
      page: 1,
      limit: limitNum,
      sort: sortBy,
      order: sortOrder,
      forceRefresh,
      paginate: false
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

    const totalItems = items.length;
    const offset = (pageNum - 1) * limitNum;
    const paginatedItems = items.slice(offset, offset + limitNum);

    res.json({
      libraryId,
      prefix,
      search,
      sort: sortBy,
      order: sortOrder,
      items: paginatedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limitNum),
        hasMore: pageNum * limitNum < totalItems
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

    if (error.status) {
      errorMessage = error.message;
      statusCode = error.status;
    } else if (error.Code === 'NoSuchBucket' || error.name === 'NoSuchBucket') {
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

    getOwnedLibrary(libraryId, req.user.userId);

    const { enqueued, job } = enqueueLibraryRefresh(req.user.userId, libraryId);

    const statusMessage = job.status === 'running'
      ? 'Refresh already running for this library'
      : (enqueued ? 'Refresh queued and started in background' : 'Refresh already queued for this library');

    res.status(enqueued ? 202 : 200).json({
      success: true,
      enqueued,
      status: job.status,
      message: statusMessage
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to refresh cache' });
  }
});

/**
 * POST /api/videos/:libraryId/stream-token
 * Mint short-lived token for a specific video key.
 */
router.post('/:libraryId/stream-token', async (req, res) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const { error, value } = streamTokenSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const key = value.key;
    if (key.includes('..') || key.startsWith('/') || key.includes('\\')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    getOwnedLibrary(libraryId, req.user.userId);
    const streamToken = createStreamToken({
      userId: req.user.userId,
      libraryId,
      key
    });

    res.json({
      streamToken,
      expiresIn: '5m'
    });
  } catch (error) {
    console.error('Create stream token error:', error);
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create stream token' });
  }
});

/**
 * GET /api/videos/:libraryId/refresh-status
 * Get background refresh status for a library
 */
router.get('/:libraryId/refresh-status', async (req, res) => {
  try {
    const libraryId = parseInt(req.params.libraryId);

    getOwnedLibrary(libraryId, req.user.userId);

    const status = getLibraryRefreshStatus(req.user.userId, libraryId);
    res.json(status);
  } catch (error) {
    console.error('Error fetching refresh status:', error);
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch refresh status' });
  }
});

export default router;
