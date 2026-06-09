import { env } from "../config/env.js";

export function generateOtpCode(): string {
  if (env.DEV_OTP_ENABLED) {
    return env.DEV_OTP;
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function getOtpExpiry(): Date {
  return new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);
}

export function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}
