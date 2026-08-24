import pool from "../config/db";
import type { PoolClient } from "pg";
import {
    insertContract,
    findContractById,
    listContractsForUser,
    updateContractStatus,
    Contract,
} from "../models/contract.model";
import { updateResourceHolder } from "../models/resource.model";
import { releaseEscrow, captureEscrowFee } from "./ledger.service";
import { insertReport, ReportReason } from "../models/report.model";
import {
    insertRating,
    findRatingByContractAndRater,
    updateProfileRatingAggregate,
    Rating,
} from "../models/rating.model";
import {
    generateOTP,
    verifyOTP,
    HandoffPurpose,
} from "../utils/otp";
import { badRequest, notFound, forbidden, conflict } from "../utils/errors";

/** 10% of escrowed funds retained as platform cancellation fee (90% refunded). */
const CANCELLATION_FEE_RATE = 0.10;

export const transitionCustody = async (
    resourceId: string,
    targetHolderId: string,
    client: PoolClient
): Promise<void> => {
    await updateResourceHolder(resourceId, targetHolderId, client);
};

/** Shared dispute-filing guards used by both POST /api/reports and dispute-condition. */
export const validateDisputeFiling = (
    contract: Contract,
    reporterId: string
): void => {
    if (contract.requester_id !== reporterId && contract.provider_id !== reporterId) {
        throw forbidden("Not a participant in this contract", "FORBIDDEN");
    }
    if (contract.status !== "returned" && contract.status !== "returned_pending_dispute") {
        throw conflict("Contract must be returned to file a dispute", "INVALID_CONTRACT_STATUS");
    }
    if (contract.condition_disputed) {
        throw conflict("Condition has already been disputed", "ALREADY_DISPUTED");
    }
    if (contract.dispute_deadline && new Date(contract.dispute_deadline).getTime() < Date.now()) {
        throw conflict("Dispute window has expired", "DISPUTE_WINDOW_EXPIRED");
    }
};

export const getContract = async (
    contractId: string,
    userId: string
): Promise<Contract> => {
    const contract = await findContractById(contractId);
    if (!contract) {
        throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
    }
    if (contract.requester_id !== userId && contract.provider_id !== userId) {
        throw forbidden("Not authorized to view this contract", "FORBIDDEN");
    }
    return contract;
};

export const listMyContracts = async (userId: string): Promise<Contract[]> => {
    return listContractsForUser(userId);
};

export const generateHandoffOTP = async (
    contractId: string,
    userId: string,
    purpose: HandoffPurpose
): Promise<{ code: string; expiresAt: Date; purpose: HandoffPurpose }> => {
    const contract = await findContractById(contractId);
    if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
    if (contract.requester_id !== userId && contract.provider_id !== userId) {
        throw forbidden("Not authorized", "FORBIDDEN");
    }

    if (purpose === "checkout") {
        if (contract.provider_id !== userId) {
            throw forbidden("Only the provider can generate a checkout code", "FORBIDDEN");
        }
        if (contract.status !== "confirmed") {
            throw conflict("Contract must be confirmed before checkout", "CONTRACT_NOT_CONFIRMED");
        }
    } else if (purpose === "return") {
        if (contract.requester_id !== userId) {
            throw forbidden("Only the requester can generate a return code", "FORBIDDEN");
        }
        if (contract.status !== "active") {
            throw conflict("Contract must be active before return", "CONTRACT_NOT_ACTIVE");
        }
    } else {
        throw badRequest("Invalid handoff purpose", "INVALID_HANDOFF_PURPOSE");
    }

    return generateOTP(contractId, purpose);
};

