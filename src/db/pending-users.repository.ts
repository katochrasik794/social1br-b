import { query } from "../lib/db.js";

export type PendingUserRow = {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  otp_hash: string;
  otp_expires_at: Date;
  otp_attempts: number;
  created_at: Date;
};

export async function findPendingUserByEmail(email: string) {
  const result = await query<PendingUserRow>("SELECT * FROM pending_users WHERE email = $1 LIMIT 1", [email]);
  return result.rows[0] ?? null;
}

export async function upsertPendingUser(data: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  otpHash: string;
  otpExpiresAt: Date;
}) {
  const result = await query<PendingUserRow>(
    `INSERT INTO pending_users (email, password_hash, first_name, last_name, phone, otp_hash, otp_expires_at, otp_attempts)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       phone = EXCLUDED.phone,
       otp_hash = EXCLUDED.otp_hash,
       otp_expires_at = EXCLUDED.otp_expires_at,
       otp_attempts = 0,
       created_at = NOW()
     RETURNING *`,
    [data.email, data.passwordHash, data.firstName, data.lastName, data.phone, data.otpHash, data.otpExpiresAt]
  );
  return result.rows[0];
}

export async function incrementPendingOtpAttempts(email: string) {
  await query(`UPDATE pending_users SET otp_attempts = otp_attempts + 1 WHERE email = $1`, [email]);
}

export async function deletePendingUserByEmail(email: string) {
  await query(`DELETE FROM pending_users WHERE email = $1`, [email]);
}
