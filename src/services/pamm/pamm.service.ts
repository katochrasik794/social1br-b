import * as pammRepo from "../../db/pamm.repository.js";
import { AppError } from "../../utils/response.js";

export async function getPammSettings() {
  const settings = await pammRepo.getPammSettings();
  if (!settings) {
    throw new AppError("PAMM settings not configured", 500);
  }
  return settings;
}

export async function getPammInvestorDashboard(userId: string) {
  const [settings, pools, investments] = await Promise.all([
    getPammSettings(),
    pammRepo.listActivePools(),
    pammRepo.listUserInvestments(userId),
  ]);

  const active = investments.filter((i) => i.status === "Active");
  const totalInvested = active.reduce((s, i) => s + i.amount, 0);
  const avgReturn =
    investments.length > 0 ? investments.reduce((s, i) => s + i.pnlPct, 0) / investments.length : 0;

  return {
    settings,
    pools,
    investments,
    summary: {
      totalInvested,
      activePools: active.length,
      avgReturnPct: Math.round(avgReturn * 10) / 10,
      pendingWithdrawals: investments.filter((i) => i.status === "Pending").length,
      activeInvestments: active.length,
    },
  };
}
