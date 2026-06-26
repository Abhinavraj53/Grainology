# Grainology Agent Notes

## Sources Of Truth
- Start with `docs/DEVELOPER_GUIDE.md`; archived notes in `docs/archive/` are historical unless current code confirms them.
- Trust `package.json`, `server.js`, `src/App.tsx`, and `src/lib/api.js` over old Markdown when behavior conflicts.
- `frontend-package.json` exists but the active install/lockfile is the root `package.json` + `package-lock.json`.

## Commands
- Install from repo root: `npm install` or `npm ci`.
- Backend dev server: `npm run dev` (`nodemon server.js`, port `3001` by default).
- Frontend dev server: `npm run dev:frontend` (Vite, usually port `5173`).
- Both servers: `npm run dev:all`.
- Production frontend build: `npm run build`.
- Typecheck frontend explicitly: `npx tsc --noEmit -p tsconfig.app.json`.
- Lint explicitly: `npx eslint .`; there is no root `npm run lint` script.
- `npm test` is a placeholder that exits with failure; no unit test runner is configured.

## Runtime Setup
- Backend loads `.env` via `dotenv`; important local values include `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, Brevo credentials, and Cloudinary credentials.
- Frontend API base is `VITE_API_URL`; set `.env.local` to `VITE_API_URL=http://localhost:3001/api` for local backend use.
- If `MONGODB_URI` is missing or down, `server.js` still starts and DB-backed routes return `503` until reconnect succeeds.
- CORS allows localhost `3000`, `5173`, `5174`, configured `FRONTEND_URL`/`CORS_ORIGINS`, Render origins matching Grainology, and local `192.168.*`/`10.*` IPs.

## Architecture
- Backend entrypoint is `server.js`; all live API routes are mounted under `/api/*`, with `/health` outside the API prefix.
- Frontend entrypoint is `src/main.tsx`; route map and dashboard role split live in `src/App.tsx`.
- `admin` and `super_admin` render `src/components/AdminPanel.tsx`; other authenticated roles render `src/components/CustomerPanel.tsx`.
- `src/lib/api.js` is a JWT API client plus a Supabase-style `api.from(...)` compatibility wrapper that maps table-like calls to Express routes.
- `src/hooks/useAuth.ts` reads/stores `auth_token` in `localStorage` and loads the current profile from `/profiles/me/current`.

## Registration And KYC
- Current `/register` path is `src/pages/Register.tsx` -> `src/components/SimpleRegistration.tsx` -> `routes/registration.js`.
- The live registration flow is document upload plus optional email OTP; approval/rejection is handled by admin/super-admin flows.
- Cashfree, sandbox Aadhaar, Didit, and Supabase migration docs/files are mostly historical; Cashfree/sandbox routes are commented out in `server.js`.
- `supabase/migrations/` and `supabase/functions/` are historical references unless explicitly reviving Supabase behavior.

## Data And Scripts
- Seed commands: `npm run seed:users`, `npm run seed:data`, `npm run seed:all`, and `npm run seed:super-admin`.
- Import supply transactions with `npm run import:supply-transactions`.
- `ui-smoke.spec.js` is an ad hoc Playwright smoke test for admin/super-admin UI, but `@playwright/test` is not in the lockfile and no script runs it.

## Deployment
- `render.yaml` is the active deployment blueprint: backend web service uses `npm install` + `npm start`; frontend static service uses `npm ci && npm run build` and publishes `dist`.
- Render frontend sets `VITE_API_URL=https://grainology-xcg8.onrender.com/api`; backend production needs dashboard secrets such as `MONGODB_URI`, `JWT_SECRET`, Brevo, and Cloudinary values.
