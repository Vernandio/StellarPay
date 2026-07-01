import { Request, Response } from "express";
import { adminAuth } from "../services/firebase";

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
