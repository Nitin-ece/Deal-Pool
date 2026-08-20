import pool from "../config/db";
import type { PoolClient } from "pg";
import { firebaseAuth } from "../config/firebase";
import { generateUsername } from "../utils/username";
import {
    findProfileByFirebaseUid,
    findProfileById,
    findProfileByEmail,
    insertProfile,
    updateProfileFields,
    Profile,
} from "../models/user.model";
import { grantSignupBonus } from "./ledger.service";
import { unauthorized, conflict, notFound, badRequest } from "../utils/errors";

interface FirebaseAuthResponse {
    localId: string;
    email: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
}

interface FirebaseRefreshResponse {
    id_token: string;
    refresh_token: string;
    expires_in: string;
    user_id: string;
    project_id: string;
    token_type: string;
}

/** Public profile shape returned by auth endpoints (numeric ratings). */
export type PublicProfile = Omit<Profile, "avg_rating" | "trust_score"> & {
    avg_rating: number;
    trust_score?: number;
    reliability_strikes?: number;
};

export const toPublicProfile = (profile: Profile): PublicProfile => ({
    ...profile,
    avg_rating: Number(profile.avg_rating ?? 0),
    rating_count: Number(profile.rating_count ?? 0),
    reliability_strikes:
        profile.reliability_strikes !== undefined
            ? Number(profile.reliability_strikes)
            : undefined,
    trust_score:
        profile.trust_score !== undefined ? Number(profile.trust_score) : undefined,
});

const firebaseApiKey = process.env.FIREBASE_API_KEY?.replace(/^"|"$/g, "");

if (!firebaseApiKey) {
    throw new Error("FIREBASE_API_KEY is not configured");
}

const firebaseAuthUrl = "https://identitytoolkit.googleapis.com/v1/accounts";
const firebaseSecureTokenUrl = "https://securetoken.googleapis.com/v1/token";

const isUniqueViolation = (error: unknown, constraint?: string): boolean => {
    const pgError = error as { code?: string; constraint?: string; message?: string; detail?: string };
    if (pgError.code !== "23505") return false;
    if (!constraint) return true;
    return (
        pgError.constraint === constraint ||
        Boolean(pgError.message?.includes(constraint)) ||
        Boolean(pgError.detail?.includes(constraint))
    );
};

