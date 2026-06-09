import pg from "pg";
import { env } from "../config/env.js";

const globalForDb = globalThis as unknown as { pgPool: pg.Pool | undefined };

export const pool =
  globalForDb.pgPool ??
  new pg.Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function getClient() {
  return pool.connect();
}

export async function testConnection() {
  await pool.query("SELECT 1");
}
