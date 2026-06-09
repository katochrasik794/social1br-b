import * as depositsRepo from "../../db/deposits.repository.js";
import * as accountsRepo from "../../db/trading-accounts.repository.js";
import { getAccountForFundRequest, refreshAccountBalanceFromMt5 } from "../trading/trading-accounts.service.js";
import { validateGatewayForDeposit } from "../gateways/manual-gateways.service.js";
import { adjustMt5Balance } from "../mt5/mt5.client.js";
import { AppError } from "../../utils/response.js";

function validateDepositAmount(amount: number, group: { minDeposit: number | null; maxDeposit: number | null }) {
  if (group.minDeposit != null && amount < group.minDeposit) {
    throw new AppError(`Minimum deposit is $${group.minDeposit}`, 400);
  }
  if (group.maxDeposit != null && amount > group.maxDeposit) {
    throw new AppError(`Maximum deposit is $${group.maxDeposit}`, 400);
  }
}

export async function createDeposit(
  userId: string,
  input: {
    tradingAccountId: string;
    amount: number;
    manualGatewayId: string;
    paymentMethod?: string;
    transactionReference?: string;
    proofUrl?: string | null;
  }
) {
  const gateway = await validateGatewayForDeposit(input.manualGatewayId, input.amount);
  const { account, group } = await getAccountForFundRequest(input.tradingAccountId, userId);
  validateDepositAmount(input.amount, group);

  return depositsRepo.insertDeposit({
    userId,
    tradingAccountId: account.id,
    amount: input.amount,
    currency: account.currency,
    paymentMethod: input.paymentMethod ?? gateway.name,
    manualGatewayId: gateway.id,
    transactionReference: input.transactionReference ?? null,
    proofUrl: input.proofUrl ?? null,
  });
}

export async function listUserDeposits(userId: string) {
  return depositsRepo.listDepositsByUser(userId);
}

export async function listAdminDeposits(params: {
  status?: "pending" | "approved" | "rejected";
  page?: number;
  limit?: number;
}) {
  const [list, counts] = await Promise.all([
    depositsRepo.listDepositsAdmin(params),
    depositsRepo.countDepositsByStatus(),
  ]);
  return { ...list, counts };
}

export async function approveDeposit(id: string, adminId: string, comment?: string) {
  const deposit = await depositsRepo.findDepositById(id);
  if (!deposit) throw new AppError("Deposit not found", 404);
  if (deposit.status !== "pending") throw new AppError("Deposit is not pending", 400);

  const account = await accountsRepo.findTradingAccountById(deposit.trading_account_id);
  if (!account) throw new AppError("Trading account not found", 404);

  try {
    await adjustMt5Balance(
      account.account_number,
      "Deposit",
      Number(deposit.amount),
      `CRM deposit ${deposit.id}`
    );
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : "MT5 deposit failed", 502);
  }

  const updated = await depositsRepo.approveDeposit(id, adminId, comment ?? null);
  if (!updated) throw new AppError("Deposit could not be approved", 400);

  await refreshAccountBalanceFromMt5(account.id);
  return updated;
}

export async function rejectDeposit(id: string, adminId: string, reason: string) {
  const updated = await depositsRepo.rejectDeposit(id, adminId, reason);
  if (!updated) throw new AppError("Deposit not found or not pending", 404);
  return updated;
}
