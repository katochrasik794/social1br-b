import { query } from "../lib/db.js";

export type DepositRow = {
  id: string;
  user_id: string;
  trading_account_id: string;
  amount: string;
  currency: string;
  payment_method: string;
  manual_gateway_id: string | null;
  transaction_reference: string | null;
  proof_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_comment: string | null;
  rejection_reason: string | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  reviewed_by: string | null;
  created_at: Date;
  updated_at: Date;
};

function serializeDeposit(
  row: DepositRow & {
    account_number?: string;
    user_email?: string;
    user_first_name?: string | null;
    user_last_name?: string | null;
    gateway_name?: string | null;
    gateway_category?: string | null;
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
    manualGatewayId: row.manual_gateway_id,
    gatewayName: row.gateway_name,
    gatewayCategory: row.gateway_category,
    transactionReference: row.transaction_reference,
    proofUrl: row.proof_url,
    status: row.status,
    adminComment: row.admin_comment,
    rejectionReason: row.rejection_reason,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    reviewedBy: row.reviewed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertDeposit(data: {
  userId: string;
  tradingAccountId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  manualGatewayId?: string | null;
  transactionReference: string | null;
  proofUrl: string | null;
}) {
  const result = await query<DepositRow>(
    `INSERT INTO deposits (
      user_id, trading_account_id, amount, currency, payment_method, manual_gateway_id, transaction_reference, proof_url
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
    [
      data.userId,
      data.tradingAccountId,
      data.amount,
      data.currency,
      data.paymentMethod,
      data.manualGatewayId ?? null,
      data.transactionReference,
      data.proofUrl,
    ]
  );
  return serializeDeposit(result.rows[0]);
}

export async function findDepositById(id: string) {
  const result = await query<DepositRow>(`SELECT * FROM deposits WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function listDepositsByUser(userId: string) {
  const result = await query<DepositRow & { account_number: string }>(
    `SELECT d.*, ta.account_number
     FROM deposits d
     JOIN trading_accounts ta ON ta.id = d.trading_account_id
     WHERE d.user_id = $1
     ORDER BY d.created_at DESC`,
    [userId]
  );
  return result.rows.map(serializeDeposit);
}

export async function listDepositsAdmin(params: {
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
    conditions.push(`d.status = $${idx}`);
    values.push(params.status);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM deposits d ${where}`,
    values
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const rowsResult = await query<
    DepositRow & {
      account_number: string;
      user_email: string;
      user_first_name: string | null;
      user_last_name: string | null;
      gateway_name: string | null;
      gateway_category: string | null;
    }
  >(
    `SELECT d.*, ta.account_number, u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name,
            mg.name AS gateway_name, mg.category::text AS gateway_category
     FROM deposits d
     JOIN trading_accounts ta ON ta.id = d.trading_account_id
     JOIN users u ON u.id = d.user_id
     LEFT JOIN manual_gateways mg ON mg.id = d.manual_gateway_id
     ${where}
     ORDER BY d.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return {
    items: rowsResult.rows.map(serializeDeposit),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function approveDeposit(id: string, adminId: string, comment: string | null) {
  const result = await query<DepositRow>(
    `UPDATE deposits SET
      status = 'approved',
      admin_comment = $2,
      approved_at = NOW(),
      reviewed_by = $3,
      updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, comment, adminId]
  );
  return result.rows[0] ?? null;
}

export async function rejectDeposit(id: string, adminId: string, reason: string) {
  const result = await query<DepositRow>(
    `UPDATE deposits SET
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

export async function countDepositsByStatus() {
  const result = await query<{ pending: string; approved: string; rejected: string }>(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
      COUNT(*) FILTER (WHERE status = 'approved')::text AS approved,
      COUNT(*) FILTER (WHERE status = 'rejected')::text AS rejected
     FROM deposits`
  );
  return {
    pending: Number(result.rows[0]?.pending ?? 0),
    approved: Number(result.rows[0]?.approved ?? 0),
    rejected: Number(result.rows[0]?.rejected ?? 0),
  };
}
