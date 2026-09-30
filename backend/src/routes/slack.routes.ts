import { Router } from "express";
import {
  slackCallback,
  slackDisconnect,
  slackStatus,
  startSlackConnect,
} from "../controllers/slack.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/connect", startSlackConnect);
router.get("/callback", slackCallback);
router.get("/status", slackStatus);
router.delete("/disconnect", slackDisconnect);

export default router;
