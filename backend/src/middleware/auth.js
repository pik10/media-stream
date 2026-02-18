import { verifyToken } from '../services/authService.js';
import db from '../config/database.js';

/**
 * Middleware to verify JWT token and attach user info to request
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);

    // Stream tokens are only valid for /api/stream routes.
    if (decoded.tokenType === 'stream') {
      return res.status(403).json({ error: 'Invalid access token type' });
    }

    // Enforce current user state from DB so deactivation/admin role changes
    // take effect immediately for already-issued tokens.
    const user = db.prepare('SELECT id, username, is_admin, is_active FROM users WHERE id = ?').get(decoded.userId);
    if (!user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    if (user.is_active !== 1) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    req.user = {
      ...decoded,
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin === 1,
      isActive: user.is_active === 1
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
