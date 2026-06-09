import { query } from "../lib/db.js";

export async function getMamSettings() {
  const result = await query<{
    enable_mam: boolean;
    show_on_dashboard: boolean;
    min_account_balance: string;
    platform_fee_pct: string;
    force_kyc: boolean;
  }>(`SELECT enable_mam, show_on_dashboard, min_account_balance, platform_fee_pct, force_kyc FROM mam_settings ORDER BY created_at ASC LIMIT 1`);
  const row = result.rows[0];
  if (!row) return null;
  return {
    enableMam: row.enable_mam,
    showOnDashboard: row.show_on_dashboard,
    minAccountBalance: Number(row.min_account_balance),
    platformFeePct: Number(row.platform_fee_pct),
    forceKyc: row.force_kyc,
  };
}

export async function listApprovedManagers() {
  const result = await query<{
    id: string;
    display_name: string;
    headline: string | null;
    win_rate: string;
    followers_count: number;
    fee_pct: string;
    lot_scaling: string;
    aum: string;
    monthly_return_pct: string;
    risk_level: string;
    status: string;
  }>(
    `SELECT id, display_name, headline, win_rate, followers_count, fee_pct, lot_scaling,
            aum, monthly_return_pct, risk_level, status
     FROM mam_managers
     WHERE status = 'approved'
     ORDER BY created_at DESC`
  );
  return result.rows.map((r) => ({
    id: r.id,
    displayName: r.display_name,
    headline: r.headline ?? "",
    winRate: Number(r.win_rate),
    followersCount: r.followers_count,
    feePct: Number(r.fee_pct),
    lotScaling: r.lot_scaling,
    aum: Number(r.aum),
    monthlyReturnPct: Number(r.monthly_return_pct),
    riskLevel: capitalizeRisk(r.risk_level),
    status: r.status,
  }));
}

export async function listUserLinks(userId: string) {
  const result = await query<{
    id: string;
    manager_id: string | null;
    manager_name: string;
    account_login: string | null;
    lot_multiplier: string;
    max_lot: string;
    pnl_pct: string;
    status: string;
    linked_at: Date;
  }>(
    `SELECT id, manager_id, manager_name, account_login, lot_multiplier, max_lot, pnl_pct, status, linked_at
     FROM mam_links
     WHERE user_id = $1
     ORDER BY linked_at DESC`,
    [userId]
  );
  return result.rows.map((r) => ({
    id: r.id,
    managerId: r.manager_id,
    managerName: r.manager_name,
    accountLogin: r.account_login ?? "—",
    lotMultiplier: Number(r.lot_multiplier),
    maxLot: Number(r.max_lot),
    pnlPct: Number(r.pnl_pct),
    status: capitalizeStatus(r.status),
    linkedAt: r.linked_at,
  }));
}

function capitalizeRisk(v: string) {
  const s = v.toLowerCase();
  if (s === "low") return "Low";
  if (s === "high") return "High";
  return "Medium";
}

function capitalizeStatus(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}
