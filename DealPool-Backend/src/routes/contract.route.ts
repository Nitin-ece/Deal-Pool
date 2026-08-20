import { Router } from "express";
import {
    getContractHandler,
    listMyContractsHandler,
    confirmContractHandler,
    cancelContractHandler,
    checkoutContractHandler,
    returnContractHandler,
    disputeConditionHandler,
    rateContractHandler,
    getHandoffTokenHandler,
} from "../controllers/contract.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", listMyContractsHandler);
router.get("/:id/handoff-token", getHandoffTokenHandler);
router.get("/:id", getContractHandler);
router.post("/:id/confirm", confirmContractHandler);
router.post("/:id/cancel", cancelContractHandler);
router.post("/:id/checkout", checkoutContractHandler);
router.post("/:id/return", returnContractHandler);
router.post("/:id/dispute-condition", disputeConditionHandler);
router.post("/:id/rate", rateContractHandler);

export default router;
