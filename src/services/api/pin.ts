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

export type PinVerifyResult =
  | { ok: true }
  | { ok: false; reason: "incorrect"; remaining: number; error: string }
  | { ok: false; reason: "locked"; lockedUntil: string; error: string }
  | { ok: false; reason: "error"; error: string };

/**
 * Verifies the user's PIN.
 *
 * Attempt-counting and lockout are enforced server-side (see the backend
 * pinController). This returns the server's structured verdict rather than a
 * bare boolean so the UI can show remaining attempts / lock countdown without
 * keeping its own (bypassable) counter. It does not throw on a wrong PIN or a
 * lockout — only on an unexpected transport/server failure.
 */
export const verifyPin = async (pin: string): Promise<PinVerifyResult> => {
  const res = await apiClient.postRaw("/api/pin/verify", { pin });
  const data = (res.data ?? {}) as {
    valid?: boolean;
    remaining?: number;
    locked?: boolean;
    lockedUntil?: string;
    error?: string;
  };

  if (res.ok && data.valid) return { ok: true };

  if (res.status === 429 || data.locked) {
    return {
      ok: false,
      reason: "locked",
      lockedUntil: data.lockedUntil ?? new Date().toISOString(),
      error: data.error ?? "Too many incorrect attempts. Please try again later.",
    };
  }

  if (res.status === 401) {
    return {
      ok: false,
      reason: "incorrect",
      remaining: typeof data.remaining === "number" ? data.remaining : 0,
      error: data.error ?? "Incorrect PIN",
    };
  }

  // 404 (no PIN set), 400 (bad request), 5xx, etc.
  return { ok: false, reason: "error", error: data.error ?? `Verification failed (${res.status})` };
};

/**
 * Changes the user's PIN.
 * Requires the old PIN for verification.
 */
export const changePin = async (oldPin: string, newPin: string): Promise<void> => {
  await apiClient.post("/api/pin/change", { oldPin, newPin });
};

/**
 * Resets the user's PIN without the old PIN.
 * Only works while signed in with a forgot-PIN reset token (carries the
 * `pinReset` claim). Used by the forgot-PIN flow after OTP verification.
 */
export const resetPin = async (pin: string): Promise<void> => {
  await apiClient.post("/api/pin/reset", { pin });
};
