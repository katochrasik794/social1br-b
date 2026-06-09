import type { Request, Response, NextFunction } from "express";

const SUSPICIOUS_PATTERNS = [
  /<script\b/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDROP\b|\bDELETE\b|\bUPDATE\b|\bOR\b\s+1\s*=\s*1)/i,
];

import { AppError } from "../utils/response.js";

/** Reject obvious XSS / SQL-injection payloads in raw body strings */
export function rejectSuspiciousInput(req: Request, _res: Response, next: NextFunction) {
  const check = (value: unknown): boolean => {
    if (typeof value === "string") {
      return SUSPICIOUS_PATTERNS.some((p) => p.test(value));
    }
    if (Array.isArray(value)) return value.some(check);
    if (value && typeof value === "object") {
      return Object.values(value).some(check);
    }
    return false;
  };

  if (req.body && check(req.body)) {
    return next(new AppError("Invalid input", 400));
  }
  next();
}
