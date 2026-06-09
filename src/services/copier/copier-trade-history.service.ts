import * as mastersRepo from "../../db/copier-masters.repository.js";
import * as accountsRepo from "../../db/trading-accounts.repository.js";
import * as managerRepo from "../../db/mt5-manager.repository.js";
import {
  clientLogin,
  fetchClientHistoryAll,
  filterAndNormalizeClosedTrades,
} from "../mt5/mt5-history.client.js";
import { decrypt } from "../../utils/encrypt.js";
import { AppError } from "../../utils/response.js";

async function fetchClosedTradesForAccount(tradingAccountId: string) {
  const account = await accountsRepo.findTradingAccountById(tradingAccountId);
  if (!account) {
    throw new AppError("Trading account not found", 404);
  }

  const managerConfig = await managerRepo.getActiveManagerConfig();
  if (!managerConfig?.api_key) {
    throw new AppError("MT5 manager is not configured", 500);
  }

  let masterPassword: string;
  try {
    masterPassword = decrypt(account.master_password_enc);
  } catch {
    throw new AppError("Failed to read trading account credentials", 500);
  }

  const login = Number(account.account_number);
  if (!Number.isFinite(login)) {
    throw new AppError("Invalid MT5 account number", 500);
  }

  try {
    const clientToken = await clientLogin(login, masterPassword, managerConfig.api_key);
    const deals = await fetchClientHistoryAll(clientToken);
    const closedTrades = filterAndNormalizeClosedTrades(deals);

    return {
      closedTrades,
      openTrades: [] as [],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "MT5 history unavailable";
    throw new AppError(message, 502);
  }
}

export async function getMasterAccountTradeHistory(userId: string, tradingAccountId: string) {
  const master = await mastersRepo.findMasterByUserId(userId);
  if (!master || master.status !== "approved") {
    throw new AppError("Approved master profile required", 403);
  }

  const link = await mastersRepo.findMasterAccountForUser(master.id, userId, tradingAccountId);
  if (!link) {
    throw new AppError("Master account not found", 404);
  }

  return fetchClosedTradesForAccount(tradingAccountId);
}

export async function getAdminMasterAccountTradeHistory(tradingAccountId: string) {
  const link = await mastersRepo.findApprovedMasterAccountByTradingAccountId(tradingAccountId);
  if (!link) {
    throw new AppError("Master account not found", 404);
  }

  return fetchClosedTradesForAccount(tradingAccountId);
}

export async function getPublicMasterAccountTradeHistory(masterId: string, tradingAccountId: string) {
  const master = await mastersRepo.findMasterById(masterId);
  if (!master || master.status !== "approved") {
    throw new AppError("Master not found", 404);
  }

  const link = await mastersRepo.findMasterAccountLink(masterId, tradingAccountId);
  if (!link) {
    throw new AppError("Master account not found", 404);
  }

  return fetchClosedTradesForAccount(tradingAccountId);
}
