# DealPool

A Hyperlocal Resource, Skill & Service Exchange Network.

## Project Structure

```
DealPool/
├── DealPool-Backend/   # Express + TypeScript + PostgreSQL / Supabase + Firebase Auth
├── DealPool-Frontend/  # React 19 + TypeScript + Vite + TailwindCSS + Redux Toolkit
├── CONTEXT.md          # Architecture, schema, and API documentation
└── .gitignore
```

---

## Getting Started

### 1. Backend Setup

```bash
cd DealPool-Backend
npm install
npm run dev
```

The backend server runs on `http://localhost:3000`.

### 2. Frontend Setup

```bash
cd DealPool-Frontend
npm install
npm run dev
```

The frontend development server runs on `http://localhost:5173` and automatically proxies `/api/*` requests to the backend at `http://localhost:3000`.

---

## API Endpoints Overview

| Route | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Register new user with email & password |
| `/api/auth/login` | POST | Login with email & password |
| `/api/auth/google` | POST | Login with Firebase Google ID token |
| `/api/auth/me` | GET | Get authenticated user profile |
| `/api/auth/logout` | POST | Logout user |
| `/api/auth/refresh` | POST | Refresh session tokens |
| `/api/auth/update` | PATCH | Update username / profile photo |
| `/api/auth/change-password` | PATCH | Change account password |
| `/api/deals` | GET / POST | List & create deals |
| `/api/deals/nearby` | GET | Search deals by geolocation radius |
| `/api/deals/:id` | GET / PATCH / DELETE | Manage individual deal |
| `/api/deals/:dealId/offers` | GET / POST | List & create offers on a deal |
| `/api/offers/:id/accept` | PATCH | Accept an offer |
| `/api/offers/:id/reject` | PATCH | Reject an offer |
| `/api/offers/:id/withdraw` | PATCH | Withdraw an offer |
| `/api/resources` | GET / POST / PATCH / DELETE | Manage exchange resources |
| `/api/skills` | GET / POST / PATCH / DELETE | Manage user skills |
| `/api/transactions` | GET / POST | Track deal completion & ratings |
