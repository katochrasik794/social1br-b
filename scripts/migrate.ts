import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaDir = path.join(__dirname, "schema");

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[migrate] DATABASE_URL is required");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    const files = fs
      .readdirSync(schemaDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (file !== "000_migrations.sql") {
        const tableCheck = await client.query(`SELECT to_regclass('public.schema_migrations') AS reg`);
        if (tableCheck.rows[0]?.reg) {
          const exists = await client.query(
            "SELECT 1 FROM schema_migrations WHERE filename = $1",
            [file]
          );
          if (exists.rowCount && exists.rowCount > 0) {
            console.log(`[migrate] Skip ${file} (already applied)`);
            continue;
          }
        }
      }

      const sql = fs.readFileSync(path.join(schemaDir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        if (file !== "000_migrations.sql") {
          await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        }
        await client.query("COMMIT");
        console.log(`[migrate] Applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log("[migrate] Done");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("[migrate] Failed:", err);
  process.exit(1);
});
