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
