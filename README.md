# PDRS — Project Defense Rehearsal System

Practice defending your project against AI-generated reviewer questions. Students
submit project details, go through rehearsal sessions with scored answers, and
faculty can run live panel sessions with annotations.

## Stack
- **Backend:** Node.js (>=20), Express
- **Database:** SQLite via `better-sqlite3`
- **Auth:** `bcryptjs` for password hashing, `jsonwebtoken` for access tokens
- **Realtime:** `ws` (WebSocket) for panel/live sessions
- **Security:** `helmet`, `cors`, `express-rate-limit`, `express-validator`
- **AI:** `groq-sdk` (wired in a later phase)
- **Frontend:** Vanilla HTML / CSS / JavaScript (no frameworks)

## Phase 1 — what's built

Scaffold and database only. No feature routes yet.

- Full project layout (routes/, middleware/, public/ with pages + css + js modules)
- `db.js` initialises SQLite with these 9 tables:
  `users`, `projects`, `sessions`, `answers`, `panel_sessions`,
  `session_requests`, `notifications`, `panel_annotations`, `login_attempts`
- Seeds two demo accounts on first boot (bcrypt-hashed):
  - `demo_student@pdrs.com` / `demo1234` (role: `student`)
  - `demo_faculty@pdrs.com` / `demo1234` (role: `faculty`)
- `GET /api/health` health endpoint
- WebSocket server attached at `/ws`
- `render.yaml` for one-click Render deploy

## Setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET.
npm start
```

Open <http://localhost:3000>.

## Project layout

```
.
├── index.js                 # Express + HTTP + WS entrypoint
├── db.js                    # better-sqlite3 init, schema, demo seed
├── websocket.js             # ws server attached to the HTTP server
├── routes/                  # Feature routes (empty in Phase 1)
│   ├── auth.js
│   ├── sessions.js
│   ├── projects.js
│   ├── ai.js
│   ├── faculty.js
│   ├── notifications.js
│   └── panel.js
├── middleware/
│   ├── auth.js              # JWT verification
│   ├── roles.js             # Role-based access
│   └── validators.js        # express-validator helpers
├── public/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── student.html
│   ├── faculty.html
│   ├── session.html
│   ├── results.html
│   ├── history.html
│   ├── notifications.html
│   ├── panel.html
│   ├── css/
│   │   ├── style.css
│   │   └── animations.css
│   └── js/
│       ├── api.js
│       ├── auth.js
│       ├── utils.js
│       ├── animations.js
│       ├── charts.js
│       ├── toast.js
│       ├── websocket.js
│       └── webrtc.js
├── data/                    # SQLite DB lives here (gitignored)
├── render.yaml
├── .env.example
└── package.json
```

## Conventions
- All SQL uses prepared statements with bound parameters. No string concatenation.
- Complete files only — no placeholders or TODOs in committed code.
- Every schema change goes through the migrations runner in `db.js`.
