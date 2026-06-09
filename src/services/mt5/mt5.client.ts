import { env } from "../../config/env.js";
import { decrypt } from "../../utils/encrypt.js";
import * as managerRepo from "../../db/mt5-manager.repository.js";
import { extractGroupName, extractItems } from "./group.mapper.js";

type TokenCache = {
  token: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

function getBaseUrl() {
  return env.MT5_API_URL.replace(/\/$/, "");
}

function extractToken(data: Record<string, unknown>): string | null {
  const nested = data.data as Record<string, unknown> | undefined;
  const token =
    data.token ??
    data.accessToken ??
    data.access_token ??
    nested?.token ??
    nested?.accessToken ??
    nested?.access_token;
  return token ? String(token) : null;
}

async function loginWithConfig(config: {
  api_key: string;
  mt5_login: number;
  mt5_password: string;
  mt5_server: string;
}) {
  const password = decrypt(config.mt5_password);
  const res = await fetch(`${getBaseUrl()}/api/v1/auth/manager/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      apiKey: config.api_key,
      mt5_login: config.mt5_login,
      mt5_password: password,
      mt5_server: config.mt5_server,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = String(data.message ?? data.error ?? "MT5 manager login failed");
    throw new Error(message);
  }

  const token = extractToken(data);
  if (!token) throw new Error("MT5 manager login returned no token");

  tokenCache = {
    token,
    expiresAt: Date.now() + env.MT5_MANAGER_TOKEN_TTL_MS,
  };

  return token;
}

export async function getManagerTokenCached(force = false) {
  if (!force && tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const config = await managerRepo.getActiveManagerConfig();
  if (!config) throw new Error("No active MT5 manager configuration found");

  return loginWithConfig(config);
}

export function clearManagerTokenCache() {
  tokenCache = null;
}

export async function managerGet(path: string, retry = true): Promise<unknown> {
  const token = await getManagerTokenCached();
  const res = await fetch(`${getBaseUrl()}/api/v1${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if ((res.status === 401 || res.status === 403) && retry) {
    clearManagerTokenCache();
    await getManagerTokenCached(true);
    return managerGet(path, false);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = String((data as Record<string, unknown>).message ?? (data as Record<string, unknown>).error ?? "MT5 API request failed");
    throw new Error(message);
  }

  return data;
}

export async function testManagerConnection(config?: {
  apiKey: string;
  mt5Login: number;
  mt5Password: string;
  mt5Server: string;
}) {
  if (config) {
    const res = await fetch(`${getBaseUrl()}/api/v1/auth/manager/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        apiKey: config.apiKey,
        mt5_login: config.mt5Login,
        mt5_password: config.mt5Password,
        mt5_server: config.mt5Server,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(String(data.message ?? data.error ?? "Connection test failed"));
    }
    if (!extractToken(data)) throw new Error("Connection test returned no token");
    return true;
  }

  clearManagerTokenCache();
  await getManagerTokenCached(true);
  return true;
}

export async function fetchMt5Groups() {
  const data = await managerGet("/mt5/groups");
  return extractItems(data, ["groups", "items"]) as Record<string, unknown>[];
}

export async function fetchMt5GroupConfig(groupName: string) {
  const encoded = encodeURIComponent(groupName);
  const data = await managerGet(`/mt5/groups/${encoded}/config`);
  return (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
}

export async function fetchMt5GroupsWithConfig() {
  const groups = await fetchMt5Groups();
  const enriched = await Promise.all(
    groups.map(async (group) => {
      const name = extractGroupName(group);
      if (!name) return group;
      try {
        const config = await fetchMt5GroupConfig(name);
        return { ...group, ...config, name };
      } catch {
        return group;
      }
    })
  );
  return enriched;
}
