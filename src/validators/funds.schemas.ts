import { z } from "zod";

export const createDepositSchema = z.object({
  tradingAccountId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  manualGatewayId: z.string().uuid(),
  paymentMethod: z.string().min(1).max(120).optional(),
  transactionReference: z.string().max(255).optional(),
});

export const createWithdrawalSchema = z.object({
  tradingAccountId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  paymentMethod: z.string().min(1).max(120),
  paymentDetails: z.record(z.unknown()).default({}),
});

export const approveDepositSchema = z.object({
  comment: z.string().max(500).optional(),
});

export const rejectFundSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const approveWithdrawalSchema = z.object({
  externalTransactionId: z.string().max(255).optional(),
  comment: z.string().max(500).optional(),
});
