import express from 'express';
import db from '../config/database.js';
import { authenticateStreamToken } from '../middleware/streamAuth.js';
import { decrypt } from '../utils/encryption.js';
import { createS3Client, getObjectStream, getObjectMetadata, getVideoMimeType } from '../services/s3Service.js';

const router = express.Router();

// All routes require authentication (accepts token from query param for video streaming)
router.use(authenticateStreamToken);

/**
 * GET /api/stream/:libraryId/:encodedKey
 * Stream video from S3 with HTTP Range request support
 * The key is base64url encoded to handle special characters in paths
 */
router.get('/:libraryId/:encodedKey', async (req, res) => {
  try {
    const libraryId = parseInt(req.params.libraryId);
    const key = decodeURIComponent(req.params.encodedKey);

    // Validate key to prevent path traversal attacks
    if (key.includes('..') || key.startsWith('/') || key.includes('\\')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

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

    // Get object metadata first to know the size
    const metadata = await getObjectMetadata(s3Client, library.bucket, key);
    const fileSize = metadata.contentLength;
    const mimeType = metadata.contentType || getVideoMimeType(key);

    // Parse Range header
    const range = req.headers.range;

    if (range) {
      // Handle range request (for video seeking)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // Get object stream with range
      const { stream } = await getObjectStream(s3Client, library.bucket, key, {
        range: `bytes=${start}-${end}`
      });

      // Send partial content response
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600'
      });

      // Pipe stream to response
      stream.pipe(res);
    } else {
      // Handle full file request
      const { stream } = await getObjectStream(s3Client, library.bucket, key);

      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600'
      });

      // Pipe stream to response
      stream.pipe(res);
    }

    // Handle stream errors
    res.on('error', (error) => {
      console.error('Stream error:', error);
    });

  } catch (error) {
    console.error('Streaming error:', error);

    // Check if headers already sent
    if (!res.headersSent) {
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        res.status(404).json({ error: 'Video not found' });
      } else {
        res.status(500).json({ error: 'Streaming failed' });
      }
    }
  }
});

export default router;