export const confirmContract = async (
    contractId: string,
    userId: string
): Promise<Contract> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const contract = await findContractById(contractId, client);
        if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
        if (contract.requester_id !== userId && contract.provider_id !== userId) {
            throw forbidden("Not authorized to confirm this contract", "FORBIDDEN");
        }
        if (contract.status === "cancelled" || contract.status === "completed") {
            throw conflict(`Cannot confirm contract in status '${contract.status}'`, "INVALID_CONTRACT_STATUS");
        }

        const isRequester = contract.requester_id === userId;
        const isProvider = contract.provider_id === userId;

        const requesterConfirmed = isRequester ? true : contract.requester_confirmed;
        const providerConfirmed = isProvider ? true : contract.provider_confirmed;
        const bothConfirmed = requesterConfirmed && providerConfirmed;

        const newStatus = bothConfirmed ? "confirmed" : "pending_confirmation";

        const updated = await updateContractStatus(
            contractId,
            newStatus,
            {
                requesterConfirmed,
                providerConfirmed,
                contactRevealed: bothConfirmed,
            },
            client
        );

        if (bothConfirmed) {
            await transitionCustody(contract.resource_id, contract.provider_id, client);
        }

        await client.query("COMMIT");
        return updated!;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const cancelContract = async (
    contractId: string,
    userId: string,
    reason?: string
): Promise<Contract> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const contract = await findContractById(contractId, client);
        if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
        if (contract.requester_id !== userId && contract.provider_id !== userId) {
            throw forbidden("Not authorized to cancel this contract", "FORBIDDEN");
        }
        if (contract.status === "completed" || contract.status === "cancelled") {
            throw conflict(`Cannot cancel contract in status '${contract.status}'`, "INVALID_CONTRACT_STATUS");
        }
        if (contract.status === "active" || contract.status === "returned") {
            throw conflict("Cannot cancel after checkout", "INVALID_CONTRACT_STATUS");
        }

        const rentalFee = Number(contract.rental_fee || contract.lend_fee || 0);
        const securityDeposit = Number(contract.security_deposit || contract.security_amount || 0);
        const totalEscrowed = rentalFee + securityDeposit;

        const cancellationFee = totalEscrowed * CANCELLATION_FEE_RATE;
        const refundAmount = Math.max(0, totalEscrowed - cancellationFee);

        if (refundAmount > 0) {
            await releaseEscrow(
                contractId,
                contract.requester_id,
                contract.requester_id,
                refundAmount,
                "escrow_release_security",
                client,
                `Cancellation refund (90%) for contract ${contractId}`
            );
        }

        if (cancellationFee > 0) {
            await captureEscrowFee(
                contractId,
                contract.requester_id,
                cancellationFee,
                client,
                `Cancellation fee (10%) for contract ${contractId}`
            );
        }

        await transitionCustody(contract.resource_id, contract.requester_id, client);

        const updated = await updateContractStatus(
            contractId,
            "cancelled",
            { cancelReason: reason ?? "User requested cancellation" },
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

export const checkoutContract = async (
    contractId: string,
    userId: string,
    code?: string
): Promise<Contract> => {
    await verifyOTP(code, contractId, "checkout");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const contract = await findContractById(contractId, client);
        if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
        if (contract.requester_id !== userId && contract.provider_id !== userId) {
            throw forbidden("Only a contract participant can confirm checkout", "FORBIDDEN");
        }
        if (contract.status !== "confirmed") {
            throw conflict("Contract must be confirmed before checkout", "CONTRACT_NOT_CONFIRMED");
        }

        const now = new Date();
        const updated = await updateContractStatus(
            contractId,
            "active",
            { checkedOutAt: now },
            client
        );

        await transitionCustody(contract.resource_id, contract.provider_id, client);

        await client.query("COMMIT");
        return updated!;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const returnContract = async (
    contractId: string,
    userId: string,
    code?: string
): Promise<Contract> => {
    await verifyOTP(code, contractId, "return");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const contract = await findContractById(contractId, client);
        if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
        if (contract.requester_id !== userId && contract.provider_id !== userId) {
            throw forbidden("Only a contract participant can return the item", "FORBIDDEN");
        }
        if (contract.status !== "active") {
            throw conflict("Contract must be active before return", "CONTRACT_NOT_ACTIVE");
        }

        const now = new Date();
        const disputeDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const lendFee = Number(contract.rental_fee || contract.lend_fee || 0);
        if (lendFee > 0) {
            await releaseEscrow(
                contractId,
                contract.requester_id,
                contract.provider_id,
                lendFee,
                "escrow_release_fee",
                client,
                `Lend fee released upon item return for contract ${contractId}`
            );
        }

        const updated = await updateContractStatus(
            contractId,
            "returned",
            {
                returnedAt: now,
                disputeDeadline,
            },
            client
        );

        await transitionCustody(contract.resource_id, contract.requester_id, client);

        await client.query("COMMIT");
        return updated!;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const disputeCondition = async (
    contractId: string,
    userId: string,
    reason: ReportReason = "damage",
    description = "Condition disputed by participant"
): Promise<Contract> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const contract = await findContractById(contractId, client);
        if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");

        // Either party (requester or provider) can file a dispute
        validateDisputeFiling(contract, userId);

        await insertReport(
            {
                contractId,
                reporterId: userId,
                reason: reason as ReportReason,
                description,
            },
            client
        );

        const updated = await updateContractStatus(
            contractId,
            "disputed",
            { conditionDisputed: true },
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

export const rateContract = async (
    contractId: string,
    userId: string,
    score: number,
    review?: string
): Promise<{ success: boolean; score: number; review?: string; rating: Rating }> => {
    if (!Number.isFinite(score) || score < 1 || score > 5) {
        throw badRequest("Score must be between 1 and 5", "INVALID_RATING_SCORE");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const contract = await findContractById(contractId, client);
        if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
        if (contract.requester_id !== userId && contract.provider_id !== userId) {
            throw forbidden("Not authorized to rate this contract", "FORBIDDEN");
        }
        if (contract.status !== "completed") {
            throw conflict("Can only rate completed contracts", "CONTRACT_NOT_COMPLETED");
        }

        const existing = await findRatingByContractAndRater(contractId, userId, client);
        if (existing) {
            throw conflict("You have already rated this contract", "RATING_ALREADY_SUBMITTED");
        }

        const ratedId =
            contract.requester_id === userId
                ? contract.provider_id
                : contract.requester_id;

        const rating = await insertRating(
            {
                contractId,
                raterId: userId,
                ratedId,
                score: Math.round(score),
                review,
            },
            client
        );

        await updateProfileRatingAggregate(ratedId, client);

        await client.query("COMMIT");
        return { success: true, score: rating.score, review: review ?? undefined, rating };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
