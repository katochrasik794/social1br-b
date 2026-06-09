import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import { fail } from "../utils/response.js";

export type AuthUser = {
  id: string;
  role: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      admin?: AuthUser;
    }
  }
}

export function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json(fail("Authentication required"));
  }

  try {
    const payload = verifyToken(header.slice(7));
    if (payload.type !== "user" || payload.purpose === "password_reset") {
      return res.status(401).json(fail("Invalid token"));
    }
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json(fail("Invalid or expired token"));
  }
}

export function authenticateResetToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json(fail("Reset token required"));
  }

  try {
    const payload = verifyToken(header.slice(7));
    if (payload.type !== "user" || payload.purpose !== "password_reset") {
      return res.status(401).json(fail("Invalid reset token"));
    }
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json(fail("Invalid or expired reset token"));
  }
}
