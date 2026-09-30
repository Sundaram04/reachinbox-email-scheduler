import { Router } from "express";
import {
  createSenderHandler,
  deleteSenderHandler,
  listSendersHandler,
} from "../controllers/sender.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth);

router.post("/", createSenderHandler);
router.get("/", listSendersHandler);
router.delete("/:id", deleteSenderHandler);

export default router;
