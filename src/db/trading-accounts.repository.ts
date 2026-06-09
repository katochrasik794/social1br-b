import { query } from "../lib/db.js";

export type TradingAccountRow = {
  id: string;
  user_id: string;
  account_number: string;
  platform: string;
  mt5_group: string;
  leverage: number;
  currency: string;
  account_status: string;
  name: string;
  email: string;
  master_password_enc: string;
  investor_password_enc: string;
  balance: string;
  equity: string;
  created_at: Date;
  updated_at: Date;
};

function serialize(row: TradingAccountRow, includePasswords = false) {
  const base = {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (!includePasswords) return base;
  return {
    ...base,
    masterPasswordEnc: row.master_password_enc,
    investorPasswordEnc: row.investor_password_enc,
  };
}

export async function accountNumberExists(accountNumber: number) {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM trading_accounts WHERE account_number = $1) AS exists`,
    [accountNumber]
  );
  return result.rows[0]?.exists ?? false;
}

export async function insertTradingAccount(data: {
  userId: string;
  accountNumber: number;
  mt5Group: string;
  leverage: number;
  currency: string;
  name: string;
  email: string;
  masterPasswordEnc: string;
  investorPasswordEnc: string;
}) {
  const result = await query<TradingAccountRow>(
    `INSERT INTO trading_accounts (
      user_id, account_number, mt5_group, leverage, currency, name, email,
      master_password_enc, investor_password_enc
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`,
    [
      data.userId,
      data.accountNumber,
      data.mt5Group,
      data.leverage,
      data.currency,
      data.name,
      data.email,
      data.masterPasswordEnc,
      data.investorPasswordEnc,
    ]
  );
  return serialize(result.rows[0]);
}

export async function findTradingAccountById(id: string) {
  const result = await query<TradingAccountRow>(`SELECT * FROM trading_accounts WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function findTradingAccountByIdForUser(id: string, userId: string) {
  const result = await query<TradingAccountRow>(
    `SELECT * FROM trading_accounts WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] ?? null;
}

export async function listTradingAccountsByUser(userId: string) {
  const result = await query<TradingAccountRow>(
    `SELECT * FROM trading_accounts WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map((r) => serialize(r));
}

export async function listTradingAccountRowsByUser(userId: string) {
  const result = await query<TradingAccountRow>(
    `SELECT * FROM trading_accounts WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function updateTradingAccountBalance(id: string, balance: number, equity: number) {
  await query(
    `UPDATE trading_accounts SET balance = $2, equity = $3, updated_at = NOW() WHERE id = $1`,
    [id, balance, equity]
  );
}

export async function listAllTradingAccounts(params: { page?: number; limit?: number; search?: string }) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;
  const values: unknown[] = [];
  let where = "";

  if (params.search?.trim()) {
    values.push(`%${params.search.trim()}%`);
    where = `WHERE u.email ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR ta.account_number::text ILIKE $1 OR ta.mt5_group ILIKE $1`;
  }

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM trading_accounts ta
     JOIN users u ON u.id = ta.user_id
     ${where}`,
    values
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const rowsResult = await query<
    TradingAccountRow & {
      user_email: string;
      user_first_name: string | null;
      user_last_name: string | null;
    }
  >(
    `SELECT ta.*, u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name
     FROM trading_accounts ta
     JOIN users u ON u.id = ta.user_id
     ${where}
     ORDER BY ta.created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset]
  );

  return {
    items: rowsResult.rows.map((row) => ({
      ...serialize(row),
      userEmail: row.user_email,
      userName: [row.user_first_name, row.user_last_name].filter(Boolean).join(" ") || row.user_email,
    })),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
