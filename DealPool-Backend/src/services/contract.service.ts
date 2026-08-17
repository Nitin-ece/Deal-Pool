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
import { lockEscrow, refundAllEscrow } from "./ledger.service";
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
        if (contract.requester_id !== userId) {
            throw forbidden("Only the requester can confirm the contract", "FORBIDDEN");
        }
        if (contract.status !== "created") {
            throw conflict(`Cannot confirm contract in status '${contract.status}'`, "INVALID_CONTRACT_STATUS");
        }

        const rentalFee = Number(contract.rental_fee || 0);
        const securityDeposit = Number(contract.security_deposit || 0);

        // Lock funds in escrow with FOR UPDATE wallet lock inside lockEscrow
        await lockEscrow(contractId, userId, rentalFee, securityDeposit, client);

        const updated = await updateContractStatus(contractId, "confirmed", {}, client);

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
    userId: string
): Promise<Contract> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const contract = await findContractById(contractId, client);
        if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
        if (contract.requester_id !== userId && contract.provider_id !== userId) {
            throw forbidden("Not authorized to cancel this contract", "FORBIDDEN");
        }
        if (contract.status !== "created" && contract.status !== "confirmed") {
            throw conflict(`Cannot cancel contract in status '${contract.status}'`, "INVALID_CONTRACT_STATUS");
        }

        if (contract.status === "confirmed") {
            // Refund locked escrow
            await refundAllEscrow(contractId, contract.requester_id, client);
        }

        const updated = await updateContractStatus(contractId, "cancelled", {}, client);

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
        if (contract.requester_id !== requesterId) {
            throw forbidden("Only the requester can return the item", "FORBIDDEN");
        }
        if (contract.status !== "active") {
            throw conflict("Contract must be active before return", "CONTRACT_NOT_ACTIVE");
        }

        const now = new Date();
        // 24 hour dispute deadline window
        const disputeDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const updated = await updateContractStatus(
            contractId,
            "returned",
            {
                returnedAt: now,
                disputeDeadline,
            },
            client
        );

        // Return custody to provider
        await updateResourceHolder(contract.resource_id, contract.provider_id, client);

        await client.query("COMMIT");
        return updated!;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
