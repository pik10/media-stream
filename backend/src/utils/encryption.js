import CryptoJS from 'crypto-js';

// Don't store ENCRYPTION_KEY in a constant - access directly from process.env
// to avoid ES6 module hoisting issues (same as JWT_SECRET)
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  return key;
};

/**
 * Encrypt text using AES-256
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text
 */
export function encrypt(text) {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, getEncryptionKey()).toString();
}

/**
 * Decrypt text using AES-256
 * @param {string} encryptedText - Encrypted text to decrypt
 * @returns {string} Decrypted text
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return '';
  const bytes = CryptoJS.AES.decrypt(encryptedText, getEncryptionKey());
  return bytes.toString(CryptoJS.enc.Utf8);
}
