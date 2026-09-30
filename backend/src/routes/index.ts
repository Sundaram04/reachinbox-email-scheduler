import { Router } from "express";
import authRoutes from "./auth.routes";
import healthRoutes from "./health.routes";
import meRoutes from "./me.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/me", meRoutes);

export default router;
