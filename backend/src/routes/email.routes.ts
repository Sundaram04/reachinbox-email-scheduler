import { Router } from "express";
import {
  getEmailHandler,
  listScheduledHandler,
  listSentHandler,
  scheduleEmailsHandler,
} from "../controllers/email.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

router.post("/schedule", scheduleEmailsHandler);
router.get("/scheduled", listScheduledHandler);
router.get("/sent", listSentHandler);
router.get("/:id", getEmailHandler);

export default router;
