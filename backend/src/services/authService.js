import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import {
  isAccountLocked,
  recordFailedAttempt,
  clearFailedAttempts,
  getLockoutMinutesRemaining
} from './loginAttemptTracker.js';

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = '24h';
const STREAM_TOKEN_EXPIRY = process.env.STREAM_TOKEN_EXPIRY || '5m';

// Don't store JWT_SECRET in a constant - access directly from process.env
// to avoid ES6 module hoisting issues
const getJwtSecret = () => process.env.JWT_SECRET;

/**
 * Register a new user
 * @param {string} username
 * @param {string} password
 * @returns {Object} User object (without password)
 */
export async function registerUser(username, password) {
  // Normalize username to lowercase for case-insensitive authentication
  const normalizedUsername = username.toLowerCase().trim();

  // Check if user exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(normalizedUsername);
  if (existingUser) {
    throw new Error('Username already exists');
  }

  // Check if this is the first user - they should become admin automatically
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const isFirstUser = userCount.count === 0;

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Insert user (first user becomes admin)
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, is_admin, is_active) VALUES (?, ?, ?, 1)'
  ).run(normalizedUsername, passwordHash, isFirstUser ? 1 : 0);

  return {
    id: result.lastInsertRowid,
    username: normalizedUsername,
    isAdmin: isFirstUser
  };
}

/**
 * Login user and generate JWT token
 * @param {string} username
 * @param {string} password
 * @returns {Object} Token and user info
 */
export async function loginUser(username, password) {
  // Normalize username to lowercase for case-insensitive authentication
  const normalizedUsername = username.toLowerCase().trim();

  // Check if account is locked
  const lockStatus = isAccountLocked(normalizedUsername);
  if (lockStatus.isLocked) {
    const minutesRemaining = getLockoutMinutesRemaining(lockStatus.lockedUntil);
    throw new Error(`Account temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minutes.`);
  }

  // Get user
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(normalizedUsername);
  if (!user) {
    // Record failed attempt even if user doesn't exist (prevent username enumeration timing)
    recordFailedAttempt(normalizedUsername);
    throw new Error('Invalid credentials');
  }

  // Explicitly block inactive accounts from signing in.
  if (user.is_active !== 1) {
    throw new Error('Account is inactive');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    // Record failed attempt
    const attemptResult = recordFailedAttempt(normalizedUsername);

    if (attemptResult.isLocked) {
      const minutesRemaining = getLockoutMinutesRemaining(attemptResult.lockedUntil);
      throw new Error(`Account locked due to too many failed login attempts. Please try again in ${minutesRemaining} minutes.`);
    }

    // Inform user of remaining attempts
    if (attemptResult.attemptsRemaining <= 2) {
      throw new Error(`Invalid credentials. ${attemptResult.attemptsRemaining} attempts remaining before account lockout.`);
    }

    throw new Error('Invalid credentials');
  }

  // Clear failed attempts on successful login
  clearFailedAttempts(normalizedUsername);

  // Update last_login and login_count
  db.prepare(`
    UPDATE users
    SET last_login = CURRENT_TIMESTAMP,
        login_count = COALESCE(login_count, 0) + 1
    WHERE id = ?
  `).run(user.id);

  // Generate token with isAdmin flag
  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin === 1
    },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      isAdmin: user.is_admin === 1
    }
  };
}

/**
 * Create a short-lived JWT for streaming a specific video key.
 * @param {Object} params
 * @param {number} params.userId
 * @param {number} params.libraryId
 * @param {string} params.key
 * @returns {string} JWT stream token
 */
export function createStreamToken({ userId, libraryId, key }) {
  return jwt.sign(
    {
      tokenType: 'stream',
      userId,
      libraryId,
      key
    },
    getJwtSecret(),
    { expiresIn: STREAM_TOKEN_EXPIRY }
  );
}

/**
 * Verify JWT token
 * @param {string} token
 * @returns {Object} Decoded token payload
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Get user by ID
 * @param {number} userId
 * @returns {Object} User object (without password)
 */
export async function getUserById(userId) {
  const user = db.prepare('SELECT id, username, email, is_admin, is_active, created_at, last_login FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return {
    ...user,
    isAdmin: user.is_admin === 1,
    isActive: user.is_active === 1
  };
}

/**
 * Change user password
 * @param {number} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Object} Success message
 */
export async function changePassword(userId, currentPassword, newPassword) {
  // Get user with password hash
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Update password
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, userId);

  return {
    message: 'Password changed successfully'
  };
}
