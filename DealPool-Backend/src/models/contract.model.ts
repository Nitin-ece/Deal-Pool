import pool from "../config/db";
import type { PoolClient } from "pg";

export type ContractStatus =
    | "created"
    | "confirmed"
    | "active"
    | "returned"
    | "completed"
    | "disputed"
    | "cancelled";

export interface Contract {
    id: string;
    deal_id: string;
    offer_id: string;
    resource_id: string;
    requester_id: string;
    provider_id: string;
    rental_fee: number | string;
    security_deposit: number | string;
    status: ContractStatus;
    checked_out_at: Date | null;
    returned_at: Date | null;
    dispute_deadline: Date | null;
    condition_disputed: boolean;
    created_at: Date;
    updated_at: Date;
}

export const insertContract = async (
    params: {
        dealId: string;
        offerId: string;
        resourceId: string;
        requesterId: string;
        providerId: string;
        rentalFee: number;
        securityDeposit: number;
        status?: ContractStatus;
    },
    client?: PoolClient
): Promise<Contract> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        INSERT INTO contracts (
            deal_id, offer_id, resource_id, requester_id, provider_id,
            rental_fee, security_deposit, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `,
        [
            params.dealId,
            params.offerId,
            params.resourceId,
            params.requesterId,
            params.providerId,
            params.rentalFee,
            params.securityDeposit,
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
        WHERE status = 'returned'
          AND condition_disputed = false
          AND dispute_deadline IS NOT NULL
          AND dispute_deadline < now()
        ORDER BY dispute_deadline ASC
        `
    );
    return result.rows;
};
