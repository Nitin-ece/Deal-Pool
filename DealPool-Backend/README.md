# DealPool Backend

A peer-to-peer resource sharing & rental marketplace API: users post **Deals** (requests for items), others respond with **Offers**, the deal owner accepts one, which atomically creates a **Contract** backed by a double-entry **Wallet & Escrow** ledger.

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

All errors are thrown using the centralized `AppError` class from `src/utils/errors.ts` and processed through `src/middleware/error.middleware.ts`.

---

## Concurrency & Financial Integrity Invariants

1. **Wallet Row Lock (`FOR UPDATE`)**: Acquired before checking balances or locking escrow during `acceptOffer` and `confirmContract`.
2. **Escrow Assertion**: `releaseEscrow` strictly verifies `currentEscrow >= amount` against `sumEscrowForContract` before writing any ledger release entry.
3. **Dispute Deadline Invariant**: Automated settlement cron re-checks `condition_disputed === false` and `dispute_deadline < now()` inside individual contract transactions.
4. **Debt Blocking (`DEBT_BLOCK`)**: Users with outstanding debt cannot post new deals or submit offers.
5. **Fee Cap (`FEE_EXCEEDS_CAP`)**: Offer price cannot exceed 10% of resource declared value.

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
- `current_holder_id` (uuid FK profiles)
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
- `id` (uuid PK), `deal_id` (uuid FK deals), `offer_id` (uuid FK offers), `resource_id` (uuid FK resources)
- `requester_id` (uuid FK profiles), `provider_id` (uuid FK profiles)
- `rental_fee` (numeric(12,2)), `security_deposit` (numeric(12,2))
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
- `PATCH /api/auth/update` — Update profile fields
- `PATCH /api/auth/change-password` — Change password

### Admin (`/api/admin`)
- `GET /api/admin/users` — List profiles (admin only)
- `GET /api/admin/users/:id` — Get single user
- `PATCH /api/admin/users/:id/role` — Update user role
- `DELETE /api/admin/users/:id` — Delete user profile

### Wallet (`/api/wallet`)
- `GET /api/wallet` — Get current wallet balance & locked escrow
- `POST /api/wallet/deposit` — Deposit test funds (`{ "amount": 500 }`)
- `GET /api/wallet/ledger` — List user's ledger transaction entries
- `GET /api/wallet/debts` — List user's outstanding debts

### Deals (`/api/deals`)
- `POST /api/deals` — Create deal (blocked if debt exists)
- `GET /api/deals` — List deals (supports `category`, `status`)
- `GET /api/deals/nearby` — PostGIS proximity search (`lat`, `lng`, `radiusKm`)
- `GET /api/deals/:id` — Get deal details
- `PATCH /api/deals/:id` — Update deal
- `DELETE /api/deals/:id` — Delete deal

### Offers (`/api/offers` & `/api/deals/:id/offers`)
- `POST /api/deals/:id/offers` — Submit offer (enforces 10% fee cap & debt block)
- `GET /api/deals/:id/offers` — List offers for deal
- `PATCH /api/offers/:id/accept` — Accept offer & create contract
- `PATCH /api/offers/:id/reject` — Reject offer
- `PATCH /api/offers/:id/withdraw` — Withdraw offer

### Resources (`/api/resources`)
- `POST /api/resources` — Register physical resource with `declaredValue`
- `GET /api/resources/me` — List my resources
- `GET /api/resources/nearby` — PostGIS proximity search
- `GET /api/resources/:id` — Get resource by ID
- `PATCH /api/resources/:id` — Update resource
- `DELETE /api/resources/:id` — Delete resource

### Contracts (`/api/contracts`)
- `GET /api/contracts` — List my contracts
- `GET /api/contracts/:id` — Get contract details
- `POST /api/contracts/:id/confirm` — Requester confirms contract & locks escrow
- `POST /api/contracts/:id/checkout` — Provider hands over resource (`status -> active`)
- `POST /api/contracts/:id/return` — Requester returns item (`status -> returned`, sets dispute deadline)
- `POST /api/contracts/:id/cancel` — Cancel contract (refunds escrow if confirmed)

### Reports & Disputes (`/api/reports`)
- `POST /api/reports` — File dispute (flags contract `condition_disputed = true`)
- `GET /api/reports` — List user or all reports (if admin)
- `GET /api/reports/:id` — Get report details
- `POST /api/reports/:id/resolve` — Admin resolution:
  - `damage`: Award up to security deposit as penalty to provider, refund remaining deposit. If `damageAward > securityDeposit`, record debt and apply reliability strike to requester.
  - `dismissed`: Refund full deposit to requester, pay rental fee to provider.
  - `overcharge`: Apply reliability strike to provider.

---

## Cron Settlement Script

Run the automated contract dispute-window settlement script:

```bash
# Windows PowerShell
.\node_modules\.bin\tsx scripts/settle-contracts.ts

# Linux / Bash
npx tsx scripts/settle-contracts.ts
```

---

## Running Test Suites

### Windows PowerShell:
```powershell
.\scripts\run-tests.ps1
```

### Linux / Bash:
```bash
./scripts/run-tests.sh
```

### Interactive UI Test Dashboard:
Open `tests/test-dashboard.html` in any modern web browser to interactively test and debug all endpoints in real time.