import { query } from "../lib/db.js";

export type CopierSubscriptionRow = {
  id: string;
  copier_user_id: string;
  master_id: string;
  trading_account_id: string;
  allocation: string;
  copy_mode: "proportional" | "fixed";
  lot_multiplier: string;
  daily_loss_limit_pct: string;
  commission_from_copier_pct: string;
  status: "active" | "paused" | "stopped";
  terms_accepted_at: Date;
  created_at: Date;
  updated_at: Date;
};

function serialize(row: CopierSubscriptionRow) {
  return {
    id: row.id,
    copierUserId: row.copier_user_id,
    masterId: row.master_id,
    tradingAccountId: row.trading_account_id,
    allocation: Number(row.allocation),
    copyMode: row.copy_mode,
    lotMultiplier: Number(row.lot_multiplier),
    dailyLossLimitPct: Number(row.daily_loss_limit_pct),
    commissionFromCopierPct: Number(row.commission_from_copier_pct),
    status: row.status,
    termsAcceptedAt: row.terms_accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertSubscription(data: {
  copierUserId: string;
  masterId: string;
  tradingAccountId: string;
  allocation: number;
  copyMode: "proportional" | "fixed";
  lotMultiplier: number;
  dailyLossLimitPct: number;
  commissionFromCopierPct: number;
}) {
  const result = await query<CopierSubscriptionRow>(
    `INSERT INTO copier_subscriptions (
      copier_user_id, master_id, trading_account_id, allocation,
      copy_mode, lot_multiplier, daily_loss_limit_pct, commission_from_copier_pct, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')
    RETURNING *`,
    [
      data.copierUserId,
      data.masterId,
      data.tradingAccountId,
      data.allocation,
      data.copyMode,
      data.lotMultiplier,
      data.dailyLossLimitPct,
      data.commissionFromCopierPct,
    ]
  );
  return serialize(result.rows[0]);
}

export async function listSubscriptionsByUser(userId: string) {
  const result = await query<
    CopierSubscriptionRow & {
      master_display_name: string;
      master_commission_pct: string;
      commission_from_copier_pct: string;
      account_number: string;
      account_balance: string;
      account_equity: string;
    }
  >(
    `SELECT cs.*,
            COALESCE(primary_acct.display_name, cm.display_name) AS master_display_name,
            cm.commission_pct AS master_commission_pct,
            cs.commission_from_copier_pct,
            ta.account_number, ta.balance AS account_balance, ta.equity AS account_equity
     FROM copier_subscriptions cs
     JOIN copier_masters cm ON cm.id = cs.master_id
     JOIN trading_accounts ta ON ta.id = cs.trading_account_id
     LEFT JOIN LATERAL (
       SELECT cma.display_name
       FROM copier_master_accounts cma
       WHERE cma.master_id = cm.id
       ORDER BY cma.is_primary DESC, cma.created_at ASC
       LIMIT 1
     ) primary_acct ON TRUE
     WHERE cs.copier_user_id = $1
     ORDER BY cs.created_at DESC`,
    [userId]
  );
  return result.rows.map((r) => ({
    ...serialize(r),
    masterName: r.master_display_name,
    masterCommissionPct: Number(r.commission_from_copier_pct ?? r.master_commission_pct),
    commissionFromCopierPct: Number(r.commission_from_copier_pct ?? r.master_commission_pct),
    accountLogin: String(r.account_number),
    accountBalance: Number(r.account_balance),
    accountEquity: Number(r.account_equity),
  }));
}

export async function listFollowersByMaster(masterId: string) {
  const result = await query<
    CopierSubscriptionRow & {
      copier_email: string;
      account_number: string;
    }
  >(
    `SELECT cs.*, u.email AS copier_email, ta.account_number
     FROM copier_subscriptions cs
     JOIN users u ON u.id = cs.copier_user_id
     JOIN trading_accounts ta ON ta.id = cs.trading_account_id
     WHERE cs.master_id = $1
     ORDER BY cs.created_at DESC`,
    [masterId]
  );
  return result.rows.map((r) => ({
    ...serialize(r),
    copierEmail: r.copier_email,
    accountLogin: String(r.account_number),
  }));
}

export async function findExistingSubscription(copierUserId: string, masterId: string, tradingAccountId: string) {
  const result = await query<CopierSubscriptionRow>(
    `SELECT * FROM copier_subscriptions
     WHERE copier_user_id = $1 AND master_id = $2 AND trading_account_id = $3`,
    [copierUserId, masterId, tradingAccountId]
  );
  return result.rows[0] ?? null;
}

export async function findSubscriptionById(id: string) {
  const result = await query<CopierSubscriptionRow>(`SELECT * FROM copier_subscriptions WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}
