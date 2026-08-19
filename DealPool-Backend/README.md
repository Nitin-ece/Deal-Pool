# MakerPool Backend — Coin Economy & Resource Sharing Platform (PRD v2.1)

MakerPool is a closed-loop coin economy and physical resource-sharing backend built with Express 5, TypeScript, PostgreSQL (PostGIS), Firebase Auth, and cryptographic transaction chaining.

Makers exchange physical equipment, tools, and hardware through a trust-minimized workflow backed by an append-only double-entry ledger, escrow protection, dynamic deposit tiers, 24h dispute windows, and automated deadline settlement.

---

## 1. Core Principles & Economics (v2.1)

- **Closed-Loop Coins**: All platform actions use native MakerPool coins (seeded with 1,000 coins on registration).
- **Append-Only Ledger**: All balance changes are immutably recorded in `ledger_entries`. `wallets.balance` and `wallets.locked_balance` act as cached balances, mutated strictly within atomic ledger service operations.
- **Escrow Integrity**: Escrow is contract-bound (`escrow_lock`, `escrow_release_*`, `escrow_penalty`). The system guarantees `SUM(lock) - SUM(release + penalty) >= release_amount` before any payout.
- **Dynamic Deposit Tiers**:
  - Declared Value $V \le 500 \implies 15\%$ security deposit
  - $500 < V \le 2000 \implies 20\%$ security deposit
  - $V > 2000 \implies 25\%$ security deposit
  - Providers may raise deposit rates within the platform allowed band $[10\%, 50\%]$.
- **10% Fee Cap Guard**: Maximum lend fee per deal cannot exceed $10\%$ of the linked resource's declared value (`FEE_EXCEEDS_CAP`).
- **Platform Fee**: $5\%$ platform fee on declared value captured atomically on offer acceptance.
- **24-Hour Dispute Window**: On item return, the lend fee releases immediately to the provider while the security deposit remains locked for 24 hours. If no damage report is filed within 24 hours, the security deposit is automatically released to the requester via cron (`scripts/settle-contracts.ts`).
- **Damage Debt & Reputation**: Admin dispute resolution awards damages to the provider. Any shortfall exceeding the security deposit creates an outstanding record in `debts`, applies a reliability strike to the requester, and activates `DEBT_BLOCK` preventing new deals and offers.

---

## 2. API Response Specification

Every API endpoint strictly conforms to the standardized envelope:

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

