import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
    listUsers,
    getUser,
    updateRole,
    deleteUser,
} from "../controllers/admin.controller";
import {
    listReportsHandler,
    resolveDisputeHandler,
} from "../controllers/report.controller";

const router = Router();

router.use(authMiddleware, requireRole("admin"));

router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.patch("/users/:id/role", updateRole);
router.delete("/users/:id", deleteUser);

// Admin Reports Management
router.get("/reports", listReportsHandler);
router.patch("/reports/:id/resolve", resolveDisputeHandler);
router.post("/reports/:id/resolve", resolveDisputeHandler);

export default router;