import { Router } from "express";
import {
  googleCallback,
  logout,
  startGoogleLogin,
} from "../controllers/auth.controller";

const router = Router();

router.get("/google", startGoogleLogin);
router.get("/google/callback", googleCallback);
router.post("/logout", logout);

export default router;
