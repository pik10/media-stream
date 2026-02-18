import express from 'express';
import db from '../config/database.js';
import { authenticateStreamToken } from '../middleware/streamAuth.js';
import { decrypt } from '../utils/encryption.js';
import { getObjectStream, getVideoMimeType } from '../services/s3Service.js';
import { getOrCreateClient } from '../services/s3ConnectionPool.js';
import { recordStreamStart, recordStreamOutcome } from '../services/metricsService.js';

const router = express.Router();

// All routes require authentication (accepts token from query param for video streaming)
router.use(authenticateStreamToken);

/**
 * GET /api/stream/:libraryId/:encodedKey
 * Stream video from S3 with HTTP Range request support
 * The key is base64url encoded to handle special characters in paths
 */
router.get('/:libraryId/:encodedKey', async (req, res) => {
  let libraryId;
  let stream;
  let metricsStarted = false;
  let finalized = false;
  const startedAt = Date.now();

  const finalizeStreamMetric = (outcome, statusCode) => {
    if (finalized || !metricsStarted) return;
    finalized = true;
    recordStreamOutcome(libraryId, outcome, statusCode, Date.now() - startedAt);
  };

  const cleanupStream = () => {
    if (stream && !stream.destroyed) {
      stream.destroy();
    }
  };

  try {
    libraryId = parseInt(req.params.libraryId);
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

    // Reuse pooled S3 client to reduce connection churn under range-heavy playback.
    const s3Client = getOrCreateClient(req.user.userId, libraryId, {
      endpoint: library.endpoint,
      region: library.region,
      accessKeyId: accessKey,
      secretAccessKey: secretKey
    });

    // Parse Range header
    const range = req.headers.range;
    recordStreamStart(libraryId);
    metricsStarted = true;

    if (range) {
      // Handle range request (for video seeking)
      const rangeResponse = await getObjectStream(s3Client, library.bucket, key, {
        range
      });
      stream = rangeResponse.stream;

      // Send partial content response
      res.writeHead(206, {
        'Content-Range': rangeResponse.contentRange,
        'Accept-Ranges': 'bytes',
        'Content-Length': rangeResponse.contentLength,
        'Content-Type': rangeResponse.contentType || getVideoMimeType(key),
        'Cache-Control': 'private, max-age=3600'
      });
    } else {
      // Handle full file request
      const fullResponse = await getObjectStream(s3Client, library.bucket, key);
      stream = fullResponse.stream;

      res.writeHead(200, {
        'Content-Length': fullResponse.contentLength,
        'Content-Type': fullResponse.contentType || getVideoMimeType(key),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600'
      });
    }

    req.on('aborted', () => {
      cleanupStream();
      finalizeStreamMetric('client_aborted', 499);
    });
    res.on('close', () => {
      if (!finalized) {
        cleanupStream();
        finalizeStreamMetric('client_aborted', 499);
      }
    });
    res.on('error', cleanupStream);
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        finalizeStreamMetric('completed', res.statusCode);
      } else {
        finalizeStreamMetric('other_error', res.statusCode);
      }
    });

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      cleanupStream();
      finalizeStreamMetric('upstream_error', 502);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming failed' });
      } else {
        res.destroy(error);
      }
    });

    // Pipe stream to response
    stream.pipe(res);

  } catch (error) {
    console.error('Streaming error:', error);

    // Check if headers already sent
    if (!res.headersSent) {
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        finalizeStreamMetric('not_found', 404);
        res.status(404).json({ error: 'Video not found' });
      } else if (error.name === 'InvalidRange' || error.Code === 'InvalidRange' || error.$metadata?.httpStatusCode === 416) {
        finalizeStreamMetric('invalid_range', 416);
        res.status(416).json({ error: 'Requested range not satisfiable' });
      } else {
        finalizeStreamMetric('other_error', 500);
        res.status(500).json({ error: 'Streaming failed' });
      }
    } else {
      finalizeStreamMetric('other_error', res.statusCode || 500);
    }
  }
});

export default router;
