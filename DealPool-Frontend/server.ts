import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";

export interface UserProfile {
  id: string;
  firebase_uid: string;
  username: string;
  email: string;
  profile_photo: string | null;
  role: "user" | "admin";
  avg_rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  user_id: string;
  creator?: Partial<UserProfile>;
  title: string;
  description: string;
  category: "Physical Resource" | "Skill" | "Service" | "Equipment" | "Other";
  budget_min: number;
  budget_max: number;
  lat: number;
  lng: number;
  address?: string;
  image_url?: string;
  radius_km: number;
  status: "open" | "offer_accepted" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  deal_id: string;
  provider_id: string;
  provider?: Partial<UserProfile>;
  price: number;
  terms: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  created_at: string;
  updated_at: string;
}

// In-Memory Database for local state & persistence
interface UserRecord extends UserProfile {
  password_hash: string;
  refresh_token?: string;
}

const users: Map<string, UserRecord> = new Map();
const deals: Map<string, Deal> = new Map();
const offers: Map<string, Offer> = new Map();

// Helper to compute distance in km using Haversine formula
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function generateRandomUsername(): string {
  const adjectives = [
    "swift", "clever", "bright", "urban", "metro", "green", "agile", "bold", "hyper",
    "stellar", "kind", "calm", "noble", "vivid", "crafty", "prime", "fresh", "zen"
  ];
  const nouns = [
    "otter", "falcon", "maker", "fox", "badger", "spark", "panda", "harbor", "lynx",
    "beacon", "cedar", "orbit", "atlas", "sprout", "pulse", "quiver", "runner", "scout"
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const hash = crypto.randomBytes(3).toString("hex");
  return `${adj}_${noun}_${hash}`;
}

// Seed initial profiles and realistic community deals
function seedDatabase() {
  const adminUser: UserRecord = {
    id: "u-admin-001",
    firebase_uid: "fb-admin-001",
    username: "admin_dealpool",
    email: "admin@dealpool.com",
    password_hash: "admin123",
    profile_photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    role: "admin",
    avg_rating: 4.95,
    rating_count: 42,
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userRiya: UserRecord = {
    id: "u-riya-002",
    firebase_uid: "fb-riya-002",
    username: "riya_sharma",
    email: "riya@community.io",
    password_hash: "password123",
    profile_photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    role: "user",
    avg_rating: 4.85,
    rating_count: 24,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userArjun: UserRecord = {
    id: "u-arjun-003",
    firebase_uid: "fb-arjun-003",
    username: "arjun_mehta",
    email: "arjun@community.io",
    password_hash: "password123",
    profile_photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    role: "user",
    avg_rating: 4.70,
    rating_count: 32,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userSarah: UserRecord = {
    id: "u-sarah-004",
    firebase_uid: "fb-sarah-004",
    username: "sarah_builder",
    email: "sarah@community.io",
    password_hash: "password123",
    profile_photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    role: "user",
    avg_rating: 4.90,
    rating_count: 18,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userVikram: UserRecord = {
    id: "u-vikram-005",
    firebase_uid: "fb-vikram-005",
    username: "vikram_singh",
    email: "vikram@community.io",
    password_hash: "password123",
    profile_photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    role: "user",
    avg_rating: 4.65,
    rating_count: 15,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userNeha: UserRecord = {
    id: "u-neha-006",
    firebase_uid: "fb-neha-006",
    username: "neha_kapoor",
    email: "neha@community.io",
    password_hash: "password123",
    profile_photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    role: "user",
    avg_rating: 4.80,
    rating_count: 29,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  [adminUser, userRiya, userArjun, userSarah, userVikram, userNeha].forEach((u) => {
    users.set(u.id, u);
  });

  // Center coordinate around Connaught Place, New Delhi (28.6304, 77.2177)
  // We also distribute slightly so default map centers nicely
  const sampleDeals: Deal[] = [
    {
      id: "deal-001",
      user_id: userRiya.id,
      title: "Need a 4K Projector + Screen for Friday Film Screening",
      description: "Looking for a high-definition projector (1080p or 4K with HDMI input) and a foldable screen for a community presentation. Needed for full evening from 5 PM to 10 PM.",
      category: "Equipment",
      budget_min: 450,
      budget_max: 650,
      lat: 28.6328,
      lng: 77.2195,
      address: "Connaught Place, Central Delhi",
      image_url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80",
      radius_km: 6.0,
      status: "open",
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: "deal-002",
      user_id: userArjun.id,
      title: "Senior React / TypeScript Dev for 3hr Architecture Review",
      description: "Need an experienced senior engineer to pair program for 3 hours, audit state management bottlenecks, and help organize our offline database layer.",
      category: "Skill",
      budget_min: 750,
      budget_max: 1100,
      lat: 28.6412,
      lng: 77.2285,
      address: "Barakhamba Road, New Delhi",
      image_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
      radius_km: 8.0,
      status: "open",
      created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    },
    {
      id: "deal-003",
      user_id: userNeha.id,
      title: "Help moving handcrafted solid wood furniture",
      description: "Moving a two-seater oak couch, dining table, and four chairs to 3rd floor apartment with service lift. Need 1 strong helper for 2.5 hours.",
      category: "Service",
      budget_min: 600,
      budget_max: 900,
      lat: 28.6185,
      lng: 77.2090,
      address: "Gol Market, New Delhi",
      image_url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80",
      radius_km: 5.0,
      status: "open",
      created_at: new Date(Date.now() - 7 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 7 * 3600000).toISOString(),
    },
    {
      id: "deal-004",
      user_id: userVikram.id,
      title: "Cordless Impact Drill Machine with masonry bit set",
      description: "Need a cordless or heavy-duty impact drill machine to mount 6 floating shelves and curtain rods this weekend. Will return sanitized and undamaged.",
      category: "Physical Resource",
      budget_min: 250,
      budget_max: 450,
      lat: 28.6480,
      lng: 77.2140,
      address: "Pahar Ganj, Central Delhi",
      image_url: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80",
      radius_km: 4.5,
      status: "open",
      created_at: new Date(Date.now() - 11 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 11 * 3600000).toISOString(),
    },
    {
      id: "deal-005",
      user_id: userSarah.id,
      title: "Beginner Acoustic Guitar Coach for weekend lessons",
      description: "Looking for friendly neighborhood tutor for 2 weekly introductory sessions in chord progressions, rhythm strumming, and fingerpicking basics.",
      category: "Skill",
      budget_min: 500,
      budget_max: 800,
      lat: 28.6250,
      lng: 77.2340,
      address: "Mandi House Cultural Hub",
      image_url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80",
      radius_km: 7.0,
      status: "open",
      created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 18 * 3600000).toISOString(),
    },
    {
      id: "deal-006",
      user_id: userRiya.id,
      title: "Sony Alpha A7 IV or A7 III Full Frame Camera Kit",
      description: "Need a Canon or Sony mirrorless/DSLR camera with 50mm or 24-70mm lens for half a day to photograph handcrafted ceramic mugs for our studio store.",
      category: "Equipment",
      budget_min: 850,
      budget_max: 1300,
      lat: 28.6360,
      lng: 77.2110,
      address: "Janpath Market lane",
      image_url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80",
      radius_km: 5.5,
      status: "open",
      created_at: new Date(Date.now() - 28 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 28 * 3600000).toISOString(),
    },
    {
      id: "deal-007",
      user_id: userArjun.id,
      title: "Camping Tent (4-Person Waterproof) + 2 Sleeping Bags",
      description: "Planning a 2-day hill trek this coming weekend. Looking to borrow or rent clean, weather-sealed 4-person dome tent with ground sheet and thermal sleeping bags.",
      category: "Physical Resource",
      budget_min: 400,
      budget_max: 700,
      lat: 28.6380,
      lng: 77.2210,
      address: "Shivaji Stadium precinct",
      image_url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop&q=80",
      radius_km: 6.5,
      status: "open",
      created_at: new Date(Date.now() - 32 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 32 * 3600000).toISOString(),
    }
  ];

  sampleDeals.forEach((d) => {
    deals.set(d.id, d);
  });

  // Seed sample offers for deal-001
  const offer1: Offer = {
    id: "off-001",
    deal_id: "deal-001",
    provider_id: userArjun.id,
    price: 500,
    terms: "Epson 1080p 3600 lumens projector with 5m HDMI cable + tripod stand included. Available Saturday morning for handover.",
    status: "pending",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  };

  const offer2: Offer = {
    id: "off-002",
    deal_id: "deal-001",
    provider_id: userNeha.id,
    price: 550,
    terms: "BenQ Full HD projector + portable pull-up projection screen if needed at no extra cost.",
    status: "pending",
    created_at: new Date(Date.now() - 1.5 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1.5 * 3600000).toISOString(),
  };

  const offer3: Offer = {
    id: "off-003",
    deal_id: "deal-001",
    provider_id: userVikram.id,
    price: 450,
    terms: "ViewSonic portable LED projector. Compact, bright, and comes with wireless screen casting dongle.",
    status: "pending",
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  };

  [offer1, offer2, offer3].forEach((o) => {
    offers.set(o.id, o);
  });
}

seedDatabase();

// Clean public profile
function toPublicProfile(u: UserRecord): UserProfile {
  return {
    id: u.id,
    firebase_uid: u.firebase_uid,
    username: u.username,
    email: u.email,
    profile_photo: u.profile_photo,
    role: u.role,
    avg_rating: u.avg_rating,
    rating_count: u.rating_count,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Helper auth extractor from cookies
  function getAuthenticatedUser(req: express.Request): UserRecord | null {
    const accessToken = req.cookies?.accessToken;
    if (!accessToken) return null;
    // In our cookie token simulation, accessToken is userId:tokenVersion or signed payload
    const userId = accessToken.split("::")[0];
    const user = users.get(userId);
    return user || null;
  }

  function setAuthCookies(res: express.Response, user: UserRecord) {
    const tokenPayload = `${user.id}::${Date.now()}`;
    const refreshTokenPayload = `${user.id}::refresh::${Date.now()}`;
    user.refresh_token = refreshTokenPayload;

    res.cookie("accessToken", tokenPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000, // 15 mins
      path: "/",
    });

    res.cookie("refreshToken", refreshTokenPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });
  }

  function clearAuthCookies(res: express.Response) {
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
  }

  // --- API Routes ---

  // Health
  app.get("/api/health", (req, res) => {
    res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
  });

  // 1. POST /api/auth/register { email, password }
  app.post("/api/auth/register", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Email and password are required" },
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    if (password.length < 6) {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Password must be at least 6 characters" },
      });
      return;
    }

    // Check email exists
    for (const u of users.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        res.status(409).json({
          success: false,
          error: { code: "EMAIL_EXISTS", message: "An account with this email already exists." },
        });
        return;
      }
    }

    const newId = `u-${crypto.randomUUID().slice(0, 8)}`;
    const newUsername = generateRandomUsername();
    const newUser: UserRecord = {
      id: newId,
      firebase_uid: `fb-${crypto.randomUUID().slice(0, 8)}`,
      username: newUsername,
      email: cleanEmail,
      password_hash: password, // In production hashed with argon2/bcrypt
      profile_photo: null,
      role: "user",
      avg_rating: 5.0,
      rating_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    users.set(newId, newUser);
    setAuthCookies(res, newUser);

    res.status(201).json({
      success: true,
      data: toPublicProfile(newUser),
    });
  });

  // 2. POST /api/auth/login { email, password }
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Email and password are required" },
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    let foundUser: UserRecord | null = null;
    for (const u of users.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser || foundUser.password_hash !== password) {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      });
      return;
    }

    setAuthCookies(res, foundUser);
    res.json({
      success: true,
      data: toPublicProfile(foundUser),
    });
  });

  // 3. GET /api/auth/me (cookie auth, no body)
  app.get("/api/auth/me", (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    res.json({
      success: true,
      data: toPublicProfile(user),
    });
  });

  // 4. POST /api/auth/logout (clears cookies)
  app.post("/api/auth/logout", (req, res) => {
    clearAuthCookies(res);
    res.json({
      success: true,
      data: null,
    });
  });

  // 5. POST /api/auth/refresh (reads refreshToken cookie, rotates both cookies)
  app.post("/api/auth/refresh", (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_REFRESH_TOKEN", message: "No refresh token provided" },
      });
      return;
    }

    const userId = refreshToken.split("::")[0];
    const user = users.get(userId);
    if (!user || user.refresh_token !== refreshToken) {
      clearAuthCookies(res);
      res.status(401).json({
        success: false,
        error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token is invalid or expired" },
      });
      return;
    }

    setAuthCookies(res, user);
    res.json({
      success: true,
      data: toPublicProfile(user),
    });
  });

  // 6. POST /api/auth/google { idToken }
  app.post("/api/auth/google", (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_TOKEN", message: "Google ID token required" },
      });
      return;
    }

    // Lookup or create google user based on idToken simulation or payload
    const demoEmail = "google.user@dealpool.community";
    let googleUser: UserRecord | null = null;
    for (const u of users.values()) {
      if (u.email.toLowerCase() === demoEmail) {
        googleUser = u;
        break;
      }
    }

    if (!googleUser) {
      const newId = `u-g-${crypto.randomUUID().slice(0, 8)}`;
      googleUser = {
        id: newId,
        firebase_uid: `fb-google-${crypto.randomUUID().slice(0, 8)}`,
        username: generateRandomUsername(),
        email: demoEmail,
        password_hash: crypto.randomBytes(16).toString("hex"),
        profile_photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        role: "user",
        avg_rating: 5.0,
        rating_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      users.set(newId, googleUser);
    }

    setAuthCookies(res, googleUser);
    res.json({
      success: true,
      data: toPublicProfile(googleUser),
    });
  });

  // 7. PATCH /api/auth/update { username?, email?, profile_photo? }
  app.patch("/api/auth/update", (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    const { username, email, profile_photo } = req.body;
    if (username === undefined && email === undefined && profile_photo === undefined) {
      res.status(400).json({
        success: false,
        error: { code: "NO_UPDATE_FIELDS", message: "No update fields provided" },
      });
      return;
    }

    if (username !== undefined) {
      const cleanUsername = String(username).trim();
      if (!cleanUsername || cleanUsername.length < 3) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_USERNAME", message: "Username must be at least 3 characters" },
        });
        return;
      }
      // Check if username taken by another user
      for (const u of users.values()) {
        if (u.id !== user.id && u.username.toLowerCase() === cleanUsername.toLowerCase()) {
          res.status(409).json({
            success: false,
            error: { code: "USERNAME_TAKEN", message: "Username is already taken" },
          });
          return;
        }
      }
      user.username = cleanUsername;
    }

    if (email !== undefined) {
      const cleanEmail = String(email).toLowerCase().trim();
      if (!cleanEmail.includes("@")) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_EMAIL", message: "Valid email required" },
        });
        return;
      }
      for (const u of users.values()) {
        if (u.id !== user.id && u.email.toLowerCase() === cleanEmail) {
          res.status(409).json({
            success: false,
            error: { code: "EMAIL_TAKEN", message: "Email is already in use by another account" },
          });
          return;
        }
      }
      user.email = cleanEmail;
    }

    if (profile_photo !== undefined) {
      user.profile_photo = profile_photo ? String(profile_photo) : null;
    }

    user.updated_at = new Date().toISOString();
    res.json({
      success: true,
      data: toPublicProfile(user),
    });
  });

  // 8. PATCH /api/auth/change-password { currentPassword, newPassword }
  app.patch("/api/auth/change-password", (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: { code: "WEAK_PASSWORD", message: "Current and new passwords are required" },
      });
      return;
    }

    if (user.password_hash !== currentPassword) {
      res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "Current password is incorrect" },
      });
      return;
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: { code: "WEAK_PASSWORD", message: "New password must be at least 6 characters" },
      });
      return;
    }

    user.password_hash = newPassword;
    user.updated_at = new Date().toISOString();

    res.json({
      success: true,
      data: null,
    });
  });

  // --- Admin Routes (role: "admin" only) ---

  function requireAdmin(req: express.Request, res: express.Response): UserRecord | null {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return null;
    }
    if (user.role !== "admin") {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Administrator access required" },
      });
      return null;
    }
    return user;
  }

  // GET /api/admin/users?limit=50&offset=0
  app.get("/api/admin/users", (req, res) => {
    if (!requireAdmin(req, res)) return;

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const sortedUsers = Array.from(users.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit)
      .map(toPublicProfile);

    res.json({
      success: true,
      data: sortedUsers,
    });
  });

  // GET /api/admin/users/:id
  app.get("/api/admin/users/:id", (req, res) => {
    if (!requireAdmin(req, res)) return;

    const user = users.get(req.params.id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "PROFILE_NOT_FOUND", message: "User profile not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: toPublicProfile(user),
    });
  });

  // PATCH /api/admin/users/:id/role { role: "user" | "admin" }
  app.patch("/api/admin/users/:id/role", (req, res) => {
    if (!requireAdmin(req, res)) return;

    const targetUser = users.get(req.params.id);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: { code: "PROFILE_NOT_FOUND", message: "User profile not found" },
      });
      return;
    }

    const { role } = req.body;
    if (role !== "user" && role !== "admin") {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_ROLE", message: "Role must be 'user' or 'admin'" },
      });
      return;
    }

    targetUser.role = role;
    targetUser.updated_at = new Date().toISOString();

    res.json({
      success: true,
      data: toPublicProfile(targetUser),
    });
  });

  // DELETE /api/admin/users/:id
  app.delete("/api/admin/users/:id", (req, res) => {
    if (!requireAdmin(req, res)) return;

    const targetUser = users.get(req.params.id);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: { code: "PROFILE_NOT_FOUND", message: "User profile not found" },
      });
      return;
    }

    users.delete(req.params.id);
    res.json({
      success: true,
      data: null,
    });
  });

  // --- Deals & Offers Routes ---

  // Helper to attach creator profile to Deal
  function enrichDeal(deal: Deal, viewerUser: UserRecord | null): any {
    const creator = users.get(deal.user_id);
    const creatorSummary = creator
      ? {
          id: creator.id,
          username: creator.username,
          profile_photo: creator.profile_photo,
          avg_rating: creator.avg_rating,
          rating_count: creator.rating_count,
        }
      : undefined;

    // Check location privacy §6
    // If viewer is creator or has an accepted offer on this deal, show exact coordinates
    let hasAcceptedOffer = false;
    if (viewerUser) {
      for (const off of offers.values()) {
        if (off.deal_id === deal.id && off.provider_id === viewerUser.id && off.status === "accepted") {
          hasAcceptedOffer = true;
          break;
        }
      }
    }

    const isAuthorizedForExactLocation = viewerUser && (viewerUser.id === deal.user_id || hasAcceptedOffer || viewerUser.role === "admin");

    if (isAuthorizedForExactLocation) {
      return {
        ...deal,
        creator: creatorSummary,
        exact_location_visible: true,
      };
    } else {
      // Return fuzzy/approximate details
      return {
        ...deal,
        creator: creatorSummary,
        exact_location_visible: false,
        // Lat/lng are preserved for general distance calculation or fuzzy radius rendering
      };
    }
  }

  // POST /api/deals { title, description, category, budgetMin, budgetMax, lat, lng, radiusKm }
  app.post("/api/deals", (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required to post a deal" },
      });
      return;
    }

    const { title, description, category, budgetMin, budgetMax, lat, lng, radiusKm, address, image_url } = req.body;
    if (!title || !category || lat === undefined || lng === undefined) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_DEAL_DATA", message: "Title, category, and location coordinates are required." },
      });
      return;
    }

    // Default category images if not provided
    const defaultImages: Record<string, string> = {
      "Physical Resource": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80",
      "Skill": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
      "Service": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80",
      "Equipment": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80",
      "Other": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
    };

    const newDealId = `deal-${crypto.randomUUID().slice(0, 8)}`;
    const newDeal: Deal = {
      id: newDealId,
      user_id: user.id,
      title: String(title).trim(),
      description: String(description || "").trim(),
      category: category || "Other",
      budget_min: Number(budgetMin) || 0,
      budget_max: Number(budgetMax) || Number(budgetMin) || 0,
      lat: Number(lat),
      lng: Number(lng),
      address: address ? String(address).trim() : "Custom Pin Location",
      image_url: image_url ? String(image_url).trim() : (defaultImages[category] || defaultImages["Other"]),
      radius_km: Number(radiusKm) || 5.0,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    deals.set(newDealId, newDeal);

    res.status(201).json({
      success: true,
      data: enrichDeal(newDeal, user),
    });
  });

  // GET /api/deals ?category=&status=&userId=
  app.get("/api/deals", (req, res) => {
    const viewer = getAuthenticatedUser(req);
    const { category, status, userId } = req.query;

    let dealList = Array.from(deals.values());

    if (category && typeof category === "string") {
      dealList = dealList.filter((d) => d.category.toLowerCase() === category.toLowerCase());
    }

    if (status && typeof status === "string") {
      dealList = dealList.filter((d) => d.status.toLowerCase() === status.toLowerCase());
    }

    if (userId && typeof userId === "string") {
      dealList = dealList.filter((d) => d.user_id === userId);
    }

    dealList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({
      success: true,
      data: dealList.map((d) => enrichDeal(d, viewer)),
    });
  });

  // GET /api/deals/nearby ?lat=&lng=&radiusKm=&category= (ST_DWithin PostGIS simulation)
  app.get("/api/deals/nearby", (req, res) => {
    const viewer = getAuthenticatedUser(req);
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = parseFloat(req.query.radiusKm as string) || 15.0;
    const category = req.query.category as string;

    const centerLat = isNaN(lat) ? 28.6304 : lat;
    const centerLng = isNaN(lng) ? 77.2177 : lng;

    let results = Array.from(deals.values())
      .map((d) => {
        const distanceKm = calculateDistanceKm(centerLat, centerLng, d.lat, d.lng);
        return {
          ...enrichDeal(d, viewer),
          distance_km: distanceKm,
        };
      })
      .filter((d) => d.distance_km <= radiusKm);

    if (category && category !== "All") {
      results = results.filter((d) => d.category.toLowerCase() === category.toLowerCase());
    }

    // Sort by distance (ST_Distance)
    results.sort((a, b) => a.distance_km - b.distance_km);

    res.json({
      success: true,
      data: results,
    });
  });

  // GET /api/deals/:id
  app.get("/api/deals/:id", (req, res) => {
    const viewer = getAuthenticatedUser(req);
    const deal = deals.get(req.params.id);
    if (!deal) {
      res.status(404).json({
        success: false,
        error: { code: "DEAL_NOT_FOUND", message: "Deal not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: enrichDeal(deal, viewer),
    });
  });

  // PATCH /api/deals/:id (owner only)
  app.patch("/api/deals/:id", (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    const deal = deals.get(req.params.id);
    if (!deal) {
      res.status(404).json({
        success: false,
        error: { code: "DEAL_NOT_FOUND", message: "Deal not found" },
      });
      return;
    }

    if (deal.user_id !== user.id && user.role !== "admin") {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only the deal owner can edit this deal" },
      });
      return;
    }

    const { title, description, category, budgetMin, budgetMax, status, radiusKm } = req.body;
    if (title !== undefined) deal.title = String(title).trim();
    if (description !== undefined) deal.description = String(description).trim();
    if (category !== undefined) deal.category = category;
    if (budgetMin !== undefined) deal.budget_min = Number(budgetMin);
    if (budgetMax !== undefined) deal.budget_max = Number(budgetMax);
    if (status !== undefined) deal.status = status;
    if (radiusKm !== undefined) deal.radius_km = Number(radiusKm);

    deal.updated_at = new Date().toISOString();

    res.json({
      success: true,
      data: enrichDeal(deal, user),
    });
  });

  // DELETE /api/deals/:id (owner only)
  app.delete("/api/deals/:id", (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    const deal = deals.get(req.params.id);
    if (!deal) {
      res.status(404).json({
        success: false,
        error: { code: "DEAL_NOT_FOUND", message: "Deal not found" },
      });
      return;
    }

    if (deal.user_id !== user.id && user.role !== "admin") {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only the deal owner can delete this deal" },
      });
      return;
    }

    deals.delete(req.params.id);
    res.json({
      success: true,
      data: null,
    });
  });

  // --- Offers Endpoints ---

  function enrichOffer(offer: Offer): any {
    const provider = users.get(offer.provider_id);
    return {
      ...offer,
      provider: provider
        ? {
            id: provider.id,
            username: provider.username,
            profile_photo: provider.profile_photo,
            avg_rating: provider.avg_rating,
            rating_count: provider.rating_count,
          }
        : undefined,
    };
  }

  // POST /api/deals/:dealId/offers { price, terms }
  app.post("/api/deals/:dealId/offers", (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required to make an offer" },
      });
      return;
    }

    const deal = deals.get(req.params.dealId);
    if (!deal) {
      res.status(404).json({
        success: false,
        error: { code: "DEAL_NOT_FOUND", message: "Deal not found" },
      });
      return;
    }

    if (deal.user_id === user.id) {
      res.status(400).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You cannot make an offer on your own deal" },
      });
      return;
    }

    if (deal.status !== "open") {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_STATUS", message: "This deal is no longer accepting offers" },
      });
      return;
    }

    const { price, terms } = req.body;
    if (!price || !terms) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_OFFER_DATA", message: "Price and terms are required" },
      });
      return;
    }

    const newOfferId = `off-${crypto.randomUUID().slice(0, 8)}`;
    const newOffer: Offer = {
      id: newOfferId,
      deal_id: deal.id,
      provider_id: user.id,
      price: Number(price),
      terms: String(terms).trim(),
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    offers.set(newOfferId, newOffer);

    res.status(201).json({
      success: true,
      data: enrichOffer(newOffer),
    });
  });

  // GET /api/deals/:dealId/offers
  app.get("/api/deals/:dealId/offers", (req, res) => {
    const deal = deals.get(req.params.dealId);
    if (!deal) {
      res.status(404).json({
        success: false,
        error: { code: "DEAL_NOT_FOUND", message: "Deal not found" },
      });
      return;
    }

    const dealOffers = Array.from(offers.values())
      .filter((o) => o.deal_id === deal.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(enrichOffer);

    res.json({
      success: true,
      data: dealOffers,
    });
  });

  // PATCH /api/offers/:id/accept -- marks deal.status = 'offer_accepted', rejects competing offers
  app.patch("/api/offers/:id/accept", (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    const targetOffer = offers.get(req.params.id);
    if (!targetOffer) {
      res.status(404).json({
        success: false,
        error: { code: "OFFER_NOT_FOUND", message: "Offer not found" },
      });
      return;
    }

    const deal = deals.get(targetOffer.deal_id);
    if (!deal) {
      res.status(404).json({
        success: false,
        error: { code: "DEAL_NOT_FOUND", message: "Associated deal not found" },
      });
      return;
    }

    if (deal.user_id !== user.id && user.role !== "admin") {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only the deal owner can accept offers" },
      });
      return;
    }

    targetOffer.status = "accepted";
    targetOffer.updated_at = new Date().toISOString();

    // Mark deal as offer_accepted
    deal.status = "offer_accepted";
    deal.updated_at = new Date().toISOString();

    // Reject competing offers on the same deal
    for (const off of offers.values()) {
      if (off.deal_id === deal.id && off.id !== targetOffer.id && off.status === "pending") {
        off.status = "rejected";
        off.updated_at = new Date().toISOString();
      }
    }

    res.json({
      success: true,
      data: enrichOffer(targetOffer),
    });
  });

  // PATCH /api/offers/:id/reject
  app.patch("/api/offers/:id/reject", (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    const targetOffer = offers.get(req.params.id);
    if (!targetOffer) {
      res.status(404).json({
        success: false,
        error: { code: "OFFER_NOT_FOUND", message: "Offer not found" },
      });
      return;
    }

    const deal = deals.get(targetOffer.deal_id);
    if (!deal || (deal.user_id !== user.id && user.role !== "admin")) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only the deal owner can reject offers" },
      });
      return;
    }

    targetOffer.status = "rejected";
    targetOffer.updated_at = new Date().toISOString();

    res.json({
      success: true,
      data: enrichOffer(targetOffer),
    });
  });

  // PATCH /api/offers/:id/withdraw
  app.patch("/api/offers/:id/withdraw", (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    const targetOffer = offers.get(req.params.id);
    if (!targetOffer) {
      res.status(404).json({
        success: false,
        error: { code: "OFFER_NOT_FOUND", message: "Offer not found" },
      });
      return;
    }

    if (targetOffer.provider_id !== user.id && user.role !== "admin") {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only the provider can withdraw this offer" },
      });
      return;
    }

    targetOffer.status = "withdrawn";
    targetOffer.updated_at = new Date().toISOString();

    res.json({
      success: true,
      data: enrichOffer(targetOffer),
    });
  });

  // Vite middleware for frontend development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DealPool backend and frontend running on port ${PORT}`);
  });
}

startServer();
