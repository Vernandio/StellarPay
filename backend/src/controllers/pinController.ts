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

export const verifyPin = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: "PIN is required" });

    const securityRef = adminFirestore.collection("users").doc(uid).collection("security").doc("pin");
    const doc = await securityRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "No PIN set for this account" });
    }

    const { pinHash } = doc.data() as { pinHash: string };
    const isValid = await bcrypt.compare(pin, pinHash);

    if (!isValid) {
      return res.status(401).json({ error: "Incorrect PIN" });
    }

    return res.status(200).json({ message: "PIN verified", valid: true });
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
    });

    return res.status(200).json({ message: "PIN changed successfully" });
  } catch (error) {
    console.error("PIN change error:", error);
    return res.status(500).json({ error: "Failed to change PIN" });
  }
};