All application errors are thrown using the centralized `AppError` class (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`) and handled by `src/middleware/error.middleware.ts`.

---

## 3. Database Schema

### `profiles`
- `id` (uuid PK) — Matches authenticated user ID
- `firebase_uid` (text unique)
- `username` (text unique)
- `email` (text unique)
- `profile_photo` (text nullable)
- `role` (`user` | `admin`, default `user`)
- `avg_rating` (numeric(3,2), default 0.00)
- `rating_count` (integer, default 0)
- `reliability_strikes` (integer, default 0)
- `trust_score` (numeric(4,2), default 5.00)
- timestamps

### `wallets`
- `id` (uuid PK), `user_id` (uuid unique FK profiles)
- `balance` (numeric(12,2) >= 0) — Available coin balance
- `locked_balance` (numeric(12,2) >= 0) — Funds currently committed in active escrows
- timestamps

### `ledger_entries`
- `id` (uuid PK), `contract_id` (uuid FK contracts nullable), `user_id` (uuid FK profiles)
- `amount` (numeric(12,2))
- `entry_type` (`signup_bonus` | `deposit` | `withdrawal` | `fee_capture` | `escrow_lock` | `escrow_release_fee` | `escrow_release_deposit` | `escrow_penalty` | `damage_debt`)
- `from_wallet_id` (uuid FK wallets nullable), `to_wallet_id` (uuid FK wallets nullable)
- `description` (text), `created_at` (timestamptz)

### `debts`
- `id` (uuid PK), `user_id` (uuid FK profiles), `contract_id` (uuid FK contracts nullable)
- `amount` (numeric(12,2)), `status` (`outstanding` | `settled`)
- timestamps

### `resources`
- `id` (uuid PK), `owner_id` (uuid FK profiles)
- `title`, `description`, `category`, `condition`
- `declared_value` (numeric(10,2) default 0.00)
- `security_deposit_rate` (numeric(4,2) default 0.15)
- `location` (geography(Point,4326)), `is_available` (boolean default true)
- `current_holder_id` (uuid FK profiles — tracks physical custody)
- timestamps

### `deals`
- `id` (uuid PK), `user_id` (uuid FK profiles)
- `title`, `description`, `category`, `budget_min`, `budget_max`
- `location` (geography(Point,4326)), `radius_km` (default 10)
- `resource_id` (uuid FK resources nullable)
- `status` (`open` | `offer_accepted` | `completed` | `cancelled`)
- timestamps

### `offers`
- `id` (uuid PK), `deal_id` (uuid FK deals), `provider_id` (uuid FK profiles)
- `price` (numeric(12,2)), `terms` (text)
- `status` (`pending` | `accepted` | `rejected` | `withdrawn`)
- timestamps

### `contracts`
- `id` (uuid PK), `deal_id` (uuid FK deals), `offer_id` (uuid FK offers), `resource_id` (uuid FK resources)
- `requester_id` (uuid FK profiles), `provider_id` (uuid FK profiles)
- `declared_value`, `deposit_tier_rate`, `lend_fee`, `security_amount`, `platform_fee`
- `requester_confirmed` (bool), `provider_confirmed` (bool), `contact_revealed` (bool)
- `checked_out_at` (timestamptz), `returned_at` (timestamptz), `dispute_deadline` (timestamptz)
- `condition_disputed` (bool default false)
- `status` (`created` | `confirmed` | `active` | `returned` | `completed` | `disputed` | `cancelled`)
- timestamps

### `transactions`
- `id` (uuid PK), `deal_id` (uuid FK deals), `offer_id` (uuid FK offers), `resource_id` (uuid FK resources)
- `from_user_id` (uuid FK profiles), `to_user_id` (uuid FK profiles)
- `parent_transaction_id` (uuid FK transactions nullable — forms recursive custody chain)
- `contract_id` (uuid FK contracts nullable)
- `status` (`agreement_created` | `confirmed` | `active` | `completed` | `disputed` | `cancelled`)
- timestamps

### `reports` (Disputes)
- `id` (uuid PK), `contract_id` (uuid FK contracts), `reporter_id` (uuid FK profiles)
- `reason` (`damage` | `overcharge` | `other`), `description` (text)
- `status` (`pending` | `resolved_damage` | `resolved_dismissed` | `resolved_overcharge`)
- `damage_award` (numeric(12,2)), `resolved_by` (uuid FK profiles nullable), `resolution_notes` (text)
- timestamps

---

## 4. API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register user, issue JWT cookies, award 1,000 coin signup grant
- `POST /api/auth/login` — Sign in with email & password
- `POST /api/auth/google` — Google OAuth credential login & signup grant
- `GET /api/auth/me` — Retrieve caller's profile and reputation stats
- `PATCH /api/auth/update` — Update username and profile details
- `PATCH /api/auth/change-password` — Change account password
- `POST /api/auth/refresh` — Rotate access/refresh tokens
- `POST /api/auth/logout` — Invalidate session cookies

### Wallet & Ledger (`/api/wallet`)
- `GET /api/wallet` — View current balance and locked escrow amount
- `POST /api/wallet/deposit` — Deposit testing coins (`{ "amount": 500 }`)
- `GET /api/wallet/ledger` — View paginated ledger entries (`limit`, `offset`)
- `GET /api/wallet/debts` — View outstanding debts blocking operations

### Resources (`/api/resources`)
- `POST /api/resources` — Register physical tool/resource with `declaredValue`, `securityDepositRate`, `lat`, `lng`
- `GET /api/resources/me` — List caller's registered resources
- `GET /api/resources/nearby` — PostGIS radial search (`lat`, `lng`, `radiusKm`)
- `GET /api/resources/:id` — Retrieve resource details and current holder
- `GET /api/resources/:id/chain` — Recursive custody chain with third-party privacy redaction
- `PATCH /api/resources/:id` — Update resource details (guarded against changes during active deals)
- `DELETE /api/resources/:id` — Remove resource listing

### Deals (`/api/deals`)
- `POST /api/deals` — Create listing/request for a resource (`DEBT_BLOCK` protected)
- `GET /api/deals` — List active deals with filters (`category`, `status`, `limit`, `offset`)
- `GET /api/deals/nearby` — PostGIS proximity search (`lat`, `lng`, `radiusKm`)
- `GET /api/deals/:id` — Get deal details
- `PATCH /api/deals/:id` — Update deal listing (owner only)
- `DELETE /api/deals/:id` — Cancel/delete deal listing (owner only)

### Offers (`/api/offers`)
- `POST /api/deals/:dealId/offers` — Submit offer on deal (enforces 10% fee cap & payer debt checks)
- `GET /api/deals/:dealId/offers` — List offers for a deal
- `PATCH /api/offers/:id/accept` — Accept offer (captures 5% platform fee, creates contract & transaction, locks escrow)
- `PATCH /api/offers/:id/reject` — Reject offer
- `PATCH /api/offers/:id/withdraw` — Withdraw submitted offer

### Contracts Lifecycle (`/api/contracts`)
- `GET /api/contracts` — List caller's contracts
- `GET /api/contracts/:id` — Retrieve contract status, escrow breakdown, and dispute window
- `POST /api/contracts/:id/confirm` — Confirm participation, reveal contact info, transfer custody
- `POST /api/contracts/:id/cancel` — Cancel before checkout (90% refund, 10% cancellation fee)
- `POST /api/contracts/:id/checkout` — Mark item picked up (`active`)
- `POST /api/contracts/:id/return` — Mark item returned, release lend fee immediately, start 24h dispute timer
- `POST /api/contracts/:id/dispute-condition` — Flag item condition / file dispute report
- `POST /api/contracts/:id/rate` — Submit rating for other party

### Admin & Disputes (`/api/admin`)
- `GET /api/admin/users` — List system profiles with pagination
- `GET /api/admin/users/:id` — View specific profile
- `PATCH /api/admin/users/:id/role` — Promote/demote user roles (`user` | `admin`)
- `DELETE /api/admin/users/:id` — Delete user profile
- `GET /api/admin/reports` — List dispute reports with status filter
- `POST /api/admin/reports/:id/resolve` — Resolve dispute (awards damages, applies debts & reliability strikes)

---

## 5. Automated Background Jobs

### Dispute Deadline Settlement Cron (`scripts/settle-contracts.ts`)
Runs periodically or on schedule to find contracts past their 24h dispute deadline where no dispute was filed, automatically releasing the security deposit to the requester and marking the contract `completed`.

```bash
npx tsx scripts/settle-contracts.ts
```

---

## 6. Running Tests

Execute the full suite of 10 automated test suites across all backend components:

### On Windows (PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-tests.ps1
```

### On Linux / macOS (Bash):
```bash
bash ./scripts/run-tests.sh
```

### Individual Test Suites:
```bash
npx tsx tests/auth.test.ts
npx tsx tests/admin.test.ts
npx tsx tests/wallet.test.ts
npx tsx tests/resources.test.ts
npx tsx tests/deals.test.ts
npx tsx tests/offers.test.ts
npx tsx tests/contracts.test.ts
npx tsx tests/reports.test.ts
npx tsx tests/transactions.test.ts
npx tsx tests/e2e_full_suite.test.ts
```

---

## 7. Interactive Test Cockpit

Open `tests/test-dashboard.html` in your browser to run live API calls, test coin grants, simulate the multi-hop custody chain, and inspect double-entry ledger entries in real time.
