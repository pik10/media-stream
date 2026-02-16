import { createS3Client } from '../services/s3Service.js';
import { decrypt } from './encryption.js';

/**
 * Get library with decrypted credentials and S3 client
 * @param {Object} db - Database instance
 * @param {number} libraryId - Library ID
 * @param {number} userId - User ID for ownership verification
 * @returns {Promise<Object|null>} Object with library, s3Client, accessKey, secretKey or null if not found
 * @throws {Error} If credentials cannot be decrypted
 */
export async function getLibraryWithS3Client(db, libraryId, userId) {
  const library = await db.prepare(`
    SELECT * FROM libraries WHERE id = ? AND user_id = ?
  `).get(libraryId, userId);

  if (!library) {
    return null;
  }

  // Decrypt credentials
  const accessKey = decrypt(library.access_key_encrypted);
  const secretKey = decrypt(library.secret_key_encrypted);

  // Validate decrypted credentials
  if (!accessKey || !secretKey) {
    console.error('Failed to decrypt credentials for library:', libraryId);
    throw new Error('Failed to decrypt library credentials. This may indicate a wrong ENCRYPTION_KEY.');
  }

  // Create S3 client
  const s3Client = createS3Client({
    endpoint: library.endpoint,
    region: library.region,
    accessKey,
    secretKey
  });

  return { library, s3Client, accessKey, secretKey };
}
