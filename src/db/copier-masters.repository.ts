import { query, getClient } from "../lib/db.js";

export type CopierMasterRow = {
  id: string;
  user_id: string;
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
  created_at: Date;
  updated_at: Date;
};

export function serializeMaster(row: CopierMasterRow) {
  return {
    id: row.id,
    userId: row.user_id,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findMasterByUserId(userId: string) {
  const result = await query<CopierMasterRow>(`SELECT * FROM copier_masters WHERE user_id = $1`, [userId]);
  return result.rows[0] ?? null;
}

export async function findMasterUserEmail(masterId: string) {
  const result = await query<{ email: string }>(
    `SELECT u.email
     FROM copier_masters cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.id = $1`,
    [masterId]
  );
  return result.rows[0] ?? null;
}

export async function findMasterById(id: string) {
  const result = await query<CopierMasterRow>(`SELECT * FROM copier_masters WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function upsertMasterApplication(data: {
  userId: string;
  displayName: string;
  headline: string;
  strategySummary: string;
  strategyDetail?: string | null;
  riskProfile: "low" | "medium" | "high";
  commissionPct: number;
}) {
  const result = await query<CopierMasterRow>(
    `INSERT INTO copier_masters (
      user_id, display_name, headline, strategy_summary, strategy_detail,
      risk_profile, commission_pct, status, applied_at, rejection_reason, reviewed_at, reviewed_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW(),NULL,NULL,NULL)
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      headline = EXCLUDED.headline,
      strategy_summary = EXCLUDED.strategy_summary,
      strategy_detail = EXCLUDED.strategy_detail,
      risk_profile = EXCLUDED.risk_profile,
      commission_pct = EXCLUDED.commission_pct,
      status = 'pending',
      rejection_reason = NULL,
      applied_at = NOW(),
      reviewed_at = NULL,
      reviewed_by = NULL,
      updated_at = NOW()
    RETURNING *`,
    [
      data.userId,
      data.displayName,
      data.headline,
      data.strategySummary,
      data.strategyDetail ?? null,
      data.riskProfile,
      data.commissionPct,
    ]
  );
  return result.rows[0];
}

export type MasterAccountProfileInput = {
  displayName: string;
  headline: string;
  strategySummary: string;
  strategyDetail?: string | null;
  riskProfile: "low" | "medium" | "high";
  commissionPct: number;
  minCopyAmount?: number;
  publicProfile?: boolean;
  acceptNewCopiers?: boolean;
};

export async function addMasterAccount(
  masterId: string,
  tradingAccountId: string,
  profile: MasterAccountProfileInput
) {
  const result = await query<{ id: string }>(
    `INSERT INTO copier_master_accounts (
      master_id, trading_account_id, is_primary,
      display_name, headline, strategy_summary, strategy_detail,
      risk_profile, commission_pct, min_copy_amount, public_profile, accept_new_copiers
    ) VALUES (
      $1, $2,
      (SELECT NOT EXISTS (SELECT 1 FROM copier_master_accounts WHERE master_id = $1)),
      $3, $4, $5, $6, $7, $8, $9, $10, $11
    )
    ON CONFLICT (master_id, trading_account_id) DO NOTHING
    RETURNING id`,
    [
      masterId,
      tradingAccountId,
      profile.displayName,
      profile.headline,
      profile.strategySummary,
      profile.strategyDetail ?? null,
      profile.riskProfile,
      profile.commissionPct,
      profile.minCopyAmount ?? 25,
      profile.publicProfile ?? true,
      profile.acceptNewCopiers ?? true,
    ]
  );
  return result.rows[0] ?? null;
}

export async function replaceMasterAccounts(
  masterId: string,
  accounts: { tradingAccountId: string; profile: MasterAccountProfileInput }[]
) {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM copier_master_accounts WHERE master_id = $1`, [masterId]);
    for (let i = 0; i < accounts.length; i++) {
      const { tradingAccountId, profile } = accounts[i];
      await client.query(
        `INSERT INTO copier_master_accounts (
          master_id, trading_account_id, is_primary,
          display_name, headline, strategy_summary, strategy_detail,
          risk_profile, commission_pct, min_copy_amount, public_profile, accept_new_copiers
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          masterId,
          tradingAccountId,
          i === 0,
          profile.displayName,
          profile.headline,
          profile.strategySummary,
          profile.strategyDetail ?? null,
          profile.riskProfile,
          profile.commissionPct,
          profile.minCopyAmount ?? 25,
          profile.publicProfile ?? true,
          profile.acceptNewCopiers ?? true,
        ]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function serializeLinkedAccount(r: {
  id: string;
  trading_account_id: string;
  is_primary: boolean;
  account_number: string;
  platform: string;
  balance: string;
  equity: string;
  account_status: string;
  display_name: string | null;
  headline: string | null;
  strategy_summary: string | null;
  strategy_detail: string | null;
  risk_profile: "low" | "medium" | "high" | null;
  commission_pct: string | null;
  min_copy_amount: string | null;
  public_profile: boolean | null;
  accept_new_copiers: boolean | null;
}) {
  return {
    id: r.trading_account_id,
    linkId: r.id,
    accountNumber: Number(r.account_number),
    platform: r.platform,
    balance: Number(r.balance),
    equity: Number(r.equity),
    accountStatus: r.account_status,
    isPrimary: r.is_primary,
    displayName: r.display_name ?? "",
    headline: r.headline ?? "",
    strategySummary: r.strategy_summary ?? "",
    strategyDetail: r.strategy_detail,
    riskProfile: r.risk_profile ?? ("medium" as const),
    commissionPct: Number(r.commission_pct ?? 0),
    minCopyAmount: Number(r.min_copy_amount ?? 25),
    publicProfile: r.public_profile ?? true,
    acceptNewCopiers: r.accept_new_copiers ?? true,
  };
}

export async function listMasterAccounts(masterId: string) {
  const result = await query<{
    id: string;
    master_id: string;
    trading_account_id: string;
    is_primary: boolean;
    account_number: string;
    platform: string;
    balance: string;
    equity: string;
    account_status: string;
    display_name: string | null;
    headline: string | null;
    strategy_summary: string | null;
    strategy_detail: string | null;
    risk_profile: "low" | "medium" | "high" | null;
    commission_pct: string | null;
    min_copy_amount: string | null;
    public_profile: boolean | null;
    accept_new_copiers: boolean | null;
  }>(
    `SELECT cma.*, ta.account_number, ta.platform, ta.balance, ta.equity, ta.account_status
     FROM copier_master_accounts cma
     JOIN trading_accounts ta ON ta.id = cma.trading_account_id
     WHERE cma.master_id = $1
     ORDER BY cma.is_primary DESC, cma.created_at ASC`,
    [masterId]
  );
  return result.rows.map(serializeLinkedAccount);
}

export async function listRatedMasterAccounts() {
  const result = await query<{
    link_id: string;
    master_id: string;
    trading_account_id: string;
    account_number: string;
    balance: string;
    display_name: string | null;
    headline: string | null;
    strategy_summary: string | null;
    strategy_detail: string | null;
    risk_profile: "low" | "medium" | "high" | null;
    commission_pct: string | null;
    min_copy_amount: string | null;
    copiers_count: string;
  }>(
    `SELECT cma.id AS link_id,
            cma.master_id,
            cma.trading_account_id,
            ta.account_number,
            ta.balance,
            cma.display_name,
            cma.headline,
            cma.strategy_summary,
            cma.strategy_detail,
            cma.risk_profile,
            cma.commission_pct,
            cma.min_copy_amount,
            (
              SELECT COUNT(*)::text
              FROM copier_subscriptions cs
              WHERE cs.master_id = cma.master_id AND cs.status = 'active'
            ) AS copiers_count
     FROM copier_master_accounts cma
     JOIN copier_masters cm ON cm.id = cma.master_id
     JOIN trading_accounts ta ON ta.id = cma.trading_account_id
     WHERE cm.status = 'approved'
       AND COALESCE(cma.public_profile, TRUE) = TRUE
     ORDER BY cma.created_at DESC`
  );
  return result.rows;
}

export async function listApprovedMasters() {
  const result = await query<
    CopierMasterRow & {
      user_email: string;
      copiers_count: string;
      total_balance: string | null;
    }
  >(
    `SELECT cm.*, u.email AS user_email,
            COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'active')::text AS copiers_count,
            COALESCE(SUM(ta.balance), 0)::text AS total_balance
     FROM copier_masters cm
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN copier_subscriptions cs ON cs.master_id = cm.id
     LEFT JOIN copier_master_accounts cma ON cma.master_id = cm.id
     LEFT JOIN trading_accounts ta ON ta.id = cma.trading_account_id
     WHERE cm.status = 'approved'
     GROUP BY cm.id, u.email
     ORDER BY cm.applied_at DESC`
  );
  return result.rows;
}

export async function listAllMastersForAdmin() {
  const result = await query<
    CopierMasterRow & {
      user_email: string;
      followers_count: string;
      total_balance: string | null;
      primary_account_number: string | null;
      primary_display_name: string | null;
    }
  >(
    `SELECT cm.*, u.email AS user_email,
            COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'active')::text AS followers_count,
            COALESCE(SUM(ta.balance), 0)::text AS total_balance,
            (
              SELECT ta2.account_number
              FROM copier_master_accounts cma2
              JOIN trading_accounts ta2 ON ta2.id = cma2.trading_account_id
              WHERE cma2.master_id = cm.id
              ORDER BY cma2.is_primary DESC, cma2.created_at ASC
              LIMIT 1
            ) AS primary_account_number,
            (
              SELECT COALESCE(cma2.display_name, cm.display_name)
              FROM copier_master_accounts cma2
              WHERE cma2.master_id = cm.id
              ORDER BY cma2.is_primary DESC, cma2.created_at ASC
              LIMIT 1
            ) AS primary_display_name
     FROM copier_masters cm
     JOIN users u ON u.id = cm.user_id
     LEFT JOIN copier_subscriptions cs ON cs.master_id = cm.id
     LEFT JOIN copier_master_accounts cma ON cma.master_id = cm.id
     LEFT JOIN trading_accounts ta ON ta.id = cma.trading_account_id
     GROUP BY cm.id, u.email
     ORDER BY cm.applied_at DESC`
  );
  return result.rows;
}

export async function listMasterTradingAccountIdsForUser(userId: string) {
  const result = await query<{ trading_account_id: string }>(
    `SELECT cma.trading_account_id
     FROM copier_master_accounts cma
     JOIN copier_masters cm ON cm.id = cma.master_id
     WHERE cm.user_id = $1 AND cm.status IN ('pending', 'approved')`,
    [userId]
  );
  return result.rows.map((r) => r.trading_account_id);
}

export async function findMasterAccountLink(masterId: string, tradingAccountId: string) {
  const result = await query<{ id: string }>(
    `SELECT cma.id
     FROM copier_master_accounts cma
     JOIN copier_masters cm ON cm.id = cma.master_id
     WHERE cma.master_id = $1 AND cma.trading_account_id = $2 AND cm.status = 'approved'`,
    [masterId, tradingAccountId]
  );
  return result.rows[0] ?? null;
}

export async function findApprovedMasterAccountByTradingAccountId(tradingAccountId: string) {
  const result = await query<{ master_id: string; user_id: string }>(
    `SELECT cma.master_id, cm.user_id
     FROM copier_master_accounts cma
     JOIN copier_masters cm ON cm.id = cma.master_id
     WHERE cma.trading_account_id = $1 AND cm.status = 'approved'`,
    [tradingAccountId]
  );
  return result.rows[0] ?? null;
}

export async function listLinkedAccountsForAdmin() {
  const result = await query<{
    link_id: string;
    master_id: string;
    trading_account_id: string;
    linked_at: Date;
    display_name: string;
    headline: string | null;
    strategy_summary: string | null;
    user_email: string;
    commission_pct: string;
    risk_profile: "low" | "medium" | "high";
    min_copy_amount: string;
    account_number: string;
    platform: string;
    balance: string;
    equity: string;
    followers_count: string;
    is_primary: boolean;
  }>(
    `SELECT cma.id AS link_id,
            cma.master_id,
            cma.trading_account_id,
            cma.created_at AS linked_at,
            cma.is_primary,
            COALESCE(cma.display_name, cm.display_name) AS display_name,
            cma.headline,
            cma.strategy_summary,
            u.email AS user_email,
            COALESCE(cma.commission_pct, cm.commission_pct) AS commission_pct,
            COALESCE(cma.risk_profile, cm.risk_profile) AS risk_profile,
            COALESCE(cma.min_copy_amount, 25) AS min_copy_amount,
            ta.account_number,
            ta.platform,
            ta.balance,
            ta.equity,
            (
              SELECT COUNT(*)::text
              FROM copier_subscriptions cs
              WHERE cs.master_id = cm.id AND cs.status = 'active'
            ) AS followers_count
     FROM copier_master_accounts cma
     JOIN copier_masters cm ON cm.id = cma.master_id
     JOIN users u ON u.id = cm.user_id
     JOIN trading_accounts ta ON ta.id = cma.trading_account_id
     WHERE cm.status = 'approved'
     ORDER BY cma.created_at DESC`
  );
  return result.rows;
}

export async function updateApprovedMasterProfile(
  id: string,
  data: {
    displayName: string;
    headline: string;
    strategySummary: string;
    strategyDetail?: string | null;
    riskProfile: "low" | "medium" | "high";
    commissionPct: number;
  }
) {
  const result = await query<CopierMasterRow>(
    `UPDATE copier_masters
     SET display_name = $2, headline = $3, strategy_summary = $4, strategy_detail = $5,
         risk_profile = $6, commission_pct = $7, updated_at = NOW()
     WHERE id = $1 AND status = 'approved'
     RETURNING *`,
    [
      id,
      data.displayName,
      data.headline,
      data.strategySummary,
      data.strategyDetail ?? null,
      data.riskProfile,
      data.commissionPct,
    ]
  );
  return result.rows[0] ?? null;
}

export async function approveMaster(id: string, adminId: string) {
  const result = await query<CopierMasterRow>(
    `UPDATE copier_masters
     SET status = 'approved', reviewed_at = NOW(), reviewed_by = $2, rejection_reason = NULL, updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, adminId]
  );
  return result.rows[0] ?? null;
}

