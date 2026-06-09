import { query } from "../lib/db.js";

export async function getPammSettings() {
  const result = await query<{
    enable_pamm: boolean;
    show_on_dashboard: boolean;
    min_investment: string;
    platform_fee_pct: string;
    force_kyc: boolean;
  }>(`SELECT enable_pamm, show_on_dashboard, min_investment, platform_fee_pct, force_kyc FROM pamm_settings ORDER BY created_at ASC LIMIT 1`);
  const row = result.rows[0];
  if (!row) return null;
  return {
    enablePamm: row.enable_pamm,
    showOnDashboard: row.show_on_dashboard,
    minInvestment: Number(row.min_investment),
    platformFeePct: Number(row.platform_fee_pct),
    forceKyc: row.force_kyc,
  };
}

export async function listActivePools() {
  const result = await query<{
    id: string;
    name: string;
    manager_name: string;
    min_deposit: string;
    fee_pct: string;
    management_fee_pct: string;
    risk_profile: string;
    nav: string;
    monthly_return_pct: string;
    investors_count: number;
    status: string;
  }>(
    `SELECT id, name, manager_name, min_deposit, fee_pct, management_fee_pct, risk_profile,
            nav, monthly_return_pct, investors_count, status
     FROM pamm_pools
     WHERE status = 'active'
     ORDER BY created_at DESC`
  );
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    managerName: r.manager_name,
    minDeposit: Number(r.min_deposit),
    feePct: Number(r.fee_pct),
    managementFeePct: Number(r.management_fee_pct),
    riskProfile: capitalizeRisk(r.risk_profile),
    nav: Number(r.nav),
    monthlyReturnPct: Number(r.monthly_return_pct),
    investorsCount: r.investors_count,
    status: r.status,
  }));
}

export async function listUserInvestments(userId: string) {
  const result = await query<{
    id: string;
    pool_id: string | null;
    pool_name: string;
    amount: string;
    share_pct: string;
    pnl_pct: string;
    status: string;
    invested_at: Date;
  }>(
    `SELECT id, pool_id, pool_name, amount, share_pct, pnl_pct, status, invested_at
     FROM pamm_investments
     WHERE user_id = $1
     ORDER BY invested_at DESC`,
    [userId]
  );
  return result.rows.map((r) => ({
    id: r.id,
    poolId: r.pool_id,
    poolName: r.pool_name,
    amount: Number(r.amount),
    sharePct: Number(r.share_pct),
    pnlPct: Number(r.pnl_pct),
    status: capitalizeStatus(r.status),
    investedAt: r.invested_at,
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
