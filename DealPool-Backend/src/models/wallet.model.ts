import pool from "../config/db";
import type { PoolClient } from "pg";
export * from "./ledger.model";

export interface Wallet {
    id: string;
    user_id: string;
    balance: number | string;
    locked_balance: number | string;
    created_at: Date;
    updated_at: Date;
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

export const findWalletByUserIdForUpdate = async (
    userId: string,
    client: PoolClient
): Promise<Wallet | null> => {
    return findWalletByUserId(userId, true, client);
};

export const insertWallet = async (
    userId: string,
    initialBalance = 0,
    client?: PoolClient
): Promise<Wallet> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        INSERT INTO wallets (user_id, balance, locked_balance)
        VALUES ($1, $2, 0.00)
        ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
        RETURNING *
        `,
        [userId, initialBalance]
    );
    return result.rows[0];
};

export const createWallet = insertWallet;

export const updateWalletBalance = async (
    userId: string,
    balanceDelta: number,
    lockedDelta = 0,
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
