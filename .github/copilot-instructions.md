## Grainology — Copilot instructions

Short context
- This repo is a full-stack React + TypeScript frontend (Vite) and a Node/Express backend that uses Mongoose/MongoDB. The backend entry is `server.js` (ES modules). Frontend entry is `src/main.tsx` and app routes are in `src/App.tsx`.

How to run (explicit)
- Install deps: `npm install` at repo root. The repo uses `type: "module"` so prefer ES module imports.
- Start backend (dev): `npm run dev` — this runs `nodemon server.js` and binds the API at `http://localhost:3001` by default.
- Start frontend (dev): `npm run dev:frontend` (this runs `vite --host`); the frontend expects API at `VITE_API_URL` (see README). When debugging CORS, check `server.js` which builds an `allowedOrigins` array from `FRONTEND_URL`.
- Seed data: `npm run seed:data`, `npm run seed:users`, or `npm run seed:all`. There are standalone scripts under `scripts/` (for example `scripts/seedData.js`).

High-level architecture notes
- server.js mounts all API routes under `/api/*`. Routes live in the `routes/` directory and are imported into `server.js` (e.g. `routes/auth.js` → mounted at `/api/auth`).
- Models are Mongoose schemas in `models/*.js`. Example: `models/User.js` hashes passwords in `pre('save')` and its `toJSON` transform removes `password`, drops `_id/__v` and exposes `id`.
- Middleware lives in `middleware/` (e.g. `middleware/auth.js`) and is used to protect routes via `authenticate` and to guard against DB unavailability.
- External integrations live in `lib/` and `services/` (example: `lib/cashfree.js`, `services/weatherService.js`). Keys are under `keys/` (e.g. `cashfree_public_key.pem`).

Project-specific conventions and gotchas
- ES modules only: files import with `import X from './path.js'` (note the `.js` extension even when code is authored in JS). Avoid CommonJS `require()` in new backend files.
- Routes should export an Express `router` as the default export (see `routes/auth.js`). To add a new API area: create `routes/<name>.js` and add `app.use('/api/<name>', <name>Routes)` in `server.js`.
- Many routes explicitly check `mongoose.connection.readyState` and return 503 when DB is unavailable — the server intentionally does not exit on DB connection failure to allow other debugging. Preserve that behavior when changing error handling.
- JWT settings are environment-driven: `JWT_SECRET` and `JWT_EXPIRES_IN`. Tokens are signed in `routes/auth.js` using `jwt.sign(...)`.
- Frontend expects the backend to return user objects with `id` and without `password` (this is implemented in model `toJSON` transforms). When returning user data, follow that shape.

Common developer workflows (short examples)
- Add a route
  1. Create `routes/foo.js` with an exported router.
  2. Import and mount it from `server.js`: `import fooRoutes from './routes/foo.js'; app.use('/api/foo', fooRoutes);`

- Debug CORS issues: open `server.js` and inspect/modify `FRONTEND_URL` in your `.env` (server normalizes trailing slashes). The server logs blocked origins.

- Reproduce auth flow: use `/api/auth/signup`, `/api/auth/signin`, and read session via `/api/auth/session`. Tokens are Bearer JWTs.

Files to inspect first when you are editing code
- `server.js` — central wiring (CORS, route mounting, DB connect, error handlers).
- `routes/*.js` — API surface. Look at `routes/auth.js` for best-practice patterns used across other routes (detailed input validation and DB checks).
- `models/*.js` — Mongoose schemas and data-shaping (`toJSON`) rules.
- `middleware/auth.js` — authentication helpers and DB-availability checks used per-route.
- `lib/` and `services/` — external integrations (Cashfree, weather). Use these for KYC/payment flows.
- `scripts/` — seed and import utilities used to bootstrap test data.

Quick style and safety rules for automated suggestions
- Prefer small, incremental changes. Keep backend API contracts stable (changing response shapes requires frontend updates). When modifying a model JSON transform, update places where the frontend expects `id` and not `_id`.
- Preserve explicit DB-connection checks in routes. If you centralize that check, keep the same client-visible 503 behavior.
- When adding new dependencies, prefer minimal, well-maintained packages and add them to `package.json` at the root.
- The project uses no backend TypeScript; backend files are plain `.js` with ES modules. The frontend is TypeScript/React (.tsx).

If something looks missing
- README mentions `typecheck` and other scripts; verify `package.json` scripts before using them. The canonical scripts are in the root `package.json`.

Where to ask for more info
- If a behavior depends on deployment (Render, MongoDB Atlas IP whitelist, or Cashfree keys) check `.env` and the `keys/` directory. If you need clarification about which `npm` script to run in your environment, ask the repo owner which flow they use locally (there are small inconsistencies between README and scripts).

If any of these notes are unclear or you'd like more examples (route template, model template, or a seed example), tell me which area and I will extend this file.
