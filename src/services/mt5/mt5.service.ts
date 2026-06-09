import { encrypt, decrypt } from "../../utils/encrypt.js";
import * as managerRepo from "../../db/mt5-manager.repository.js";
import * as groupsRepo from "../../db/mt5-groups.repository.js";
import { defaultDedicatedName, extractGroupName, mapApiGroupToScalars } from "./group.mapper.js";
import { fetchMt5GroupsWithConfig, testManagerConnection } from "./mt5.client.js";
import { AppError } from "../../utils/response.js";
import { env } from "../../config/env.js";

function maskConfig(row: {
  id: string;
  label: string;
  api_key: string;
  mt5_login: number;
  mt5_password: string;
  mt5_server: string;
  is_active: boolean;
  last_tested_at: Date | null;
  created_at: Date;
  updated_at: Date;
} | null | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    apiKey: row.api_key,
    mt5Login: row.mt5_login,
    mt5Password: "••••••••",
    mt5Server: row.mt5_server,
    isActive: row.is_active,
    lastTestedAt: row.last_tested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mt5ApiUrl: env.MT5_API_URL,
  };
}

export async function getManagerConfig() {
  const row = await managerRepo.getActiveManagerConfig();
  return maskConfig(row);
}

export async function listManagerConfigs() {
  const rows = await managerRepo.listManagerConfigs();
  return rows.map((row) => maskConfig(row)!);
}

export async function getManagerConfigById(id: string) {
  const row = await managerRepo.findManagerConfigById(id);
  if (!row) throw new AppError("Manager configuration not found", 404);
  return maskConfig(row);
}

export async function saveManagerConfig(input: {
  id?: string;
  label?: string;
  apiKey: string;
  mt5Login: number;
  mt5Password?: string;
  mt5Server: string;
}) {
  const existing = input.id
    ? await managerRepo.findManagerConfigById(input.id)
    : await managerRepo.getActiveManagerConfig();

  let encryptedPassword = existing?.mt5_password;

  if (input.mt5Password && input.mt5Password !== "••••••••") {
    encryptedPassword = encrypt(input.mt5Password);
  }

  if (!encryptedPassword) {
    throw new AppError("MT5 manager password is required", 400);
  }

  let row;
  if (input.id) {
    row = await managerRepo.updateManagerConfigById(input.id, {
      label: input.label ?? "Default",
      apiKey: input.apiKey,
      mt5Login: input.mt5Login,
      mt5Password: encryptedPassword,
      mt5Server: input.mt5Server,
      setActive: true,
    });
    if (!row) throw new AppError("Manager configuration not found", 404);
  } else {
    const total = await managerRepo.countManagerConfigs();
    if (total >= 1) {
      throw new AppError("You can add maximum only one connection at a time", 400);
    }
    row = await managerRepo.upsertActiveManagerConfig({
      label: input.label ?? "Default",
      apiKey: input.apiKey,
      mt5Login: input.mt5Login,
      mt5Password: encryptedPassword,
      mt5Server: input.mt5Server,
    });
  }

  return maskConfig(row);
}

export async function deleteManagerConfig(id: string) {
  const row = await managerRepo.findManagerConfigById(id);
  if (!row) throw new AppError("Manager configuration not found", 404);
  await managerRepo.deleteManagerConfigById(id);
  return { deleted: true };
}

