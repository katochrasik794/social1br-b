import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import pg from "pg";
import { encrypt } from "../src/utils/encrypt.js";

dotenv.config();

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[seed] DATABASE_URL is required");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;

    if (email && password) {
      const normalizedEmail = email.toLowerCase().trim();
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.query(
        `INSERT INTO admins (id, email, password_hash, role, updated_at)
         VALUES (gen_random_uuid()::text, $1, $2, 'super_admin', NOW())
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           updated_at = NOW()`,
        [normalizedEmail, passwordHash]
      );
      console.log(`[seed] Upserted super_admin: ${normalizedEmail}`);
    } else {
      console.log("[seed] Skipped admin — INITIAL_ADMIN_EMAIL/PASSWORD not set");
    }

    const apiKey = process.env.MT5_MANAGER_API_KEY;
    const mt5Login = process.env.MT5_MANAGER_LOGIN;
    const mt5Password = process.env.MT5_MANAGER_PASSWORD;
    const mt5Server = process.env.MT5_MANAGER_SERVER;

    if (apiKey && mt5Login && mt5Password && mt5Server) {
      const encryptedPassword = encrypt(mt5Password);
      const loginNum = Number(mt5Login);

      await pool.query(`UPDATE mt5_manager_configs SET is_active = FALSE WHERE is_active = TRUE`);

      await pool.query(
        `INSERT INTO mt5_manager_configs (label, api_key, mt5_login, mt5_password, mt5_server, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        ["Default", apiKey, loginNum, encryptedPassword, mt5Server]
      );
      console.log("[seed] Inserted MT5 manager config from env");
    } else {
      console.log("[seed] Skipped MT5 manager — MT5_MANAGER_* env vars not set");
    }

    console.log("[seed] Done");
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
