'use strict';

/**
 * Factory: returns middleware that allows only users whose `req.user.role`
 * matches one of the allowed roles. Must be composed after `requireAuth`.
 *
 *   app.get('/x', requireAuth, requireRole('faculty'), handler)
 *   app.get('/y', requireAuth, requireRole('student', 'faculty'), handler)
 */
function requireRole(...allowed) {
  const allowedSet = new Set(allowed);
  return function roleGuard(req, res, next) {
    const user = req.user;
    if (!user || !user.role) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    if (!allowedSet.has(user.role)) {
      return res.status(403).json({ error: 'forbidden', required: [...allowedSet] });
    }
    return next();
  };
}

module.exports = { requireRole };
