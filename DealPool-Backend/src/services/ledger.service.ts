import type { PoolClient } from "pg";
import {
    findWalletByUserId,
    updateWalletBalance,
    insertLedgerEntry,
    sumEscrowForContract,
    createWallet,
    LedgerEntryType,
    LedgerEntry,
} from "../models/wallet.model";
import { badRequest, conflict } from "../utils/errors";

export const lockEscrow = async (
    contractId: string,
    requesterId: string,
    rentalFee: number,
    securityDeposit: number,
    client: PoolClient
): Promise<void> => {
    const totalNeeded = rentalFee + securityDeposit;

    let wallet = await findWalletByUserId(requesterId, true, client);
    if (!wallet) {
        wallet = await createWallet(requesterId, client);
    }

    const availableBalance = Number(wallet.balance);
    if (availableBalance < totalNeeded) {
        throw badRequest(
            `Insufficient wallet balance. Required: ₹${totalNeeded.toFixed(2)}, available: ₹${availableBalance.toFixed(2)}`,
            "INSUFFICIENT_BALANCE"
        );
    }

    // Deduct from balance, add to locked_balance
    await updateWalletBalance(requesterId, -totalNeeded, totalNeeded, client);

    if (rentalFee > 0) {
        await insertLedgerEntry(
            {
                contractId,
                userId: requesterId,
                amount: rentalFee,
                entryType: "escrow_lock_fee",
                description: `Locked rental fee for contract ${contractId}`,
            },
            client
        );
    }

    if (securityDeposit > 0) {
        await insertLedgerEntry(
            {
                contractId,
                userId: requesterId,
                amount: securityDeposit,
                entryType: "escrow_lock_security",
                description: `Locked security deposit for contract ${contractId}`,
            },
            client
        );
    }
};

export const releaseEscrow = async (
    contractId: string,
    requesterId: string,
    recipientId: string,
    amount: number,
    entryType: LedgerEntryType,
    client: PoolClient,
    description?: string
): Promise<LedgerEntry | null> => {
    if (amount <= 0) return null;

    // Assert against sumEscrowForContract before writing
    const { currentEscrow } = await sumEscrowForContract(contractId, client);
    if (amount > currentEscrow) {
        throw conflict(
            `Cannot release ₹${amount.toFixed(2)}: escrow holds only ₹${currentEscrow.toFixed(2)}`,
            "ESCROW_SHORTFALL"
        );
    }

    // Deduct locked amount from requester
    await updateWalletBalance(requesterId, 0, -amount, client);

    // Credit recipient
    let recipientWallet = await findWalletByUserId(recipientId, true, client);
    if (!recipientWallet) {
        recipientWallet = await createWallet(recipientId, client);
    }
    await updateWalletBalance(recipientId, amount, 0, client);

    // Write ledger entry
    return insertLedgerEntry(
        {
            contractId,
            userId: recipientId,
            amount,
            entryType,
            description: description ?? `Escrow release (${entryType}) for contract ${contractId}`,
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

    await insertLedgerEntry(
        {
            contractId,
            userId: requesterId,
            amount: currentEscrow,
            entryType: "escrow_release_security",
            description: `Refunded unspent escrow for contract ${contractId}`,
        },
        client
    );
};
