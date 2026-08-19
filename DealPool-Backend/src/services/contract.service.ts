import pool from "../config/db";
import type { PoolClient } from "pg";
import {
    insertContract,
    findContractById,
    listContractsForUser,
    updateContractStatus,
    Contract,
} from "../models/contract.model";
import { updateResourceHolder, findResourceById as findResourceByIdModel } from "../models/resource.model";
import { lockEscrow, releaseEscrow, refundAllEscrow } from "./ledger.service";
import { insertReport, ReportReason } from "../models/report.model";
import { badRequest, notFound, forbidden, conflict } from "../utils/errors";

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

        const isRequester = contract.requester_id === userId;
        const isProvider = contract.provider_id === userId;

        const requesterConfirmed = isRequester ? true : contract.requester_confirmed;
        const providerConfirmed = isProvider ? true : contract.provider_confirmed;

        // If either party confirms, transition to confirmed and reveal contact
        const updated = await updateContractStatus(
            contractId,
            "confirmed",
            {
                requesterConfirmed,
                providerConfirmed,
                contactRevealed: true,
            },
            client
        );

        // Move resource custody to the other party on confirmation
        const resource = await findResourceByIdModel(contract.resource_id, client);
        const newHolder = resource?.current_holder_id === contract.requester_id
            ? contract.provider_id
            : contract.requester_id;
        await updateResourceHolder(contract.resource_id, newHolder, client);

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

        // 27/3 cancellation split: platform fee 3% of declared value, refund remainder of escrow
        const declaredValue = Number(contract.declared_value || 0);
        const cancellationFee = declaredValue * 0.03;

        const rentalFee = Number(contract.rental_fee || contract.lend_fee || 0);
        const securityDeposit = Number(contract.security_deposit || contract.security_amount || 0);
        const totalEscrowed = rentalFee + securityDeposit;

        const refundAmount = Math.max(0, totalEscrowed - cancellationFee);

        if (refundAmount > 0) {
            await releaseEscrow(
                contractId,
                contract.requester_id,
                contract.requester_id,
                refundAmount,
                "escrow_release_security",
                client,
                `Cancellation refund for contract ${contractId}`
            );
        }

        if (cancellationFee > 0) {
            await releaseEscrow(
                contractId,
                contract.requester_id,
                contract.requester_id,
                cancellationFee,
                "fee_capture",
                client,
                `Cancellation fee (3%) for contract ${contractId}`
            );
        }

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
    providerId: string
): Promise<Contract> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const contract = await findContractById(contractId, client);
        if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
        if (contract.provider_id !== providerId) {
            throw forbidden("Only the provider can check out the item", "FORBIDDEN");
        }
        if (contract.status !== "confirmed" && contract.status !== "created") {
            throw conflict("Contract must be confirmed before checkout", "CONTRACT_NOT_CONFIRMED");
        }

        const now = new Date();
        const updated = await updateContractStatus(
            contractId,
            "active",
            { checkedOutAt: now },
            client
        );

        // Move resource custody to requester
        await updateResourceHolder(contract.resource_id, contract.requester_id, client);

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
    requesterId: string
): Promise<Contract> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const contract = await findContractById(contractId, client);
        if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
        if (contract.requester_id !== requesterId && contract.provider_id !== requesterId) {
            throw forbidden("Only a contract participant can return the item", "FORBIDDEN");
        }
        if (contract.status !== "active") {
            throw conflict("Contract must be active before return", "CONTRACT_NOT_ACTIVE");
        }

        const now = new Date();
        // 24 hour dispute deadline window
        const disputeDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Release lend fee immediately to provider
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

        // Return custody to resource owner
        const resource = await findResourceByIdModel(contract.resource_id, client);
        await updateResourceHolder(contract.resource_id, resource?.owner_id ?? contract.provider_id, client);

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
    description = "Condition disputed by provider"
): Promise<Contract> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const contract = await findContractById(contractId, client);
        if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
        if (contract.provider_id !== userId) {
            throw forbidden("Only the provider can dispute the returned condition", "FORBIDDEN");
        }
        if (contract.status !== "returned" && contract.status !== "returned_pending_dispute") {
            throw conflict("Contract must be returned to dispute condition", "INVALID_CONTRACT_STATUS");
        }
        if (contract.condition_disputed) {
            throw conflict("Condition has already been disputed", "ALREADY_DISPUTED");
        }
        if (contract.dispute_deadline && new Date(contract.dispute_deadline).getTime() < Date.now()) {
            throw conflict("Dispute window has expired", "DISPUTE_WINDOW_EXPIRED");
        }

        // Auto-create report
        await insertReport(
            {
                contractId,
                reporterId: userId,
                reason: reason as any,
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
): Promise<{ success: boolean; score: number; review?: string }> => {
    const contract = await findContractById(contractId);
    if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
    if (contract.requester_id !== userId && contract.provider_id !== userId) {
        throw forbidden("Not authorized to rate this contract", "FORBIDDEN");
    }
    if (contract.status !== "completed") {
        throw conflict("Can only rate completed contracts", "CONTRACT_NOT_COMPLETED");
    }

    return { success: true, score, review };
};
