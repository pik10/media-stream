import express from 'express';
import { authenticateStreamToken } from '../middleware/streamAuth.js';
import { getObjectStream, getVideoMimeType } from '../services/s3Service.js';
import { recordStreamStart, recordStreamOutcome } from '../services/metricsService.js';
import { getOwnedLibraryS3Context } from '../services/libraryAccessService.js';

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

    if (req.user.tokenType === 'stream') {
      if (req.user.libraryId !== libraryId || req.user.key !== key) {
        return res.status(403).json({ error: 'Invalid stream token' });
      }
    }

    const { library, s3Client } = getOwnedLibraryS3Context(libraryId, req.user.userId);

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
      if (error.status) {
        finalizeStreamMetric('other_error', error.status);
        res.status(error.status).json({ error: error.message });
      } else if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
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
