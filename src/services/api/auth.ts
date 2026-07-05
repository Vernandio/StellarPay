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
 * Checks whether an email, username, and/or phone number are still available.
 * Any omitted field is skipped (undefined in the response).
 */
export const checkAvailability = async (fields: {
  email?: string;
  username?: string;
  phone?: string;
}): Promise<{ email?: boolean; username?: boolean; phone?: boolean }> => {
  return apiClient.post("/api/auth/check-availability", fields);
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
