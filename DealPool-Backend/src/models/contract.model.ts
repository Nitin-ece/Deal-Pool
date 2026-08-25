import pool from "../config/db";
import type { PoolClient } from "pg";

export type ContractStatus =
    | "created"
    | "pending_confirmation"
    | "confirmed"
    | "active"
    | "returned"
    | "returned_pending_dispute"
    | "completed"
    | "disputed"
    | "cancelled";

export interface Contract {
    id: string;
    deal_id: string;
    offer_id: string;
    resource_id: string | null;
    requester_id: string;
    provider_id: string;
    rental_fee: number | string;
    security_deposit: number | string;
    declared_value: number | string;
    lend_fee: number | string;
    security_amount: number | string;
    platform_fee: number | string;
    security_deposit_rate: number | string;
    status: ContractStatus;
    requester_confirmed: boolean;
    provider_confirmed: boolean;
    confirm_deadline: Date | null;
    contact_revealed: boolean;
    checked_out_at: Date | null;
    returned_at: Date | null;
    dispute_deadline: Date | null;
    condition_disputed: boolean;
    cancel_reason: string | null;
    created_at: Date;
    updated_at: Date;
}

export const insertContract = async (
    params: {
        dealId: string;
        offerId: string;
        resourceId?: string | null;
        requesterId: string;
        providerId: string;
        rentalFee?: number;
        securityDeposit?: number;
        declaredValue?: number;
        lendFee?: number;
        securityAmount?: number;
        platformFee?: number;
        securityDepositRate?: number;
        status?: ContractStatus;
    },
    client?: PoolClient
): Promise<Contract> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        INSERT INTO contracts (
            deal_id, offer_id, resource_id, requester_id, provider_id,
            rental_fee, security_deposit, declared_value, lend_fee, security_amount,
            platform_fee, security_deposit_rate, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
        `,
        [
            params.dealId,
            params.offerId,
            params.resourceId,
            params.requesterId,
            params.providerId,
            params.rentalFee ?? params.lendFee ?? 0,
            params.securityDeposit ?? params.securityAmount ?? 0,
            params.declaredValue ?? 0,
            params.lendFee ?? params.rentalFee ?? 0,
            params.securityAmount ?? params.securityDeposit ?? 0,
            params.platformFee ?? 0,
            params.securityDepositRate ?? 0.15,
            params.status ?? "created",
        ]
    );
    return result.rows[0];
};

export const findContractById = async (
    id: string,
    client?: PoolClient
): Promise<Contract | null> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `SELECT * FROM contracts WHERE id = $1`,
        [id]
    );
    return result.rows[0] ?? null;
};

export const listContractsForUser = async (
    userId: string,
    client?: PoolClient
): Promise<Contract[]> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        SELECT * FROM contracts
        WHERE requester_id = $1 OR provider_id = $1
        ORDER BY created_at DESC
        `,
        [userId]
    );
    return result.rows;
};

export const updateContractStatus = async (
    id: string,
    status: ContractStatus,
    extraFields: {
        checkedOutAt?: Date | null;
        returnedAt?: Date | null;
        disputeDeadline?: Date | null;
        conditionDisputed?: boolean;
        requesterConfirmed?: boolean;
        providerConfirmed?: boolean;
        contactRevealed?: boolean;
        cancelReason?: string | null;
    } = {},
    client?: PoolClient
): Promise<Contract | null> => {
    const executor = client ?? pool;
    const clauses = ["status = $2", "updated_at = now()"];
    const values: unknown[] = [id, status];
    let idx = 3;

    if (extraFields.checkedOutAt !== undefined) {
        clauses.push(`checked_out_at = $${idx++}`);
        values.push(extraFields.checkedOutAt);
    }
    if (extraFields.returnedAt !== undefined) {
        clauses.push(`returned_at = $${idx++}`);
        values.push(extraFields.returnedAt);
    }
    if (extraFields.disputeDeadline !== undefined) {
        clauses.push(`dispute_deadline = $${idx++}`);
        values.push(extraFields.disputeDeadline);
    }
    if (extraFields.conditionDisputed !== undefined) {
        clauses.push(`condition_disputed = $${idx++}`);
        values.push(extraFields.conditionDisputed);
    }
    if (extraFields.requesterConfirmed !== undefined) {
        clauses.push(`requester_confirmed = $${idx++}`);
        values.push(extraFields.requesterConfirmed);
    }
    if (extraFields.providerConfirmed !== undefined) {
        clauses.push(`provider_confirmed = $${idx++}`);
        values.push(extraFields.providerConfirmed);
    }
    if (extraFields.contactRevealed !== undefined) {
        clauses.push(`contact_revealed = $${idx++}`);
        values.push(extraFields.contactRevealed);
    }
    if (extraFields.cancelReason !== undefined) {
        clauses.push(`cancel_reason = $${idx++}`);
        values.push(extraFields.cancelReason);
    }

    const result = await executor.query(
        `
        UPDATE contracts
        SET ${clauses.join(", ")}
        WHERE id = $1
        RETURNING *
        `,
        values
    );
    return result.rows[0] ?? null;
};

export const findContractsPastDisputeDeadline = async (
    client?: PoolClient
): Promise<Contract[]> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        SELECT * FROM contracts
        WHERE (status = 'returned' OR status = 'returned_pending_dispute')
          AND condition_disputed = false
          AND dispute_deadline IS NOT NULL
          AND dispute_deadline < now()
        ORDER BY dispute_deadline ASC
        `
    );
    return result.rows;
};
