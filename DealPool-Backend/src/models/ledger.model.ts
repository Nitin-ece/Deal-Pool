import pool from "../config/db";
import type { PoolClient } from "pg";

export type LedgerEntryType =
    | "deposit"
    | "withdrawal"
    | "fee_capture"
    | "escrow_lock"
    | "escrow_lock_fee"
    | "escrow_lock_security"
    | "escrow_release_fee"
    | "escrow_payout_fee"
    | "escrow_release_security"
    | "escrow_penalty"
    | "damage_debt";

export interface LedgerEntry {
    id: string;
    contract_id: string | null;
    user_id: string | null;
    from_wallet_id: string | null;
    to_wallet_id: string | null;
    amount: number | string;
    entry_type: LedgerEntryType;
    description: string | null;
    created_at: Date;
}

export const insertLedgerEntry = async (
    params: {
        contractId?: string | null;
        userId?: string | null;
        fromWalletId?: string | null;
        toWalletId?: string | null;
        amount: number;
        entryType: LedgerEntryType;
        description?: string | null;
    },
    client?: PoolClient
): Promise<LedgerEntry> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        INSERT INTO ledger_entries (
            contract_id, user_id, from_wallet_id, to_wallet_id,
            amount, entry_type, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
            params.contractId ?? null,
            params.userId ?? null,
            params.fromWalletId ?? null,
            params.toWalletId ?? null,
            params.amount,
            params.entryType,
            params.description ?? null,
        ]
    );
    return result.rows[0];
};

export const findLedgerEntriesForUser = async (
    userId: string,
    limit = 50,
    offset = 0,
    client?: PoolClient
): Promise<LedgerEntry[]> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        SELECT le.*
        FROM ledger_entries le
        LEFT JOIN wallets w ON w.user_id = $1
        WHERE le.user_id = $1
           OR le.from_wallet_id = w.id
           OR le.to_wallet_id = w.id
        ORDER BY le.created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [userId, limit, offset]
    );
    return result.rows;
};

export const sumEscrowForContract = async (
    contractId: string,
    client?: PoolClient
): Promise<{ lockedTotal: number; releasedTotal: number; currentEscrow: number }> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        SELECT
            COALESCE(SUM(CASE WHEN entry_type IN ('escrow_lock', 'escrow_lock_fee', 'escrow_lock_security') THEN amount ELSE 0 END), 0) AS locked_total,
            COALESCE(SUM(CASE WHEN entry_type IN ('escrow_release_fee', 'escrow_payout_fee', 'escrow_release_security', 'escrow_penalty') THEN amount ELSE 0 END), 0) AS released_total
        FROM ledger_entries
        WHERE contract_id = $1
        `,
        [contractId]
    );

    const lockedTotal = Number(result.rows[0]?.locked_total || 0);
    const releasedTotal = Number(result.rows[0]?.released_total || 0);
    const currentEscrow = Math.max(0, lockedTotal - releasedTotal);

    return { lockedTotal, releasedTotal, currentEscrow };
};