const firebaseRequest = async <T>(
    endpoint: string,
    body: Record<string, unknown>
): Promise<T> => {
    const response = await fetch(
        `${firebaseAuthUrl}:${endpoint}?key=${firebaseApiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const message = data?.error?.message ?? "Firebase authentication failed";

        if (message === "EMAIL_EXISTS") {
            throw conflict("Email already exists", "EMAIL_EXISTS");
        }

        if (
            message === "EMAIL_NOT_FOUND" ||
            message === "INVALID_PASSWORD" ||
            message === "INVALID_LOGIN_CREDENTIALS"
        ) {
            throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
        }

        if (message === "TOO_MANY_ATTEMPTS_TRY_LATER") {
            throw badRequest("Too many attempts. Try again later.", "TOO_MANY_ATTEMPTS");
        }

        throw unauthorized("Firebase authentication failed", "FIREBASE_AUTH_FAILED");
    }

    return data as T;
};

export const registerUser = async (email: string, password: string) => {
    if (!email || !password) {
        throw unauthorized("Email and password are required", "INVALID_CREDENTIALS");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await findProfileByEmail(normalizedEmail);

    if (existing) {
        throw conflict("Profile already exists", "PROFILE_EXISTS");
    }

    if (password.length < 6) {
        throw badRequest(
            "New password must be at least 6 characters",
            "WEAK_PASSWORD"
        );
    }

    const firebaseUser = await firebaseRequest<FirebaseAuthResponse>("signUp", {
        email: normalizedEmail,
        password,
        returnSecureToken: true,
    });

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const profile = await createProfile(firebaseUser.localId, client, normalizedEmail);
        await grantSignupBonus(profile.id, client);
        await client.query("COMMIT");

        return {
            profile: toPublicProfile(profile),
            token: firebaseUser.idToken,
            refreshToken: firebaseUser.refreshToken,
        };
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        try {
            await firebaseAuth.deleteUser(firebaseUser.localId);
        } catch (cleanupError) {
            console.error("FIREBASE USER CLEANUP ERROR:", cleanupError);
        }

        throw error;
    } finally {
        client.release();
    }
};

export const loginUser = async (email: string, password: string) => {
    if (!email || !password) {
        throw unauthorized("Email and password are required", "INVALID_CREDENTIALS");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const firebaseUser = await firebaseRequest<FirebaseAuthResponse>(
        "signInWithPassword",
        { email: normalizedEmail, password, returnSecureToken: true }
    );

    // Heal orphaned Firebase users that never got a Postgres profile row
    const profile = await ensureProfileForFirebaseUser(
        firebaseUser.localId,
        firebaseUser.email || normalizedEmail
    );

    return {
        profile: toPublicProfile(profile),
        token: firebaseUser.idToken,
        refreshToken: firebaseUser.refreshToken,
    };
};

export const refreshFirebaseToken = async (refreshToken: string | undefined) => {
    if (!refreshToken) {
        throw unauthorized("Refresh token is required", "INVALID_REFRESH_TOKEN");
    }

    const response = await fetch(`${firebaseSecureTokenUrl}?key=${firebaseApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw unauthorized("Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
    }

    const refreshed = data as FirebaseRefreshResponse;

    return {
        token: refreshed.id_token,
        refreshToken: refreshed.refresh_token,
        expiresIn: refreshed.expires_in,
        uid: refreshed.user_id,
    };
};

export const createProfile = async (
    uid: string,
    client?: PoolClient,
    emailHint?: string | null
): Promise<Profile> => {
    const firebaseUser = await firebaseAuth.getUser(uid);

    const existing = await findProfileByFirebaseUid(uid);
    if (existing) {
        throw conflict("Profile already exists", "PROFILE_EXISTS");
    }

    const email =
        firebaseUser.email?.trim().toLowerCase() ||
        emailHint?.trim().toLowerCase() ||
        null;

    if (!email) {
        throw badRequest(
            "Google account must expose an email address",
            "EMAIL_REQUIRED"
        );
    }

    const emailOwner = await findProfileByEmail(email);
    if (emailOwner && emailOwner.firebase_uid !== uid) {
        if (firebaseUser.emailVerified) {
            const updated = await updateProfileFields(emailOwner.id, { firebase_uid: uid });
            if (updated) return updated;
        }
        throw conflict(
            "An account with this email already exists. Sign in with email and password.",
            "EMAIL_EXISTS"
        );
    }

    const maxAttempts = 5;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const username = generateUsername();

        try {
            return await insertProfile(
                {
                    firebaseUid: uid,
                    username,
                    email,
                    profilePhoto: firebaseUser.photoURL ?? null,
                },
                client
            );
        } catch (error) {
            if (isUniqueViolation(error, "profiles_name_key")) {
                lastError = error;
                continue;
            }
            if (isUniqueViolation(error, "profiles_email_key")) {
                throw conflict(
                    "An account with this email already exists. Sign in with email and password.",
                    "EMAIL_EXISTS"
                );
            }
            throw error;
        }
    }

    throw lastError;
};

/**
 * Resolve a Firebase UID to a Postgres profile, creating one (with signup bonus)
 * when the Auth user exists but the profile row does not.
 */
export const ensureProfileForFirebaseUser = async (
    firebaseUid: string,
    emailHint?: string | null
): Promise<Profile> => {
    const existing = await findProfileByFirebaseUid(firebaseUid);
    if (existing) return existing;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Re-check inside the transaction window
        const again = await findProfileByFirebaseUid(firebaseUid);
        if (again) {
            await client.query("COMMIT");
            return again;
        }

        const profile = await createProfile(firebaseUid, client, emailHint);
        await grantSignupBonus(profile.id, client);
        await client.query("COMMIT");
        return profile;
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});

        // Concurrent create won the race — return the winner
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            (error as { code?: string }).code === "PROFILE_EXISTS"
        ) {
            const raced = await findProfileByFirebaseUid(firebaseUid);
            if (raced) return raced;
        }

        throw error;
    } finally {
        client.release();
    }
};

/**
 * Used by GET /api/auth/me and PATCH /api/auth/change-password.
 * Called with req.user!.uid, which is the POSTGRES profile id (per authMiddleware),
 * NOT the Firebase UID — so this must look up by Postgres id.
 */
