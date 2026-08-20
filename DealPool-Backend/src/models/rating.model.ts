import pool from "../config/db";
import type { PoolClient } from "pg";

export interface Rating {
    id: string;
    contract_id: string;
    rater_id: string;
    rated_id: string;
    score: number;
    review: string | null;
    created_at: Date;
}

export const insertRating = async (
    params: {
        contractId: string;
        raterId: string;
        ratedId: string;
        score: number;
        review?: string | null;
    },
    client?: PoolClient
): Promise<Rating> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        INSERT INTO ratings (contract_id, rater_id, rated_id, score, review)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
            params.contractId,
            params.raterId,
            params.ratedId,
            params.score,
            params.review ?? null,
        ]
    );
    return result.rows[0];
};

export const findRatingByContractAndRater = async (
    contractId: string,
    raterId: string,
    client?: PoolClient
): Promise<Rating | null> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `SELECT * FROM ratings WHERE contract_id = $1 AND rater_id = $2`,
        [contractId, raterId]
    );
    return result.rows[0] ?? null;
};

export const updateProfileRatingAggregate = async (
    profileId: string,
    client?: PoolClient
): Promise<void> => {
    const executor = client ?? pool;
    await executor.query(
        `
        UPDATE profiles
        SET
            avg_rating = COALESCE((
                SELECT ROUND(AVG(score)::numeric, 2)
                FROM ratings
                WHERE rated_id = $1
            ), 0),
            rating_count = COALESCE((
                SELECT COUNT(*)::integer
                FROM ratings
                WHERE rated_id = $1
            ), 0),
            updated_at = now()
        WHERE id = $1
        `,
        [profileId]
    );
};
