import { Router } from "express";
import {
    getContractHandler,
    listMyContractsHandler,
    confirmContractHandler,
    cancelContractHandler,
    checkoutContractHandler,
    returnContractHandler,
} from "../controllers/contract.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", listMyContractsHandler);
router.get("/:id", getContractHandler);
router.post("/:id/confirm", confirmContractHandler);
router.post("/:id/cancel", cancelContractHandler);
router.post("/:id/checkout", checkoutContractHandler);
router.post("/:id/return", returnContractHandler);

export default router;
