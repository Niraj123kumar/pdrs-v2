# PDRS — Project Defense Rehearsal System

Practice defending your project against AI-generated reviewer questions. Students
submit project details, go through rehearsal sessions with scored answers, and
faculty can run live panel sessions with annotations.

## Stack
- **Runtime:** Node.js 20+
- **Backend:** Express 4 (HTTP + WebSocket via `ws`)
- **Database:** SQLite (`better-sqlite3`), file-backed at `./data/pdrs.db`
- **Auth:** `bcryptjs` + `jsonwebtoken`
- **Security:** `helmet`, `cors`, `express-rate-limit`, `express-validator`
- **AI:** `groq-sdk` (wired in a later phase)
- **Frontend:** Vanilla HTML/CSS/JS served from `public/`

## Replit setup
- Single workflow **Start application** runs `npm start` and serves on port **5000** (webview).
- `index.js` reads `PORT` from `.env`, which is set to `5000`.
- `app.set('trust proxy', 1)` is enabled so `express-rate-limit` works correctly behind Replit's iframe proxy.
- A development `JWT_SECRET` is generated into `.env` on first setup; replace it for production.

## Demo accounts (seeded on first boot)
- `demo_student@pdrs.com` / `demo1234` (role: `student`)
- `demo_faculty@pdrs.com` / `demo1234` (role: `faculty`)

## Endpoints
- `GET /api/health` — service + database health check
- `POST /api/auth/*`, `/api/sessions/*`, `/api/projects/*`, `/api/ai/*`,
  `/api/faculty/*`, `/api/notifications/*`, `/api/panel/*`
- WebSocket server attached at `/ws`

## Deployment
- Configured as **VM** target (`npm start`). VM is required because the app keeps
  state in a local SQLite file and uses long-lived WebSocket connections; an
  autoscale deployment would lose data and connections on scale events.
- Set `JWT_SECRET` (and optionally `GROQ_API_KEY`) as production secrets before
  publishing.

## Project layout
```
index.js                 # Express + HTTP + WS entrypoint
db.js                    # better-sqlite3 init, schema, demo seed
websocket.js             # ws server attached to the HTTP server
routes/                  # Feature routes
middleware/              # auth, roles, validators
public/                  # Static frontend (HTML/CSS/JS)
data/                    # SQLite DB lives here (gitignored)
```

## Recent changes
- 2026-04-24: Initial Replit import. Created `.env` with `PORT=5000` and a
  generated `JWT_SECRET`. Added `app.set('trust proxy', 1)` in `index.js` so
  `express-rate-limit` works behind the Replit proxy. Configured the
  `Start application` workflow on port 5000 and a VM deployment running
  `npm start`.
