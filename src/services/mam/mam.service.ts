import * as mamRepo from "../../db/mam.repository.js";
import { AppError } from "../../utils/response.js";

export async function getMamSettings() {
  const settings = await mamRepo.getMamSettings();
  if (!settings) {
    throw new AppError("MAM settings not configured", 500);
  }
  return settings;
}

export async function getMamInvestorDashboard(userId: string) {
  const [settings, managers, links] = await Promise.all([
    getMamSettings(),
    mamRepo.listApprovedManagers(),
    mamRepo.listUserLinks(userId),
  ]);

  const active = links.filter((l) => l.status === "Active");
  const avgPnl = links.length > 0 ? links.reduce((s, l) => s + l.pnlPct, 0) / links.length : 0;
  const totalAum = active.reduce((s, l) => s + l.lotMultiplier * 10000, 0);

  return {
    settings,
    managers,
    links,
    summary: {
      linkedAccounts: active.length,
      totalAum,
      avgPnlPct: Math.round(avgPnl * 10) / 10,
      activeManagers: new Set(active.map((l) => l.managerId).filter(Boolean)).size,
    },
  };
}
