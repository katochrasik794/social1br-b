import * as usersRepo from "../../db/users.repository.js";
import * as groupsRepo from "../../db/mt5-groups.repository.js";
import * as accountsRepo from "../../db/trading-accounts.repository.js";
import { openMt5Account, fetchMt5Account } from "../mt5/mt5.client.js";
import { encrypt, decrypt } from "../../utils/encrypt.js";
import { generatePassword, generateUniqueLogin } from "../../utils/password-gen.js";
import { AppError } from "../../utils/response.js";
import { query } from "../../lib/db.js";

async function listActiveGroups() {
  const result = await query<{
    id: string;
    group_name: string;
    dedicated_name: string | null;
    description: string | null;
    currency: string | null;
    min_deposit: string | null;
    max_deposit: string | null;
    min_withdrawal: string | null;
    max_withdrawal: string | null;
    badge_label: string | null;
    plan_description: string | null;
    spread_from: string | null;
    max_leverage_display: number | null;
    commission_text: string | null;
    min_lot_size: string | null;
  }>(
    `SELECT id, group_name, dedicated_name, description, currency, min_deposit, max_deposit,
            min_withdrawal, max_withdrawal, badge_label, plan_description, spread_from,
            max_leverage_display, commission_text, min_lot_size
     FROM mt5_groups WHERE is_active = TRUE ORDER BY group_name ASC`
  );
  return result.rows.map((r) => ({
    id: r.id,
    groupName: r.group_name,
    dedicatedName: r.dedicated_name,
    description: r.description,
    currency: r.currency ?? "USD",
    minDeposit: r.min_deposit != null ? Number(r.min_deposit) : null,
    maxDeposit: r.max_deposit != null ? Number(r.max_deposit) : null,
    minWithdrawal: r.min_withdrawal != null ? Number(r.min_withdrawal) : null,
    maxWithdrawal: r.max_withdrawal != null ? Number(r.max_withdrawal) : null,
    badgeLabel: r.badge_label,
    planDescription: r.plan_description ?? r.description,
    spreadFrom: r.spread_from,
    maxLeverageDisplay: r.max_leverage_display ?? 500,
    commissionText: r.commission_text,
    minLotSize: r.min_lot_size ?? "0.01 Lots",
  }));
}

export async function getAvailableGroups() {
  return listActiveGroups();
}

function safeDecryptPassword(enc: string) {
  try {
    return decrypt(enc);
  } catch {
    return "";
  }
}

function serializeUserAccount(row: Awaited<ReturnType<typeof accountsRepo.listTradingAccountRowsByUser>>[number]) {
  return {
    id: row.id,
    userId: row.user_id,
    accountNumber: Number(row.account_number),
    platform: row.platform,
    mt5Group: row.mt5_group,
    leverage: row.leverage,
    currency: row.currency,
    accountStatus: row.account_status,
    name: row.name,
    email: row.email,
    balance: Number(row.balance),
    equity: Number(row.equity),
    masterPassword: safeDecryptPassword(row.master_password_enc),
    investorPassword: safeDecryptPassword(row.investor_password_enc),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listUserAccounts(userId: string) {
  const rows = await accountsRepo.listTradingAccountRowsByUser(userId);
  return rows.map(serializeUserAccount);
}

export async function openAccount(
  userId: string,
  input: { group: string; leverage: number; masterPassword: string }
) {
  const user = await usersRepo.findUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  const groupRow = await groupsRepo.findGroupByName(input.group);
  if (!groupRow || !groupRow.is_active) {
    throw new AppError("Invalid or inactive MT5 group", 400);
  }

  const login = await generateUniqueLogin(accountsRepo.accountNumberExists);
  const masterPassword = input.masterPassword;
  const investorPassword = generatePassword(10);
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email.split("@")[0];

  const { login: createdLogin } = await openMt5Account({
    login,
    group: input.group,
    name: fullName,
    email: user.email,
    leverage: input.leverage,
    password: masterPassword,
    investorPassword,
    phone: user.phone ?? undefined,
    comment: "Opened via Social Trading",
  });

  const account = await accountsRepo.insertTradingAccount({
    userId,
    accountNumber: createdLogin,
    mt5Group: input.group,
    leverage: input.leverage,
    currency: groupRow.currency ?? "USD",
    name: fullName,
    email: user.email,
    masterPasswordEnc: encrypt(masterPassword),
    investorPasswordEnc: encrypt(investorPassword),
  });

  return {
    ...account,
    masterPassword,
    investorPassword,
  };
}

export async function listAdminAccounts(params: { page?: number; limit?: number; search?: string }) {
  return accountsRepo.listAllTradingAccounts(params);
}

export async function refreshAccountBalanceFromMt5(accountId: string) {
  const row = await accountsRepo.findTradingAccountById(accountId);
  if (!row) return;
  const profile = await fetchMt5Account(row.account_number);
  if (!profile) return;
  const balance = Number(profile.balance ?? profile.Balance ?? 0);
  const equity = Number(profile.equity ?? profile.Equity ?? balance);
  if (Number.isFinite(balance)) {
    await accountsRepo.updateTradingAccountBalance(accountId, balance, Number.isFinite(equity) ? equity : balance);
  }
}

export async function getAccountForFundRequest(accountId: string, userId: string) {
  const account = await accountsRepo.findTradingAccountByIdForUser(accountId, userId);
  if (!account) throw new AppError("Trading account not found", 404);
  const groupRow = await groupsRepo.findGroupByName(account.mt5_group);
  const group = {
    minDeposit: groupRow?.min_deposit != null ? Number(groupRow.min_deposit) : null,
    maxDeposit: groupRow?.max_deposit != null ? Number(groupRow.max_deposit) : null,
    minWithdrawal: groupRow?.min_withdrawal != null ? Number(groupRow.min_withdrawal) : null,
    maxWithdrawal: groupRow?.max_withdrawal != null ? Number(groupRow.max_withdrawal) : null,
  };
  return { account, group };
}
