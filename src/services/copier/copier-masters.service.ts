import * as settingsRepo from "../../db/copier-settings.repository.js";
import * as mastersRepo from "../../db/copier-masters.repository.js";
import * as subsRepo from "../../db/copier-subscriptions.repository.js";
import * as accountsRepo from "../../db/trading-accounts.repository.js";
import * as changeRequestsRepo from "../../db/copier-master-change-requests.repository.js";
import * as commissionService from "./copier-commission.service.js";
import { COMMISSION_MODEL } from "../../utils/copier-commission.js";
import { AppError } from "../../utils/response.js";

function riskLabel(profile: "low" | "medium" | "high") {
  if (profile === "low") return "Low Risk";
  if (profile === "high") return "High Risk";
  return "Medium Risk";
}

function riskScore(profile: "low" | "medium" | "high") {
  if (profile === "low") return 2;
  if (profile === "high") return 8;
  return 5;
}

export async function getCopierSettings() {
  const settings = await settingsRepo.getCopierSettings();
  if (!settings) {
    throw new AppError("Copier settings not configured", 500);
  }
  return {
    ...settings,
    commissionModel: COMMISSION_MODEL,
  };
}

export async function updateMasterAccountSettings(
  userId: string,
  tradingAccountId: string,
  data: {
    displayName: string;
    headline: string;
    strategySummary: string;
    strategyDetail?: string;
    riskProfile: "low" | "medium" | "high";
    commissionPct: number;
    minCopyAmount: number;
    publicProfile: boolean;
    acceptNewCopiers: boolean;
  }
) {
  const master = await mastersRepo.findMasterByUserId(userId);
  if (!master || master.status !== "approved") {
    throw new AppError("Approved master profile required", 403);
  }

  const link = await mastersRepo.findMasterAccountForUser(master.id, userId, tradingAccountId);
  if (!link) {
    throw new AppError("Master account not found", 404);
  }

  const updated = await mastersRepo.updateMasterAccountProfile(master.id, tradingAccountId, data);
  if (!updated) {
    throw new AppError("Failed to update account settings", 500);
  }

  if (updated.is_primary) {
    await mastersRepo.updateApprovedMasterProfile(master.id, {
      displayName: data.displayName,
      headline: data.headline,
      strategySummary: data.strategySummary,
      strategyDetail: data.strategyDetail,
      riskProfile: data.riskProfile,
      commissionPct: data.commissionPct,
    });
  }

  return getMasterMe(userId);
}

export async function getMasterMe(userId: string) {
  const master = await mastersRepo.findMasterByUserId(userId);
  if (!master) {
    return { status: "none" as const };
  }

  const profile = mastersRepo.serializeMaster(master);
  const linkedAccounts =
    master.status === "approved" ? await mastersRepo.listMasterAccounts(master.id) : [];
  const primaryAccount = linkedAccounts.find((a) => a.isPrimary) ?? linkedAccounts[0];
  const followers = master.status === "approved" ? await subsRepo.listFollowersByMaster(master.id) : [];
  const commissions =
    master.status === "approved" ? await commissionService.getMasterCommissionDashboard(master.id) : null;
  const pendingChangeRequest =
    master.status === "approved"
      ? await changeRequestsRepo.findPendingChangeRequestWithAccount(master.id)
      : null;

  return {
    status: profile.status,
    profile: {
      ...profile,
      displayName: primaryAccount?.displayName || profile.displayName,
      headline: primaryAccount?.headline || profile.headline,
      strategySummary: primaryAccount?.strategySummary || profile.strategySummary,
      strategyDetail: primaryAccount?.strategyDetail ?? profile.strategyDetail,
      riskProfile: primaryAccount?.riskProfile || profile.riskProfile,
      commissionPct: primaryAccount?.commissionPct ?? profile.commissionPct,
      commissionFromCopiersPct: primaryAccount?.commissionPct ?? profile.commissionPct,
      commissionModel: COMMISSION_MODEL,
      minCopyAmount: primaryAccount?.minCopyAmount,
    },
    linkedAccounts,
    rejectionReason: profile.rejectionReason,
    followers: followers.map((f) => ({
      id: f.id,
      email: f.copierEmail,
      accountLogin: f.accountLogin,
      allocation: f.allocation,
      commissionFromCopierPct: f.commissionFromCopierPct,
      status: f.status,
      startedAt: f.createdAt,
    })),
    commissions,
    pendingChangeRequest,
  };
}

