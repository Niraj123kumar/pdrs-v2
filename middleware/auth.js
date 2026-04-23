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
 * Verify a JWT from the Authorization header and attach the decoded payload
 * to req.user. Responds 401 with { error: "Authentication required" } when
 * the token is missing, malformed, expired, or fails verification.
 */
function verifyToken(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'JWT_SECRET not configured' });
  }
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    req.token = token;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Authentication required' });
  }
}

/**
 * Sign a JWT for the given user payload using JWT_SECRET and JWT_EXPIRES_IN.
 */
function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

module.exports = {
  verifyToken,
  signToken,
  extractBearerToken,
  // Alias kept for any existing callers; identical to verifyToken.
  requireAuth: verifyToken,
};