export async function testConnection(input?: {
  apiKey: string;
  mt5Login: number;
  mt5Password?: string;
  mt5Server: string;
}) {
  if (input) {
    let password = input.mt5Password;
    if (!password || password === "••••••••") {
      const existing = await managerRepo.getActiveManagerConfig();
      if (!existing) throw new AppError("Password required for connection test", 400);
      password = decrypt(existing.mt5_password);
    }
    try {
      await testManagerConnection({
        apiKey: input.apiKey,
        mt5Login: input.mt5Login,
        mt5Password: password,
        mt5Server: input.mt5Server,
      });
    } catch (err) {
      throw new AppError(err instanceof Error ? err.message : "Connection test failed", 502);
    }
    const existing = await managerRepo.getActiveManagerConfig();
    if (existing) await managerRepo.updateManagerLastTested(existing.id);
    return { ok: true, message: "Connection successful" };
  }

  const existing = await managerRepo.getActiveManagerConfig();
  if (!existing) throw new AppError("No active MT5 manager configuration", 404);

  try {
    await testManagerConnection();
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : "Connection test failed", 502);
  }
  await managerRepo.updateManagerLastTested(existing.id);
  return { ok: true, message: "Connection successful" };
}

export async function listGroups(params: groupsRepo.ListGroupsParams) {
  const [list, counts] = await Promise.all([
    groupsRepo.listGroups(params),
    groupsRepo.countGroupsByStatus(),
  ]);
  return { ...list, counts };
}

export async function getGroup(id: string) {
  const group = await groupsRepo.findGroupById(id);
  if (!group) throw new AppError("Group not found", 404);
  return group;
}

export async function updateGroup(
  id: string,
  patch: Partial<{
    dedicatedName: string | null;
    marginCall: number | null;
    marginStopOut: number | null;
    minDeposit: number | null;
    maxDeposit: number | null;
    minWithdrawal: number | null;
    maxWithdrawal: number | null;
    badgeLabel: string | null;
    planDescription: string | null;
    spreadFrom: string | null;
    maxLeverageDisplay: number | null;
    commissionText: string | null;
    minLotSize: string | null;
    isActive: boolean;
  }>
) {
  const updated = await groupsRepo.updateGroupAdminFields(id, patch);
  if (!updated) throw new AppError("Group not found", 404);
  return updated;
}

export async function deleteGroup(id: string) {
  const ok = await groupsRepo.deleteGroupById(id);
  if (!ok) throw new AppError("Group not found", 404);
  return { deleted: true };
}

export async function syncGroups(forceUpdate: boolean) {
  let apiGroups;
  try {
    apiGroups = await fetchMt5GroupsWithConfig();
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : "Failed to fetch MT5 groups", 502);
  }
  let inserted = 0;
  let updated = 0;
  let deleted = 0;

  const apiNames: string[] = [];

  for (const apiGroup of apiGroups) {
    const mapped = mapApiGroupToScalars(apiGroup);
    if (!mapped.groupName) continue;

    apiNames.push(mapped.groupName);
    const existing = await groupsRepo.findGroupByName(mapped.groupName);

    if (!existing) {
      await groupsRepo.insertGroup({
        groupName: mapped.groupName,
        dedicatedName: defaultDedicatedName(mapped.groupName),
        description: mapped.description,
        company: mapped.company,
        currency: mapped.currency,
        server: mapped.server,
        marginCall: mapped.marginCall,
        marginStopOut: mapped.marginStopOut,
        isActive: mapped.isActiveFromApi,
        rawJson: mapped.rawJson,
      });
      inserted++;
      continue;
    }

    if (forceUpdate) {
      await groupsRepo.updateGroupForceFields(existing.id, {
        description: mapped.description,
        company: mapped.company,
        currency: mapped.currency,
        server: mapped.server,
        marginCall: mapped.marginCall,
        marginStopOut: mapped.marginStopOut,
        rawJson: mapped.rawJson,
      });
    } else {
      await groupsRepo.updateGroupApiFields(existing.id, {
        description: mapped.description,
        company: mapped.company,
        currency: mapped.currency,
        server: mapped.server,
        marginCall: mapped.marginCall,
        marginStopOut: mapped.marginStopOut,
        rawJson: mapped.rawJson,
      });
    }
    updated++;
  }

  if (forceUpdate) {
    deleted = await groupsRepo.deleteGroupsNotInNames(apiNames);
  }

  return { inserted, updated, deleted, total: apiNames.length };
}
