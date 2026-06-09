import { query } from "../lib/db.js";

export type Mt5GroupRow = {
  id: string;
  group_name: string;
  dedicated_name: string | null;
  description: string | null;
  company: string | null;
  currency: string | null;
  server: string | null;
  margin_call: string | null;
  margin_stop_out: string | null;
  min_deposit: string | null;
  max_deposit: string | null;
  min_withdrawal: string | null;
  max_withdrawal: string | null;
  badge_label: string | null;
  plan_description: string | null;
  spread_from: string | null;
  max_leverage_display: number | null;
  commission_text: string | null;
  min_lot_size: string | null;
  is_active: boolean;
  raw_json: Record<string, unknown>;
  last_synced_at: Date;
  created_at: Date;
  updated_at: Date;
};

export type ListGroupsParams = {
  status?: "active" | "inactive";
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

function serializeGroup(row: Mt5GroupRow) {
  return {
    id: row.id,
    groupName: row.group_name,
    dedicatedName: row.dedicated_name,
    description: row.description,
    company: row.company,
    currency: row.currency,
    server: row.server,
    marginCall: row.margin_call != null ? Number(row.margin_call) : null,
    marginStopOut: row.margin_stop_out != null ? Number(row.margin_stop_out) : null,
    minDeposit: row.min_deposit != null ? Number(row.min_deposit) : null,
    maxDeposit: row.max_deposit != null ? Number(row.max_deposit) : null,
    minWithdrawal: row.min_withdrawal != null ? Number(row.min_withdrawal) : null,
    maxWithdrawal: row.max_withdrawal != null ? Number(row.max_withdrawal) : null,
    badgeLabel: row.badge_label,
    planDescription: row.plan_description,
    spreadFrom: row.spread_from,
    maxLeverageDisplay: row.max_leverage_display ?? 500,
    commissionText: row.commission_text,
    minLotSize: row.min_lot_size ?? "0.01 Lots",
    isActive: row.is_active,
    rawJson: row.raw_json,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findGroupByName(groupName: string) {
  const result = await query<Mt5GroupRow>(`SELECT * FROM mt5_groups WHERE group_name = $1 LIMIT 1`, [groupName]);
  return result.rows[0] ?? null;
}

export async function findGroupById(id: string) {
  const result = await query<Mt5GroupRow>(`SELECT * FROM mt5_groups WHERE id = $1 LIMIT 1`, [id]);
  const row = result.rows[0];
  return row ? serializeGroup(row) : null;
}

export async function listGroups(params: ListGroupsParams) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 10));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.status === "active") {
    conditions.push(`is_active = TRUE`);
  } else if (params.status === "inactive") {
    conditions.push(`is_active = FALSE`);
  }

  if (params.search?.trim()) {
    conditions.push(
      `(group_name ILIKE $${idx} OR dedicated_name ILIKE $${idx} OR company ILIKE $${idx})`
    );
    values.push(`%${params.search.trim()}%`);
    idx++;
  }

  if (params.from) {
    conditions.push(`last_synced_at >= $${idx}`);
    values.push(new Date(params.from));
    idx++;
  }

  if (params.to) {
    conditions.push(`last_synced_at <= $${idx}`);
    values.push(new Date(params.to));
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM mt5_groups ${where}`,
    values
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const rowsResult = await query<Mt5GroupRow>(
    `SELECT * FROM mt5_groups ${where}
     ORDER BY last_synced_at DESC, group_name ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return {
    items: rowsResult.rows.map(serializeGroup),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function countGroupsByStatus() {
  const result = await query<{ active: string; inactive: string }>(
    `SELECT
      COUNT(*) FILTER (WHERE is_active = TRUE)::text AS active,
      COUNT(*) FILTER (WHERE is_active = FALSE)::text AS inactive
     FROM mt5_groups`
  );
  return {
    active: Number(result.rows[0]?.active ?? 0),
    inactive: Number(result.rows[0]?.inactive ?? 0),
  };
}

export async function insertGroup(data: {
  groupName: string;
  dedicatedName: string | null;
  description: string | null;
  company: string | null;
  currency: string | null;
  server: string | null;
  marginCall: number | null;
  marginStopOut: number | null;
  isActive: boolean;
  rawJson: Record<string, unknown>;
}) {
  const result = await query<Mt5GroupRow>(
    `INSERT INTO mt5_groups (
      group_name, dedicated_name, description, company, currency, server,
      margin_call, margin_stop_out, is_active, raw_json, last_synced_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
    RETURNING *`,
    [
      data.groupName,
      data.dedicatedName,
      data.description,
      data.company,
      data.currency,
      data.server,
      data.marginCall,
      data.marginStopOut,
      data.isActive,
      JSON.stringify(data.rawJson),
    ]
  );
  return serializeGroup(result.rows[0]);
}

export async function updateGroupApiFields(
  id: string,
  data: {
    description: string | null;
    company: string | null;
    currency: string | null;
    server: string | null;
    marginCall: number | null;
    marginStopOut: number | null;
    rawJson: Record<string, unknown>;
  }
) {
  const result = await query<Mt5GroupRow>(
    `UPDATE mt5_groups SET
      description = $2,
      company = $3,
      currency = $4,
      server = $5,
      margin_call = $6,
      margin_stop_out = $7,
      raw_json = $8,
      last_synced_at = NOW(),
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.description,
      data.company,
      data.currency,
      data.server,
      data.marginCall,
      data.marginStopOut,
      JSON.stringify(data.rawJson),
    ]
  );
  return result.rows[0] ? serializeGroup(result.rows[0]) : null;
}

export async function updateGroupForceFields(
  id: string,
  data: {
    description: string | null;
    company: string | null;
    currency: string | null;
    server: string | null;
    marginCall: number | null;
    marginStopOut: number | null;
    rawJson: Record<string, unknown>;
  }
) {
  return updateGroupApiFields(id, data);
}

export async function updateGroupAdminFields(
  id: string,
  data: Partial<{
    dedicatedName: string | null;
    marginCall: number | null;
    marginStopOut: number | null;
    minDeposit: number | null;
    maxDeposit: number | null;
    minWithdrawal: number | null;
    maxWithdrawal: number | null;
    badgeLabel: string | null;
    planDescription: string | null;
    spreadFrom: string | null;
    maxLeverageDisplay: number | null;
    commissionText: string | null;
    minLotSize: string | null;
    isActive: boolean;
  }>
) {
  const fields: string[] = [];
  const values: unknown[] = [id];
  let idx = 2;

  const map: Record<string, unknown> = {
    dedicatedName: data.dedicatedName,
    marginCall: data.marginCall,
    marginStopOut: data.marginStopOut,
    minDeposit: data.minDeposit,
    maxDeposit: data.maxDeposit,
    minWithdrawal: data.minWithdrawal,
    maxWithdrawal: data.maxWithdrawal,
    badgeLabel: data.badgeLabel,
    planDescription: data.planDescription,
    spreadFrom: data.spreadFrom,
    maxLeverageDisplay: data.maxLeverageDisplay,
    commissionText: data.commissionText,
    minLotSize: data.minLotSize,
    isActive: data.isActive,
  };

  const columnMap: Record<string, string> = {
    dedicatedName: "dedicated_name",
    marginCall: "margin_call",
    marginStopOut: "margin_stop_out",
    minDeposit: "min_deposit",
    maxDeposit: "max_deposit",
    minWithdrawal: "min_withdrawal",
    maxWithdrawal: "max_withdrawal",
    badgeLabel: "badge_label",
    planDescription: "plan_description",
    spreadFrom: "spread_from",
    maxLeverageDisplay: "max_leverage_display",
    commissionText: "commission_text",
    minLotSize: "min_lot_size",
    isActive: "is_active",
  };

  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${columnMap[key]} = $${idx}`);
      values.push(value);
      idx++;
    }
  }

  if (!fields.length) return findGroupById(id);

  const result = await query<Mt5GroupRow>(
    `UPDATE mt5_groups SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0] ? serializeGroup(result.rows[0]) : null;
}

export async function deleteGroupsNotInNames(names: string[]) {
  if (!names.length) {
    const result = await query(`DELETE FROM mt5_groups RETURNING id`);
    return result.rowCount ?? 0;
  }
  const result = await query(`DELETE FROM mt5_groups WHERE group_name <> ALL($1::text[]) RETURNING id`, [names]);
  return result.rowCount ?? 0;
}

export async function deleteGroupById(id: string) {
  const result = await query(`DELETE FROM mt5_groups WHERE id = $1 RETURNING id`, [id]);
  return (result.rowCount ?? 0) > 0;
}
