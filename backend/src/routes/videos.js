import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { decrypt } from '../utils/encryption.js';
import { createS3Client, listObjects, isVideoFile } from '../services/s3Service.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/videos/:libraryId
 * List videos in a library with optional prefix for folder navigation
 * Query params: prefix (optional)
 */
router.get('/:libraryId', async (req, res) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const prefix = req.query.prefix || '';

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

    // Create S3 client
    const s3Client = createS3Client({
      endpoint: library.endpoint,
      region: library.region,
      accessKey,
      secretKey
    });

    // Combine library path prefix with requested prefix
    const fullPrefix = library.path_prefix
      ? `${library.path_prefix}/${prefix}`.replace(/\/+/g, '/').replace(/^\//, '')
      : prefix;

    // List objects
    const objects = await listObjects(s3Client, library.bucket, fullPrefix);

    // Process objects to separate folders and files
    const items = [];
    const folders = new Set();

    for (const obj of objects) {
      // Remove the full prefix from the key to get relative path
      let relativePath = obj.Key;
      if (fullPrefix) {
        relativePath = obj.Key.substring(fullPrefix.length).replace(/^\//, '');
      }

      // Skip if empty (happens when listing the prefix itself)
      if (!relativePath) continue;

      // Check if this is a folder (contains a slash after removing prefix)
      const slashIndex = relativePath.indexOf('/');
      if (slashIndex > 0) {
        // This is a file in a subfolder, add the folder name
        const folderName = relativePath.substring(0, slashIndex);
        folders.add(folderName);
      } else if (slashIndex === -1) {
        // This is a file in the current directory
        if (isVideoFile(obj.Key)) {
          items.push({
            type: 'file',
            name: relativePath,
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified
          });
        }
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

    res.json({
      libraryId,
      prefix: prefix,
      items
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

export default router;
