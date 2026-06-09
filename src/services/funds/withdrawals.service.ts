import * as withdrawalsRepo from "../../db/withdrawals.repository.js";
import * as accountsRepo from "../../db/trading-accounts.repository.js";
import { getAccountForFundRequest, refreshAccountBalanceFromMt5 } from "../trading/trading-accounts.service.js";
import { adjustMt5Balance, fetchMt5Account } from "../mt5/mt5.client.js";
import { AppError } from "../../utils/response.js";

function validateWithdrawalAmount(
  amount: number,
  group: { minWithdrawal: number | null; maxWithdrawal: number | null }
) {
  if (group.minWithdrawal != null && amount < group.minWithdrawal) {
    throw new AppError(`Minimum withdrawal is $${group.minWithdrawal}`, 400);
  }
  if (group.maxWithdrawal != null && amount > group.maxWithdrawal) {
    throw new AppError(`Maximum withdrawal is $${group.maxWithdrawal}`, 400);
  }
}

export async function createWithdrawal(
  userId: string,
  input: {
    tradingAccountId: string;
    amount: number;
    paymentMethod: string;
    paymentDetails: Record<string, unknown>;
  }
) {
  const { account, group } = await getAccountForFundRequest(input.tradingAccountId, userId);
  validateWithdrawalAmount(input.amount, group);

  const profile = await fetchMt5Account(account.account_number);
  const balance = Number(profile?.balance ?? profile?.Balance ?? account.balance);
  if (Number.isFinite(balance) && input.amount > balance) {
    throw new AppError("Insufficient MT5 balance for withdrawal", 400);
  }

  return withdrawalsRepo.insertWithdrawal({
    userId,
    tradingAccountId: account.id,
    amount: input.amount,
    currency: account.currency,
    paymentMethod: input.paymentMethod,
    paymentDetails: input.paymentDetails,
  });
}

export async function listUserWithdrawals(userId: string) {
  return withdrawalsRepo.listWithdrawalsByUser(userId);
}

export async function listAdminWithdrawals(params: {
  status?: "pending" | "approved" | "rejected";
  page?: number;
  limit?: number;
}) {
  const [list, counts] = await Promise.all([
    withdrawalsRepo.listWithdrawalsAdmin(params),
    withdrawalsRepo.countWithdrawalsByStatus(),
  ]);
  return { ...list, counts };
}

export async function approveWithdrawal(
  id: string,
  adminId: string,
  externalTransactionId?: string,
  comment?: string
) {
  const withdrawal = await withdrawalsRepo.findWithdrawalById(id);
  if (!withdrawal) throw new AppError("Withdrawal not found", 404);
  if (withdrawal.status !== "pending") throw new AppError("Withdrawal is not pending", 400);

  const account = await accountsRepo.findTradingAccountById(withdrawal.trading_account_id);
  if (!account) throw new AppError("Trading account not found", 404);

  try {
    await adjustMt5Balance(
      account.account_number,
      "Withdraw",
      Number(withdrawal.amount),
      `CRM withdrawal ${withdrawal.id}`
    );
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : "MT5 withdrawal failed", 502);
  }

  const updated = await withdrawalsRepo.approveWithdrawal(
    id,
    adminId,
    externalTransactionId ?? null,
    comment ?? null
  );
  if (!updated) throw new AppError("Withdrawal could not be approved", 400);

  await refreshAccountBalanceFromMt5(account.id);
  return updated;
}

export async function rejectWithdrawal(id: string, adminId: string, reason: string) {
  const updated = await withdrawalsRepo.rejectWithdrawal(id, adminId, reason);
  if (!updated) throw new AppError("Withdrawal not found or not pending", 404);
  return updated;
}
