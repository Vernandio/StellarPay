import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { adminFirestore } from "../services/firebase";

const SALT_ROUNDS = 12;

export const setupPin = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const { pin } = req.body;
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: "PIN must be exactly 6 digits" });
    }

    // Check if user has active PIN flag in profile
    const userDoc = await adminFirestore.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const hasPinActive = userData?.hasPin === true;

    // Check if PIN already exists and is active
    const securityRef = adminFirestore.collection("users").doc(uid).collection("security").doc("pin");
    const existing = await securityRef.get();
    if (existing.exists && hasPinActive) {
      return res.status(409).json({ error: "PIN already set. Use change endpoint instead." });
    }

    const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
    await securityRef.set({
      pinHash,
      pinSetAt: new Date(),
      pinChangedAt: null,
    });

    // Update hasPin flag on user profile
    await adminFirestore.collection("users").doc(uid).update({ hasPin: true });

    return res.status(200).json({ message: "PIN set successfully" });
  } catch (error) {
    console.error("PIN setup error:", error);
    return res.status(500).json({ error: "Failed to set PIN" });
  }
};

/**
 * Resets the PIN without the old PIN.
 * Only usable with a token minted by the forgot-PIN OTP flow, which carries
 * the `pinReset: true` custom claim (see verifyForgotPinOtp). This lets a user
 * who genuinely forgot their PIN set a new one, while still preventing a normal
 * session token from overwriting a PIN without knowing the current one.
 */
export const resetPin = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    if (req.user?.pinReset !== true) {
      return res.status(403).json({ error: "This action requires a PIN reset code." });
    }

    const { pin } = req.body;
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: "PIN must be exactly 6 digits" });
    }

    const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
    const securityRef = adminFirestore.collection("users").doc(uid).collection("security").doc("pin");
    // A fresh PIN clears any lockout streak (the user proved control via OTP).
    await securityRef.set({
      pinHash,
      pinSetAt: new Date(),
      pinChangedAt: new Date(),
      failedAttempts: 0,
      lockCount: 0,
      lockedUntil: null,
    });

    await adminFirestore.collection("users").doc(uid).update({ hasPin: true });

    return res.status(200).json({ message: "PIN reset successfully" });
  } catch (error) {
    console.error("PIN reset error:", error);
    return res.status(500).json({ error: "Failed to reset PIN" });
  }
};

// ── Server-side lockout policy ────────────────────────────────────────
// Attempt counting and lockout are enforced here, not on the client, so a
// user can't grant themselves fresh attempts by clearing app storage,
// reinstalling, or killing the app. The counter lives on the user's
// security/pin doc and is mutated inside a transaction to survive races.
const MAX_ATTEMPTS = 5;
// Escalating cooldown per lock cycle (1st lock → 1 min, then 5, 15, 30, 60).
// Indexed by number of prior locks; last entry is the cap.
const LOCK_DURATIONS_MS = [
  1 * 60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
];

type PinDoc = {
  pinHash: string;
  failedAttempts?: number;
  lockCount?: number;
  lockedUntil?: FirebaseFirestore.Timestamp | null;
};

export const verifyPin = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: "PIN is required" });

    const securityRef = adminFirestore.collection("users").doc(uid).collection("security").doc("pin");

    // Run the read → compare → write as a transaction so concurrent submits
    // can't both read the same attempt count and each get a "free" attempt.
    const outcome = await adminFirestore.runTransaction(async (tx) => {
      const doc = await tx.get(securityRef);
      if (!doc.exists) {
        return { status: 404 as const, body: { error: "No PIN set for this account" } };
      }

      const data = doc.data() as PinDoc;
      const now = Date.now();
      const lockedUntilMs = data.lockedUntil ? data.lockedUntil.toMillis() : 0;

      // Currently locked out — reject without even checking the PIN.
      if (lockedUntilMs > now) {
        return {
          status: 429 as const,
          body: {
            error: "Too many incorrect attempts. Please try again later.",
            locked: true,
            lockedUntil: new Date(lockedUntilMs).toISOString(),
          },
        };
      }

      const isValid = await bcrypt.compare(pin, data.pinHash);

      if (isValid) {
        // Success clears the failed-attempt streak (but keeps lockCount so
        // repeat offenders still escalate). A prior expired lock is cleared.
        tx.update(securityRef, { failedAttempts: 0, lockedUntil: null });
        return { status: 200 as const, body: { message: "PIN verified", valid: true } };
      }

      // Wrong PIN — increment the streak.
      const failedAttempts = (data.failedAttempts ?? 0) + 1;

      if (failedAttempts >= MAX_ATTEMPTS) {
        // Hit the threshold — start (or escalate) a timed lockout.
        const lockCount = (data.lockCount ?? 0) + 1;
        const durationIdx = Math.min(lockCount - 1, LOCK_DURATIONS_MS.length - 1);
        const newLockedUntil = new Date(now + LOCK_DURATIONS_MS[durationIdx]);
        tx.update(securityRef, {
          failedAttempts: 0, // reset the streak; the lock now governs access
          lockCount,
          lockedUntil: newLockedUntil,
        });
        return {
          status: 429 as const,
          body: {
            error: "Too many incorrect attempts. Please try again later.",
            locked: true,
            lockedUntil: newLockedUntil.toISOString(),
          },
        };
      }

      tx.update(securityRef, { failedAttempts });
      return {
        status: 401 as const,
        body: {
          error: "Incorrect PIN",
          valid: false,
          remaining: MAX_ATTEMPTS - failedAttempts,
        },
      };
    });

    return res.status(outcome.status).json(outcome.body);
  } catch (error) {
    console.error("PIN verify error:", error);
    return res.status(500).json({ error: "Failed to verify PIN" });
  }
};

export const changePin = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const { oldPin, newPin } = req.body;
    if (!oldPin || !newPin) {
      return res.status(400).json({ error: "Both old and new PIN are required" });
    }
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      return res.status(400).json({ error: "New PIN must be exactly 6 digits" });
    }

    const securityRef = adminFirestore.collection("users").doc(uid).collection("security").doc("pin");
    const doc = await securityRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "No PIN set for this account" });
    }

    const { pinHash } = doc.data() as { pinHash: string };
    const isValid = await bcrypt.compare(oldPin, pinHash);

    if (!isValid) {
      return res.status(401).json({ error: "Incorrect current PIN" });
    }

    const newPinHash = await bcrypt.hash(newPin, SALT_ROUNDS);
    await securityRef.update({
      pinHash: newPinHash,
      pinChangedAt: new Date(),
      failedAttempts: 0,
      lockedUntil: null,
    });

    return res.status(200).json({ message: "PIN changed successfully" });
  } catch (error) {
    console.error("PIN change error:", error);
    return res.status(500).json({ error: "Failed to change PIN" });
  }
};
