import { query } from "../lib/db.js";

export type PasswordResetRow = {
  id: string;
  user_id: string;
  otp_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
};

export async function createPasswordResetOtp(userId: string, otpHash: string, expiresAt: Date) {
  await query(
    `INSERT INTO password_reset_otps (user_id, otp_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, otpHash, expiresAt]
  );
}

export async function findLatestValidResetOtp(userId: string) {
  const result = await query<PasswordResetRow>(
    `SELECT * FROM password_reset_otps
     WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function markResetOtpUsed(id: string) {
  await query(`UPDATE password_reset_otps SET used_at = NOW() WHERE id = $1`, [id]);
}
