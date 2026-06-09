import { query } from "../../lib/db.js";

type ActivityRow = {
  type: "account_opened" | "deposit" | "withdrawal";
  id: string;
  created_at: Date;
  account_number: string | null;
  amount: string | null;
  status: string | null;
  detail: string | null;
};

function buildMessage(row: ActivityRow) {
  if (row.type === "account_opened") {
    const login = row.account_number ?? "—";
    const group = row.detail ? ` (${row.detail})` : "";
    return `MT5 account ${login} opened${group}`;
  }
  if (row.type === "deposit") {
    const amt = row.amount != null ? `$${Number(row.amount).toLocaleString()}` : "";
    const status = row.status ?? "pending";
    return `Deposit ${amt} — ${status}`;
  }
  const amt = row.amount != null ? `$${Number(row.amount).toLocaleString()}` : "";
  const status = row.status ?? "pending";
  return `Withdrawal ${amt} — ${status}`;
}

export async function listRecentUserActivities(userId: string, limit = 5) {
  const result = await query<ActivityRow>(
    `SELECT * FROM (
      SELECT
        'account_opened'::text AS type,
        id::text,
        created_at,
        account_number::text AS account_number,
        NULL::text AS amount,
        account_status AS status,
        mt5_group AS detail
      FROM trading_accounts
      WHERE user_id = $1
      UNION ALL
      SELECT
        'deposit'::text,
        id::text,
        created_at,
        NULL,
        amount::text,
        status::text,
        payment_method
      FROM deposits
      WHERE user_id = $1
      UNION ALL
      SELECT
        'withdrawal'::text,
        id::text,
        created_at,
        NULL,
        amount::text,
        status::text,
        payment_method
      FROM withdrawals
      WHERE user_id = $1
    ) activities
    ORDER BY created_at DESC
    LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => ({
    id: `${row.type}-${row.id}`,
    type: row.type,
    message: buildMessage(row),
    status: row.status,
    amount: row.amount != null ? Number(row.amount) : null,
    accountNumber: row.account_number != null ? Number(row.account_number) : null,
    createdAt: row.created_at,
  }));
}
