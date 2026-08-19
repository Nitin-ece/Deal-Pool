import pool from "../config/db";
import type { PoolClient } from "pg";
import {
    findWalletByUserId,
    insertWallet,
    updateWalletBalance,
    insertLedgerEntry,
    findLedgerEntriesForUser,
    insertDebt,
    hasOutstandingDebt,
    listDebtsByUser,
    Wallet,
    LedgerEntry,
    Debt,
} from "../models/wallet.model";
import { badRequest } from "../utils/errors";

export const getOrCreateWallet = async (
    userId: string,
    client?: PoolClient
): Promise<Wallet> => {
    let wallet = await findWalletByUserId(userId, false, client);
    if (!wallet) {
        wallet = await insertWallet(userId, 0, client);
    }
    return wallet;
};

export const getWallet = async (
    userId: string,
    client?: PoolClient
): Promise<Wallet> => {
    return getOrCreateWallet(userId, client);
};

export const depositFunds = async (
    userId: string,
    amount: number
): Promise<Wallet> => {
    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
        throw badRequest("Deposit amount must be a positive number", "INVALID_AMOUNT");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const wallet = await getOrCreateWallet(userId, client);

        const updated = await updateWalletBalance(userId, amount, 0, client);
        await insertLedgerEntry(
            {
                userId,
                toWalletId: wallet.id,
                amount,
                entryType: "deposit",
                description: `Deposit of ₹${amount.toFixed(2)}`,
            },
            client
        );

        await client.query("COMMIT");
        return updated!;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const getLedger = async (
    userId: string,
    query?: { limit?: number; offset?: number }
): Promise<LedgerEntry[]> => {
    await getOrCreateWallet(userId);
    const limit = query?.limit ? Number(query.limit) : 50;
    const offset = query?.offset ? Number(query.offset) : 0;
    return findLedgerEntriesForUser(userId, limit, offset);
};

export const getWalletLedger = async (userId: string): Promise<LedgerEntry[]> => {
    return getLedger(userId);
};

export const getUserDebts = async (userId: string): Promise<Debt[]> => {
    return listDebtsByUser(userId);
};

export const checkUserHasDebt = async (
    userId: string,
    client?: PoolClient
): Promise<boolean> => {
    return hasOutstandingDebt(userId, client);
};

export { hasOutstandingDebt };

export const recordDebt = async (
    userId: string,
    amount: number,
    contractId: string | null,
    client?: PoolClient
): Promise<Debt> => {
    return insertDebt(userId, contractId, amount, client);
};
