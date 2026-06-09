import { query } from "../lib/db.js";

export type CommissionLedgerRow = {
  id: string;
  subscription_id: string;
  master_id: string;
  copier_user_id: string;
  copier_profit: string;
  commission_pct: string;
  commission_amount: string;
  status: "accrued" | "paid" | "cancelled";
  note: string | null;
  created_at: Date;
  paid_at: Date | null;
};

function serialize(row: CommissionLedgerRow) {
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
    masterId: row.master_id,
    copierUserId: row.copier_user_id,
    copierProfit: Number(row.copier_profit),
    commissionPct: Number(row.commission_pct),
    commissionAmount: Number(row.commission_amount),
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

export async function insertCommissionAccrual(data: {
  subscriptionId: string;
  masterId: string;
  copierUserId: string;
  copierProfit: number;
  commissionPct: number;
  commissionAmount: number;
  note?: string;
}) {
  const result = await query<CommissionLedgerRow>(
    `INSERT INTO copier_commission_ledger (
      subscription_id, master_id, copier_user_id,
      copier_profit, commission_pct, commission_amount, note
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
    [
      data.subscriptionId,
      data.masterId,
      data.copierUserId,
      data.copierProfit,
      data.commissionPct,
      data.commissionAmount,
      data.note ?? null,
    ]
  );
  return serialize(result.rows[0]);
}

export async function getMasterCommissionSummary(masterId: string) {
  const result = await query<{
    total_accrued: string;
    total_paid: string;
    pending_payout: string;
    copier_count: string;
  }>(
    `SELECT
      COALESCE(SUM(commission_amount) FILTER (WHERE status IN ('accrued', 'paid')), 0)::text AS total_accrued,
      COALESCE(SUM(commission_amount) FILTER (WHERE status = 'paid'), 0)::text AS total_paid,
      COALESCE(SUM(commission_amount) FILTER (WHERE status = 'accrued'), 0)::text AS pending_payout,
      COUNT(DISTINCT copier_user_id)::text AS copier_count
     FROM copier_commission_ledger
     WHERE master_id = $1`,
    [masterId]
  );
  const row = result.rows[0];
  return {
    totalAccrued: Number(row?.total_accrued ?? 0),
    totalPaid: Number(row?.total_paid ?? 0),
    pendingPayout: Number(row?.pending_payout ?? 0),
    copierCount: Number(row?.copier_count ?? 0),
  };
}

export async function listCommissionByMaster(masterId: string, limit = 50) {
  const result = await query<
    CommissionLedgerRow & {
      copier_email: string;
      account_number: string;
    }
  >(
    `SELECT ccl.*, u.email AS copier_email, ta.account_number
     FROM copier_commission_ledger ccl
     JOIN users u ON u.id = ccl.copier_user_id
     JOIN copier_subscriptions cs ON cs.id = ccl.subscription_id
     JOIN trading_accounts ta ON ta.id = cs.trading_account_id
     WHERE ccl.master_id = $1
     ORDER BY ccl.created_at DESC
     LIMIT $2`,
    [masterId, limit]
  );
  return result.rows.map((r) => ({
    ...serialize(r),
    copierEmail: r.copier_email,
    copierAccountLogin: String(r.account_number),
  }));
}

export async function getCommissionByCopierForMaster(masterId: string) {
  const result = await query<{
    copier_user_id: string;
    copier_email: string;
    subscription_id: string;
    commission_pct: string;
    total_copier_profit: string;
    total_commission: string;
    pending_commission: string;
  }>(
    `SELECT
      cs.copier_user_id,
      u.email AS copier_email,
      cs.id AS subscription_id,
      cs.commission_from_copier_pct::text AS commission_pct,
      COALESCE(SUM(ccl.copier_profit), 0)::text AS total_copier_profit,
      COALESCE(SUM(ccl.commission_amount), 0)::text AS total_commission,
      COALESCE(SUM(ccl.commission_amount) FILTER (WHERE ccl.status = 'accrued'), 0)::text AS pending_commission
     FROM copier_subscriptions cs
     JOIN users u ON u.id = cs.copier_user_id
     LEFT JOIN copier_commission_ledger ccl ON ccl.subscription_id = cs.id
     WHERE cs.master_id = $1 AND cs.status = 'active'
     GROUP BY cs.id, cs.copier_user_id, u.email, cs.commission_from_copier_pct
     ORDER BY total_commission DESC`,
    [masterId]
  );
  return result.rows.map((r) => ({
    copierUserId: r.copier_user_id,
    copierEmail: r.copier_email,
    subscriptionId: r.subscription_id,
    commissionFromCopierPct: Number(r.commission_pct),
    totalCopierProfit: Number(r.total_copier_profit),
    totalCommissionEarned: Number(r.total_commission),
    pendingCommission: Number(r.pending_commission),
  }));
}