export const getProfile = async (postgresUid: string): Promise<PublicProfile> => {
    const profile = await findProfileById(postgresUid);

    if (!profile) {
        throw unauthorized("User profile not found", "PROFILE_NOT_FOUND");
    }

    return toPublicProfile(profile);
};

/**
 * Used only by authMiddleware, which passes the FIREBASE UID from the decoded token.
 * Keep this looking up by firebase_uid.
 */
export const findProfile = async (firebaseUid: string): Promise<Profile | null> => {
    return findProfileByFirebaseUid(firebaseUid);
};

export const verifyFirebaseToken = async (token: string) => {
    try {
        return await firebaseAuth.verifyIdToken(token);
    } catch (error) {
        console.error("FIREBASE VERIFY ERROR:", error);
        throw unauthorized("Invalid or expired authentication token", "INVALID_TOKEN");
    }
};

export const googleLoginUser = async (
    idToken: string,
    refreshToken?: string
) => {
    if (!idToken) {
        throw unauthorized("Firebase ID token is required", "INVALID_TOKEN");
    }

    const decoded = await verifyFirebaseToken(idToken);
    const email =
        typeof decoded.email === "string" ? decoded.email : undefined;

    const profile = await ensureProfileForFirebaseUser(decoded.uid, email);

    return {
        profile: toPublicProfile(profile),
        token: idToken,
        refreshToken: refreshToken || undefined,
    };
};

interface UpdateProfileInput {
    username?: string;
    email?: string;
    profile_photo?: string;
}

const UPDATABLE_FIELDS: (keyof UpdateProfileInput)[] = [
    "username",
    "email",
    "profile_photo",
];

/**
 * Called with req.user!.uid (POSTGRES id) from PATCH /api/auth/update.
 * updateProfileFields must match on the Postgres profiles.id column.
 * Role escalation is prevented by only allowing UPDATABLE_FIELDS.
 */
export const updateProfile = async (
    postgresUid: string,
    updates: UpdateProfileInput
): Promise<PublicProfile> => {
    const fields: Record<string, unknown> = {};

    for (const key of UPDATABLE_FIELDS) {
        if (updates[key] !== undefined) {
            fields[key] = updates[key];
        }
    }

    if (Object.keys(fields).length === 0) {
        throw badRequest("No valid fields provided to update", "NO_UPDATE_FIELDS");
    }

    try {
        const profile = await updateProfileFields(postgresUid, fields);

        if (!profile) {
            throw notFound("User profile not found", "PROFILE_NOT_FOUND");
        }

        return toPublicProfile(profile);
    } catch (error) {
        if (isUniqueViolation(error, "profiles_name_key")) {
            throw conflict("Username already taken", "USERNAME_TAKEN");
        }
        if (isUniqueViolation(error, "profiles_email_key")) {
            throw conflict("Email already in use", "EMAIL_TAKEN");
        }

        throw error;
    }
};

/**
 * Called with req.user!.uid (POSTGRES id) from PATCH /api/auth/change-password.
 * Must look up the profile by Postgres id to find the associated firebase_uid,
 * then use THAT firebase_uid for the Firebase Admin SDK call — not the postgresUid param.
 */
export const changeUserPassword = async (
    postgresUid: string,
    currentPassword: string,
    newPassword: string
): Promise<void> => {
    if (!currentPassword || !newPassword) {
        throw badRequest(
            "Current password and new password are required",
            "INVALID_CREDENTIALS"
        );
    }

    if (newPassword.length < 6) {
        throw badRequest(
            "New password must be at least 6 characters",
            "WEAK_PASSWORD"
        );
    }

    const profile = await findProfileById(postgresUid);

    if (!profile) {
        throw unauthorized("User profile not found", "UNAUTHORIZED");
    }

    if (!profile.email) {
        throw badRequest(
            "This account has no email/password credentials",
            "PASSWORD_NOT_AVAILABLE"
        );
    }

    const verifyResponse = await fetch(
        `${firebaseAuthUrl}:signInWithPassword?key=${firebaseApiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: profile.email,
                password: currentPassword,
                returnSecureToken: false,
            }),
        }
    );

    if (!verifyResponse.ok) {
        throw unauthorized(
            "Current password is incorrect",
            "INVALID_CREDENTIALS"
        );
    }

    await firebaseAuth.updateUser(profile.firebase_uid, { password: newPassword });
};
