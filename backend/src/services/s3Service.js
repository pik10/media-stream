import { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const S3_RETRY_ATTEMPTS = Math.max(1, parseInt(process.env.S3_RETRY_ATTEMPTS || '3', 10));
const S3_RETRY_BASE_DELAY_MS = Math.max(25, parseInt(process.env.S3_RETRY_BASE_DELAY_MS || '120', 10));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableS3Error(error) {
  const status = error?.$metadata?.httpStatusCode;
  const name = error?.name || '';
  const code = error?.Code || error?.code || '';

  if (status === 429 || status >= 500) return true;
  if (['SlowDown', 'InternalError', 'ServiceUnavailable', 'RequestTimeout', 'TimeoutError'].includes(code)) return true;
  if (['SlowDown', 'InternalError', 'ServiceUnavailable', 'RequestTimeout', 'TimeoutError'].includes(name)) return true;

  const message = `${error?.message || ''}`.toLowerCase();
  if (message.includes('socket hang up') || message.includes('timeout') || message.includes('temporarily unavailable') || message.includes('econnreset') || message.includes('eai_again')) {
    return true;
  }

  return false;
}

async function sendWithRetry(client, command, operationName) {
  let attempt = 0;

  while (attempt < S3_RETRY_ATTEMPTS) {
    try {
      return await client.send(command);
    } catch (error) {
      const retryable = isRetryableS3Error(error);
      const isLastAttempt = attempt >= S3_RETRY_ATTEMPTS - 1;

      if (!retryable || isLastAttempt) {
        throw error;
      }

      const delayMs = S3_RETRY_BASE_DELAY_MS * (2 ** attempt) + Math.floor(Math.random() * 50);
      console.warn(`[s3-retry] ${operationName} failed (attempt ${attempt + 1}/${S3_RETRY_ATTEMPTS}): ${error.name || error.Code || error.message}. retrying in ${delayMs}ms`);
      await sleep(delayMs);
      attempt += 1;
    }
  }
}

/**
 * Create S3 client with custom configuration
 * @param {Object} config - S3 configuration
 * @returns {S3Client}
 */
export function createS3Client(config) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey
    },
    forcePathStyle: true // Required for some S3-compatible services like Garage
  });
}

/**
 * List objects in S3 bucket with optional prefix
 * Automatically handles pagination for large buckets
 * @param {S3Client} client
 * @param {string} bucket
 * @param {string} prefix
 * @param {number} maxKeys - Max keys per request (default 1000)
 * @param {number} maxTotal - Max total objects to return (default 10000)
 * @returns {Promise<Array>} List of objects
 */
export async function listObjects(client, bucket, prefix = '', maxKeys = 1000, maxTotal = 10000) {
  const allObjects = [];
  let continuationToken = undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken
    });

    const response = await sendWithRetry(client, command, 'ListObjectsV2');
    const contents = response.Contents || [];
    allObjects.push(...contents);

    continuationToken = response.NextContinuationToken;

    // Safety limit to avoid memory issues with very large buckets
    if (allObjects.length >= maxTotal) {
      console.warn(`Reached max object limit (${maxTotal}) for bucket ${bucket}, prefix ${prefix}`);
      break;
    }
  } while (continuationToken);

  return allObjects;
}

/**
 * Get object stream from S3
 * @param {S3Client} client
 * @param {string} bucket
 * @param {string} key
 * @param {Object} options - Optional range parameters
 * @returns {Promise<Object>} Object with stream and metadata
 */
export async function getObjectStream(client, bucket, key, options = {}) {
  const params = {
    Bucket: bucket,
    Key: key
  };

  // Add Range header if specified
  if (options.range) {
    params.Range = options.range;
  }

  const command = new GetObjectCommand(params);
  const response = await sendWithRetry(client, command, 'GetObject');

  return {
    stream: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    contentRange: response.ContentRange,
    acceptRanges: response.AcceptRanges,
    lastModified: response.LastModified,
    etag: response.ETag
  };
}

/**
 * Get object metadata without downloading
 * @param {S3Client} client
 * @param {string} bucket
 * @param {string} key
 * @returns {Promise<Object>} Object metadata
 */
export async function getObjectMetadata(client, bucket, key) {
  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key
  });

  const response = await sendWithRetry(client, command, 'HeadObject');

  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    etag: response.ETag
  };
}

/**
 * Test S3 connection by listing bucket
 * @param {Object} config - S3 configuration
 * @returns {Promise<boolean>}
 */
export async function testConnection(config) {
  try {
    const client = createS3Client(config);
    await listObjects(client, config.bucket, '', 1);
    return true;
  } catch (error) {
    throw new Error(`S3 connection failed: ${error.message}`);
  }
}

/**
 * Check if file is a video based on extension
 * @param {string} key - S3 object key
 * @returns {boolean}
 */
export function isVideoFile(key) {
  const videoExtensions = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.m4v', '.flv', '.wmv', '.mpg', '.mpeg'];
  const extension = key.substring(key.lastIndexOf('.')).toLowerCase();
  return videoExtensions.includes(extension);
}

/**
 * Get MIME type for video file
 * @param {string} key - S3 object key
 * @returns {string}
 */
export function getVideoMimeType(key) {
  const extension = key.substring(key.lastIndexOf('.')).toLowerCase();
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.m4v': 'video/x-m4v',
    '.flv': 'video/x-flv',
    '.wmv': 'video/x-ms-wmv',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}
