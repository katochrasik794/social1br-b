import * as settingsRepo from "../../db/copier-settings.repository.js";
import * as subsRepo from "../../db/copier-subscriptions.repository.js";
import * as mastersRepo from "../../db/copier-masters.repository.js";
import * as accountsRepo from "../../db/trading-accounts.repository.js";
import { AppError } from "../../utils/response.js";

export async function listUserSubscriptions(userId: string) {
  return subsRepo.listSubscriptionsByUser(userId);
}

export async function createSubscription(
  userId: string,
  data: {
    masterId: string;
    tradingAccountId: string;
    allocation: number;
    copyMode: "proportional" | "fixed";
    lotMultiplier: number;
    dailyLossLimitPct: number;
  }
) {
  const settings = await settingsRepo.getCopierSettings();
  if (!settings?.enableCopier) {
    throw new AppError("Copy trading is currently disabled", 403);
  }

  const master = await mastersRepo.findMasterById(data.masterId);
  if (!master || master.status !== "approved") {
    throw new AppError("Master not found", 404);
  }

  if (master.user_id === userId) {
    throw new AppError("You cannot copy your own master account", 400);
  }

  const account = await accountsRepo.findTradingAccountByIdForUser(data.tradingAccountId, userId);
  if (!account) {
    throw new AppError("Invalid trading account", 400);
  }
  if (account.account_status !== "active") {
    throw new AppError("Trading account must be active", 400);
  }

  const masterAccountIds = await mastersRepo.listMasterTradingAccountIdsForUser(userId);
  if (masterAccountIds.includes(data.tradingAccountId)) {
    throw new AppError("Master trading accounts cannot be used for copy trading", 400);
  }

  const accountBalance = Number(account.balance);
  if (Math.abs(data.allocation - accountBalance) > 0.01) {
    throw new AppError("Allocation must equal your full account balance", 400);
  }

  if (data.allocation < settings.minAllocation || data.allocation > settings.maxAllocation) {
    throw new AppError(
      `Allocation must be between $${settings.minAllocation} and $${settings.maxAllocation}`,
      400
    );
  }

  const existing = await subsRepo.findExistingSubscription(userId, data.masterId, data.tradingAccountId);
  if (existing && existing.status !== "stopped") {
    throw new AppError("You are already copying this master with this account", 400);
  }

  const commissionFromCopierPct = Number(master.commission_pct);

  return subsRepo.insertSubscription({
    copierUserId: userId,
    masterId: data.masterId,
    tradingAccountId: data.tradingAccountId,
    allocation: data.allocation,
    copyMode: data.copyMode,
    lotMultiplier: data.lotMultiplier,
    dailyLossLimitPct: data.dailyLossLimitPct,
    commissionFromCopierPct,
  });
}
