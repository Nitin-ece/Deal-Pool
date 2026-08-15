# DealPool — Working Context

> Living document. Updated as the frontend enhancement + backend connection task progresses.
> Last updated: 2026-08-15 (task complete for current backend scope)

---

## Goal

1. Enhance the generated frontend so it is not generic AI-studio UI.
2. Connect it to `DealPool-Backend` (auth + admin already exist).
3. Handle errors correctly (readable messages, no `[object Object]`, no overlapping text).
4. Document failures / gaps in README files.
5. Keep this file accurate until the task is done.

**Status: DONE for auth/admin wiring + UI redesign.** Deals/offers wait on backend routes.

---

## Repo layout

| Path | Role |
|------|------|
| `DealPool-Frontend/` | Vite + React 19 + Redux Toolkit + Tailwind 4 + Motion + Sonner + Firebase client |
| `DealPool-Backend/` | Express 5 + Firebase Auth + Postgres/Supabase + cookie sessions |
| `CONTEXT.md` | This file |
| `DealPool-Backend.zip` | Archive (ignore for runtime) |

---

## Backend (current)

**Routes live:** `GET /api`, `/api/auth/*`, `/api/admin/*`  
**Not live:** `/api/deals*`, `/api/offers*`

Auth: Firebase + Postgres `profiles`, httpOnly `accessToken` / `refreshToken`, CORS credentials for localhost Vite.

---

## Frontend (after enhancement)

### Design — Neighborhood Signal
- Fonts: Syne (display) + Manrope (body)
- Tokens: `--ink #14181F`, `--paper #E8ECF1`, `--signal #FF6B2C`, `--pool #0F6E56`, `--line #D5DAE2`
- Landing: brand-first full-bleed hero (no auth card / pill clutter in first viewport)
- Auth: dedicated `/login` `/register` with readable error banners (`break-words`)
- App shell: Header/Sidebar/BottomNav retuned; header menus close on outside click; truncation avoids overlap

### Libraries added
`clsx`, `tailwind-merge`, `sonner`, `firebase`

### Wiring
- Axios interceptor unwraps `{ success, data|error }`, refreshes on 401, normalizes messages via `getErrorMessage`
- Vite proxy `/api` → `VITE_BACKEND_URL` (default `http://localhost:3000`)
- Auth/admin slices + Admin page hit real backend
- Google: real ID token when `VITE_FIREBASE_*` set; otherwise button hidden
- Deals/offers: graceful `ApiUnavailable` when backend returns 404 / network gap
- Mock demo quick-logins removed from production auth UI (still in `server.ts` mock only)

### Key new files
- `src/lib/cn.ts`, `errors.ts`, `firebase.ts`
- `src/components/common/BrandMark.tsx`, `ApiUnavailable.tsx`
- `src/vite-env.d.ts`

---

## How to run

```bash
# terminal 1
cd DealPool-Backend && npm run dev

# terminal 2
cd DealPool-Frontend && pnpm dev
```

Docs: `DealPool-Frontend/README.md`, `DealPool-Backend/README.md` (updated with integration + gaps).

---

## Progress log

### 2026-08-15 — Baseline captured
Explored packages, cookie auth, CORS, frontend gaps (generic UI, mock Google token, deals API mismatch, object errors).

### 2026-08-15 — Implementation
- Design system + Landing/Auth/shell/radar polish
- Error utilities + API interceptor + Firebase Google path
- Deals gap UX + README updates + `tsc --noEmit` clean

### 2026-08-15 — Auth fix (sign-in + Google)

**Causes found:**
1. Register returned `PROFILE_EXISTS` when email already had a DB row (user should sign in).
2. Login failed / 500 when Firebase user existed but Postgres profile was missing (orphans), or username unique constraint was named differently than `profiles_name_key` → unhandled PG error → `INTERNAL_SERVER_ERROR`.
3. Google button was hidden because `VITE_FIREBASE_*` in frontend `.env` was empty.

**Fixes:**
- `ensureProfile` on login/google; register heals orphaned Firebase users.
- Broader username unique-violation detection; clearer conflict messages.
- Serialize `avg_rating` as number for the client.
- Frontend `.env` filled with project `dealpoolbackend` web API key + authDomain; Google button always visible.
- Auth UI auto-switches to Sign in on PROFILE_EXISTS / EMAIL_EXISTS.

**User action:** Restart backend (`npm run dev`) and frontend (`pnpm dev`). Enable Google provider in Firebase Console if using Google.
- Backend deals/offers + PostGIS nearby
- Cascade Firebase user delete on admin delete
- Fill `VITE_FIREBASE_*` for Google in real deploys

---

## Known gaps (documented in READMEs)

1. Deals/offers API missing on backend → UI unavailable state.
2. Google needs Firebase web env vars.
3. Proxy recommended for local cookies; direct cross-origin needs CORS alignment.
4. Backend startup depends on valid Firebase + DB `.env`.
5. Admin delete does not remove Firebase Auth user (backend note).
