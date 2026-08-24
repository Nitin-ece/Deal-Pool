import crypto from "crypto";
import pool from "../config/db";
import type { PoolClient } from "pg";
import { badRequest } from "./errors";

export type HandoffPurpose = "checkout" | "return";

/** OTP validity window: 15 minutes. */
const OTP_TTL_MS = 15 * 60 * 1000;

/**
 * Characters used for OTP generation.
 * Excludes ambiguous characters: I, 1, O, 0, L to avoid confusion.
 */
const OTP_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Ensure the contract_otps table exists.
 * Called once at startup — safe to run multiple times.
 */
export const ensureOTPTable = async (): Promise<void> => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS contract_otps (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            contract_id UUID NOT NULL,
            purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('checkout', 'return')),
            code VARCHAR(10) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);
    // Create index if not exists (idempotent via IF NOT EXISTS)
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_contract_otps_lookup
        ON contract_otps(contract_id, purpose, code);
    `);
};

/**
 * Generate a random 6-character OTP in the format XXX-XXX.
 * Example: "A3B-K2M"
 */
const createOTPCode = (): string => {
    const bytes = crypto.randomBytes(6);
    const chars: string[] = [];
    for (let i = 0; i < 6; i++) {
        chars.push(OTP_CHARS[bytes[i] % OTP_CHARS.length]);
    }
    return `${chars[0]}${chars[1]}${chars[2]}-${chars[3]}${chars[4]}${chars[5]}`;
};

/**
 * Generate an OTP for a contract handoff (checkout or return).
 * Invalidates any existing OTP for the same contract + purpose before creating a new one.
 */
export const generateOTP = async (
    contractId: string,
    purpose: HandoffPurpose,
    client?: PoolClient
): Promise<{ code: string; expiresAt: Date; purpose: HandoffPurpose }> => {
    const executor = client ?? pool;
    const code = createOTPCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Remove any previous OTP for the same contract + purpose
    await executor.query(
        `DELETE FROM contract_otps WHERE contract_id = $1 AND purpose = $2`,
        [contractId, purpose]
    );

    // Insert the new OTP
    await executor.query(
        `INSERT INTO contract_otps (contract_id, purpose, code, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [contractId, purpose, code, expiresAt]
    );

    return { code, expiresAt, purpose };
};

/**
 * Verify an OTP code for a contract handoff.
 * Deletes the OTP on success (single-use).
 * Throws on mismatch, expiry, or missing code.
 */
export const verifyOTP = async (
    code: string | undefined,
    contractId: string,
    purpose: HandoffPurpose,
    client?: PoolClient
): Promise<void> => {
    if (!code || !code.trim()) {
        throw badRequest("Handoff code is required", "MISSING_HANDOFF_CODE");
    }

    const normalizedCode = code.trim().toUpperCase();
    const executor = client ?? pool;

    const result = await executor.query(
        `SELECT id, expires_at FROM contract_otps
         WHERE contract_id = $1 AND purpose = $2 AND code = $3
         LIMIT 1`,
        [contractId, purpose, normalizedCode]
    );

    if (result.rows.length === 0) {
        throw badRequest("Invalid handoff code", "INVALID_HANDOFF_CODE");
    }

    const row = result.rows[0];
    const expiresAt = new Date(row.expires_at);

    if (Date.now() > expiresAt.getTime()) {
        // Clean up expired OTP
        await executor.query(`DELETE FROM contract_otps WHERE id = $1`, [row.id]);
        throw badRequest("Handoff code has expired — generate a new one", "EXPIRED_HANDOFF_CODE");
    }

    // Single-use: delete after successful verification
    await executor.query(`DELETE FROM contract_otps WHERE id = $1`, [row.id]);
};