export async function getMasterApplyAccountOptions(
  userId: string,
  opts?: { forApprovedMaster?: boolean }
) {
  const master = await mastersRepo.findMasterByUserId(userId);
  const excludeMasterId =
    opts?.forApprovedMaster && master?.status === "approved" ? master.id : undefined;

  const [accountRows, registeredIds, linkedAccounts, pendingChange] = await Promise.all([
    accountsRepo.listTradingAccountsByUser(userId),
    mastersRepo.listRegisteredMasterTradingAccountIds(excludeMasterId),
    master?.status === "approved" ? mastersRepo.listMasterAccounts(master.id) : Promise.resolve([]),
    master?.status === "approved"
      ? changeRequestsRepo.findPendingChangeRequestByMasterId(master.id)
      : Promise.resolve(null),
  ]);
  const registeredSet = new Set(registeredIds);
  const currentIds = new Set(linkedAccounts.map((a) => a.id));
  const pendingChangeAccountId = pendingChange?.trading_account_id ?? null;

  return accountRows.map((a) => ({
    id: a.id,
    accountNumber: a.accountNumber,
    platform: a.platform,
    balance: a.balance,
    equity: a.equity,
    accountStatus: a.accountStatus,
    isRegisteredAsMaster: registeredSet.has(a.id) && !currentIds.has(a.id),
    isCurrentMasterAccount: currentIds.has(a.id),
    isPendingChangeAccount: pendingChangeAccountId === a.id,
  }));
}

export async function submitMasterChangeRequest(
  userId: string,
  data: {
    tradingAccountId: string;
    displayName: string;
    headline: string;
    strategySummary: string;
    strategyDetail?: string;
    riskProfile: "low" | "medium" | "high";
    commissionPct: number;
    minCopyAmount?: number;
  }
) {
  const master = await mastersRepo.findMasterByUserId(userId);
  if (!master || master.status !== "approved") {
    throw new AppError("Approved master profile required", 403);
  }

  const existingPending = await changeRequestsRepo.findPendingChangeRequestByMasterId(master.id);
  if (existingPending) {
    throw new AppError("You already have a pending account change request", 400);
  }

  const linked = await mastersRepo.listMasterAccounts(master.id);
  const linkedIds = new Set(linked.map((a) => a.id));
  if (linkedIds.has(data.tradingAccountId)) {
    throw new AppError("This account is already linked to your master profile", 400);
  }

  const registeredIds = new Set(
    await mastersRepo.listRegisteredMasterTradingAccountIds(master.id)
  );
  if (registeredIds.has(data.tradingAccountId)) {
    throw new AppError("This account is already registered as a master account", 400);
  }

  const account = await accountsRepo.findTradingAccountByIdForUser(data.tradingAccountId, userId);
  if (!account) {
    throw new AppError("Invalid trading account", 400);
  }
  if (account.account_status !== "active") {
    throw new AppError("Trading account must be active", 400);
  }

  await changeRequestsRepo.insertChangeRequest({
    masterId: master.id,
    userId,
    tradingAccountId: data.tradingAccountId,
    displayName: data.displayName,
    headline: data.headline,
    strategySummary: data.strategySummary,
    strategyDetail: data.strategyDetail,
    riskProfile: data.riskProfile,
    commissionPct: data.commissionPct,
    minCopyAmount: data.minCopyAmount,
  });

  return getMasterMe(userId);
}

function accountProfileFromChangeRow(row: {
  display_name: string;
  headline: string;
  strategy_summary: string;
  strategy_detail: string | null;
  risk_profile: "low" | "medium" | "high";
  commission_pct: string;
  min_copy_amount?: string | null;
}) {
  return {
    displayName: row.display_name,
    headline: row.headline,
    strategySummary: row.strategy_summary,
    strategyDetail: row.strategy_detail,
    riskProfile: row.risk_profile,
    commissionPct: Number(row.commission_pct),
    minCopyAmount: Number(row.min_copy_amount ?? 25),
  };
}

