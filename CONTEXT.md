# MakerPool — Working Context

> Living document. Updated for PRD v2.2 stabilization + frontend contracts UX.
> Last updated: 2026-08-20

---

## Goal

1. Stabilize MakerPool backend per PRD v2.2 (correctness + security).
2. Keep frontend API-aligned with contracts / wallet / QR handoff.
3. Production-ready UX: Landing, Contracts, nav consistency (MakerPool brand).

---

## PRD v2.2 status

| Item | Status |
|------|--------|
| 2.1 Two-sided confirm (contact + custody only when both confirm) | Done |
| 2.2 Cancellation fee = 10% platform capture via `captureEscrowFee` | Done |
| 2.3 QR handoff tokens (`utils/qrcode.ts` + handoff-token route) | Done |
| 2.4 `transitionCustody` single call site pattern | Done |
| 2.5 Shared `validateDisputeFiling` for reports + dispute-condition | Done |
| 2.6 Ratings table + aggregates (`017_add_ratings.sql`) | Done |
| 2.7 Negative `damageAward` rejected | Done |
| 3.1 CORS allowlist via `CORS_ALLOWED_ORIGINS` | Done |
| 3.2 Cookie `secure` in production + matching clearCookie | Done |
| 4.1 Skill modules | Absent (only drop/create migrations) |

**Ledger fix (v2.2 follow-up):** `sumEscrowForContract` now treats `fee_capture` as released escrow so cancellation fees don't leave a phantom escrow balance.

---

## How to run

```bash
# terminal 1
cd DealPool-Backend && npm run migrate && npm run dev

# terminal 2
cd DealPool-Frontend && npm run dev
```

Apply migration `017_add_ratings.sql` before exercising `POST /api/contracts/:id/rate`.
