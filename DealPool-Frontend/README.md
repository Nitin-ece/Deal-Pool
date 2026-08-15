# DealPool Frontend

Hyperlocal resource & skill exchange UI. Connects to **DealPool-Backend** over the Vite `/api` proxy with cookie-based auth.

## Stack

- React 19 + Vite 6 + TypeScript
- Redux Toolkit + React Router 7
- Tailwind CSS 4 + Motion + Sonner toasts
- Axios (`withCredentials`) for httpOnly session cookies
- Optional Firebase Web SDK for Google sign-in

## Quick start

1. Install (pnpm recommended — lockfile present):

```bash
pnpm install
```

2. Copy env:

```bash
cp .env.example .env
```

3. Start **DealPool-Backend** on port `3000` (see backend README).

4. Run the app:

```bash
pnpm dev
```

App: `http://localhost:5173` → proxies `/api` → `VITE_BACKEND_URL` (default `http://localhost:3000`).

## Environment

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Leave empty in local dev (use Vite proxy). Set only if calling API on another origin. |
| `VITE_BACKEND_URL` | Proxy target for `/api` (default `http://localhost:3000`). |
| `VITE_FIREBASE_API_KEY` / `AUTH_DOMAIN` / `PROJECT_ID` / `APP_ID` | Optional. Enables Google sign-in; must match the backend Firebase project. |

## What works against the real backend today

| Feature | Status |
|---------|--------|
| Register / login / logout / refresh / me | Wired to `/api/auth/*` |
| Profile update & change password | Wired |
| Admin user list / role / delete | Wired (`/api/admin/*`, admin role required) |
| Google sign-in | Wired when `VITE_FIREBASE_*` is set (same project as backend). Enable Google provider in Firebase Console. |
| Deals nearby / create / offers | **Not on backend yet** — UI shows a clear unavailable state |

### Auth troubleshooting

| Symptom | Fix |
|---------|-----|
| "Profile already exists" / EMAIL_EXISTS on register | Use **Sign in** — account is already registered. |
| Internal server error on auth | Restart backend after pulling fixes; check backend terminal logs. Username unique constraint + orphaned Firebase users are healed automatically now. |
| Google button fails / popup blocked | Enable Google in Firebase Auth; add authorized domain `localhost`; restart Vite after `.env` change. |
| Google button missing after env edit | Restart `pnpm dev` so Vite reloads `VITE_*` vars. |

## Mock API (optional)

`pnpm run dev:mock` runs `server.ts` (in-memory auth + deals + seed users). Use only for local UI demos of deals. Prefer the real backend for auth/admin.

Demo emails like `admin@dealpool.com` exist **only** in the mock server — they will fail against Firebase.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Vite + proxy to backend |
| `pnpm run dev:mock` | Vite + in-memory mock API |
| `pnpm build` | Production build |
| `pnpm lint` | `tsc --noEmit` |

## Design notes

Visual system: **Neighborhood Signal** (Syne + Manrope, cool paper ground, coral signal accent). See root `CONTEXT.md` for tokens and task history.

## Known gaps / failures

- Deals & offers endpoints are missing on DealPool-Backend → radar/create/detail call `/api/deals*` and surface `ApiUnavailable` / error toasts.
- Without Firebase web config, Google button is hidden.
- Cross-origin cookies break if you set `VITE_API_BASE_URL` to another host without matching CORS + cookie domain; keep proxy for local work.
- Backend must be running or auth/network errors will show (“Cannot reach the API…”).
