import { env } from "../../config/env.js";
import { extractItems } from "./group.mapper.js";

export type Mt5HistoryDeal = Record<string, unknown>;

export type NormalizedClosedTrade = {
  id: string;
  orderId: string;
  volume: number;
  type: string;
  symbol: string;
  openTime: string;
  closeTime: string;
  openPrice: string;
  closePrice: string;
  tpSl: string;
  pips: number | null;
  commission: string;
  profit: number;
};

type ClientTokenCache = {
  token: string;
  expiresAt: number;
};

const clientTokenCache = new Map<number, ClientTokenCache>();
const CLIENT_TOKEN_TTL_MS = env.MT5_MANAGER_TOKEN_TTL_MS;

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

function pickDeal(deal: Mt5HistoryDeal, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = deal[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function dealType(deal: Mt5HistoryDeal): string {
  return String(pickDeal(deal, "type", "Type", "action", "Action") ?? "").trim();
}

function dealEntry(deal: Mt5HistoryDeal): number | null {
  const raw = pickDeal(deal, "entry", "Entry", "dealEntry", "deal_entry");
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function dealEntryDescription(deal: Mt5HistoryDeal): string {
  return String(pickDeal(deal, "entryDescription", "entry_description", "EntryDescription") ?? "")
    .trim()
    .toLowerCase();
}

function dealPositionId(deal: Mt5HistoryDeal): string | null {
  const raw = pickDeal(deal, "positionId", "position_id", "PositionId", "position");
  if (raw == null) return null;
  return String(raw);
}

function formatDealTime(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().replace("T", " ").slice(0, 16);
}

function volumeToLots(volume: unknown): number {
  const n = Number(volume ?? 0);
  if (!Number.isFinite(n) || n === 0) return 0;
  return Math.round((n / 100) * 100) / 100;
}

export function extractHistoryItems(data: unknown): Mt5HistoryDeal[] {
  const nested = data && typeof data === "object" ? (data as Record<string, unknown>).data : undefined;
  const fromRoot = extractItems(data, ["items", "history", "deals"]);
  if (fromRoot.length) return fromRoot as Mt5HistoryDeal[];
  if (nested) return extractItems(nested, ["items", "history", "deals"]) as Mt5HistoryDeal[];
  return [];
}

export function isTradeDeal(deal: Mt5HistoryDeal): boolean {
  const type = dealType(deal).toLowerCase();
  return type === "buy" || type === "sell";
}

export function isClosedOutDeal(deal: Mt5HistoryDeal): boolean {
  const entry = dealEntry(deal);
  const desc = dealEntryDescription(deal);
  return entry === 1 || desc.includes("out");
}

export function isOpenInDeal(deal: Mt5HistoryDeal): boolean {
  const entry = dealEntry(deal);
  const desc = dealEntryDescription(deal);
  return entry === 0 || desc.includes("in");
}

export async function clientLogin(login: number, password: string, apiKey: string): Promise<string> {
  const cached = clientTokenCache.get(login);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const res = await fetch(`${getBaseUrl()}/api/v1/auth/client/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-key": apiKey,
      "api-key": apiKey,
    },
    body: JSON.stringify({
      login,
      password,
      apiKey,
      api_key: apiKey,
      managerApiKey: apiKey,
      manager_api_key: apiKey,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = String(data.message ?? data.error ?? "MT5 client login failed");
    throw new Error(message);
  }

  const token = extractToken(data);
  if (!token) throw new Error("MT5 client login returned no token");

  clientTokenCache.set(login, {
    token,
    expiresAt: Date.now() + CLIENT_TOKEN_TTL_MS,
  });

  return token;
}

export async function fetchClientHistoryPage(
  clientToken: string,
  opts: { from: string; to: string; page: number; pageSize: number }
): Promise<{ items: Mt5HistoryDeal[]; totalPages: number }> {
  const params = new URLSearchParams({
    from: opts.from,
    to: opts.to,
    page: String(opts.page),
    pageSize: String(opts.pageSize),
  });

  const res = await fetch(`${getBaseUrl()}/api/v1/client/trading/history?${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${clientToken}`,
      Accept: "application/json",
    },
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = String(data.message ?? data.error ?? "MT5 history fetch failed");
    throw new Error(message);
  }

  const items = extractHistoryItems(data);
  const totalPages = Number(
    data.totalPages ?? data.total_pages ?? (data.data as Record<string, unknown> | undefined)?.totalPages ?? 1
  );

  return {
    items,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
  };
}

export async function fetchClientHistoryAll(
  clientToken: string,
  opts?: { from?: string; to?: string; pageSize?: number }
): Promise<Mt5HistoryDeal[]> {
  const from = opts?.from ?? "2024-01-01T00:00:00.000Z";
  const to = opts?.to ?? "2090-12-31T23:59:59.999Z";
  const pageSize = opts?.pageSize ?? 1000;

  const first = await fetchClientHistoryPage(clientToken, { from, to, page: 1, pageSize });
  const all = [...first.items];

  for (let page = 2; page <= first.totalPages; page++) {
    const next = await fetchClientHistoryPage(clientToken, { from, to, page, pageSize });
    all.push(...next.items);
  }

  return all;
}

export function buildInDealByPosition(deals: Mt5HistoryDeal[]): Map<string, Mt5HistoryDeal> {
  const map = new Map<string, Mt5HistoryDeal>();
  for (const deal of deals) {
    if (!isTradeDeal(deal) || !isOpenInDeal(deal)) continue;
    const positionId = dealPositionId(deal);
    if (positionId) map.set(positionId, deal);
  }
  return map;
}

export function normalizeClosedDeal(
  deal: Mt5HistoryDeal,
  inDealByPosition: Map<string, Mt5HistoryDeal>
): NormalizedClosedTrade {
  const ticket = String(pickDeal(deal, "ticket", "Ticket", "deal", "Deal", "id") ?? "");
  const positionId = dealPositionId(deal);
  const inDeal = positionId ? inDealByPosition.get(positionId) : undefined;

  const rawType = dealType(deal).toUpperCase();
  const type = rawType === "BUY" || rawType === "SELL" ? rawType : rawType || "—";

  const closePrice = pickDeal(deal, "price", "Price", "closePrice", "close_price");
  const openPrice = inDeal
    ? pickDeal(inDeal, "price", "Price", "openPrice", "open_price")
    : pickDeal(deal, "openPrice", "open_price");

  const closeTime = pickDeal(deal, "time", "Time", "closeTime", "close_time");
  const openTime = inDeal
    ? pickDeal(inDeal, "time", "Time", "openTime", "open_time")
    : pickDeal(deal, "openTime", "open_time");

  const commission = pickDeal(deal, "commission", "Commission");
  const profit = Number(pickDeal(deal, "profit", "Profit") ?? 0);

  return {
    id: ticket || `deal-${positionId ?? "unknown"}`,
    orderId: ticket ? `#${ticket}` : "—",
    volume: volumeToLots(pickDeal(deal, "volume", "Volume", "lots", "Lots")),
    type,
    symbol: String(pickDeal(deal, "symbol", "Symbol") ?? "—"),
    openTime: formatDealTime(openTime),
    closeTime: formatDealTime(closeTime),
    openPrice: openPrice != null ? String(openPrice) : "—",
    closePrice: closePrice != null ? String(closePrice) : "—",
    tpSl: "—",
    pips: null,
    commission: commission != null ? String(commission) : "—",
    profit: Number.isFinite(profit) ? profit : 0,
  };
}

export function filterAndNormalizeClosedTrades(deals: Mt5HistoryDeal[]): NormalizedClosedTrade[] {
  const inDealByPosition = buildInDealByPosition(deals);

  return deals
    .filter((deal) => isTradeDeal(deal) && isClosedOutDeal(deal))
    .map((deal) => normalizeClosedDeal(deal, inDealByPosition))
    .sort((a, b) => {
      const ta = a.closeTime === "—" ? 0 : new Date(a.closeTime).getTime();
      const tb = b.closeTime === "—" ? 0 : new Date(b.closeTime).getTime();
      return tb - ta;
    });
}
