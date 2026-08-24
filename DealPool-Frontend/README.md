# DealPool Frontend

Hyperlocal Resource, Skill & Equipment Sharing Web Application built with **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS**.

---

## ⚡ Tech Stack

- **Framework**: React 19 + TypeScript + Vite 6
- **Routing**: React Router 7
- **State Management**: Redux Toolkit (RTK) + RTK Query
- **Styling**: Tailwind CSS v4 + Motion (framer-motion) + Lucide Icons
- **Notifications**: Sonner toasts
- **API & Networking**: Axios with cookie-based session management (`withCredentials: true`)
- **Authentication**: JWT Cookie Auth + optional Firebase Web SDK for Google Sign-In
- **Mapping & Geo**: Google Maps Platform / Radar discovery integration

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v20+ recommended)
- **pnpm** (recommended), npm, or bun

### 2. Installation
```bash
# From the DealPool-Frontend directory
pnpm install
```

### 3. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` as needed:
```env
# In local development, leave VITE_API_BASE_URL empty so Vite proxies requests to localhost:3000
VITE_API_BASE_URL=
VITE_BACKEND_URL=http://localhost:3000

# Google Maps API Key for map radar & location search
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Firebase Web Config (matching your backend project for Google Sign-In)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### 4. Run the Development Server
Make sure the **DealPool-Backend** is running on port `3000`, then launch:
```bash
pnpm dev
```
Open **`http://localhost:5173`** in your browser. All `/api/*` requests will be proxied to `http://localhost:3000`.

---

## 🌐 Environment Variables

| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_API_BASE_URL` | No *(Local)* / **Yes *(Production)*** | Base URL for backend API (e.g. `https://dealpool-backend.onrender.com`). Leave empty in local dev to use Vite proxy. |
| `VITE_BACKEND_URL` | Yes *(Local)* | Target URL for the local Vite proxy (default: `http://localhost:3000`). |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | Google Maps API key for map radar and address autocomplete. |
| `VITE_FIREBASE_API_KEY` | Optional | Firebase Web API key for Google OAuth authentication. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Optional | Firebase Auth Domain for OAuth redirect/popup. |
| `VITE_FIREBASE_PROJECT_ID` | Optional | Firebase Project ID. |
| `VITE_FIREBASE_APP_ID` | Optional | Firebase App ID. |

---

## 🚢 Production Deployment (Render / Vercel / Netlify)

When deploying the frontend to production:

1. **Build Command**: `pnpm build`
2. **Publish / Output Directory**: `dist`
3. **Environment Variables**:
   - Set `VITE_API_BASE_URL` to your live backend URL (e.g., `https://dealpool-backend.onrender.com`).
   - Set `VITE_GOOGLE_MAPS_API_KEY` and Firebase credentials.

> **Note**: Ensure the backend's `CORS_ORIGIN` matches your frontend domain (e.g., `https://dealpool.onrender.com`) to allow cookie transmission (`credentials: include`).

---

## 🛠️ Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `dev` | `pnpm dev` | Starts Vite dev server on `http://localhost:5173` with `/api` proxy |
| `dev:mock` | `pnpm run dev:mock` | Starts Vite with an in-memory mock Express server (`server.ts`) |
| `build` | `pnpm build` | Type-checks and builds production-ready bundle into `dist/` |
| `preview` | `pnpm preview` | Locally preview the production build |
| `lint` | `pnpm lint` | Runs TypeScript compiler checks (`tsc --noEmit`) |

---

## 🔌 API & Feature Coverage

| Module | Endpoints | Status |
| :--- | :--- | :---: |
| **Authentication** | `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/google`, `/api/auth/logout` | ✅ Connected |
| **Deals / Requests** | `/api/deals`, `/api/deals/search`, `/api/deals/:id` | ✅ Connected |
| **Offers & Bids** | `/api/offers`, `/api/offers/:id/accept`, `/api/offers/:id/reject`, counter-offers | ✅ Connected |
| **Smart Contracts** | `/api/contracts`, milestone updates, completion, QR confirmation | ✅ Connected |
| **Wallet & Escrow** | `/api/wallet`, `/api/wallet/transactions`, deposit, escrow release | ✅ Connected |
| **Geo & Discovery** | `/api/discovery/nearby` (RTK Query) | ✅ Connected |
| **User & Admin** | `/api/admin/users`, `/api/admin/users/:id/role`, user deletion | ✅ Connected |

---

## 🔧 Troubleshooting

### 1. `ERR_NETWORK` / "Cannot reach the API"
- Make sure **DealPool-Backend** is running (`pnpm dev` in the `DealPool-Backend` directory).
- Check that the backend port matches `VITE_BACKEND_URL` in `.env` (default `http://localhost:3000`).

### 2. Cookie / Authentication Not Persisting
- In local development, access the app via `http://localhost:5173` rather than `http://127.0.0.1:5173` to match cookie domains.
- In production, ensure `withCredentials: true` is allowed on the backend via CORS headers (`Access-Control-Allow-Credentials: true`).

### 3. Google Sign-In Button Missing or Failing
- Ensure all `VITE_FIREBASE_*` variables are defined in `.env`.
- Verify **Google Provider** is enabled in your Firebase Console under **Authentication → Sign-in method**.
- Add `localhost` and your production domain to **Authorized Domains** in the Firebase Console.
- Restart the dev server after editing `.env`.
