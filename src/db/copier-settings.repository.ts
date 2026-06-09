import { query } from "../lib/db.js";

export type CopierSettingsRow = {
  id: string;
  enable_copier: boolean;
  enable_master_applications: boolean;
  min_allocation: string;
  max_allocation: string;
  platform_fee_pct: string;
  auto_stop_equity_drop_pct: string;
  max_drawdown_allowed_pct: string;
  force_kyc: boolean;
  show_on_dashboard: boolean;
  payout_cycle: string;
};

function serialize(row: CopierSettingsRow) {
  return {
    enableCopier: row.enable_copier,
    enableMasterApplications: row.enable_master_applications,
    minAllocation: Number(row.min_allocation),
    maxAllocation: Number(row.max_allocation),
    platformFeePct: Number(row.platform_fee_pct),
    autoStopEquityDropPct: Number(row.auto_stop_equity_drop_pct),
    maxDrawdownAllowedPct: Number(row.max_drawdown_allowed_pct),
    forceKyc: row.force_kyc,
    showOnDashboard: row.show_on_dashboard,
    payoutCycle: row.payout_cycle,
  };
}

export async function getCopierSettings() {
  const result = await query<CopierSettingsRow>(`SELECT * FROM copier_settings ORDER BY created_at ASC LIMIT 1`);
  const row = result.rows[0];
  if (!row) return null;
  return serialize(row);
}
