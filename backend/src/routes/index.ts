import { Router } from "express";
import adminRoutes, { QUEUES_BASE_PATH } from "./admin.routes";
import authRoutes from "./auth.routes";
import emailRoutes from "./email.routes";
import healthRoutes from "./health.routes";
import meRoutes from "./me.routes";
import senderRoutes from "./sender.routes";
import slackRoutes from "./slack.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/me", meRoutes);
router.use("/api/emails", emailRoutes);
router.use("/api/senders", senderRoutes);
router.use("/api/slack", slackRoutes);
router.use(QUEUES_BASE_PATH, adminRoutes);

export default router;
