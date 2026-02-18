import { verifyToken } from '../services/authService.js';

/**
 * Middleware to verify JWT token from query parameter (for video streaming)
 * HTML5 video elements can't send Authorization headers, so we use query params
 */
export function authenticateStreamToken(req, res, next) {
  const token = req.query.streamToken || req.query.token || req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // Attach user info to request
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
