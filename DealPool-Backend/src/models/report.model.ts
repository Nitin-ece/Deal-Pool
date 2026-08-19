import pool from "../config/db";
import type { PoolClient } from "pg";

export type ReportReason = "damage" | "damage_claim" | "overcharge" | "other";
export type ReportStatus =
    | "pending"
    | "resolved_damage"
    | "resolved_dismissed"
    | "resolved_overcharge"
    | "upheld"
    | "dismissed";

export interface Report {
    id: string;
    contract_id: string;
    reporter_id: string;
    reason: ReportReason;
    description: string;
    status: ReportStatus;
    damage_award: number | string | null;
    resolved_by: string | null;
    resolution_notes: string | null;
    created_at: Date;
    updated_at: Date;
}

export const insertReport = async (
    params: {
        contractId: string;
        reporterId: string;
        reason: ReportReason;
        description: string;
    },
    client?: PoolClient
): Promise<Report> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        INSERT INTO reports (contract_id, reporter_id, reason, description, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING *
        `,
        [params.contractId, params.reporterId, params.reason, params.description]
    );
    return result.rows[0];
};

export const findReportById = async (
    id: string,
    client?: PoolClient
): Promise<Report | null> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `SELECT * FROM reports WHERE id = $1`,
        [id]
    );
    return result.rows[0] ?? null;
};

export const findReportByContractId = async (
    contractId: string,
    client?: PoolClient
): Promise<Report | null> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `SELECT * FROM reports WHERE contract_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [contractId]
    );
    return result.rows[0] ?? null;
};

export const listReports = async (
    filter?: { reporterId?: string; status?: string; reason?: string },
    client?: PoolClient
): Promise<Report[]> => {
    const executor = client ?? pool;
    const clauses: string[] = [];
    const values: unknown[] = [];

    if (filter?.reporterId) {
        values.push(filter.reporterId);
        clauses.push(`reporter_id = $${values.length}`);
    }
    if (filter?.status) {
        values.push(filter.status);
        clauses.push(`status = $${values.length}`);
    }
    if (filter?.reason) {
        values.push(filter.reason);
        clauses.push(`reason = $${values.length}`);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await executor.query(
        `SELECT * FROM reports ${where} ORDER BY created_at DESC`,
        values
    );
    return result.rows;
};

export const updateReportResolution = async (
    id: string,
    params: {
        status: ReportStatus;
        damageAward?: number | null;
        resolvedBy: string;
        resolutionNotes?: string | null;
    },
    client?: PoolClient
): Promise<Report | null> => {
    const executor = client ?? pool;
    const result = await executor.query(
        `
        UPDATE reports
        SET status = $2,
            damage_award = $3,
            resolved_by = $4,
            resolution_notes = $5,
            updated_at = now()
        WHERE id = $1
        RETURNING *
        `,
        [
            id,
            params.status,
            params.damageAward ?? 0,
            params.resolvedBy,
            params.resolutionNotes ?? null,
        ]
    );
    return result.rows[0] ?? null;
};
