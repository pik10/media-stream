import express from 'express';
import Joi from 'joi';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { testConnection } from '../services/s3Service.js';
import { invalidateLibrary } from '../services/s3ConnectionPool.js';
import { invalidateCache } from '../services/videoCacheService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation schema for adding library
const addLibrarySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  endpoint: Joi.string().uri().required(),
  region: Joi.string().min(1).required(),
  bucket: Joi.string().min(1).required(),
  accessKey: Joi.string().min(1).required(),
  secretKey: Joi.string().min(1).required(),
  pathPrefix: Joi.string().allow('').optional(),
  showOnHome: Joi.boolean().optional()
});

/**
 * GET /api/libraries
 * List all libraries for current user
 */
router.get('/', async (req, res) => {
  try {
    const libraries = db.prepare(`
      SELECT id, name, endpoint, region, bucket, path_prefix, show_on_home, created_at
      FROM libraries
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.userId);

    res.json({ libraries });
  } catch (error) {
    console.error('Get libraries error:', error);
    res.status(500).json({ error: 'Failed to fetch libraries' });
  }
});

/**
 * POST /api/libraries
 * Add a new S3 library
 */
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error, value } = addLibrarySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, endpoint, region, bucket, accessKey, secretKey, pathPrefix, showOnHome } = value;

    // Encrypt credentials
    const accessKeyEncrypted = encrypt(accessKey);
    const secretKeyEncrypted = encrypt(secretKey);

    // Insert library
    const result = db.prepare(`
      INSERT INTO libraries (user_id, name, endpoint, region, bucket, access_key_encrypted, secret_key_encrypted, path_prefix, show_on_home)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.userId,
      name,
      endpoint,
      region,
      bucket,
      accessKeyEncrypted,
      secretKeyEncrypted,
      pathPrefix || '',
      showOnHome === false ? 0 : 1
    );

    const library = {
      id: result.lastInsertRowid,
      name,
      endpoint,
      region,
      bucket,
      path_prefix: pathPrefix || '',
      show_on_home: showOnHome === false ? 0 : 1
    };

    res.status(201).json({
      message: 'Library added successfully',
      library
    });
  } catch (error) {
    console.error('Add library error:', error);
    res.status(500).json({ error: 'Failed to add library' });
  }
});

/**
 * PUT /api/libraries/:id
 * Update an existing library
 */
router.put('/:id', async (req, res) => {
  try {
    const libraryId = parseInt(req.params.id);

    // Get existing library and verify ownership
    const existingLibrary = db.prepare('SELECT * FROM libraries WHERE id = ?').get(libraryId);
    if (!existingLibrary) {
      return res.status(404).json({ error: 'Library not found' });
    }
    if (existingLibrary.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // For update, make accessKey and secretKey optional
    const updateSchema = Joi.object({
      name: Joi.string().min(1).max(100).required(),
      endpoint: Joi.string().uri().required(),
      region: Joi.string().min(1).required(),
      bucket: Joi.string().min(1).required(),
      accessKey: Joi.string().allow('').optional(),
      secretKey: Joi.string().allow('').optional(),
      pathPrefix: Joi.string().allow('').optional(),
      showOnHome: Joi.boolean().optional()
    });

    // Validate input
    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, endpoint, region, bucket, accessKey, secretKey, pathPrefix, showOnHome } = value;
    const nextShowOnHome = typeof showOnHome === 'boolean'
      ? (showOnHome ? 1 : 0)
      : (existingLibrary.show_on_home ?? 1);

    // If credentials are provided, encrypt them; otherwise keep existing
    let accessKeyEncrypted = existingLibrary.access_key_encrypted;
    let secretKeyEncrypted = existingLibrary.secret_key_encrypted;

    if (accessKey && accessKey.trim() !== '') {
      accessKeyEncrypted = encrypt(accessKey);
    }
    if (secretKey && secretKey.trim() !== '') {
      secretKeyEncrypted = encrypt(secretKey);
    }

    // Update library
    db.prepare(`
      UPDATE libraries
      SET name = ?, endpoint = ?, region = ?, bucket = ?,
          access_key_encrypted = ?, secret_key_encrypted = ?, path_prefix = ?, show_on_home = ?
      WHERE id = ?
    `).run(
      name,
      endpoint,
      region,
      bucket,
      accessKeyEncrypted,
      secretKeyEncrypted,
      pathPrefix || '',
      nextShowOnHome,
      libraryId
    );

    // Invalidate S3 pool and cache when library credentials/config change
    invalidateLibrary(libraryId);
    invalidateCache(libraryId);

    const updatedLibrary = {
      id: libraryId,
      name,
      endpoint,
      region,
      bucket,
      path_prefix: pathPrefix || '',
      show_on_home: nextShowOnHome
    };

    res.json({
      message: 'Library updated successfully',
      library: updatedLibrary
    });
  } catch (error) {
    console.error('Update library error:', error);
    res.status(500).json({ error: 'Failed to update library' });
  }
});

/**
 * DELETE /api/libraries/:id
 * Delete a library
 */
router.delete('/:id', async (req, res) => {
  try {
    const libraryId = parseInt(req.params.id);

    // Verify ownership
    const library = db.prepare('SELECT user_id FROM libraries WHERE id = ?').get(libraryId);
    if (!library) {
      return res.status(404).json({ error: 'Library not found' });
    }
    if (library.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete library
    db.prepare('DELETE FROM libraries WHERE id = ?').run(libraryId);

    // Invalidate S3 pool and cache when library is deleted
    invalidateLibrary(libraryId);
    invalidateCache(libraryId);

    res.json({ message: 'Library deleted successfully' });
  } catch (error) {
    console.error('Delete library error:', error);
    res.status(500).json({ error: 'Failed to delete library' });
  }
});

/**
 * POST /api/libraries/test
 * Test S3 connection WITHOUT saving the library (for validation before adding)
 */
router.post('/test', async (req, res) => {
  try {
    // Validate input
    const { error, value } = addLibrarySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { endpoint, region, bucket, accessKey, secretKey } = value;

    // Test connection without saving
    await testConnection({
      endpoint,
      region,
      bucket,
      accessKey,
      secretKey
    });

    res.json({ message: 'Connection successful' });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/libraries/:id/test
 * Test S3 connection for an existing library
 */
router.post('/:id/test', async (req, res) => {
  try {
    const libraryId = parseInt(req.params.id);

    // Get library with credentials
    const library = db.prepare(`
      SELECT * FROM libraries WHERE id = ? AND user_id = ?
    `).get(libraryId, req.user.userId);

    if (!library) {
      return res.status(404).json({ error: 'Library not found' });
    }

    // Decrypt credentials
    const accessKey = decrypt(library.access_key_encrypted);
    const secretKey = decrypt(library.secret_key_encrypted);

    // Test connection
    await testConnection({
      endpoint: library.endpoint,
      region: library.region,
      bucket: library.bucket,
      accessKey,
      secretKey
    });

    res.json({ message: 'Connection successful' });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
