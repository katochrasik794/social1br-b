import { query } from "../lib/db.js";

export type GatewayCategory =
  | "gateway"
  | "cryptocurrency"
  | "wire_transfer"
  | "upi"
  | "local_depositor";

export type ManualGatewayRow = {
  id: string;
  category: GatewayCategory;
  name: string;
  slug: string;
  details: string | null;
  crypto_address: string | null;
  vpa_address: string | null;
  bank_name: string | null;
  account_number: string | null;
  icon_url: string | null;
  qr_code_url: string | null;
  processing_time_text: string;
  fee_display: string;
  min_amount: string;
  max_amount: string;
  limits_currency: string;
  network: string | null;
  warning_text: string | null;
  is_active: boolean;
  is_recommended: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

export function serializeGateway(row: ManualGatewayRow) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    slug: row.slug,
    details: row.details,
    cryptoAddress: row.crypto_address,
    vpaAddress: row.vpa_address,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    iconUrl: row.icon_url,
    qrCodeUrl: row.qr_code_url,
    processingTimeText: row.processing_time_text,
    feeDisplay: row.fee_display,
    minAmount: Number(row.min_amount),
    maxAmount: Number(row.max_amount),
    limitsCurrency: row.limits_currency,
    network: row.network,
    warningText: row.warning_text,
    isActive: row.is_active,
    isRecommended: row.is_recommended,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type SerializedGateway = ReturnType<typeof serializeGateway>;

export async function listActiveGateways() {
  const result = await query<ManualGatewayRow>(
    `SELECT * FROM manual_gateways WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC`
  );
  return result.rows.map(serializeGateway);
}

export async function listAllGateways() {
  const result = await query<ManualGatewayRow>(
    `SELECT * FROM manual_gateways ORDER BY sort_order ASC, name ASC`
  );
  return result.rows.map(serializeGateway);
}

export async function findGatewayById(id: string) {
  const result = await query<ManualGatewayRow>(`SELECT * FROM manual_gateways WHERE id = $1`, [id]);
  return result.rows[0] ? serializeGateway(result.rows[0]) : null;
}

export async function findActiveGatewayById(id: string) {
  const result = await query<ManualGatewayRow>(
    `SELECT * FROM manual_gateways WHERE id = $1 AND is_active = TRUE`,
    [id]
  );
  return result.rows[0] ? serializeGateway(result.rows[0]) : null;
}

export async function findGatewayBySlug(slug: string) {
  const result = await query<ManualGatewayRow>(`SELECT * FROM manual_gateways WHERE slug = $1`, [slug]);
  return result.rows[0] ? serializeGateway(result.rows[0]) : null;
}

export async function insertGateway(data: {
  category: GatewayCategory;
  name: string;
  slug: string;
  details?: string | null;
  cryptoAddress?: string | null;
  vpaAddress?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  iconUrl?: string | null;
  qrCodeUrl?: string | null;
  processingTimeText?: string;
  feeDisplay?: string;
  minAmount?: number;
  maxAmount?: number;
  limitsCurrency?: string;
  network?: string | null;
  warningText?: string | null;
  isActive?: boolean;
  isRecommended?: boolean;
  sortOrder?: number;
}) {
  const result = await query<ManualGatewayRow>(
    `INSERT INTO manual_gateways (
      category, name, slug, details, crypto_address, vpa_address, bank_name, account_number,
      icon_url, qr_code_url, processing_time_text, fee_display, min_amount, max_amount,
      limits_currency, network, warning_text, is_active, is_recommended, sort_order
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    RETURNING *`,
    [
      data.category,
      data.name,
      data.slug,
      data.details ?? null,
      data.cryptoAddress ?? null,
      data.vpaAddress ?? null,
      data.bankName ?? null,
      data.accountNumber ?? null,
      data.iconUrl ?? null,
      data.qrCodeUrl ?? null,
      data.processingTimeText ?? "5-15 Mins",
      data.feeDisplay ?? "0%",
      data.minAmount ?? 20,
      data.maxAmount ?? 200000,
      data.limitsCurrency ?? "USD",
      data.network ?? null,
      data.warningText ?? null,
      data.isActive ?? true,
      data.isRecommended ?? false,
      data.sortOrder ?? 0,
    ]
  );
  return serializeGateway(result.rows[0]);
}

export async function updateGateway(
  id: string,
  data: Partial<{
    category: GatewayCategory;
    name: string;
    slug: string;
    details: string | null;
    cryptoAddress: string | null;
    vpaAddress: string | null;
    bankName: string | null;
    accountNumber: string | null;
    iconUrl: string | null;
    qrCodeUrl: string | null;
    processingTimeText: string;
    feeDisplay: string;
    minAmount: number;
    maxAmount: number;
    limitsCurrency: string;
    network: string | null;
    warningText: string | null;
    isActive: boolean;
    isRecommended: boolean;
    sortOrder: number;
  }>
) {
  const map: Record<string, unknown> = {
    category: data.category,
    name: data.name,
    slug: data.slug,
    details: data.details,
    cryptoAddress: data.cryptoAddress,
    vpaAddress: data.vpaAddress,
    bankName: data.bankName,
    accountNumber: data.accountNumber,
    iconUrl: data.iconUrl,
    qrCodeUrl: data.qrCodeUrl,
    processingTimeText: data.processingTimeText,
    feeDisplay: data.feeDisplay,
    minAmount: data.minAmount,
    maxAmount: data.maxAmount,
    limitsCurrency: data.limitsCurrency,
    network: data.network,
    warningText: data.warningText,
    isActive: data.isActive,
    isRecommended: data.isRecommended,
    sortOrder: data.sortOrder,
  };

  const columnMap: Record<string, string> = {
    category: "category",
    name: "name",
    slug: "slug",
    details: "details",
    cryptoAddress: "crypto_address",
    vpaAddress: "vpa_address",
    bankName: "bank_name",
    accountNumber: "account_number",
    iconUrl: "icon_url",
    qrCodeUrl: "qr_code_url",
    processingTimeText: "processing_time_text",
    feeDisplay: "fee_display",
    minAmount: "min_amount",
    maxAmount: "max_amount",
    limitsCurrency: "limits_currency",
    network: "network",
    warningText: "warning_text",
    isActive: "is_active",
    isRecommended: "is_recommended",
    sortOrder: "sort_order",
  };

  const fields: string[] = [];
  const values: unknown[] = [id];
  let idx = 2;

  for (const [key, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${columnMap[key]} = $${idx}`);
      values.push(value);
      idx++;
    }
  }

  if (!fields.length) return findGatewayById(id);

  const result = await query<ManualGatewayRow>(
    `UPDATE manual_gateways SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0] ? serializeGateway(result.rows[0]) : null;
}

export async function deleteGateway(id: string) {
  const result = await query(`DELETE FROM manual_gateways WHERE id = $1 RETURNING id`, [id]);
  return (result.rowCount ?? 0) > 0;
}
