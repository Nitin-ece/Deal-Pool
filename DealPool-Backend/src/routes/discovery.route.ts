import { Router } from "express";
import { getNearbyDiscoveryHandler } from "../controllers/discovery.controller";

const router = Router();

router.get("/nearby", getNearbyDiscoveryHandler);

export default router;
