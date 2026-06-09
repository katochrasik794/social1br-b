import * as commissionRepo from "../../db/copier-commission.repository.js";
import * as subsRepo from "../../db/copier-subscriptions.repository.js";
import { commissionFromCopierProfit, COMMISSION_MODEL } from "../../utils/copier-commission.js";
import { AppError } from "../../utils/response.js";

export function getCommissionModel() {
  return COMMISSION_MODEL;
}

/** Called when copier profit from copied trades is known (MT5 sync / payout job). */
export async function recordCommissionFromCopierProfit(data: {
  subscriptionId: string;
  copierProfit: number;
  note?: string;
}) {
  if (data.copierProfit <= 0) {
    throw new AppError("Commission is only earned on positive copier profit", 400);
  }

  const sub = await subsRepo.findSubscriptionById(data.subscriptionId);
  if (!sub || sub.status !== "active") {
    throw new AppError("Active subscription not found", 404);
  }

  const pct = Number(sub.commission_from_copier_pct);
  const amount = commissionFromCopierProfit(data.copierProfit, pct);

  if (amount <= 0) {
    return null;
  }

  return commissionRepo.insertCommissionAccrual({
    subscriptionId: sub.id,
    masterId: sub.master_id,
    copierUserId: sub.copier_user_id,
    copierProfit: data.copierProfit,
    commissionPct: pct,
    commissionAmount: amount,
    note: data.note,
  });
}

export async function getMasterCommissionDashboard(masterId: string) {
  const [summary, byCopier, recent] = await Promise.all([
    commissionRepo.getMasterCommissionSummary(masterId),
    commissionRepo.getCommissionByCopierForMaster(masterId),
    commissionRepo.listCommissionByMaster(masterId, 20),
  ]);

  return {
    model: COMMISSION_MODEL,
    summary,
    byCopier,
    recent,
  };
}
