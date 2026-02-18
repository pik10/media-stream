/**
 * Login Attempt Tracker Service
 * Tracks failed login attempts and implements account lockout
 */

// In-memory storage for failed login attempts
// Key: username, Value: { count, firstAttempt, lockedUntil }
const failedAttempts = new Map();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window

function normalizeUsername(username) {
  return String(username || '').toLowerCase().trim();
}

/**
 * Check if an account is locked
 * @param {string} username
 * @returns {Object} { isLocked: boolean, lockedUntil: Date|null }
 */
export function isAccountLocked(username) {
  const normalizedUsername = normalizeUsername(username);
  const record = failedAttempts.get(normalizedUsername);

  if (!record) {
    return { isLocked: false, lockedUntil: null };
  }

  const now = Date.now();

  // Check if lockout period has expired
  if (record.lockedUntil && now >= record.lockedUntil) {
    // Lockout expired, clear the record
    failedAttempts.delete(normalizedUsername);
    return { isLocked: false, lockedUntil: null };
  }

  // Check if still locked
  if (record.lockedUntil && now < record.lockedUntil) {
    return { isLocked: true, lockedUntil: new Date(record.lockedUntil) };
  }

  return { isLocked: false, lockedUntil: null };
}

/**
 * Record a failed login attempt
 * @param {string} username
 * @returns {Object} { isLocked: boolean, attemptsRemaining: number, lockedUntil: Date|null }
 */
export function recordFailedAttempt(username) {
  const normalizedUsername = normalizeUsername(username);
  const now = Date.now();
  let record = failedAttempts.get(normalizedUsername);

  if (!record) {
    // First failed attempt
    record = {
      count: 1,
      firstAttempt: now,
      lockedUntil: null
    };
    failedAttempts.set(normalizedUsername, record);
    return {
      isLocked: false,
      attemptsRemaining: MAX_ATTEMPTS - 1,
      lockedUntil: null
    };
  }

  // Check if we're outside the attempt window - reset if so
  if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
    record = {
      count: 1,
      firstAttempt: now,
      lockedUntil: null
    };
    failedAttempts.set(normalizedUsername, record);
    return {
      isLocked: false,
      attemptsRemaining: MAX_ATTEMPTS - 1,
      lockedUntil: null
    };
  }

  // Increment failed attempt count
  record.count++;

  // Lock account if max attempts reached
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    failedAttempts.set(normalizedUsername, record);

    console.warn(`Account locked: ${normalizedUsername} (${record.count} failed attempts)`);

    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockedUntil: new Date(record.lockedUntil)
    };
  }

  failedAttempts.set(normalizedUsername, record);
  return {
    isLocked: false,
    attemptsRemaining: MAX_ATTEMPTS - record.count,
    lockedUntil: null
  };
}

/**
 * Clear failed attempts for a username (call on successful login)
 * @param {string} username
 */
export function clearFailedAttempts(username) {
  const normalizedUsername = normalizeUsername(username);
  failedAttempts.delete(normalizedUsername);
}

/**
 * Get lockout/attempt status for admin visibility
 * @param {string} username
 * @returns {Object}
 */
export function getAttemptStatus(username) {
  const normalizedUsername = normalizeUsername(username);
  const record = failedAttempts.get(normalizedUsername);

  if (!record) {
    return {
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      attemptsRemaining: MAX_ATTEMPTS
    };
  }

  const lockStatus = isAccountLocked(normalizedUsername);
  if (!lockStatus.isLocked && !failedAttempts.has(normalizedUsername)) {
    return {
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 0,
      attemptsRemaining: MAX_ATTEMPTS
    };
  }

  const activeRecord = failedAttempts.get(normalizedUsername);
  const count = activeRecord?.count || 0;

  return {
    isLocked: lockStatus.isLocked,
    lockedUntil: lockStatus.lockedUntil,
    failedAttempts: count,
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - count)
  };
}

/**
 * Unlock account and clear failed attempts
 * @param {string} username
 */
export function unlockAccount(username) {
  clearFailedAttempts(username);
}

/**
 * Get remaining lockout time in minutes
 * @param {Date} lockedUntil
 * @returns {number} Minutes remaining
 */
export function getLockoutMinutesRemaining(lockedUntil) {
  if (!lockedUntil) return 0;
  const remaining = lockedUntil.getTime() - Date.now();
  return Math.ceil(remaining / 60000);
}

// Cleanup old entries every hour to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [username, record] of failedAttempts.entries()) {
    // Remove entries older than 1 hour
    if (now - record.firstAttempt > 3600000) {
      failedAttempts.delete(username);
    }
  }
}, 3600000); // Run every hour
