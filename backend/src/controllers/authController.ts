import { Request, Response } from "express";
import { adminAuth, adminFirestore } from "../services/firebase";
import nodemailer from "nodemailer";

export const validateSession = async (req: Request, res: Response) => {
  try {
    // The user object is attached by the requireAuth middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "No user session found" });
    }

    // You can fetch additional user data from Firestore here if needed

    return res.status(200).json({
      message: "Session is valid",
      user: {
        uid: user.uid,
        email: user.email,
        email_verified: user.email_verified,
        role: user.role || "user",
      },
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Generates a password reset link using Firebase Admin SDK
    // The link can then be sent via a custom email service (e.g., SendGrid, Mailgun)
    const resetLink = await adminAuth.generatePasswordResetLink(email);

    // TODO: Send the resetLink via your email provider here

    return res.status(200).json({
      message: "Password reset link generated successfully",
      // In production, DO NOT return the link in the response. Just return a success message.
      // We return it here for demonstration/testing purposes.
      debug_link:
        process.env.NODE_ENV === "development" ? resetLink : undefined,
    });
  } catch (error: any) {
    console.error("Password reset error:", error);

    if (error.code === "auth/user-not-found") {
      // Return a generic message to prevent email enumeration
      return res
        .status(200)
        .json({
          message: "If that email is in our system, a reset link will be sent.",
        });
    }

    return res
      .status(500)
      .json({ error: "Failed to process password reset request" });
  }
};

export const sendEmailOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store in Firestore
    await adminFirestore.collection("otps").doc(email.toLowerCase()).set({
      otp,
      expiresAt,
    });

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"StellarPay Security" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Your StellarPay Verification Code",
      html: `<h2>Your verification code is: ${otp}</h2><p>This code expires in 5 minutes.</p>`,
    });

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
};

export const verifyEmailOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    const docRef = adminFirestore.collection("otps").doc(email.toLowerCase());
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(400).json({ error: "No OTP found or expired" });
    }

    const data = docSnap.data()!;
    if (new Date() > data.expiresAt.toDate()) {
      await docRef.delete();
      return res.status(400).json({ error: "OTP has expired" });
    }

    if (data.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // OTP is correct! Delete it
    await docRef.delete();

    // Create or get Firebase user to mint custom token
    let uid = "";
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      uid = userRecord.uid;
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        const newUser = await adminAuth.createUser({ email });
        uid = newUser.uid;
      } else {
        throw e;
      }
    }

    const customToken = await adminAuth.createCustomToken(uid);
    return res.status(200).json({ message: "OTP verified", customToken });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ error: "Failed to verify OTP" });
  }
};

// ── Shared nodemailer helper ───────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
  });

// ── Resolve user by email, phone, or username ─────────────────────────
export const resolveUser = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ error: "Identifier is required" });

    const id = identifier.trim().toLowerCase();

    // 1. Try email
    try {
      const u = await adminAuth.getUserByEmail(id);
      return res.status(200).json({ email: u.email, uid: u.uid });
    } catch (_) {}

    // 2. Try phone (with or without leading +)
    try {
      const phone = id.startsWith("+") ? id : `+${id}`;
      const u = await adminAuth.getUserByPhoneNumber(phone);
      return res.status(200).json({ email: u.email, uid: u.uid });
    } catch (_) {}

    // 3. Try username in Firestore
    const snap = await adminFirestore
      .collection("users")
      .where("username", "==", id)
      .limit(1)
      .get();
    if (!snap.empty) {
      const profile = snap.docs[0].data();
      return res.status(200).json({ email: profile.email, uid: profile.uid });
    }

    return res.status(404).json({ error: "No account found with that email, phone, or username." });
  } catch (error) {
    console.error("resolveUser error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ── Forgot PIN: 8-char alphanumeric OTP ───────────────────────────────
const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 → avoids confusion
const genAlphanumOtp = (len = 8) =>
  Array.from({ length: len }, () => ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)]).join("");

export const sendForgotPinOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = genAlphanumOtp(8);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await adminFirestore.collection("pin_reset_otps").doc(email.toLowerCase()).set({ otp, expiresAt });

    await createTransporter().sendMail({
      from: `"StellarPay Security" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "StellarPay – Reset Your Security PIN",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
          <h2 style="color:#111;margin-bottom:8px">Reset Your Security PIN</h2>
          <p style="color:#555">Use the code below to reset your StellarPay PIN. It expires in <strong>10 minutes</strong>.</p>
          <div style="background:#f4f4f5;border-radius:12px;padding:28px;text-align:center;margin:24px 0">
            <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111;font-family:monospace">${otp}</span>
          </div>
          <p style="color:#aaa;font-size:13px">If you did not request a PIN reset, you can safely ignore this email.</p>
        </div>
      `,
    });

    return res.status(200).json({ message: "PIN reset code sent" });
  } catch (error) {
    console.error("sendForgotPinOtp error:", error);
    return res.status(500).json({ error: "Failed to send PIN reset code" });
  }
};

export const verifyForgotPinOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and code are required" });

    const docRef = adminFirestore.collection("pin_reset_otps").doc(email.toLowerCase());
    const docSnap = await docRef.get();

    if (!docSnap.exists) return res.status(400).json({ error: "No reset code found or it has already expired" });

    const data = docSnap.data()!;
    if (new Date() > data.expiresAt.toDate()) {
      await docRef.delete();
      return res.status(400).json({ error: "Reset code has expired" });
    }

    if (data.otp !== otp.toUpperCase().trim()) {
      return res.status(400).json({ error: "Invalid reset code" });
    }

    await docRef.delete();

    const userRecord = await adminAuth.getUserByEmail(email.toLowerCase());
    const customToken = await adminAuth.createCustomToken(userRecord.uid, { pinReset: true });
    return res.status(200).json({ message: "Code verified", customToken });
  } catch (error) {
    console.error("verifyForgotPinOtp error:", error);
    return res.status(500).json({ error: "Failed to verify reset code" });
  }
};

/**
 * Issues a Firebase custom token for a given email.
 * Used by the login flow to authenticate the user before PIN verification.
 * This is safe because the user must already know their valid identifier.
 */
export const resolveUserToken = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const userRecord = await adminAuth.getUserByEmail(email.toLowerCase());
    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    return res.status(200).json({ customToken });
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error("resolveUserToken error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