async function applyApprovedChangeRequest(changeRequestId: string, adminId: string) {
  const row = await changeRequestsRepo.approveChangeRequest(changeRequestId, adminId);
  if (!row) {
    throw new AppError("Change request not found or not pending", 404);
  }

  await mastersRepo.addMasterAccount(
    row.master_id,
    row.trading_account_id,
    accountProfileFromChangeRow(row)
  );
  return changeRequestsRepo.serializeChangeRequest(row);
}

export async function approveMasterChangeRequest(changeRequestId: string, adminId: string) {
  return applyApprovedChangeRequest(changeRequestId, adminId);
}

export async function rejectMasterChangeRequest(changeRequestId: string, adminId: string, reason: string) {
  const row = await changeRequestsRepo.rejectChangeRequest(changeRequestId, adminId, reason);
  if (!row) {
    throw new AppError("Change request not found or not pending", 404);
  }
  return changeRequestsRepo.serializeChangeRequest(row);
}

export async function applyForMaster(
  userId: string,
  data: {
    displayName: string;
    headline: string;
    strategySummary: string;
    strategyDetail?: string;
    riskProfile: "low" | "medium" | "high";
    commissionPct: number;
    minCopyAmount?: number;
    tradingAccountIds: string[];
  }
) {
  const settings = await getCopierSettings();
  if (!settings.enableMasterApplications) {
    throw new AppError("Master applications are currently disabled", 403);
  }

  const existing = await mastersRepo.findMasterByUserId(userId);
  if (existing && (existing.status === "pending" || existing.status === "approved")) {
    throw new AppError(
      existing.status === "pending" ? "You already have a pending application" : "You are already an approved master",
      400
    );
  }

  if (data.tradingAccountIds.length !== 1) {
    throw new AppError("Select exactly one MT5 account to make a master", 400);
  }

  const registeredIds = new Set(await mastersRepo.listRegisteredMasterTradingAccountIds());

  for (const accountId of data.tradingAccountIds) {
    if (registeredIds.has(accountId)) {
      throw new AppError("One or more selected accounts are already registered as a master account", 400);
    }
    const account = await accountsRepo.findTradingAccountByIdForUser(accountId, userId);
    if (!account) {
      throw new AppError("One or more selected trading accounts are invalid", 400);
    }
    if (account.account_status !== "active") {
      throw new AppError("Selected trading accounts must be active", 400);
    }
  }

  const master = await mastersRepo.upsertMasterApplication({
    userId,
    displayName: data.displayName,
    headline: data.headline,
    strategySummary: data.strategySummary,
    strategyDetail: data.strategyDetail,
    riskProfile: data.riskProfile,
    commissionPct: data.commissionPct,
  });

  const accountProfile = {
    displayName: data.displayName,
    headline: data.headline,
    strategySummary: data.strategySummary,
    strategyDetail: data.strategyDetail,
    riskProfile: data.riskProfile,
    commissionPct: data.commissionPct,
    minCopyAmount: data.minCopyAmount ?? 25,
  };

  await mastersRepo.replaceMasterAccounts(master.id, [
    { tradingAccountId: data.tradingAccountIds[0], profile: accountProfile },
  ]);

  return getMasterMe(userId);
}

