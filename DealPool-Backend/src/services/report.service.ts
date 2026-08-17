import pool from "../config/db";
import {
    insertReport,
    findReportById,
    listReports,
    updateReportResolution,
    Report,
    ReportReason,
    ReportStatus,
} from "../models/report.model";
import { findContractById, updateContractStatus } from "../models/contract.model";
import { releaseEscrow } from "./ledger.service";
import { recordDebt } from "./wallet.service";
import { applyStrike } from "./reputation.service";
import { badRequest, notFound, forbidden, conflict } from "../utils/errors";

export const fileReport = async (
    contractId: string,
    reporterId: string,
    reason: ReportReason,
    description: string
): Promise<Report> => {
    if (!reason || !description) {
        throw badRequest("reason and description are required", "MISSING_FIELDS");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const contract = await findContractById(contractId, client);
        if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");
        if (contract.requester_id !== reporterId && contract.provider_id !== reporterId) {
            throw forbidden("Not a participant in this contract", "FORBIDDEN");
        }

        const report = await insertReport(
            {
                contractId,
                reporterId,
                reason,
                description,
            },
            client
        );

        // Mark contract as disputed
        await updateContractStatus(
            contractId,
            "disputed",
            { conditionDisputed: true },
            client
        );

        await client.query("COMMIT");
        return report;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const getReport = async (
    reportId: string,
    userId: string,
    isAdmin = false
): Promise<Report> => {
    const report = await findReportById(reportId);
    if (!report) throw notFound("Report not found", "REPORT_NOT_FOUND");

    if (!isAdmin && report.reporter_id !== userId) {
        const contract = await findContractById(report.contract_id);
        if (contract?.requester_id !== userId && contract?.provider_id !== userId) {
            throw forbidden("Not authorized to view this report", "FORBIDDEN");
        }
    }

    return report;
};

export const listAllReports = async (
    userId: string,
    isAdmin = false,
    statusFilter?: ReportStatus
): Promise<Report[]> => {
    if (isAdmin) {
        return listReports({ status: statusFilter });
    }
    return listReports({ reporterId: userId, status: statusFilter });
};

export interface ResolveDisputeInput {
    outcome: "damage" | "dismissed" | "overcharge";
    damageAward?: number;
    notes?: string;
}

export const resolveDispute = async (
    reportId: string,
    adminId: string,
    input: ResolveDisputeInput
): Promise<Report> => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const report = await findReportById(reportId, client);
        if (!report) throw notFound("Report not found", "REPORT_NOT_FOUND");
        if (report.status !== "pending") {
            throw conflict("Report is already resolved", "REPORT_ALREADY_RESOLVED");
        }

        const contract = await findContractById(report.contract_id, client);
        if (!contract) throw notFound("Contract not found", "CONTRACT_NOT_FOUND");

        const rentalFee = Number(contract.rental_fee || 0);
        const securityAmount = Number(contract.security_deposit || 0);
        const requesterId = contract.requester_id;
        const providerId = contract.provider_id;
        const contractId = contract.id;

        // Payout standard rental fee to provider
        if (rentalFee > 0) {
            await releaseEscrow(
                contractId,
                requesterId,
                providerId,
                rentalFee,
                "escrow_payout_fee",
                client,
                `Rental fee payout on dispute resolution for contract ${contractId}`
            );
        }

        let resolvedStatus: ReportStatus;
        const damageAward = input.damageAward ?? 0;

        if (input.outcome === "damage") {
            resolvedStatus = "resolved_damage";

            if (damageAward > 0) {
                const penaltyFromEscrow = Math.min(damageAward, securityAmount);
                if (penaltyFromEscrow > 0) {
                    await releaseEscrow(
                        contractId,
                        requesterId,
                        providerId,
                        penaltyFromEscrow,
                        "escrow_penalty",
                        client,
                        `Damage penalty award to provider for contract ${contractId}`
                    );
                }

                const remainingDeposit = Math.max(0, securityAmount - damageAward);
                if (remainingDeposit > 0) {
                    await releaseEscrow(
                        contractId,
                        requesterId,
                        requesterId,
                        remainingDeposit,
                        "escrow_release_security",
                        client,
                        `Remaining security deposit release to requester for contract ${contractId}`
                    );
                }

                if (damageAward > securityAmount) {
                    const shortfall = damageAward - securityAmount;
                    await recordDebt(requesterId, shortfall, contractId, client);
                    await applyStrike(requesterId, client);
                }
            } else {
                // If damageAward is 0, release full deposit to requester
                if (securityAmount > 0) {
                    await releaseEscrow(
                        contractId,
                        requesterId,
                        requesterId,
                        securityAmount,
                        "escrow_release_security",
                        client,
                        `Full security deposit release to requester for contract ${contractId}`
                    );
                }
            }
        } else if (input.outcome === "dismissed") {
            resolvedStatus = "resolved_dismissed";
            // Full deposit back to requester
            if (securityAmount > 0) {
                await releaseEscrow(
                    contractId,
                    requesterId,
                    requesterId,
                    securityAmount,
                    "escrow_release_security",
                    client,
                    `Full security deposit release on dismissed report for contract ${contractId}`
                );
            }
        } else if (input.outcome === "overcharge") {
            resolvedStatus = "resolved_overcharge";
            // Overcharge upheld: provider gets reliability strike
            await applyStrike(providerId, client);
            // Full deposit back to requester
            if (securityAmount > 0) {
                await releaseEscrow(
                    contractId,
                    requesterId,
                    requesterId,
                    securityAmount,
                    "escrow_release_security",
                    client,
                    `Full security deposit release for contract ${contractId}`
                );
            }
        } else {
            throw badRequest("Invalid resolution outcome", "INVALID_OUTCOME");
        }

        const updatedReport = await updateReportResolution(
            reportId,
            {
                status: resolvedStatus,
                damageAward,
                resolvedBy: adminId,
                resolutionNotes: input.notes ?? null,
            },
            client
        );

        await updateContractStatus(contractId, "completed", {}, client);

        await client.query("COMMIT");
        return updatedReport!;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
