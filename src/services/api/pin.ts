// ── PIN Service ───────────────────────────────────────────────────────
// Frontend wrappers for the backend PIN API endpoints.
// ──────────────────────────────────────────────────────────────────────

import { apiClient } from "./client";

/**
 * Sets up a new 6-digit PIN for the current user.
 * Only works if no PIN has been set before.
 */
export const setupPin = async (pin: string): Promise<void> => {
  await apiClient.post("/api/pin/setup", { pin });
};

/**
 * Verifies the user's PIN.
 * Returns true if the PIN is correct, throws on failure.
 */
export const verifyPin = async (pin: string): Promise<boolean> => {
  const result = await apiClient.post<{ valid: boolean }>("/api/pin/verify", { pin });
  return result.valid;
};

/**
 * Changes the user's PIN.
 * Requires the old PIN for verification.
 */
export const changePin = async (oldPin: string, newPin: string): Promise<void> => {
  await apiClient.post("/api/pin/change", { oldPin, newPin });
};