function toTopRatedFromAccount(
  row: Awaited<ReturnType<typeof mastersRepo.listRatedMasterAccounts>>[number],
  rank: number
) {
  const displayName = row.display_name ?? "Master";
  const risk = row.risk_profile ?? "medium";
  return {
    id: row.master_id,
    linkId: row.link_id,
    tradingAccountId: row.trading_account_id,
    accountLogin: String(row.account_number),
    rank,
    handle: displayName.replace(/\s+/g, "_"),
    displayName,
    headline: row.headline ?? "",
    strategy: row.strategy_summary ?? "",
    expertise: "Experienced",
    riskScore: riskScore(risk),
    riskLabel: riskLabel(risk),
    gainPct: 0,
    sparkline: [] as number[],
    profit: 0,
    loss: 0,
    copiers: Number(row.copiers_count ?? 0),
    copiersDelta: 0,
    commissionPct: Number(row.commission_pct ?? 0),
    winRate: 0,
    drawdownPct: 0,
    tradeCount: 0,
    minCopyAmount: Number(row.min_copy_amount ?? 25),
    aum: Number(row.balance ?? 0),
    strategyDetail: row.strategy_detail,
    riskProfile: risk,
  };
}

export async function listApprovedMasters() {
  const rows = await mastersRepo.listRatedMasterAccounts();
  return rows.map((row, i) => toTopRatedFromAccount(row, i + 1));
}

export async function getApprovedMasterDetail(masterId: string, tradingAccountId?: string) {
  const master = await mastersRepo.findMasterById(masterId);
  if (!master || master.status !== "approved") {
    throw new AppError("Master not found", 404);
  }

  const linkedAccounts = await mastersRepo.listMasterAccounts(masterId);
  const selected =
    (tradingAccountId
      ? linkedAccounts.find((a) => a.id === tradingAccountId)
      : null) ?? linkedAccounts[0];
  if (!selected) {
    throw new AppError("Master account not found", 404);
  }

  const copiers = await mastersRepo.countCopiersForMaster(masterId);

  const topRated = {
    id: masterId,
    linkId: selected.linkId,
    tradingAccountId: selected.id,
    accountLogin: String(selected.accountNumber),
    rank: 0,
    handle: selected.displayName.replace(/\s+/g, "_"),
    displayName: selected.displayName,
    headline: selected.headline,
    strategy: selected.strategySummary,
    expertise: "Experienced",
    riskScore: riskScore(selected.riskProfile),
    riskLabel: riskLabel(selected.riskProfile),
    gainPct: 0,
    sparkline: [] as number[],
    profit: 0,
    loss: 0,
    copiers,
    copiersDelta: 0,
    commissionPct: selected.commissionPct,
    winRate: 0,
    drawdownPct: 0,
    tradeCount: 0,
    minCopyAmount: selected.minCopyAmount,
    aum: selected.balance,
    strategyDetail: selected.strategyDetail,
    riskProfile: selected.riskProfile,
  };

  const accountDetails = {
    accounts: linkedAccounts.map((a) => ({
      id: a.id,
      login: String(a.accountNumber),
      platform: a.platform as "MT4" | "MT5",
      balance: a.balance,
      equity: a.equity,
      status: a.accountStatus === "active" ? "Active" : "Archived",
      profit: 0,
      floatingProfit: 0,
      gainPct: 0,
      displayName: a.displayName,
    })),
    equityChart: [] as { date: string; value: number }[],
    tradeDistribution: [] as { label: string; value: number }[],
    tradeHistory: [] as unknown[],
  };

  return { master: topRated, accountDetails, selectedAccountId: selected.id };
}

