/**
 * Admin Authentication Middleware
 * Ensures the authenticated user has admin privileges
 */

export function requireAdmin(req, res, next) {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
