# DealPool Backend

A hyperlocal resource, skill & service exchange network API: users post **Deals** (requests for a resource or a skill), others respond with **Offers**, the deal owner accepts one, which atomically creates a custody-tracking **Transaction** — and, for physical resources, a **Contract** backed by a double-entry **Wallet & Escrow** ledger.

Stack: Express 5 · TypeScript · PostgreSQL/Supabase (PostGIS) · Firebase Auth · cookie sessions.

---

## Response Structure (Rule 1 Compliance)

Every endpoint strictly returns one of these two structures:

```typescript
export type ApiResponse<T = unknown> =
    | {
        success: true;
        data: T;
        error?: never;
    }
    | {
        success: false;
        data?: never;
        error: {
            code: string;
            message: string;
        };
    };
```

All errors are thrown using the centralized `AppError` class from `src/utils/errors.ts` (`badRequest` 400, `unauthorized` 401, `forbidden` 403, `notFound` 404, `conflict` 409) and processed through `src/middleware/error.middleware.ts`. Every handler resolves through this shape — no bare arrays, no unwrapped objects.

---

## Auth & Requests

- `authMiddleware` accepts the Firebase-issued access token either from the httpOnly `accessToken` cookie **or** an `Authorization: Bearer <token>` header, then resolves it to the caller's `profiles` row and attaches `req.user = { uid, firebaseUid, email, role }`.
- `requireRole("admin")` gates admin-only routes on top of `authMiddleware`.
- Global rate limits (`src/config/ratelimit.ts`): 1000 req/15min on all `/api/*` traffic, tightened to 100 req/15min on `/api/auth/*`. Both return `success:false` with `RATE_LIMIT_EXCEEDED` / `AUTH_RATE_LIMIT_EXCEEDED`.
- CORS (`src/config/cors.ts`) reflects any origin with `credentials: true` so cookie auth works across local dev ports.

---

## Concurrency & Financial Integrity Invariants

1. **Wallet Row Lock (`FOR UPDATE`)**: Acquired before checking balances or locking escrow during `acceptOffer` and `confirmContract`.
2. **Escrow Assertion**: `releaseEscrow` strictly verifies `currentEscrow >= amount` against `sumEscrowForContract` before writing any ledger release entry.
3. **Dispute Deadline Invariant**: The automated settlement cron re-checks `condition_disputed === false` and `dispute_deadline < now()` inside individual contract transactions.
4. **Debt Blocking (`DEBT_BLOCK`)**: Users with outstanding debt cannot post new deals or submit offers.
5. **Fee Cap (`FEE_EXCEEDS_CAP`)**: Offer price cannot exceed 10% of the linked resource's `declared_value`.
6. **Resource/Skill Exclusivity**: A `transactions` row must reference exactly one of `resource_id` / `skill_id` (DB `CHECK`, never both, never neither).
7. **Chain Parent Scoping**: `parent_transaction_id` may only be set when `resource_id` is present — skill hand-offs are one-off and never chain.
8. **Custody Chain Privacy**: On `GET /api/resources/:resourceId/chain`, every hop the caller wasn't a party to is redacted to `{ id, resource_id, status, completed_at, created_at }` — identities and pricing are stripped for non-participant hops.

---

## Database Tables

### `profiles`
- `id` (uuid PK) — this is `req.user.uid`
- `firebase_uid` (text unique)
- `username` (text unique, server-generated on register)
- `email` (text unique)
- `profile_photo` (text nullable)
- `role` (`user` | `admin`, default `user`)
- `avg_rating` (numeric(3,2), default 0.00)
- `rating_count` (integer, default 0)
- `reliability_strikes` (integer, default 0)
- `trust_score` (numeric(4,2), default 5.00)
- timestamps

### `resources`
- `id` (uuid PK), `owner_id` (uuid FK profiles)
- `title`, `description`, `category`, `condition`
- `declared_value` (numeric(12,2) default 0.00)
- `location` (geography(Point,4326)), `is_available` (boolean default true)
- `current_holder_id` (uuid FK profiles, NOT NULL — tracks who physically holds the item right now, independent of `owner_id`)
- timestamps

