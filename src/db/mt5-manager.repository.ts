import { query } from "../lib/db.js";

export type Mt5ManagerConfigRow = {
  id: string;
  label: string;
  api_key: string;
  mt5_login: number;
  mt5_password: string;
  mt5_server: string;
  is_active: boolean;
  last_tested_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export async function getActiveManagerConfig() {
  const result = await query<Mt5ManagerConfigRow>(
    `SELECT * FROM mt5_manager_configs WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 1`
  );
  return result.rows[0] ?? null;
}

export async function listManagerConfigs() {
  const result = await query<Mt5ManagerConfigRow>(
    `SELECT * FROM mt5_manager_configs ORDER BY is_active DESC, updated_at DESC`
  );
  return result.rows;
}

export async function findManagerConfigById(id: string) {
  const result = await query<Mt5ManagerConfigRow>(
    `SELECT * FROM mt5_manager_configs WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function upsertActiveManagerConfig(data: {
  label: string;
  apiKey: string;
  mt5Login: number;
  mt5Password: string;
  mt5Server: string;
}) {
  await query(`UPDATE mt5_manager_configs SET is_active = FALSE WHERE is_active = TRUE`);

  const result = await query<Mt5ManagerConfigRow>(
    `INSERT INTO mt5_manager_configs (label, api_key, mt5_login, mt5_password, mt5_server, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING *`,
    [data.label, data.apiKey, data.mt5Login, data.mt5Password, data.mt5Server]
  );
  return result.rows[0];
}

export async function updateManagerLastTested(id: string) {
  await query(`UPDATE mt5_manager_configs SET last_tested_at = NOW(), updated_at = NOW() WHERE id = $1`, [id]);
}

export async function countManagerConfigs() {
  const result = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM mt5_manager_configs`);
  return Number(result.rows[0]?.count ?? 0);
}

export async function deleteManagerConfigById(id: string) {
  const result = await query(`DELETE FROM mt5_manager_configs WHERE id = $1 RETURNING id`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function updateManagerConfigById(
  id: string,
  data: {
    label: string;
    apiKey: string;
    mt5Login: number;
    mt5Password: string;
    mt5Server: string;
    setActive?: boolean;
  }
) {
  if (data.setActive) {
    await query(`UPDATE mt5_manager_configs SET is_active = FALSE WHERE is_active = TRUE AND id <> $1`, [id]);
  }

  const result = await query<Mt5ManagerConfigRow>(
    `UPDATE mt5_manager_configs
     SET label = $2,
         api_key = $3,
         mt5_login = $4,
         mt5_password = $5,
         mt5_server = $6,
         is_active = CASE WHEN $7 THEN TRUE ELSE is_active END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.label,
      data.apiKey,
      data.mt5Login,
      data.mt5Password,
      data.mt5Server,
      data.setActive ?? false,
    ]
  );
  return result.rows[0] ?? null;
}
