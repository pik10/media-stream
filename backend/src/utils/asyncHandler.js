/**
 * Async error handler wrapper for Express routes
 * Eliminates repetitive try-catch blocks in route handlers
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => {
 *     const data = await someAsyncOperation();
 *     res.json({ data });
 *   }));
 *
 * The wrapper automatically catches errors and passes them to Express error handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Standard error response helper
 * Provides consistent error responses across all routes
 *
 * Usage in route:
 *   return sendError(res, 404, 'User not found');
 */
export const sendError = (res, status, message) => {
  return res.status(status).json({ error: message });
};
