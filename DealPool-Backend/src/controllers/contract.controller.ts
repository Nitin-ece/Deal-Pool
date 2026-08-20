import { Request, Response, NextFunction } from "express";
import {
    getContract,
    listMyContracts,
    confirmContract,
    cancelContract,
    checkoutContract,
    returnContract,
    disputeCondition,
    rateContract,
    getHandoffToken,
} from "../services/contract.service";
import type { ApiResponse } from "../utils/responseApi";
import type { HandoffPurpose } from "../utils/qrcode";
import { badRequest } from "../utils/errors";

export const getContractHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const contract = await getContract(req.params.id as string, req.user!.uid);
        const response: ApiResponse<typeof contract> = {
            success: true,
            data: contract,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const listMyContractsHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const contracts = await listMyContracts(req.user!.uid);
        const response: ApiResponse<typeof contracts> = {
            success: true,
            data: contracts,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const getHandoffTokenHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const purpose = req.query.purpose as HandoffPurpose;
        if (purpose !== "checkout" && purpose !== "return") {
            throw badRequest("purpose must be checkout or return", "INVALID_HANDOFF_PURPOSE");
        }
        const result = await getHandoffToken(
            req.params.id as string,
            req.user!.uid,
            purpose
        );
        const response: ApiResponse<typeof result> = {
            success: true,
            data: result,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const confirmContractHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const contract = await confirmContract(req.params.id as string, req.user!.uid);
        const response: ApiResponse<typeof contract> = {
            success: true,
            data: contract,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const cancelContractHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const contract = await cancelContract(
            req.params.id as string,
            req.user!.uid,
            req.body?.reason
        );
        const response: ApiResponse<typeof contract> = {
            success: true,
            data: contract,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const checkoutContractHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const contract = await checkoutContract(
            req.params.id as string,
            req.user!.uid,
            req.body?.token
        );
        const response: ApiResponse<typeof contract> = {
            success: true,
            data: contract,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const returnContractHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const contract = await returnContract(
            req.params.id as string,
            req.user!.uid,
            req.body?.token
        );
        const response: ApiResponse<typeof contract> = {
            success: true,
            data: contract,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const disputeConditionHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const contract = await disputeCondition(
            req.params.id as string,
            req.user!.uid,
            req.body?.reason,
            req.body?.description
        );
        const response: ApiResponse<typeof contract> = {
            success: true,
            data: contract,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const rateContractHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const result = await rateContract(
            req.params.id as string,
            req.user!.uid,
            req.body?.score,
            req.body?.review
        );
        const response: ApiResponse<typeof result> = {
            success: true,
            data: result,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};
