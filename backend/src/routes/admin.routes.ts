import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Router } from "express";

import { requireAdmin } from "../middleware/requireAdmin";
import { requireAuth } from "../middleware/requireAuth";
import { emailQueue } from "../queues/email.queue";

export const QUEUES_BASE_PATH = "/admin/queues";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(QUEUES_BASE_PATH);

createBullBoard({
  queues: [new BullMQAdapter(emailQueue, { readOnlyMode: true })],
  serverAdapter,
});

const router = Router();

router.use(requireAuth, requireAdmin, serverAdapter.getRouter());

export default router;
