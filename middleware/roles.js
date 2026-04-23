'use strict';

/**
 * Factory: returns middleware that only allows requests whose `req.user.role`
 * equals the given role string. Must compose after verifyToken so req.user
 * is populated.
 *
 * Usage:
 *   router.get('/x', verifyToken, requireRole('faculty'), handler)
 *
 * Responds 403 { error: "Access denied" } when role does not match.
 */
function requireRole(role) {
  return function roleGuard(req, res, next) {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Access denied' });
    }
    return next();
  };
}

module.exports = { requireRole };