### `skills`
- `id` (uuid PK), `user_id` (uuid FK profiles)
- `name`, `description`, `category` (no location column — skills can be remote)
- `is_available` (boolean default true)
- timestamps

### `deals`
- `id` (uuid PK), `user_id` (uuid FK profiles)
- `title`, `description`, `category`, `budget_min`, `budget_max`
- `location` (geography(Point,4326)), `radius_km` (default 10)
- `resource_id` (uuid FK resources nullable), `skill_id` (uuid FK skills nullable)
- `status` (`open` | `offer_accepted` | `completed` | `cancelled`)
- timestamps

### `offers`
- `id` (uuid PK), `deal_id` (uuid FK deals), `provider_id` (uuid FK profiles)
- `price` (numeric(12,2)), `terms` (text)
- `status` (`pending` | `accepted` | `rejected` | `withdrawn`)
- timestamps

### `transactions`
The custody ledger — created the moment an offer is accepted, one row per hand-off, regardless of whether it's a resource or a skill:
- `id` (uuid PK), `deal_id` (uuid FK deals), `offer_id` (uuid FK offers)
- `from_user_id` (uuid FK profiles — the giver), `to_user_id` (uuid FK profiles — the receiver)
- `resource_id` (uuid FK resources nullable) **xor** `skill_id` (uuid FK skills nullable) — exactly one is set
- `parent_transaction_id` (uuid FK transactions nullable) — links a resource to the transaction that preceded it, forming a recursive custody chain; always `null` for skill transactions
- `status` (`agreement_created` | `confirmed` | `active` | `completed` | `disputed` | `cancelled`)
- `checked_out_at`, `returned_at`, `completed_at` (timestamptz nullable)
- timestamps

### `wallets`
- `id` (uuid PK), `user_id` (uuid unique FK profiles)
- `balance` (numeric(12,2) >= 0), `locked_balance` (numeric(12,2) >= 0)
- timestamps

### `ledger_entries`
- `id` (uuid PK), `contract_id` (uuid FK contracts nullable), `user_id` (uuid FK profiles)
- `amount` (numeric(12,2))
- `entry_type` (`deposit` | `withdrawal` | `escrow_lock_fee` | `escrow_lock_security` | `escrow_payout_fee` | `escrow_release_security` | `escrow_penalty`)
- `description` (text), `created_at` (timestamptz)

### `debts`
- `id` (uuid PK), `user_id` (uuid FK profiles), `contract_id` (uuid FK contracts nullable)
- `amount` (numeric(12,2)), `status` (`outstanding` | `settled`)
- timestamps

