import { query } from "../lib/db.js";

function num(v: string | null | undefined) {
  return Number(v ?? 0);
}

export async function getPlatformOverviewStats() {
  const result = await query<{
    total_users: string;
    active_users: string;
    email_unverified: string;
    total_mt5: string;
    active_mt5: string;
    approved_masters: string;
    pending_masters: string;
    master_linked_accounts: string;
    total_deposited: string;
    master_account_deposits: string;
    copier_account_deposits: string;
    deposits_pending: string;
    deposits_rejected: string;
    deposits_mtd: string;
    deposits_today: string;
    deposits_7d_avg: string;
    total_withdrawn: string;
    withdrawals_pending: string;
    withdrawals_rejected: string;
    withdrawals_mtd: string;
    withdrawals_today: string;
    withdrawals_7d_avg: string;
    platform_aum: string;
    copier_allocated: string;
    master_balances: string;
    active_copies: string;
    active_copiers: string;
    pamm_investors: string;
    pamm_pools: string;
    pamm_invested: string;
    pamm_nav: string;
    mam_links: string;
    mam_managers: string;
    mam_aum: string;
  }>(
    `SELECT
      (SELECT COUNT(*)::text FROM users) AS total_users,
      (SELECT COUNT(*)::text FROM users WHERE status = 'active') AS active_users,
      (SELECT COUNT(*)::text FROM users WHERE is_email_verified = FALSE) AS email_unverified,
      (SELECT COUNT(*)::text FROM trading_accounts) AS total_mt5,
      (SELECT COUNT(*)::text FROM trading_accounts WHERE account_status = 'active') AS active_mt5,
      (SELECT COUNT(*)::text FROM copier_masters WHERE status = 'approved') AS approved_masters,
      (SELECT COUNT(*)::text FROM copier_masters WHERE status = 'pending') AS pending_masters,
      (SELECT COUNT(*)::text FROM copier_master_accounts cma
         JOIN copier_masters cm ON cm.id = cma.master_id WHERE cm.status = 'approved') AS master_linked_accounts,
      (SELECT COALESCE(SUM(amount), 0)::text FROM deposits WHERE status = 'approved') AS total_deposited,
      (SELECT COALESCE(SUM(d.amount), 0)::text FROM deposits d
         JOIN copier_master_accounts cma ON cma.trading_account_id = d.trading_account_id
         JOIN copier_masters cm ON cm.id = cma.master_id AND cm.status = 'approved'
         WHERE d.status = 'approved') AS master_account_deposits,
      (SELECT COALESCE(SUM(d.amount), 0)::text FROM deposits d
         WHERE d.status = 'approved'
           AND EXISTS (SELECT 1 FROM copier_subscriptions cs WHERE cs.trading_account_id = d.trading_account_id)) AS copier_account_deposits,
      (SELECT COUNT(*)::text FROM deposits WHERE status = 'pending') AS deposits_pending,
      (SELECT COUNT(*)::text FROM deposits WHERE status = 'rejected') AS deposits_rejected,
      (SELECT COALESCE(SUM(amount), 0)::text FROM deposits
         WHERE status = 'approved' AND created_at >= date_trunc('month', NOW())) AS deposits_mtd,
      (SELECT COALESCE(SUM(amount), 0)::text FROM deposits
         WHERE status = 'approved' AND created_at >= date_trunc('day', NOW())) AS deposits_today,
      (SELECT COALESCE(AVG(daily_total), 0)::text FROM (
         SELECT date_trunc('day', created_at) AS day, SUM(amount) AS daily_total
         FROM deposits WHERE status = 'approved' AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY 1
       ) s) AS deposits_7d_avg,
      (SELECT COALESCE(SUM(amount), 0)::text FROM withdrawals WHERE status = 'approved') AS total_withdrawn,
      (SELECT COUNT(*)::text FROM withdrawals WHERE status = 'pending') AS withdrawals_pending,
      (SELECT COUNT(*)::text FROM withdrawals WHERE status = 'rejected') AS withdrawals_rejected,
      (SELECT COALESCE(SUM(amount), 0)::text FROM withdrawals
         WHERE status = 'approved' AND created_at >= date_trunc('month', NOW())) AS withdrawals_mtd,
      (SELECT COALESCE(SUM(amount), 0)::text FROM withdrawals
         WHERE status = 'approved' AND created_at >= date_trunc('day', NOW())) AS withdrawals_today,
      (SELECT COALESCE(AVG(daily_total), 0)::text FROM (
         SELECT date_trunc('day', created_at) AS day, SUM(amount) AS daily_total
         FROM withdrawals WHERE status = 'approved' AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY 1
       ) s) AS withdrawals_7d_avg,
      (SELECT COALESCE(SUM(balance), 0)::text FROM trading_accounts WHERE account_status = 'active') AS platform_aum,
      (SELECT COALESCE(SUM(allocation), 0)::text FROM copier_subscriptions WHERE status = 'active') AS copier_allocated,
      (SELECT COALESCE(SUM(ta.balance), 0)::text FROM trading_accounts ta
         JOIN copier_master_accounts cma ON cma.trading_account_id = ta.id
         JOIN copier_masters cm ON cm.id = cma.master_id AND cm.status = 'approved') AS master_balances,
      (SELECT COUNT(*)::text FROM copier_subscriptions WHERE status = 'active') AS active_copies,
      (SELECT COUNT(DISTINCT copier_user_id)::text FROM copier_subscriptions WHERE status = 'active') AS active_copiers,
      (SELECT COUNT(*)::text FROM pamm_investments WHERE status = 'active') AS pamm_investors,
      (SELECT COUNT(*)::text FROM pamm_pools WHERE status = 'active') AS pamm_pools,
      (SELECT COALESCE(SUM(amount), 0)::text FROM pamm_investments WHERE status = 'active') AS pamm_invested,
      (SELECT COALESCE(SUM(nav), 0)::text FROM pamm_pools WHERE status = 'active') AS pamm_nav,
      (SELECT COUNT(*)::text FROM mam_links WHERE status = 'active') AS mam_links,
      (SELECT COUNT(*)::text FROM mam_managers WHERE status = 'approved') AS mam_managers,
      (SELECT COALESCE(SUM(aum), 0)::text FROM mam_managers WHERE status = 'approved') AS mam_aum`
  );

  const r = result.rows[0];
  if (!r) {
    return null;
  }

  return {
    users: {
      total: num(r.total_users),
      active: num(r.active_users),
      emailUnverified: num(r.email_unverified),
    },
    mt5: {
      total: num(r.total_mt5),
      active: num(r.active_mt5),
    },
    masters: {
      approved: num(r.approved_masters),
      pending: num(r.pending_masters),
      linkedAccounts: num(r.master_linked_accounts),
    },
    deposits: {
      totalApproved: num(r.total_deposited),
      fromMasterAccounts: num(r.master_account_deposits),
      fromCopierAccounts: num(r.copier_account_deposits),
      pending: num(r.deposits_pending),
      rejected: num(r.deposits_rejected),
      mtd: num(r.deposits_mtd),
      today: num(r.deposits_today),
      sevenDayAvg: num(r.deposits_7d_avg),
    },
    withdrawals: {
      totalApproved: num(r.total_withdrawn),
      pending: num(r.withdrawals_pending),
      rejected: num(r.withdrawals_rejected),
      mtd: num(r.withdrawals_mtd),
      today: num(r.withdrawals_today),
      sevenDayAvg: num(r.withdrawals_7d_avg),
    },
    aum: {
      platformTotal: num(r.platform_aum),
      copierAllocated: num(r.copier_allocated),
      masterBalances: num(r.master_balances),
    },
    copier: {
      activeCopies: num(r.active_copies),
      activeCopiers: num(r.active_copiers),
      approvedMasters: num(r.approved_masters),
    },
    pamm: {
      activeInvestments: num(r.pamm_investors),
      pools: num(r.pamm_pools),
      totalInvested: num(r.pamm_invested),
      nav: num(r.pamm_nav),
    },
    mam: {
      activeLinks: num(r.mam_links),
      managers: num(r.mam_managers),
      aum: num(r.mam_aum),
    },
  };
}

