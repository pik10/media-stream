import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints (stricter)
 * 5 requests per minute to prevent brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for general API endpoints
 * 100 requests per minute per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for video streaming endpoints
 * 50 requests per minute to prevent abuse while allowing normal usage
 */
export const streamLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: { error: 'Too many streaming requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
