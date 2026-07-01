import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../services/firebase";

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: any; // You can type this properly using admin.auth.DecodedIdToken
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res
      .status(401)
      .json({ error: "Unauthorized: Token verification failed" });
  }
};

export const requireSelf = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const targetUserId = req.params.userId || req.body.userId;

  if (!req.user || (targetUserId && req.user.uid !== targetUserId)) {
    return res
      .status(403)
      .json({ error: "Forbidden: You can only access your own resources" });
  }

  next();
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Assuming you set custom claims for roles
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }

  next();
};