export async function listRecentDeposits(limit = 5) {
  const result = await query<{
    id: string;
    created_at: Date;
    user_email: string;
    user_first_name: string | null;
    user_last_name: string | null;
    account_number: string;
    amount: string;
    status: string;
    payment_method: string;
  }>(
    `SELECT d.id, d.created_at, u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name,
            ta.account_number, d.amount, d.status, d.payment_method
     FROM deposits d
     JOIN users u ON u.id = d.user_id
     JOIN trading_accounts ta ON ta.id = d.trading_account_id
     ORDER BY d.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map((r) => ({
    id: r.id,
    time: r.created_at,
    userName: [r.user_first_name, r.user_last_name].filter(Boolean).join(" ") || r.user_email,
    userEmail: r.user_email,
    mt5: String(r.account_number),
    amount: Number(r.amount),
    status: r.status,
    details: `Deposit via ${r.payment_method}`,
  }));
}

export async function listRecentWithdrawals(limit = 5) {
  const result = await query<{
    id: string;
    created_at: Date;
    user_email: string;
    user_first_name: string | null;
    user_last_name: string | null;
    account_number: string;
    amount: string;
    status: string;
    payment_method: string;
  }>(
    `SELECT w.id, w.created_at, u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name,
            ta.account_number, w.amount, w.status, w.payment_method
     FROM withdrawals w
     JOIN users u ON u.id = w.user_id
     JOIN trading_accounts ta ON ta.id = w.trading_account_id
     ORDER BY w.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map((r) => ({
    id: r.id,
    time: r.created_at,
    userName: [r.user_first_name, r.user_last_name].filter(Boolean).join(" ") || r.user_email,
    userEmail: r.user_email,
    mt5: String(r.account_number),
    amount: Number(r.amount),
    status: r.status,
    details: `Withdrawal via ${r.payment_method}`,
  }));
}

export async function listRecentAccountsOpened(limit = 5) {
  const result = await query<{
    id: string;
    created_at: Date;
    user_email: string;
    user_first_name: string | null;
    user_last_name: string | null;
    account_number: string;
    account_status: string;
    mt5_group: string;
  }>(
    `SELECT ta.id, ta.created_at, u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name,
            ta.account_number, ta.account_status, ta.mt5_group
     FROM trading_accounts ta
     JOIN users u ON u.id = ta.user_id
     ORDER BY ta.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map((r) => ({
    id: r.id,
    time: r.created_at,
    userName: [r.user_first_name, r.user_last_name].filter(Boolean).join(" ") || r.user_email,
    userEmail: r.user_email,
    mt5: String(r.account_number),
    status: "opened",
    details: r.mt5_group,
  }));
}

export async function listActivityLogs(params: { search?: string; page?: number; limit?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 10));
  const offset = (page - 1) * limit;
  const search = params.search?.trim();
  const searchPattern = search ? `%${search}%` : null;

  const searchClause = searchPattern
    ? `WHERE (
        user_name ILIKE $1 OR user_email ILIKE $1 OR mt5 ILIKE $1 OR details ILIKE $1 OR type ILIKE $1
      )`
    : "";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM (
      SELECT u.email AS user_email,
             COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email) AS user_name,
             ta.account_number::text AS mt5,
             d.payment_method AS details,
             'Deposit' AS type
      FROM deposits d JOIN users u ON u.id = d.user_id JOIN trading_accounts ta ON ta.id = d.trading_account_id
      UNION ALL
      SELECT u.email,
             COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email),
             ta.account_number::text,
             w.payment_method,
             'Withdrawal'
      FROM withdrawals w JOIN users u ON u.id = w.user_id JOIN trading_accounts ta ON ta.id = w.trading_account_id
      UNION ALL
      SELECT u.email,
             COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email),
             ta.account_number::text,
             ta.mt5_group,
             'Account Opened'
      FROM trading_accounts ta JOIN users u ON u.id = ta.user_id
    ) logs ${searchClause}`,
    searchPattern ? [searchPattern] : []
  );

  const rowsResult = await query<{
    id: string;
    time: Date;
    type: string;
    user_name: string;
    user_email: string;
    mt5: string;
    amount: string | null;
    status: string;
    details: string;
  }>(
    `SELECT * FROM (
      SELECT d.id::text, d.created_at AS time, 'Deposit' AS type,
             COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email) AS user_name,
             u.email AS user_email, ta.account_number::text AS mt5, d.amount::text AS amount,
             d.status::text AS status, d.payment_method AS details
      FROM deposits d JOIN users u ON u.id = d.user_id JOIN trading_accounts ta ON ta.id = d.trading_account_id
      UNION ALL
      SELECT w.id::text, w.created_at, 'Withdrawal',
             COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email),
             u.email, ta.account_number::text, w.amount::text, w.status::text, w.payment_method
      FROM withdrawals w JOIN users u ON u.id = w.user_id JOIN trading_accounts ta ON ta.id = w.trading_account_id
      UNION ALL
      SELECT ta.id::text, ta.created_at, 'Account Opened',
             COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email),
             u.email, ta.account_number::text, NULL, ta.account_status, ta.mt5_group
      FROM trading_accounts ta JOIN users u ON u.id = ta.user_id
    ) logs
    ${searchClause}
    ORDER BY time DESC
    LIMIT $${searchPattern ? 2 : 1} OFFSET $${searchPattern ? 3 : 2}`,
    searchPattern ? [searchPattern, limit, offset] : [limit, offset]
  );

  const total = Number(countResult.rows[0]?.count ?? 0);

  return {
    items: rowsResult.rows.map((r) => ({
      id: r.id,
      time: r.time,
      type: r.type,
      user: r.user_name,
      userEmail: r.user_email,
      mt5: r.mt5,
      amount: r.amount != null ? Number(r.amount) : null,
      status: r.status,
      details: r.details,
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
