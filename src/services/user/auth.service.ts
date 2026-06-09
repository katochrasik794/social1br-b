import { getClient } from "../../lib/db.js";
import * as usersRepo from "../../db/users.repository.js";
import * as pendingRepo from "../../db/pending-users.repository.js";
import * as resetRepo from "../../db/password-reset.repository.js";
import { hashPassword, verifyPassword, hashOtp, verifyOtp } from "../../utils/password.js";
import { generateOtpCode, getOtpExpiry, isExpired } from "../../utils/otp.js";
import { signToken, signResetToken, verifyToken } from "../../utils/jwt.js";
import { sendOtpEmail } from "../email.service.js";
import { AppError } from "../../utils/response.js";

function serializeUser(user: {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_email_verified: boolean;
  status: string;
  last_login_at: Date | null;
  created_at: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    isEmailVerified: user.is_email_verified,
    status: user.status,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
  };
}

const MAX_OTP_ATTEMPTS = 5;

export async function registerUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}) {
  const email = input.email.toLowerCase().trim();

  const existing = await usersRepo.findUserByEmail(email);
  if (existing) throw new AppError("Email already registered", 409);

  const passwordHash = await hashPassword(input.password);
  const otp = generateOtpCode();
  const otpHash = await hashOtp(otp);
  const otpExpiresAt = getOtpExpiry();

  await pendingRepo.upsertPendingUser({
    email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    otpHash,
    otpExpiresAt,
  });

  await sendOtpEmail({
    to: email,
    subject: "Verify your email",
    purpose: "register",
    otp,
  });

  return { email, message: "OTP sent to your email" };
}

export async function verifyRegistrationOtp(input: { email: string; otp: string }) {
  const email = input.email.toLowerCase().trim();

  const pending = await pendingRepo.findPendingUserByEmail(email);
  if (!pending) throw new AppError("Registration not found. Please register again.", 404);
  if (isExpired(pending.otp_expires_at)) throw new AppError("OTP expired. Please register again.", 400);
  if (pending.otp_attempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError("Too many failed attempts. Please register again.", 429);
  }

  const valid = await verifyOtp(input.otp, pending.otp_hash);
  if (!valid) {
    await pendingRepo.incrementPendingOtpAttempts(email);
    throw new AppError("Invalid OTP", 400);
  }

  const client = await getClient();
  let user;
  try {
    await client.query("BEGIN");
    const created = await client.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_email_verified, status, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, TRUE, 'active', NOW())
       RETURNING *`,
      [pending.email, pending.password_hash, pending.first_name, pending.last_name, pending.phone]
    );
    await client.query(`DELETE FROM pending_users WHERE email = $1`, [email]);
    await client.query("COMMIT");
    user = created.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const token = signToken({ sub: user.id, type: "user", role: "user" });
  return { token, user: serializeUser(user) };
}

export async function loginUser(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();

  const user = await usersRepo.findUserByEmail(email);
  if (!user) throw new AppError("Invalid email or password", 401);

  const valid = await verifyPassword(input.password, user.password_hash);
  if (!valid) throw new AppError("Invalid email or password", 401);

  if (user.status === "banned") throw new AppError("Account is banned", 403);
  if (user.status === "inactive") throw new AppError("Account is inactive", 403);

  const updated = await usersRepo.updateUserLastLogin(user.id);
  const token = signToken({ sub: updated.id, type: "user", role: "user" });
  return { token, user: serializeUser(updated) };
}

export async function forgotPassword(input: { email: string }) {
  const email = input.email.toLowerCase().trim();
  const user = await usersRepo.findUserByEmail(email);

  if (!user) {
    return { message: "If an account exists, an OTP has been sent" };
  }

  const otp = generateOtpCode();
  const otpHash = await hashOtp(otp);
  const expiresAt = getOtpExpiry();

  await resetRepo.createPasswordResetOtp(user.id, otpHash, expiresAt);

  await sendOtpEmail({
    to: email,
    subject: "Reset your password",
    purpose: "password_reset",
    otp,
  });

  return { message: "If an account exists, an OTP has been sent" };
}

export async function verifyResetOtp(input: { email: string; otp: string }) {
  const email = input.email.toLowerCase().trim();
  const user = await usersRepo.findUserByEmail(email);
  if (!user) throw new AppError("Invalid OTP", 400);

  const record = await resetRepo.findLatestValidResetOtp(user.id);
  if (!record) throw new AppError("Invalid or expired OTP", 400);

  const valid = await verifyOtp(input.otp, record.otp_hash);
  if (!valid) throw new AppError("Invalid OTP", 400);

  await resetRepo.markResetOtpUsed(record.id);

  const resetToken = signResetToken(user.id);
  return { resetToken };
}

export async function resetPassword(input: { resetToken: string; password: string }) {
  let payload;
  try {
    payload = verifyToken(input.resetToken);
  } catch {
    throw new AppError("Invalid or expired reset token", 400);
  }

  if (payload.purpose !== "password_reset" || payload.type !== "user") {
    throw new AppError("Invalid reset token", 400);
  }

  const passwordHash = await hashPassword(input.password);
  await usersRepo.updateUserPassword(payload.sub, passwordHash);

  return { message: "Password updated successfully" };
}

export async function getUserById(id: string) {
  const user = await usersRepo.findUserById(id);
  if (!user) throw new AppError("User not found", 404);
  return serializeUser(user);
}
