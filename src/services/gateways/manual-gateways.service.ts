import * as gatewaysRepo from "../../db/manual-gateways.repository.js";
import type { GatewayCategory } from "../../db/manual-gateways.repository.js";
import { AppError } from "../../utils/response.js";

const CATEGORY_LABELS: Record<GatewayCategory, string> = {
  gateway: "Gateway",
  cryptocurrency: "Cryptocurrency",
  wire_transfer: "Wire Transfer",
  upi: "UPI / UPI QR",
  local_depositor: "Local Depositor",
};

const ALL_CATEGORIES: GatewayCategory[] = [
  "gateway",
  "cryptocurrency",
  "wire_transfer",
  "upi",
  "local_depositor",
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getCategoryLabel(category: GatewayCategory) {
  return CATEGORY_LABELS[category];
}

export async function listPublicGateways() {
  const gateways = await gatewaysRepo.listActiveGateways();
  const byCategory: Record<
    GatewayCategory,
    { category: GatewayCategory; label: string; count: number; items: typeof gateways }
  > = {} as never;

  for (const cat of ALL_CATEGORIES) {
    const items = gateways.filter((g) => g.category === cat);
    if (items.length > 0) {
      byCategory[cat] = {
        category: cat,
        label: CATEGORY_LABELS[cat],
        count: items.length,
        items,
      };
    }
  }

  return {
    gateways,
    categories: Object.values(byCategory),
  };
}

export async function getPublicGateway(id: string) {
  const gateway = await gatewaysRepo.findActiveGatewayById(id);
  if (!gateway) throw new AppError("Payment method not found", 404);
  return gateway;
}

export async function listAdminGateways() {
  return gatewaysRepo.listAllGateways();
}

export async function getAdminGateway(id: string) {
  const gateway = await gatewaysRepo.findGatewayById(id);
  if (!gateway) throw new AppError("Gateway not found", 404);
  return gateway;
}

export async function createGateway(input: {
  category: GatewayCategory;
  name: string;
  slug?: string;
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
  const slug = input.slug?.trim() || slugify(input.name);
  const existing = await gatewaysRepo.findGatewayBySlug(slug);
  if (existing) throw new AppError("Slug already exists", 409);
  return gatewaysRepo.insertGateway({ ...input, slug });
}

export async function updateGateway(
  id: string,
  input: Partial<{
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
  if (input.slug) {
    const existing = await gatewaysRepo.findGatewayBySlug(input.slug);
    if (existing && existing.id !== id) throw new AppError("Slug already exists", 409);
  }
  const updated = await gatewaysRepo.updateGateway(id, input);
  if (!updated) throw new AppError("Gateway not found", 404);
  return updated;
}

export async function toggleGatewayActive(id: string) {
  const gateway = await gatewaysRepo.findGatewayById(id);
  if (!gateway) throw new AppError("Gateway not found", 404);
  return gatewaysRepo.updateGateway(id, { isActive: !gateway.isActive });
}

export async function deleteGateway(id: string) {
  const ok = await gatewaysRepo.deleteGateway(id);
  if (!ok) throw new AppError("Gateway not found", 404);
  return { deleted: true };
}

export async function validateGatewayForDeposit(gatewayId: string, amount: number) {
  const gateway = await gatewaysRepo.findActiveGatewayById(gatewayId);
  if (!gateway) throw new AppError("Invalid or inactive payment method", 400);
  if (amount < gateway.minAmount) {
    throw new AppError(`Minimum deposit for this method is $${gateway.minAmount}`, 400);
  }
  if (amount > gateway.maxAmount) {
    throw new AppError(`Maximum deposit for this method is $${gateway.maxAmount}`, 400);
  }
  return gateway;
}
