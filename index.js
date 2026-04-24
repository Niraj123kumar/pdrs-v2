'use strict';

require('dotenv').config();

const http = require('http');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { getDatabase, closeDatabase } = require('./db');
const { attachWebSocketServer } = require('./websocket');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const projectRoutes = require('./routes/projects');
const aiRoutes = require('./routes/ai');
const facultyRoutes = require('./routes/faculty');
const notificationRoutes = require('./routes/notifications');
const panelRoutes = require('./routes/panel');

const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const DB_PATH = process.env.DB_PATH || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();

// Trust the first reverse proxy (Replit's iframe proxy / production load
// balancers) so express-rate-limit and req.ip see the real client address.
app.set('trust proxy', 1);

// --- Security & parsing middleware -----------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        // 'unsafe-inline' allows the small bootstrap script on index.html;
        // a later phase will replace this with per-response nonces.
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        'media-src': ["'self'", 'blob:'],
        'connect-src': ["'self'", 'ws:', 'wss:'],
        'frame-ancestors': ["'none'"],
      },
    },
  })
);

app.use(
  cors({
    origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : false,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Global, coarse rate limit. Tighter per-route limits (e.g. login) live on
// their respective route modules in later phases.
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- Database ---------------------------------------------------------------
const db = getDatabase(DB_PATH);
app.locals.db = db;

// --- Health -----------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  const row = db.prepare('SELECT 1 AS ok').get();
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  res.json({
    status: 'ok',
    service: 'pdrs',
    version: '0.1.0',
    db: row && row.ok === 1 ? 'connected' : 'unavailable',
    users: userCount,
    timestamp: new Date().toISOString(),
  });
});

// --- Feature routes (empty in Phase 1) -------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/panel', panelRoutes);

// --- Static frontend --------------------------------------------------------
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// --- 404 for unknown API routes --------------------------------------------
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// --- Error handler ----------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[pdrs] unhandled error:', err);
  res.status(500).json({ error: 'internal_server_error' });
});

// --- HTTP + WebSocket server ------------------------------------------------
const server = http.createServer(app);
attachWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`[pdrs] listening on http://localhost:${PORT}`);
});

function shutdown(signal) {
  console.log(`[pdrs] received ${signal}, shutting down`);
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = { app, server };
