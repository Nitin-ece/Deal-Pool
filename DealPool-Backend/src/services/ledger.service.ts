import type { PoolClient } from "pg";
import {
    findWalletByUserId,
    updateWalletBalance,
    insertLedgerEntry,
    sumEscrowForContract,
    insertWallet,
    LedgerEntryType,
    LedgerEntry,
} from "../models/wallet.model";
import { badRequest, conflict } from "../utils/errors";

const SIGNUP_BONUS_AMOUNT = 1000;

export const grantSignupBonus = async (
    userId: string,
    client: PoolClient,
    amount = SIGNUP_BONUS_AMOUNT
): Promise<LedgerEntry> => {
    let wallet = await findWalletByUserId(userId, true, client);
    if (!wallet) {
        wallet = await insertWallet(userId, amount, client);
    } else {
        await updateWalletBalance(userId, amount, 0, client);
    }

    return insertLedgerEntry(
        {
            userId,
            toWalletId: wallet.id,
            amount,
            entryType: "deposit",
            description: `Signup bonus grant of ₹${amount}`,
        },
        client
    );
};

export const captureFee = async (
    fromUserId: string,
    amount: number,
    client: PoolClient
): Promise<LedgerEntry | null> => {
    if (amount <= 0) return null;

    let wallet = await findWalletByUserId(fromUserId, true, client);
    if (!wallet) {
        wallet = await insertWallet(fromUserId, 0, client);
    }

    const available = Number(wallet.balance);
    if (available < amount) {
        throw badRequest(
            `Insufficient balance to capture fee ₹${amount.toFixed(2)} (available ₹${available.toFixed(2)})`,
            "INSUFFICIENT_BALANCE"
        );
    }

    await updateWalletBalance(fromUserId, -amount, 0, client);

    return insertLedgerEntry(
        {
            userId: fromUserId,
            fromWalletId: wallet.id,
            toWalletId: null,
            amount,
            entryType: "fee_capture",
            description: `Platform fee capture of ₹${amount.toFixed(2)}`,
        },
        client
    );
};

export const lockEscrow = async (
    fromUserId: string,
    amount: number,
    contractId: string,
    client: PoolClient
): Promise<LedgerEntry> => {
    let wallet = await findWalletByUserId(fromUserId, true, client);
    if (!wallet) {
        wallet = await insertWallet(fromUserId, 0, client);
    }

    const available = Number(wallet.balance);
    if (available < amount) {
        throw badRequest(
            `Insufficient wallet balance. Required: ₹${amount.toFixed(2)}, available: ₹${available.toFixed(2)}`,
            "INSUFFICIENT_BALANCE"
        );
    }

    // Deduct from balance, add to locked_balance
    await updateWalletBalance(fromUserId, -amount, amount, client);

    return insertLedgerEntry(
        {
            contractId,
            userId: fromUserId,
            fromWalletId: wallet.id,
            toWalletId: null,
            amount,
            entryType: "escrow_lock",
            description: `Locked escrow of ₹${amount.toFixed(2)} for contract ${contractId}`,
        },
        client
    );
};

export const releaseEscrow = async (
    contractId: string,
    fromUserId: string | null,
    toUserId: string,
    amount: number,
    entryType: LedgerEntryType,
    client: PoolClient,
    description?: string
): Promise<LedgerEntry | null> => {
    if (amount <= 0) return null;

    // CRITICAL ASSERTION GUARD: sumEscrowForContract before writing
    const { currentEscrow } = await sumEscrowForContract(contractId, client);
    if (amount > currentEscrow) {
        throw conflict(
            `Escrow shortfall: cannot release ₹${amount.toFixed(2)}, escrow holds ₹${currentEscrow.toFixed(2)}`,
            "ESCROW_INTEGRITY_ERROR"
        );
    }

    // If there is a fromUserId, reduce locked balance
    if (fromUserId) {
        await updateWalletBalance(fromUserId, 0, -amount, client);
    }

    // Credit recipient wallet
    let recipientWallet = await findWalletByUserId(toUserId, true, client);
    if (!recipientWallet) {
        recipientWallet = await insertWallet(toUserId, 0, client);
    }
    await updateWalletBalance(toUserId, amount, 0, client);

    let fromWalletId: string | null = null;
    if (fromUserId) {
        const fromWallet = await findWalletByUserId(fromUserId, false, client);
        fromWalletId = fromWallet?.id ?? null;
    }

    return insertLedgerEntry(
        {
            contractId,
            userId: toUserId,
            fromWalletId,
            toWalletId: recipientWallet.id,
            amount,
            entryType,
            description: description ?? `Escrow release (${entryType}) for contract ${contractId}`,
        },
        client
    );
};

/** Captures a fee from escrow without crediting any user wallet (platform capture). */
export const captureEscrowFee = async (
    contractId: string,
    fromUserId: string,
    amount: number,
    client: PoolClient,
    description?: string
): Promise<LedgerEntry | null> => {
    if (amount <= 0) return null;

    const { currentEscrow } = await sumEscrowForContract(contractId, client);
    if (amount > currentEscrow) {
        throw conflict(
            `Escrow shortfall: cannot capture ₹${amount.toFixed(2)}, escrow holds ₹${currentEscrow.toFixed(2)}`,
            "ESCROW_INTEGRITY_ERROR"
        );
    }

    await updateWalletBalance(fromUserId, 0, -amount, client);

    const fromWallet = await findWalletByUserId(fromUserId, false, client);

    return insertLedgerEntry(
        {
            contractId,
            userId: fromUserId,
            fromWalletId: fromWallet?.id ?? null,
            toWalletId: null,
            amount,
            entryType: "fee_capture",
            description:
                description ??
                `Platform cancellation fee capture from escrow for contract ${contractId}`,
        },
        client
    );
};

export const refundAllEscrow = async (
    contractId: string,
    requesterId: string,
    client: PoolClient
): Promise<void> => {
    const { currentEscrow } = await sumEscrowForContract(contractId, client);
    if (currentEscrow <= 0) return;

    // Return locked funds back to requester's available balance
    await updateWalletBalance(requesterId, currentEscrow, -currentEscrow, client);

    const requesterWallet = await findWalletByUserId(requesterId, false, client);

    await insertLedgerEntry(
        {
            contractId,
            userId: requesterId,
            fromWalletId: null,
            toWalletId: requesterWallet?.id ?? null,
            amount: currentEscrow,
            entryType: "escrow_release_security",
            description: `Refunded unspent escrow for contract ${contractId}`,
        },
        client
    );
};
