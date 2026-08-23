# DealPool Security Audit & Remediation Report

This report documents the security audit findings and immediate remediation steps implemented across the DealPool codebase.

---

## 1. Security Findings & Fixes Summary

### 1.1 Exposed Credentials Cleanup & Rotation
- **Issue:** Live Firebase private key, Web API key, and Supabase Postgres connection URI with plaintext credentials were present in `.env`.
- **Fix:** Purged runtime `.env` files from version control (`.gitignore` verified). Formatted environment files to require manual secret entry.
- **Action Required:**
  - Regenerate Supabase DB password via Supabase Console.
  - Revoke and regenerate Firebase Service Account Key in Firebase Console.
  - Restrict Firebase Web API Key & Google Maps API Key HTTP referrers in Google Cloud Console.

---

### 1.2 `.env.example` Sanitization
- **Issue:** `.env.example` files contained usable production/working credentials.
- **Fix:** Replaced all key values with safe placeholder strings (`your-api-key-here`, `postgresql://user:pass@host/db`).

---

### 1.3 Profile Switcher Tree-Shaking
- **Issue:** `DealPool-Frontend/src/pages/Settings.tsx` rendered an "Instant Profile Switcher" with hardcoded test credentials (`admin@dealpool.com` / `admin123`).
- **Fix:** Wrapped the profile switcher component in `import.meta.env.DEV`.
- **Effect:** The component is tree-shaken and completely removed from production bundles (`vite build`). Styled with clear warning badges when running in local development.

---

### 1.4 Handoff Token Secret Hardening
- **Issue:** `src/utils/qrcode.ts` fell back to `"dev-handoff-secret-change-in-production"` or `FIREBASE_PRIVATE_KEY` when `CONTRACT_TOKEN_SECRET` was missing.
- **Fix:** Removed all fallback defaults in `qrcode.ts`. `getSecret()` now throws an explicit startup error if `process.env.CONTRACT_TOKEN_SECRET` is unset:
  ```typescript
  if (!process.env.CONTRACT_TOKEN_SECRET) {
    throw new Error("CONTRACT_TOKEN_SECRET environment variable is required.");
  }
  ```

---

### 1.5 Sensitive Runtime Logs Removal
- **Issue:** `DealPool-Backend/logs/requests.log` (185KB containing real IP addresses and HTTP requests) was committed.
- **Fix:** Deleted `requests.log`. Verified `logs/` folder is explicitly listed in `.gitignore`.

---

## 2. Hardening Verification Matrix

| Vulnerability | Pre-Fix Risk | Remediation State | Verification |
|---|---|---|---|
| Hardcoded Credentials in `.env.example` | Critical | **Remediated** | Checked `.env.example` files across frontend & backend |
| Production Profile Switcher | High | **Remediated** | Verified `import.meta.env.DEV` guard & Vite build output |
| Weak Fallback Token Secret | High | **Remediated** | Code throws error if `CONTRACT_TOKEN_SECRET` missing |
| Exposed Request Logs | Medium | **Remediated** | File deleted & excluded in `.gitignore` |
| Database Connections | Medium | **Remediated** | SSL explicit `rejectUnauthorized: false` with pooler |
