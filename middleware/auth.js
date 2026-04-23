'use strict';

const jwt = require('jsonwebtoken');

/**
 * Extract a bearer token from the Authorization header.
 */
function extractBearerToken(req) {
  const header = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/**
 * Verify a JWT and attach the decoded payload to `req.user`.
 * Returns 401 on missing/invalid token.
 */
function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'jwt_secret_not_configured' });
  }
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'missing_token' });
  }
  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    req.token = token;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

/**
 * Sign a JWT for the given user payload using the configured secret/expiry.
 */
function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

module.exports = {
  requireAuth,
  signToken,
  extractBearerToken,
};
