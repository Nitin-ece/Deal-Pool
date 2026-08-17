import { Router } from "express";
import {
    fileReportHandler,
    getReportHandler,
    listReportsHandler,
    resolveDisputeHandler,
} from "../controllers/report.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", fileReportHandler);
router.get("/", listReportsHandler);
router.get("/:id", getReportHandler);
router.post("/:id/resolve", requireRole("admin"), resolveDisputeHandler);

export default router;
