import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { setupPin, verifyPin, changePin } from "../controllers/pinController";

const router = Router();

// All PIN routes require authentication
router.post("/setup", requireAuth, setupPin);
router.post("/verify", requireAuth, verifyPin);
router.post("/change", requireAuth, changePin);

export default router;
