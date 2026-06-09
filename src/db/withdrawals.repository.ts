import { query } from "../lib/db.js";

export type WithdrawalRow = {
  id: string;
  user_id: string;
  trading_account_id: string;
  amount: string;
  currency: string;
  payment_method: string;
  payment_details: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  external_transaction_id: string | null;
  admin_comment: string | null;
  rejection_reason: string | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  reviewed_by: string | null;
  created_at: Date;
  updated_at: Date;
};

function serializeWithdrawal(
  row: WithdrawalRow & {
    account_number?: string;
    user_email?: string;
    user_first_name?: string | null;
    user_last_name?: string | null;
  }
) {
  return {
    id: row.id,
    userId: row.user_id,
    tradingAccountId: row.trading_account_id,
    accountNumber: row.account_number != null ? Number(row.account_number) : undefined,
    userEmail: row.user_email,
    userName:
      row.user_first_name || row.user_last_name
        ? [row.user_first_name, row.user_last_name].filter(Boolean).join(" ")
        : row.user_email,
    amount: Number(row.amount),
    currency: row.currency,
    paymentMethod: row.payment_method,
    paymentDetails: row.payment_details ?? {},
    status: row.status,
    externalTransactionId: row.external_transaction_id,
    adminComment: row.admin_comment,
    rejectionReason: row.rejection_reason,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    reviewedBy: row.reviewed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertWithdrawal(data: {
  userId: string;
  tradingAccountId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDetails: Record<string, unknown>;
}) {
  const result = await query<WithdrawalRow>(
    `INSERT INTO withdrawals (
      user_id, trading_account_id, amount, currency, payment_method, payment_details
    ) VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *`,
    [
      data.userId,
      data.tradingAccountId,
      data.amount,
      data.currency,
      data.paymentMethod,
      JSON.stringify(data.paymentDetails),
    ]
  );
  return serializeWithdrawal(result.rows[0]);
}

export async function findWithdrawalById(id: string) {
  const result = await query<WithdrawalRow>(`SELECT * FROM withdrawals WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function listWithdrawalsByUser(userId: string) {
  const result = await query<WithdrawalRow & { account_number: string }>(
    `SELECT w.*, ta.account_number
     FROM withdrawals w
     JOIN trading_accounts ta ON ta.id = w.trading_account_id
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return result.rows.map(serializeWithdrawal);
}

export async function listWithdrawalsAdmin(params: {
  status?: "pending" | "approved" | "rejected";
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;
  const values: unknown[] = [];
  const conditions: string[] = [];
  let idx = 1;

  if (params.status) {
    conditions.push(`w.status = $${idx}`);
    values.push(params.status);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM withdrawals w ${where}`,
    values
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const rowsResult = await query<
    WithdrawalRow & {
      account_number: string;
      user_email: string;
      user_first_name: string | null;
      user_last_name: string | null;
    }
  >(
    `SELECT w.*, ta.account_number, u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name
     FROM withdrawals w
     JOIN trading_accounts ta ON ta.id = w.trading_account_id
     JOIN users u ON u.id = w.user_id
     ${where}
     ORDER BY w.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return {
    items: rowsResult.rows.map(serializeWithdrawal),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function approveWithdrawal(
  id: string,
  adminId: string,
  externalTransactionId: string | null,
  comment: string | null
) {
  const result = await query<WithdrawalRow>(
    `UPDATE withdrawals SET
      status = 'approved',
      external_transaction_id = $2,
      admin_comment = $3,
      approved_at = NOW(),
      reviewed_by = $4,
      updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, externalTransactionId, comment, adminId]
  );
  return result.rows[0] ?? null;
}

export async function rejectWithdrawal(id: string, adminId: string, reason: string) {
  const result = await query<WithdrawalRow>(
    `UPDATE withdrawals SET
      status = 'rejected',
      rejection_reason = $2,
      rejected_at = NOW(),
      reviewed_by = $3,
      updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, reason, adminId]
  );
  return result.rows[0] ?? null;
}

export async function countWithdrawalsByStatus() {
  const result = await query<{ pending: string; approved: string; rejected: string }>(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
      COUNT(*) FILTER (WHERE status = 'approved')::text AS approved,
      COUNT(*) FILTER (WHERE status = 'rejected')::text AS rejected
     FROM withdrawals`
  );
  return {
    pending: Number(result.rows[0]?.pending ?? 0),
    approved: Number(result.rows[0]?.approved ?? 0),
    rejected: Number(result.rows[0]?.rejected ?? 0),
  };
}
