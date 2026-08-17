import pool from "../config/db";
import type { PoolClient } from "pg";

export interface Wallet {
    id: string;
    user_id: string;
    balance: number | string;
    locked_balance: number | string;
    created_at: Date;
    updated_at: Date;
}

export type LedgerEntryType =
    | "deposit"
    | "withdrawal"
    | "escrow_lock_fee"
    | "escrow_lock_security"
    | "escrow_payout_fee"
    | "escrow_release_security"
    | "escrow_penalty";

export interface LedgerEntry {
    id: string;
    contract_id: string | null;
    user_id: string;
    amount: number | string;
    entry_type: LedgerEntryType;
    description: string | null;
    created_at: Date;
}

export interface Debt {
    id: string;
    user_id: string;
    contract_id: string | null;
    amount: number | string;
    status: "outstanding" | "settled";
    created_at: Date;
    updated_at: Date;
}

export const findWalletByUserId = async (
    userId: string,
    forUpdate = false,
    client?: PoolClient
): Promise<Wallet | null> => {
    const executor = client ?? pool;
    const query = forUpdate
        ? `SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE`
        : `SELECT * FROM wallets WHERE user_id = $1`;
    const result = await executor.query(query, [userId]);
    return result.rows[0] ?? null;
};

export const createWallet = async (
    userId: string,
    client?: PoolClient
): Promise<Wallet> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        INSERT INTO wallets (user_id, balance, locked_balance)
        VALUES ($1, 0.00, 0.00)
        ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
        RETURNING *
        `,
        [userId]
    );
    return result.rows[0];
};

export const updateWalletBalance = async (
    userId: string,
    balanceDelta: number,
    lockedDelta: number,
    client?: PoolClient
): Promise<Wallet | null> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        UPDATE wallets
        SET balance = balance + $2,
            locked_balance = locked_balance + $3,
            updated_at = now()
        WHERE user_id = $1
        RETURNING *
        `,
        [userId, balanceDelta, lockedDelta]
    );
    return result.rows[0] ?? null;
};

export const insertLedgerEntry = async (
    params: {
        contractId?: string | null;
        userId: string;
        amount: number;
        entryType: LedgerEntryType;
        description?: string | null;
    },
    client?: PoolClient
): Promise<LedgerEntry> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        INSERT INTO ledger_entries (contract_id, user_id, amount, entry_type, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [params.contractId ?? null, params.userId, params.amount, params.entryType, params.description ?? null]
    );
    return result.rows[0];
};

export const listLedgerEntries = async (
    userId: string,
    client?: PoolClient
): Promise<LedgerEntry[]> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `SELECT * FROM ledger_entries WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
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
            COALESCE(SUM(CASE WHEN entry_type IN ('escrow_lock_fee', 'escrow_lock_security') THEN amount ELSE 0 END), 0) AS locked_total,
            COALESCE(SUM(CASE WHEN entry_type IN ('escrow_payout_fee', 'escrow_release_security', 'escrow_penalty') THEN amount ELSE 0 END), 0) AS released_total
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

export const insertDebt = async (
    userId: string,
    contractId: string | null,
    amount: number,
    client?: PoolClient
): Promise<Debt> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        INSERT INTO debts (user_id, contract_id, amount, status)
        VALUES ($1, $2, $3, 'outstanding')
        RETURNING *
        `,
        [userId, contractId, amount]
    );
    return result.rows[0];
};

export const hasOutstandingDebt = async (
    userId: string,
    client?: PoolClient
): Promise<boolean> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `SELECT 1 FROM debts WHERE user_id = $1 AND status = 'outstanding' LIMIT 1`,
        [userId]
    );
    return (result.rowCount ?? 0) > 0;
};

export const listDebtsByUser = async (
    userId: string,
    client?: PoolClient
): Promise<Debt[]> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `SELECT * FROM debts WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
    );
    return result.rows;
};