export async function rejectMaster(id: string, adminId: string, reason: string) {
  const result = await query<CopierMasterRow>(
    `UPDATE copier_masters
     SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $2, rejection_reason = $3, updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, adminId, reason]
  );
  return result.rows[0] ?? null;
}

/** Trading accounts linked to pending/approved masters or reserved by pending change requests. */
export async function listRegisteredMasterTradingAccountIds(excludeMasterId?: string) {
  const values: unknown[] = [];
  let excludeClause = "";
  if (excludeMasterId) {
    values.push(excludeMasterId);
    excludeClause = `AND cm.id != $1`;
  }
  const result = await query<{ trading_account_id: string }>(
    `SELECT DISTINCT trading_account_id FROM (
      SELECT cma.trading_account_id
      FROM copier_master_accounts cma
      JOIN copier_masters cm ON cm.id = cma.master_id
      WHERE cm.status IN ('pending', 'approved')
      ${excludeClause}
      UNION
      SELECT cr.trading_account_id
      FROM copier_master_change_requests cr
      WHERE cr.status = 'pending'
      ${excludeMasterId ? `AND cr.master_id != $1` : ""}
    ) reserved`,
    values
  );
  return result.rows.map((r) => r.trading_account_id);
}

export async function countCopiersForMaster(masterId: string) {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM copier_subscriptions WHERE master_id = $1 AND status = 'active'`,
    [masterId]
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function findMasterAccountForUser(masterId: string, userId: string, tradingAccountId: string) {
  const result = await query<{ id: string; is_primary: boolean }>(
    `SELECT cma.id, cma.is_primary
     FROM copier_master_accounts cma
     JOIN copier_masters cm ON cm.id = cma.master_id
     WHERE cma.master_id = $1 AND cm.user_id = $2 AND cma.trading_account_id = $3 AND cm.status = 'approved'`,
    [masterId, userId, tradingAccountId]
  );
  return result.rows[0] ?? null;
}

export async function updateMasterAccountProfile(
  masterId: string,
  tradingAccountId: string,
  data: MasterAccountProfileInput & { publicProfile: boolean; acceptNewCopiers: boolean }
) {
  const result = await query<{ id: string; is_primary: boolean }>(
    `UPDATE copier_master_accounts
     SET display_name = $3,
         headline = $4,
         strategy_summary = $5,
         strategy_detail = $6,
         risk_profile = $7,
         commission_pct = $8,
         min_copy_amount = $9,
         public_profile = $10,
         accept_new_copiers = $11
     WHERE master_id = $1 AND trading_account_id = $2
     RETURNING id, is_primary`,
    [
      masterId,
      tradingAccountId,
      data.displayName,
      data.headline,
      data.strategySummary,
      data.strategyDetail ?? null,
      data.riskProfile,
      data.commissionPct,
      data.minCopyAmount ?? 25,
      data.publicProfile,
      data.acceptNewCopiers,
    ]
  );
  return result.rows[0] ?? null;
}
