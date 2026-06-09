import { query } from "../lib/db.js";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_email_verified: boolean;
  status: string;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export async function findUserByEmail(email: string) {
  const result = await query<UserRow>("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: string) {
  const result = await query<UserRow>("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
  return result.rows[0] ?? null;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}) {
  const result = await query<UserRow>(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, is_email_verified, status)
     VALUES ($1, $2, $3, $4, $5, TRUE, 'active')
     RETURNING *`,
    [data.email, data.passwordHash, data.firstName, data.lastName, data.phone]
  );
  return result.rows[0];
}

export async function updateUserLastLogin(id: string) {
  const result = await query<UserRow>(
    `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
}

export async function updateUserPassword(id: string, passwordHash: string) {
  await query(`UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`, [id, passwordHash]);
}
