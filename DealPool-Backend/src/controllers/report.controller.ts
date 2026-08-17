import { Request, Response, NextFunction } from "express";
import {
    fileReport,
    getReport,
    listAllReports,
    resolveDispute,
} from "../services/report.service";
import type { ApiResponse } from "../utils/responseApi";
import type { ReportReason, ReportStatus } from "../models/report.model";

export const fileReportHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { contractId, reason, description } = req.body;
        const report = await fileReport(
            contractId,
            req.user!.uid,
            reason as ReportReason,
            description
        );
        const response: ApiResponse<typeof report> = {
            success: true,
            data: report,
        };
        res.status(201).json(response);
    } catch (error) {
        next(error);
    }
};

export const getReportHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const isAdmin = req.user!.role === "admin";
        const report = await getReport(req.params.id as string, req.user!.uid, isAdmin);
        const response: ApiResponse<typeof report> = {
            success: true,
            data: report,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const listReportsHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const isAdmin = req.user!.role === "admin";
        const statusFilter = req.query.status as ReportStatus | undefined;
        const reports = await listAllReports(req.user!.uid, isAdmin, statusFilter);
        const response: ApiResponse<typeof reports> = {
            success: true,
            data: reports,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const resolveDisputeHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { outcome, damageAward, notes } = req.body;
        const report = await resolveDispute(
            req.params.id as string,
            req.user!.uid,
            {
                outcome,
                damageAward: damageAward !== undefined ? Number(damageAward) : undefined,
                notes,
            }
        );
        const response: ApiResponse<typeof report> = {
            success: true,
            data: report,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};
