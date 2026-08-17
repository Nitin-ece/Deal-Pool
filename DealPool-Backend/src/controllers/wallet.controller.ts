import { Request, Response, NextFunction } from "express";
import {
    getOrCreateWallet,
    depositFunds,
    getWalletLedger,
    getUserDebts,
} from "../services/wallet.service";
import type { ApiResponse } from "../utils/responseApi";

export const getWalletHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const wallet = await getOrCreateWallet(req.user!.uid);
        const response: ApiResponse<typeof wallet> = {
            success: true,
            data: wallet,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const depositFundsHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const amount = Number(req.body.amount);
        const wallet = await depositFunds(req.user!.uid, amount);
        const response: ApiResponse<typeof wallet> = {
            success: true,
            data: wallet,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const getLedgerHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const ledger = await getWalletLedger(req.user!.uid);
        const response: ApiResponse<typeof ledger> = {
            success: true,
            data: ledger,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

export const getDebtsHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const debts = await getUserDebts(req.user!.uid);
        const response: ApiResponse<typeof debts> = {
            success: true,
            data: debts,
        };
        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};
