import pool from "../config/db";
import type { PoolClient } from "pg";
import { notFound } from "../utils/errors";

export const applyStrike = async (
    userId: string,
    client?: PoolClient
): Promise<{ reliability_strikes: number; trust_score: string }> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        UPDATE profiles
        SET reliability_strikes = reliability_strikes + 1,
            trust_score = GREATEST(0.00, ROUND((5.00 - ((reliability_strikes + 1) * 0.50))::numeric, 2)),
            updated_at = now()
        WHERE id = $1
        RETURNING reliability_strikes, trust_score
        `,
        [userId]
    );

    if (result.rowCount === 0) {
        throw notFound("Profile not found for strike", "PROFILE_NOT_FOUND");
    }

    return result.rows[0];
};
