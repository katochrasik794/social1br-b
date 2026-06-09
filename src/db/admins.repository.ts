import { query } from "../lib/db.js";

export type AdminRow = {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
  updated_at: Date;
};

export async function findAdminByEmail(email: string) {
  const result = await query<AdminRow>("SELECT * FROM admins WHERE email = $1 LIMIT 1", [email]);
  return result.rows[0] ?? null;
}

export async function findAdminById(id: string) {
  const result = await query<AdminRow>("SELECT * FROM admins WHERE id = $1 LIMIT 1", [id]);
  return result.rows[0] ?? null;
}
