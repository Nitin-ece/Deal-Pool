# DealPool Testing Guide & Automation Architecture

This guide details how to run, write, and debug automated integration tests for DealPool Backend and Frontend.

---

## 1. Quick Start — Running Tests

### Command Line Interface (CLI)

#### On Windows (PowerShell):
```powershell
npm run test-Win
```

#### On Linux / macOS (Bash):
```bash
npm run test-Lin
```

#### Running a Specific Test File:
```bash
npx tsx tests/auth.test.ts
npx tsx tests/discovery.test.ts
npx tsx tests/deals.test.ts
```

---

## 2. Interactive Browser Test Suite (`tests/index.html`)

DealPool includes a modern, dark-mode browser dashboard for executing interactive end-to-end integration test sequences and inspecting raw HTTP requests/responses in real-time.

### How to Use:
1. Start the backend dev server:
   ```bash
   npm run dev
   ```
2. Open `tests/index.html` in your browser (e.g. `http://localhost:3000/tests/index.html` or double click file).
3. Click **▶ Run All Suite Tests** in the top header.
4. Watch the step-by-step test execution grid:
   - **Step 1:** User Registration (`POST /api/auth/register`)
   - **Step 2:** User Login & Cookies (`POST /api/auth/login`)
   - **Step 3:** Session Validation (`GET /api/auth/me`)
   - **Step 4:** Deal Creation (`POST /api/deals`)
   - **Step 5:** Discovery Needs Filter (`GET /api/discovery/nearby`)
   - **Step 6:** Offer Submission (`POST /api/deals/:id/offers`)
   - **Step 7:** Discovery Offers Transition (`GET /api/discovery/nearby`)
   - **Step 8:** Wallet Balance & Bonus (`GET /api/wallet/me`)
5. Inspect formatted JSON payloads and response timings in the bottom console panel.

---

## 3. Database Isolation Architecture (`.env.test`)

To ensure test runs never contaminate production or local development data:

1. Tests check `NODE_ENV === "test"`.
2. When `NODE_ENV=test`, `src/config/db.ts` and `src/config/firebase.ts` load configuration from `.env.test`.
3. Template configuration is located at `.env.test`.

### Cleanup Utility (`tests/helpers/cleanup.ts`)
Every test file utilizes `createCleanupTracker()` and `cleanupTestData(tracker)` in a `finally` block:

```typescript
import { createCleanupTracker, cleanupTestData } from "./helpers/cleanup";

const tracker = createCleanupTracker();

try {
  // Track created resources
  tracker.firebaseUids.push(uid);
  tracker.dealIds.push(dealId);
  tracker.offerIds.push(offerId);
} finally {
  // Deletes all tracked records in correct PostgreSQL foreign key order
  await cleanupTestData(tracker);
}
```

---

## 4. Test Suite Inventory

| Test File | Description | Focus Areas |
|---|---|---|
| `tests/auth.test.ts` | Auth Suite | Register, login, session cookies, Google sign-in, token refresh, password update |
| `tests/admin.test.ts` | Admin Control | Admin roles, privilege checks, user management |
| `tests/deals.test.ts` | Deals Marketplace | Create deal, list, nearby geospatial filter, update, delete |
| `tests/discovery.test.ts` | Discovery Radar | Proximity calculation, needs vs. offers filter classification |
| `tests/offers.test.ts` | Offers Engine | Offer creation, self-offer prevention, fee cap checks, accept, reject, withdraw |
| `tests/resources.test.ts` | Resource Ledger | Resource tracking, declared values, custody records |
| `tests/transactions.test.ts` | Transactions | Handover state machine, proof of custody |
| `tests/wallet.test.ts` | Wallet & Ledger | Signup bonus grant, balance updates, double-entry ledger |
| `tests/contracts.test.ts` | Contracts & Escrow | Escrow locking, payout, fee capture, contract completion |
| `tests/reports.test.ts` | Moderation | Community reporting, flag handling |
| `tests/e2e_full_suite.test.ts` | Full E2E Flow | End-to-end multi-user deal, offer, contract, and escrow lifecycle |
