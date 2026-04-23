'use strict';

const { Router } = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');

const { signToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validators');

const router = Router();

const BCRYPT_ROUNDS = 12;
const ALLOWED_ROLES = new Set(['student', 'faculty']);

// Tighter limit on auth endpoints to slow down brute-force attempts. The
// global /api limiter in index.js still applies underneath.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' },
});

function clientIp(req) {
  const xf = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return xf || req.ip || req.socket.remoteAddress || '';
}

function userPayload(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

router.post(
  '/register',
  authLimiter,
  [
    body('name')
      .isString().withMessage('name must be a string')
      .trim()
      .isLength({ min: 1, max: 120 }).withMessage('name is required'),
    body('email')
      .isString().withMessage('email must be a string')
      .trim()
      .isEmail().withMessage('email must be a valid email')
      .normalizeEmail({ gmail_remove_dots: false })
      .isLength({ max: 254 }),
    body('password')
      .isString().withMessage('password must be a string')
      .isLength({ min: 8, max: 128 }).withMessage('password must be 8–128 characters'),
    body('role')
      .isString()
      .isIn(['student', 'faculty']).withMessage('role must be "student" or "faculty"'),
  ],
  handleValidation,
  (req, res) => {
    const db = req.app.locals.db;
    const { name, email, password, role } = req.body;

    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({ error: 'role must be "student" or "faculty"' });
    }

    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    const info = db
      .prepare(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
      )
      .run(name.trim(), email, passwordHash, role);

    const user = db
      .prepare('SELECT id, name, email, role FROM users WHERE id = ?')
      .get(info.lastInsertRowid);

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.status(201).json({ token, user: userPayload(user) });
  }
);

router.post(
  '/login',
  authLimiter,
  [
    body('email')
      .isString()
      .trim()
      .isEmail().withMessage('email must be a valid email')
      .normalizeEmail({ gmail_remove_dots: false }),
    body('password')
      .isString()
      .isLength({ min: 1, max: 128 }).withMessage('password is required'),
  ],
  handleValidation,
  (req, res) => {
    const db = req.app.locals.db;
    const { email, password } = req.body;
    const ip = clientIp(req);

    const recordAttempt = db.prepare(
      'INSERT INTO login_attempts (email, ip, success) VALUES (?, ?, ?)'
    );

    const user = db
      .prepare(
        'SELECT id, name, email, role, password_hash FROM users WHERE email = ?'
      )
      .get(email);

    if (!user) {
      recordAttempt.run(email, ip, 0);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) {
      recordAttempt.run(email, ip, 0);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    recordAttempt.run(email, ip, 1);

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.json({ token, user: userPayload(user) });
  }
);

module.exports = router;
