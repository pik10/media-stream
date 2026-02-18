import db from '../config/database.js';
import { decrypt } from '../utils/encryption.js';
import { getOrCreateClient } from './s3ConnectionPool.js';

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * Resolve a library owned by a specific user.
 * Throws an HTTP-style error when the library is missing.
 */
export function getOwnedLibrary(libraryId, userId) {
  const library = db.prepare(`
    SELECT * FROM libraries WHERE id = ? AND user_id = ?
  `).get(libraryId, userId);

  if (!library) {
    throw createHttpError(404, 'Library not found');
  }

  return library;
}

/**
 * Resolve library + decrypted credentials + pooled S3 client.
 * Throws HTTP-style errors for missing library or invalid credential state.
 */
export function getOwnedLibraryS3Context(libraryId, userId) {
  const library = getOwnedLibrary(libraryId, userId);

  const accessKey = decrypt(library.access_key_encrypted);
  const secretKey = decrypt(library.secret_key_encrypted);

  if (!accessKey || !secretKey) {
    console.error('Failed to decrypt credentials for library:', libraryId);
    throw createHttpError(500, 'Library configuration error');
  }

  const s3Client = getOrCreateClient(userId, libraryId, {
    endpoint: library.endpoint,
    region: library.region,
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  });

  return { library, s3Client };
}
