import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import { fail } from "../utils/response.js";

export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json(fail("Admin authentication required"));
  }

  try {
    const payload = verifyToken(header.slice(7));
    if (payload.type !== "admin") {
      return res.status(401).json(fail("Invalid admin token"));
    }
    req.admin = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json(fail("Invalid or expired token"));
  }
}
