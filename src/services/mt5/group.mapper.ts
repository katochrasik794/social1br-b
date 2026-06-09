export type ApiGroup = Record<string, unknown>;

function pick(group: ApiGroup, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = group[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

export function extractGroupName(group: ApiGroup): string {
  const name = pick(group, "name", "group_name", "group", "groupId", "Group");
  return String(name ?? "").trim();
}

export function defaultDedicatedName(groupName: string): string {
  const parts = groupName.split(/[\\/]/).filter(Boolean);
  const last = parts[parts.length - 1] ?? groupName;
  return last.replace(/[-_]/g, " ").trim() || groupName;
}

export function mapApiGroupToScalars(group: ApiGroup) {
  const groupName = extractGroupName(group);
  const enabled = pick(group, "enabled", "isActive", "active", "is_active");

  return {
    groupName,
    description: pick(group, "description", "Description") != null ? String(pick(group, "description", "Description")) : null,
    company: pick(group, "company", "Company") != null ? String(pick(group, "company", "Company")) : null,
    currency: pick(group, "currency", "Currency") != null ? String(pick(group, "currency", "Currency")) : null,
    server: pick(group, "server", "Server") != null ? String(pick(group, "server", "Server")) : null,
    marginCall: toNumber(pick(group, "marginCall", "margin_call", "MarginCall")),
    marginStopOut: toNumber(pick(group, "marginStopOut", "margin_stop_out", "MarginStopOut")),
    minDeposit: toNumber(pick(group, "minimumDeposit", "minimum_deposit", "minDeposit", "min_deposit")),
    maxDeposit: toNumber(pick(group, "maximumDeposit", "maximum_deposit", "maxDeposit", "max_deposit")),
    minWithdrawal: toNumber(pick(group, "minimumWithdrawal", "minimum_withdrawal", "minWithdrawal", "min_withdrawal")),
    maxWithdrawal: toNumber(pick(group, "maximumWithdrawal", "maximum_withdrawal", "maxWithdrawal", "max_withdrawal")),
    isActiveFromApi: enabled == null ? true : Boolean(enabled),
    rawJson: group,
  };
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function extractItems(data: unknown, keys: string[]): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of keys) {
      const val = (data as Record<string, unknown>)[key];
      if (Array.isArray(val)) return val;
    }
  }
  return [];
}
