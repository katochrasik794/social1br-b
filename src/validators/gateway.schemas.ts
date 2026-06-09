import { z } from "zod";

const gatewayCategory = z.enum([
  "gateway",
  "cryptocurrency",
  "wire_transfer",
  "upi",
  "local_depositor",
]);

export const createGatewaySchema = z.object({
  category: gatewayCategory,
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(120).optional(),
  details: z.string().max(2000).optional().nullable(),
  cryptoAddress: z.string().max(500).optional().nullable(),
  vpaAddress: z.string().max(255).optional().nullable(),
  bankName: z.string().max(255).optional().nullable(),
  accountNumber: z.string().max(255).optional().nullable(),
  iconUrl: z.string().max(500).optional().nullable(),
  qrCodeUrl: z.string().max(500).optional().nullable(),
  processingTimeText: z.string().max(255).optional(),
  feeDisplay: z.string().max(64).optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  limitsCurrency: z.string().max(10).optional(),
  network: z.string().max(128).optional().nullable(),
  warningText: z.string().max(1000).optional().nullable(),
  isActive: z.coerce.boolean().optional(),
  isRecommended: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updateGatewaySchema = createGatewaySchema.partial();
