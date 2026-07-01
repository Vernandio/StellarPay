import { Router } from "express";
import { validateSession, resetPassword } from "../controllers/authController";
import { requireAuth } from "../middlewares/authMiddleware";
import { strictRateLimiter } from "../middlewares/rateLimiter";

const router = Router();

// Validate session using the token sent from FE
router.post("/validate-session", requireAuth, validateSession);

// Request a password reset email
router.post("/reset-password", strictRateLimiter, resetPassword);

export default router;
