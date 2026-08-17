import { Router } from "express";
import {
    getWalletHandler,
    depositFundsHandler,
    getLedgerHandler,
    getDebtsHandler,
} from "../controllers/wallet.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getWalletHandler);
router.post("/deposit", depositFundsHandler);
router.get("/ledger", getLedgerHandler);
router.get("/debts", getDebtsHandler);

export default router;