export async function listMastersForAdmin() {
  const [rows, changeRows, linkedRows] = await Promise.all([
    mastersRepo.listAllMastersForAdmin(),
    changeRequestsRepo.listAllChangeRequestsForAdmin(),
    mastersRepo.listLinkedAccountsForAdmin(),
  ]);

  const applications = rows
    .filter((row) => row.status !== "approved")
    .map((row) => {
      const profile = mastersRepo.serializeMaster(row);
      return {
        id: profile.id,
        kind: "application" as const,
        displayName: row.primary_display_name ?? profile.displayName,
        email: row.user_email,
        status: profile.status.charAt(0).toUpperCase() + profile.status.slice(1),
        appliedAt: profile.appliedAt,
        aum: Number(row.total_balance ?? 0),
        followers: Number(row.followers_count ?? 0),
        rejectReason: profile.rejectionReason,
        commissionPct: profile.commissionPct,
        riskProfile: profile.riskProfile,
        requestedAccount: row.primary_account_number != null ? String(row.primary_account_number) : null,
        currentAccount: null as string | null,
        platform: "MT5" as string | null,
        equity: null as number | null,
      };
    });

  const approvedAccounts = linkedRows.map((row) => ({
    id: row.link_id,
    masterId: row.master_id,
    tradingAccountId: row.trading_account_id,
    kind: "linked_account" as const,
      displayName: row.display_name,
      headline: row.headline,
      strategySummary: row.strategy_summary,
      email: row.user_email,
      status: "Approved",
      appliedAt: row.linked_at,
      aum: Number(row.balance ?? 0),
      equity: Number(row.equity ?? 0),
      followers: Number(row.followers_count ?? 0),
      rejectReason: null as string | null,
      commissionPct: Number(row.commission_pct),
      riskProfile: row.risk_profile,
      minCopyAmount: Number(row.min_copy_amount ?? 25),
    requestedAccount: String(row.account_number),
    currentAccount: null as string | null,
    platform: row.platform,
    isPrimary: row.is_primary,
  }));

  const changes = changeRows
    .filter((r) => r.status === "pending")
    .map((row) => ({
      id: row.id,
      kind: "account_change" as const,
      displayName: row.display_name,
      headline: row.headline,
      strategySummary: row.strategy_summary,
      email: row.user_email,
      status: "Pending",
      appliedAt: row.applied_at,
      aum: 0,
      equity: null as number | null,
      followers: 0,
      rejectReason: row.rejection_reason,
      commissionPct: Number(row.commission_pct),
      riskProfile: row.risk_profile,
      minCopyAmount: Number((row as { min_copy_amount?: string }).min_copy_amount ?? 25),
      requestedAccount: String(row.account_number),
      currentAccount: row.current_account_number != null ? String(row.current_account_number) : null,
      platform: "MT5" as string | null,
      isPrimary: false,
    }));

  return [...changes, ...approvedAccounts, ...applications];
}

export async function getAdminMasterProfile(masterId: string, tradingAccountId?: string) {
  const detail = await getApprovedMasterDetail(masterId, tradingAccountId);
  const master = await mastersRepo.findMasterById(masterId);
  if (!master) {
    throw new AppError("Master not found", 404);
  }

  const userRow = await mastersRepo.findMasterUserEmail(masterId);
  const followers = await subsRepo.listFollowersByMaster(masterId);
  const linkedAt = master.reviewed_at ?? master.applied_at;
  const withUsDays = linkedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(linkedAt).getTime()) / 86400000))
    : 0;

  const selected = detail.accountDetails.accounts.find((a) => a.id === detail.selectedAccountId);
  const balance = selected?.balance ?? 0;
  const equity = selected?.equity ?? 0;

  return {
    master: detail.master,
    selectedAccountId: detail.selectedAccountId,
    accounts: detail.accountDetails.accounts,
    email: userRow?.email ?? "",
    appliedAt: master.applied_at,
    approvedAt: master.reviewed_at,
    withUsDays,
    accountSummary: {
      equity,
      balance,
      floatingProfit: 0,
      bonus: 0,
      leverage: "—",
      maxUnrealisedLoss: 0,
      maxDrawdownDuration: "—",
      strategySegments: (detail.master.strategy || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 6),
    },
    followers: followers.map((f) => ({
      id: f.id,
      email: f.copierEmail,
      accountLogin: f.accountLogin,
      allocation: f.allocation,
      status: f.status,
      startedAt: f.createdAt,
    })),
  };
}

export async function approveMasterApplication(masterId: string, adminId: string) {
  const updated = await mastersRepo.approveMaster(masterId, adminId);
  if (!updated) {
    throw new AppError("Master application not found or not pending", 404);
  }
  return mastersRepo.serializeMaster(updated);
}

export async function rejectMasterApplication(masterId: string, adminId: string, reason: string) {
  const updated = await mastersRepo.rejectMaster(masterId, adminId, reason);
  if (!updated) {
    throw new AppError("Master application not found or not pending", 404);
  }
  return mastersRepo.serializeMaster(updated);
}
