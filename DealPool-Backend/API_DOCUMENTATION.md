# DealPool Backend — API Documentation & Developer Reference

Welcome to the comprehensive API specification and developer reference for the **DealPool** platform — a hyperlocal resource, skill, and service exchange network.

---

## 1. Authentication & Session Architecture

DealPool uses a hybrid authentication model combining **Firebase Authentication** (Identity Provider) and **HTTP-only Cookie Sessions** (Session Management).

### Authentication Flow
1. **Password Auth:** Clients send credentials to `POST /api/auth/register` or `POST /api/auth/login`.
2. **Google OAuth:** Clients authenticate with Firebase Web SDK (`signInWithPopup`) and send the Firebase ID Token to `POST /api/auth/google`.
3. **Session Cookies:** Upon successful authentication, the backend sets two HTTP-only cookies:
   - `accessToken`: JWT valid for **1 hour** (`maxAge: 3600000`).
   - `refreshToken`: Token valid for **60 days** (`maxAge: 5184000000`).
4. **Token Verification:** Subsequent requests pass `accessToken` in the `Cookie` header. Middleware verifies the token using `firebaseAuth.verifyIdToken()`.
5. **Token Refresh:** When `accessToken` expires, client calls `POST /api/auth/refresh` with `refreshToken` cookie to obtain a fresh token pair.

---

## 2. API Response Standard

All endpoints return a uniform envelope structure:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation of error"
  }
}
```

---

## 3. Core API Endpoints

### 3.1 Authentication & Profile (`/api/auth`)

#### `POST /api/auth/register`
Creates a new user account in Firebase Auth and provisions a PostgreSQL `profiles` row + ₹1000 signup bonus in `wallets`.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "TestPassword123!"
  }
  ```
- **Response (201 Created):** Sets `accessToken` & `refreshToken` cookies. Returns public user profile.

#### `POST /api/auth/login`
Authenticates existing credentials against Firebase Auth.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "TestPassword123!"
  }
  ```
- **Response (200 OK):** Sets `accessToken` & `refreshToken` cookies.

#### `POST /api/auth/google`
Authenticates a user via Firebase Google OAuth ID Token.
- **Request Body:**
  ```json
  {
    "idToken": "eyJhbGciOiJSUzI1NiIs..."
  }
  ```
- **Response (200 OK):** Sets session cookies, provisions profile if new user.

#### `GET /api/auth/me`
Retrieves the currently authenticated user's profile.
- **Headers:** Requires valid `accessToken` cookie.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "firebase_uid": "uid",
      "username": "eco_explorer_92",
      "email": "user@example.com",
      "role": "user",
      "avg_rating": 4.8,
      "rating_count": 5
    }
  }
  ```

#### `POST /api/auth/refresh`
Exchanges a valid `refreshToken` cookie for new `accessToken` and `refreshToken` cookies.
- **Response (200 OK):** `{ "success": true, "data": null }`

#### `POST /api/auth/logout`
Clears session cookies.
- **Response (200 OK):** `{ "success": true, "data": null }`

---

### 3.2 Discovery Radar (`/api/discovery`)

#### `GET /api/discovery/nearby`
Retrieves nearby deals separated into **needs** and **offers** based on proximity and offer status.
- **Query Parameters:**
  - `lat` (required): Latitude (e.g. `28.6304`)
  - `lng` (required): Longitude (e.g. `77.2177`)
  - `radiusKm` (optional): Radius in km (default `10`)
- **Business Rule:**
  - **Needs:** Deals with `status = 'open'` and **no pending/accepted offers**.
  - **Offers:** Deals with `status = 'open'` and **at least 1 pending/accepted offer**.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "center": { "lat": 28.6304, "lng": 77.2177, "radiusKm": 10 },
      "needs": [
        {
          "id": "uuid",
          "type": "need",
          "title": "Need a Power Drill",
          "category": "Equipment",
          "distanceKm": 1.4
        }
      ],
      "offers": [
        {
          "id": "uuid",
          "type": "offer",
          "title": "Lawnmower Available",
          "category": "Equipment",
          "distanceKm": 2.1
        }
      ],
      "total": 2
    }
  }
  ```

---

### 3.3 Deals Marketplace (`/api/deals`)

#### `POST /api/deals`
Creates a new deal (need request). Requires authenticated session.
- **Request Body:**
  ```json
  {
    "title": "Need 4K Projector for Weekend Event",
    "description": "Looking to borrow a projector for Friday evening.",
    "category": "Equipment",
    "budgetMin": 500,
    "budgetMax": 1000,
    "lat": 28.6304,
    "lng": 77.2177,
    "radiusKm": 10
  }
  ```
- **Response (201 Created):** Created deal object.

#### `GET /api/deals`
Lists all public deals with optional category and status filtering.

#### `GET /api/deals/:id`
Retrieves detailed information for a single deal.

#### `PATCH /api/deals/:id`
Updates a deal. Only permitted by the deal creator.

#### `DELETE /api/deals/:id`
Deletes a deal. Only permitted by the deal creator.

---

### 3.4 Offers (`/api/deals/:dealId/offers`)

#### `POST /api/deals/:dealId/offers`
Submits an offer to fulfill a deal. Cannot offer on your own deal.
- **Request Body:**
  ```json
  {
    "price": 600,
    "terms": "Available Friday 6 PM to Sunday morning"
  }
  ```
- **Response (201 Created):** Created offer object.

#### `GET /api/deals/:dealId/offers`
Lists all offers submitted for a deal.

---

### 3.5 Wallet & Double-Entry Ledger (`/api/wallet`)

#### `GET /api/wallet/me`
Fetches the current user's wallet balance, locked escrow balance, and transaction history.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "wallet": {
        "id": "uuid",
        "balance": "1000.00",
        "locked_balance": "0.00"
      },
      "ledger": [ ... ]
    }
  }
  ```

---

### 3.6 Reports & Governance (`/api/reports`)

#### `POST /api/reports`
Submits a community flag/report against a deal, profile, or resource.
- **Request Body:**
  ```json
  {
    "targetType": "deal",
    "targetId": "uuid",
    "reason": "Inappropriate description"
  }
  ```
- **Response (201 Created):** Report record.

---

## 4. Common Error Codes

| Error Code | HTTP Status | Description |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Email/password missing or incorrect |
| `INVALID_TOKEN` | 401 | Missing or invalid ID/access token |
| `PROFILE_EXISTS` | 409 | User profile already registered |
| `CANNOT_OFFER_OWN_DEAL` | 400 | User attempted to submit offer on their own deal |
| `DEAL_NOT_FOUND` | 404 | Deal ID does not exist |
| `FORBIDDEN` | 403 | User does not own the requested resource |
