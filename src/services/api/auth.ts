// ── Auth API Service ───────────────────────────────────────────────────
// Frontend wrappers for the backend auth-related API endpoints.
// ──────────────────────────────────────────────────────────────────────

import { apiClient } from "./client";

/**
 * Resolves a user account by email, phone number, or username.
 * Returns the canonical email and uid for the account.
 */
export const resolveUser = async (identifier: string): Promise<{ email: string; uid: string }> => {
  return apiClient.post("/api/auth/resolve-user", { identifier });
};

/**
 * Sends a forgot-PIN alphanumeric OTP to the user's email.
 */
export const sendForgotPinOtp = async (email: string): Promise<void> => {
  await apiClient.post("/api/auth/forgot-pin/send", { email });
};

/**
 * Verifies the forgot-PIN OTP code.
 * Returns a customToken if successful (use to sign in before setting new PIN).
 */
export const verifyForgotPinOtp = async (
  email: string,
  otp: string
): Promise<{ customToken: string }> => {
  return apiClient.post("/api/auth/forgot-pin/verify", { email, otp });
};
