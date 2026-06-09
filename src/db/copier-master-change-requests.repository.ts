import { query } from "../lib/db.js";

export type ChangeRequestRow = {
  id: string;
  master_id: string;
  user_id: string;
  trading_account_id: string;
  display_name: string;
  headline: string;
  strategy_summary: string;
  strategy_detail: string | null;
  risk_profile: "low" | "medium" | "high";
  commission_pct: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  applied_at: Date;
  reviewed_at: Date | null;
  reviewed_by: string | null;
};

export function serializeChangeRequest(row: ChangeRequestRow) {
  return {
    id: row.id,
    masterId: row.master_id,
    userId: row.user_id,
    tradingAccountId: row.trading_account_id,
    displayName: row.display_name,
    headline: row.headline,
    strategySummary: row.strategy_summary,
    strategyDetail: row.strategy_detail,
    riskProfile: row.risk_profile,
    commissionPct: Number(row.commission_pct),
    status: row.status,
    rejectionReason: row.rejection_reason,
    appliedAt: row.applied_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  };
}

export async function findPendingChangeRequestByMasterId(masterId: string) {
  const result = await query<ChangeRequestRow>(
    `SELECT * FROM copier_master_change_requests WHERE master_id = $1 AND status = 'pending' LIMIT 1`,
    [masterId]
  );
  return result.rows[0] ?? null;
}

export async function findChangeRequestById(id: string) {
  const result = await query<ChangeRequestRow>(
    `SELECT * FROM copier_master_change_requests WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function insertChangeRequest(data: {
  masterId: string;
  userId: string;
  tradingAccountId: string;
  displayName: string;
  headline: string;
  strategySummary: string;
  strategyDetail?: string | null;
  riskProfile: "low" | "medium" | "high";
  commissionPct: number;
  minCopyAmount?: number;
}) {
  const result = await query<ChangeRequestRow>(
    `INSERT INTO copier_master_change_requests (
      master_id, user_id, trading_account_id, display_name, headline,
      strategy_summary, strategy_detail, risk_profile, commission_pct, min_copy_amount
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      data.masterId,
      data.userId,
      data.tradingAccountId,
      data.displayName,
      data.headline,
      data.strategySummary,
      data.strategyDetail ?? null,
      data.riskProfile,
      data.commissionPct,
      data.minCopyAmount ?? 25,
    ]
  );
  return result.rows[0];
}

export async function listPendingChangeRequestAccountIds() {
  const result = await query<{ trading_account_id: string }>(
    `SELECT trading_account_id FROM copier_master_change_requests WHERE status = 'pending'`
  );
  return result.rows.map((r) => r.trading_account_id);
}

export async function listAllChangeRequestsForAdmin() {
  const result = await query<
    ChangeRequestRow & {
      user_email: string;
      account_number: string;
      current_account_number: string | null;
    }
  >(
    `SELECT cr.*, u.email AS user_email, ta.account_number,
            cur.account_number AS current_account_number
     FROM copier_master_change_requests cr
     JOIN users u ON u.id = cr.user_id
     JOIN trading_accounts ta ON ta.id = cr.trading_account_id
     LEFT JOIN LATERAL (
       SELECT ta2.account_number
       FROM copier_master_accounts cma
       JOIN trading_accounts ta2 ON ta2.id = cma.trading_account_id
       WHERE cma.master_id = cr.master_id
       ORDER BY cma.is_primary DESC, cma.created_at ASC
       LIMIT 1
     ) cur ON TRUE
     ORDER BY cr.applied_at DESC`
  );
  return result.rows;
}

export async function approveChangeRequest(id: string, adminId: string) {
  const result = await query<ChangeRequestRow>(
    `UPDATE copier_master_change_requests
     SET status = 'approved', reviewed_at = NOW(), reviewed_by = $2, updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, adminId]
  );
  return result.rows[0] ?? null;
}

export async function rejectChangeRequest(id: string, adminId: string, reason: string) {
  const result = await query<ChangeRequestRow>(
    `UPDATE copier_master_change_requests
     SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $2, rejection_reason = $3, updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, adminId, reason]
  );
  return result.rows[0] ?? null;
}

export async function findPendingChangeRequestWithAccount(masterId: string) {
  const result = await query<
    ChangeRequestRow & { account_number: string; balance: string; equity: string }
  >(
    `SELECT cr.*, ta.account_number, ta.balance, ta.equity
     FROM copier_master_change_requests cr
     JOIN trading_accounts ta ON ta.id = cr.trading_account_id
     WHERE cr.master_id = $1 AND cr.status = 'pending'
     LIMIT 1`,
    [masterId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...serializeChangeRequest(row),
    accountNumber: Number(row.account_number),
    balance: Number(row.balance),
    equity: Number(row.equity),
  };
}
