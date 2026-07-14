import { Router } from "express";
import {
  validateSession, resetPassword,
  sendEmailOtp, verifyEmailOtp,
  resolveUser, resolveUserToken,
  sendForgotPinOtp, verifyForgotPinOtp,
  checkAvailability,
  googleStart, googleCallback,
} from "../controllers/authController";
import { requireAuth } from "../middlewares/authMiddleware";
import { strictRateLimiter } from "../middlewares/rateLimiter";

const router = Router();

// Validate session
router.post("/validate-session", requireAuth, validateSession);

// Password reset
router.post("/reset-password", strictRateLimiter, resetPassword);

// OTP (signup / verify)
router.post("/send-otp", strictRateLimiter, sendEmailOtp);
router.post("/verify-otp", strictRateLimiter, verifyEmailOtp);

// Signup: check email/username/phone availability
router.post("/check-availability", strictRateLimiter, checkAvailability);

// Login: resolve identifier → email + uid
router.post("/resolve-user", strictRateLimiter, resolveUser);
// Login: mint a custom token by email (for PIN verification step)
router.post("/resolve-user-token", strictRateLimiter, resolveUserToken);

// Forgot PIN
router.post("/forgot-pin/send", strictRateLimiter, sendForgotPinOtp);
router.post("/forgot-pin/verify", strictRateLimiter, verifyForgotPinOtp);

// Google OAuth: browser opens /start, Google form-posts back to /callback
router.get("/google/start", googleStart);
router.post("/google/callback", googleCallback);

export default router;
