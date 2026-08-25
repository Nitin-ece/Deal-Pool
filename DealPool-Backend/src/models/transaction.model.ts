import pool from "../config/db";
import type { PoolClient } from "pg";

export interface Transaction {
    id: string;
    deal_id: string;
    offer_id: string;
    from_user_id: string;
    to_user_id: string;
    resource_id: string | null;
    parent_transaction_id: string | null;
    declared_value: number | string;
    lend_fee: number | string;
    security_amount: number | string;
    platform_fee: number | string;
    security_deposit_rate: number | string;
    requester_confirmed: boolean;
    provider_confirmed: boolean;
    confirm_deadline: Date | null;
    contact_revealed: boolean;
    condition_disputed: boolean;
    dispute_deadline: Date | null;
    cancel_reason: string | null;
    proximity_flagged: boolean;
    status:
        | "agreement_created"
        | "pending_confirmation"
        | "confirmed"
        | "active"
        | "returned"
        | "returned_pending_dispute"
        | "completed"
        | "disputed"
        | "cancelled";
    checked_out_at: Date | null;
    returned_at: Date | null;
    completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export const insertTransaction = async (
    params: {
        dealId: string;
        offerId: string;
        fromUserId: string;
        toUserId: string;
        resourceId: string | null;
        parentTransactionId?: string | null;
        declaredValue?: number;
        lendFee?: number;
        securityAmount?: number;
        platformFee?: number;
        securityDepositRate?: number;
        status?: string;
    },
    client?: PoolClient
): Promise<Transaction> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        INSERT INTO transactions (
            deal_id, offer_id, from_user_id, to_user_id,
            resource_id, parent_transaction_id, declared_value,
            lend_fee, security_amount, platform_fee, security_deposit_rate, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
        `,
        [
            params.dealId,
            params.offerId,
            params.fromUserId,
            params.toUserId,
            params.resourceId,
            params.parentTransactionId ?? null,
            params.declaredValue ?? 0,
            params.lendFee ?? 0,
            params.securityAmount ?? 0,
            params.platformFee ?? 0,
            params.securityDepositRate ?? 0.15,
            params.status ?? "agreement_created",
        ]
    );
    return result.rows[0];
};

export const findTransactionById = async (
    id: string,
    client?: PoolClient
): Promise<Transaction | null> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `SELECT * FROM transactions WHERE id = $1`,
        [id]
    );
    return result.rows[0] ?? null;
};

export const findLatestTransactionForResource = async (
    resourceId: string | null | undefined,
    client?: PoolClient
): Promise<Transaction | null> => {
    if (!resourceId) return null;
    const executor = client ?? pool;
    const result = await executor.query(
        `
        SELECT * FROM transactions
        WHERE resource_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [resourceId]
    );
    return result.rows[0] ?? null;
};

// Walks the chain oldest -> newest via a recursive CTE on parent_transaction_id
export const findTransactionChainByResource = async (
    resourceId: string
): Promise<Transaction[]> => {
    const result = await pool.query(
        `
        WITH RECURSIVE chain AS (
            SELECT * FROM transactions
            WHERE resource_id = $1 AND parent_transaction_id IS NULL

            UNION ALL

            SELECT t.* FROM transactions t
            INNER JOIN chain c ON t.parent_transaction_id = c.id
        )
        SELECT * FROM chain ORDER BY created_at ASC
        `,
        [resourceId]
    );
    return result.rows;
};

export const updateTransactionStatus = async (
    id: string,
    status: string,
    client?: PoolClient
): Promise<Transaction | null> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        UPDATE transactions
        SET status = $2, updated_at = now()
        WHERE id = $1
        RETURNING *
        `,
        [id, status]
    );
    return result.rows[0] ?? null;
};