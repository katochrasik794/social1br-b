import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type TokenType = "user" | "admin" | "password_reset";

export type JwtPayload = {
  sub: string;
  type: TokenType;
  role: string;
  purpose?: "password_reset";
};

export function signToken(payload: Omit<JwtPayload, "purpose"> & { purpose?: "password_reset" }, expiresIn?: string) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: expiresIn ?? env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function signResetToken(userId: string) {
  return jwt.sign(
    { sub: userId, type: "user", role: "user", purpose: "password_reset" } satisfies JwtPayload,
    env.JWT_SECRET,
    { expiresIn: `${env.OTP_TTL_MINUTES}m` }
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