### `contracts`
Created alongside a `transactions` row only when the deal is **resource-backed** (skill-only deals never get a contract — no escrow to hold):
- `id` (uuid PK), `deal_id` (uuid FK deals), `offer_id` (uuid FK offers), `resource_id` (uuid FK resources)
- `requester_id` (uuid FK profiles), `provider_id` (uuid FK profiles)
- `rental_fee` (numeric(12,2)), `security_deposit` (numeric(12,2), seeded from the resource's `declared_value`)
- `status` (`created` | `confirmed` | `active` | `returned` | `completed` | `disputed` | `cancelled`)
- `checked_out_at` (timestamptz), `returned_at` (timestamptz), `dispute_deadline` (timestamptz)
- `condition_disputed` (boolean default false)
- timestamps

### `reports` (Disputes)
- `id` (uuid PK), `contract_id` (uuid FK contracts), `reporter_id` (uuid FK profiles)
- `reason` (`damage` | `overcharge` | `other`), `description` (text)
- `status` (`pending` | `resolved_damage` | `resolved_dismissed` | `resolved_overcharge`)
- `damage_award` (numeric(12,2)), `resolved_by` (uuid FK profiles nullable), `resolution_notes` (text)
- timestamps

---

## API Routes Summary

### Auth (`/api/auth`)
- `POST /api/auth/register` — Register user & set cookies
- `POST /api/auth/login` — Login user & set cookies
- `GET /api/auth/me` — Current user profile
- `POST /api/auth/logout` — Clear auth cookies
- `POST /api/auth/refresh` — Rotate access/refresh tokens
- `POST /api/auth/google` — Google OAuth ID Token verification
- `PATCH /api/auth/update` — Update profile fields (username / email / profile_photo — `role` is silently ignored)
- `PATCH /api/auth/change-password` — Change password

### Admin (`/api/admin`, admin role required)
- `GET /api/admin/users` — List profiles (`limit`, `offset`)
- `GET /api/admin/users/:id` — Get single user
- `PATCH /api/admin/users/:id/role` — Update user role (`user` | `admin`)
- `DELETE /api/admin/users/:id` — Delete user profile

### Wallet (`/api/wallet`)
- `GET /api/wallet` — Get/lazily-create current wallet balance & locked escrow
- `POST /api/wallet/deposit` — Deposit test funds (`{ "amount": 500 }`)
- `GET /api/wallet/ledger` — List user's ledger transaction entries
- `GET /api/wallet/debts` — List user's outstanding debts

### Deals (`/api/deals`)
- `POST /api/deals` — Create deal for a `resourceId` **or** `skillId` (blocked with `DEBT_BLOCK` if debt exists)
- `GET /api/deals` — List deals (supports `category`, `status`, `limit`, `offset`)
- `GET /api/deals/nearby` — PostGIS proximity search (`lat`, `lng`, `radiusKm`, `limit`, `offset`)
- `GET /api/deals/:id` — Get deal details
- `PATCH /api/deals/:id` — Update deal (owner only)
- `DELETE /api/deals/:id` — Delete deal (owner only)

### Offers (`/api/offers` & `/api/deals/:id/offers`)
- `POST /api/deals/:dealId/offers` — Submit offer (rejects own-deal offers, enforces 10% fee cap on resource deals & `DEBT_BLOCK`)
- `GET /api/deals/:dealId/offers` — List offers for deal
- `PATCH /api/offers/:id/accept` — Deal owner accepts: rejects sibling offers, creates a `transactions` row (chained via `parent_transaction_id` if the resource has prior custody history), and additionally creates a `contracts` row when the deal is resource-backed
- `PATCH /api/offers/:id/reject` — Deal owner rejects offer
- `PATCH /api/offers/:id/withdraw` — Provider withdraws own offer

### Resources (`/api/resources`)
- `POST /api/resources` — Register a physical resource with `declaredValue`, `lat`, `lng`
- `GET /api/resources/mine` — List my resources
- `GET /api/resources/nearby` — PostGIS proximity search
- `GET /api/resources/:resourceId/chain` — Full recursive custody chain for the resource, with non-participant hops privacy-redacted
- `GET /api/resources/:id` — Get resource by ID
- `PATCH /api/resources/:id` — Update resource (owner only)
- `DELETE /api/resources/:id` — Delete resource (owner only)

### Skills (`/api/skills`) — ⚠️ implemented but not yet mounted
- `POST /api/skills` — Register a skill/service offering (`name` required)
- `GET /api/skills/mine` — List my skills
- `GET /api/skills/:id` — Get skill by ID
- `PATCH /api/skills/:id` — Update skill (owner only)
- `DELETE /api/skills/:id` — Delete skill (owner only)

  `src/routes/skill.route.ts` and `src/controllers/skill.controller.ts` are fully written and covered by the E2E suite, but `src/app.ts` never calls `app.use("/api/skills", skillRoutes)`. Until that line is added, every route above 404s — mount it before relying on skill-based deals end-to-end.

### Transactions (`/api/transactions` & nested under resources)
- `GET /api/transactions/:id` — Get a single transaction (participant-only, `FORBIDDEN` otherwise)
- `GET /api/resources/:resourceId/chain` — see Resources above; same underlying chain, indexed by resource instead of transaction id

### Discovery (`/api/discovery`)
- `GET /api/discovery/nearby` — Combined map feed: buckets nearby open deals into `needs` (open requests) and `offers` (in-progress / `Offer`-category), each with an approximate `distanceKm`, keyed around `{ lat, lng, radiusKm }`

### Contracts (`/api/contracts`, resource-backed deals only)
- `GET /api/contracts` — List my contracts
- `GET /api/contracts/:id` — Get contract details
- `POST /api/contracts/:id/confirm` — Requester confirms contract & locks escrow (rental fee + security deposit)
- `POST /api/contracts/:id/checkout` — Provider hands over resource (`status -> active`, custody moves to requester)
- `POST /api/contracts/:id/return` — Requester returns item (`status -> returned`, custody returns to provider, opens a 24h dispute window)
- `POST /api/contracts/:id/cancel` — Cancel contract (refunds locked escrow if already confirmed)

### Reports & Disputes (`/api/reports`)
- `POST /api/reports` — File dispute against a contract you're a party to (flags contract `condition_disputed = true`, `status -> disputed`)
- `GET /api/reports` — List user's own reports, or all reports if admin (`status` filter supported)
- `GET /api/reports/:id` — Get report details
- `POST /api/reports/:id/resolve` — Admin-only resolution, always pays out the rental fee first, then branches:
  - `damage`: Award up to the security deposit as a penalty to the provider, refund any remaining deposit to the requester. If `damageAward > securityDeposit`, the shortfall is recorded as a `debts` row against the requester and a reliability strike is applied.
  - `dismissed`: Refund the full deposit to the requester.
  - `overcharge`: Apply a reliability strike to the provider, refund the full deposit to the requester.

  Every path ends by setting the contract to `completed`.

---

## Full Route Table

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api` | — | Health check |
| POST | `/api/auth/register` | — | |
| POST | `/api/auth/login` | — | |
| GET | `/api/auth/me` | ✓ | |
| POST | `/api/auth/logout` | — | |
| POST | `/api/auth/refresh` | — | reads `refreshToken` cookie |
| POST | `/api/auth/google` | — | |
| PATCH | `/api/auth/update` | ✓ | |
| PATCH | `/api/auth/change-password` | ✓ | |
| GET | `/api/admin/users` | ✓ admin | |
| GET | `/api/admin/users/:id` | ✓ admin | |
| PATCH | `/api/admin/users/:id/role` | ✓ admin | |
| DELETE | `/api/admin/users/:id` | ✓ admin | |
| GET | `/api/wallet` | ✓ | |
| POST | `/api/wallet/deposit` | ✓ | |
| GET | `/api/wallet/ledger` | ✓ | |
| GET | `/api/wallet/debts` | ✓ | |
| POST | `/api/deals` | ✓ | |
| GET | `/api/deals` | — | |
| GET | `/api/deals/nearby` | — | |
| GET | `/api/deals/:id` | — | |
| PATCH | `/api/deals/:id` | ✓ | owner only |
| DELETE | `/api/deals/:id` | ✓ | owner only |
| POST | `/api/deals/:dealId/offers` | ✓ | |
| GET | `/api/deals/:dealId/offers` | — | |
| PATCH | `/api/offers/:id/accept` | ✓ | deal owner only |
| PATCH | `/api/offers/:id/reject` | ✓ | deal owner only |
| PATCH | `/api/offers/:id/withdraw` | ✓ | provider only |
| POST | `/api/resources` | ✓ | |
| GET | `/api/resources/mine` | ✓ | |
| GET | `/api/resources/nearby` | — | |
| GET | `/api/resources/:resourceId/chain` | ✓ | |
| GET | `/api/resources/:id` | — | |
| PATCH | `/api/resources/:id` | ✓ | owner only |
| DELETE | `/api/resources/:id` | ✓ | owner only |
| POST | `/api/skills` | ✓ | **not mounted — see Skills note** |
| GET | `/api/skills/mine` | ✓ | **not mounted** |
| GET | `/api/skills/:id` | — | **not mounted** |
| PATCH | `/api/skills/:id` | ✓ | **not mounted** |
| DELETE | `/api/skills/:id` | ✓ | **not mounted** |
| GET | `/api/transactions/:id` | ✓ | participant only |
| GET | `/api/discovery/nearby` | — | |
| GET | `/api/contracts` | ✓ | |
| GET | `/api/contracts/:id` | ✓ | participant only |
| POST | `/api/contracts/:id/confirm` | ✓ | requester only |
| POST | `/api/contracts/:id/checkout` | ✓ | provider only |
| POST | `/api/contracts/:id/return` | ✓ | requester only |
| POST | `/api/contracts/:id/cancel` | ✓ | participant only |
| POST | `/api/reports` | ✓ | contract participant only |
| GET | `/api/reports` | ✓ | |
| GET | `/api/reports/:id` | ✓ | |
| POST | `/api/reports/:id/resolve` | ✓ admin | |

---

## Cron Settlement Script

Auto-settles any `returned` contract whose 24h dispute window has elapsed undisputed — pays the rental fee to the provider and releases the security deposit back to the requester, then marks the contract `completed`. Re-validates each contract's state inside its own transaction immediately before settling (see Invariant 3).

```bash
# Windows PowerShell
.\node_modules\.bin\tsx scripts/settle-contracts.ts

# Linux / Bash
npx tsx scripts/settle-contracts.ts
```

---

## Running Test Suites

All test files are standalone TypeScript scripts run directly through `tsx` against a real running instance of `src/app.ts` and a real Postgres database (via `supertest`) — there is no Jest runner in the loop despite `jest.config.js` being present in the repo. Each file uses a lightweight local `test(name, fn)` helper that logs `✓`/`✗` per case and sets `process.exitCode = 1` on the first failure, so a suite's exit code reflects pass/fail.

### Suites covered by the automated runners
`scripts/run-tests.sh` / `scripts/run-tests.ps1` execute these nine files in order and print a pass/fail summary:

| File | Covers |
|---|---|
| `tests/auth.test.ts` | Register/login validation, duplicate email & username collisions, profile update, refresh + rotation, change-password, logout & cookie invalidation |
| `tests/admin.test.ts` | Admin-only guarding, list/get/promote/demote/delete users, self-role-change protection, post-delete 404s |
| `tests/deals.test.ts` | Deal CRUD, nearby PostGIS search, owner-only update/delete enforcement |
| `tests/offers.test.ts` | Own-deal offer rejection, accept/reject/withdraw flows, re-accept protection, `FEE_EXCEEDS_CAP` |
| `tests/resources.test.ts` | Resource CRUD, `mine`/`nearby` listing, empty custody chain for untransacted resources, owner-only enforcement |
| `tests/transactions.test.ts` | Multi-hop custody chain (A→B→C→D), holder updates after each hop, per-hop privacy redaction for non-participants, parent-chain linkage |
| `tests/wallet.test.ts` | Wallet auto-creation at zero balance, deposit validation, ledger entries, empty debts list |
| `tests/contracts.test.ts` | Full contract lifecycle (`created → confirmed → active → returned`), `INSUFFICIENT_BALANCE` guard, `DEBT_BLOCK` on deals/offers |
| `tests/reports.test.ts` | Dispute filing flags the contract, `damage` resolution above the security deposit creates a debt + reliability strike |

```bash
# Windows PowerShell
.\scripts\run-tests.ps1

# Linux / Bash
./scripts/run-tests.sh
```

### End-to-end narrative suite (run separately)
`tests/e2e_full_suite.test.ts` walks a single continuous story across four users (A–D): registration, profile updates, password change, admin promotion, skill creation, resource creation, a two-hop resource chain (A→B→C), chain visibility/redaction, and transaction participant-access checks. It is **not** part of `run-tests.sh` / `run-tests.ps1` and must be run on its own:

```bash
npx tsx tests/e2e_full_suite.test.ts
```

> This suite calls `POST /api/skills` and `GET /api/skills/mine`, both of which currently 404 because the skill router isn't mounted (see the Skills note above) — mount `skillRoutes` in `src/app.ts` before running it end-to-end.

### Interactive UI Test Dashboard
Open `tests/test-dashboard.html` in any modern web browser to interactively test and debug all endpoints in real time. `tests/index.html` and `tests/map.test.html` provide a lighter-weight endpoint list and a PostGIS nearby-search/map visualizer respectively.

---

## Environment Setup

Copy `.env.example` to `.env` and fill in:

```
PORT=3000
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_API_KEY=
DB_HOST=
DB_PORT=5432
DB_NAME=postgres
DB_USER=
SUPABASE_URI=
DB_PASSWORD=
```

```bash
npm install
npm run migrate   # runs scripts/migrate.ts against the migrations/ folder
npm run dev       # nodemon + tsx, http://localhost:3000
```