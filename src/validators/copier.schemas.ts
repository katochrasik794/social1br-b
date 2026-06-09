import { z } from "zod";

export const masterApplySchema = z.object({
  displayName: z.string().min(2).max(80),
  headline: z.string().min(5).max(160),
  strategySummary: z.string().min(20).max(2000),
  strategyDetail: z.string().max(5000).optional(),
  riskProfile: z.enum(["low", "medium", "high"]),
  commissionPct: z.coerce.number().min(5).max(50),
  minCopyAmount: z.coerce.number().min(25).max(100000).default(25),
  tradingAccountIds: z.array(z.string().uuid()).length(1, "Select exactly one MT5 master account"),
  termsAccepted: z.literal(true),
});

const masterProfileFields = {
  displayName: z.string().min(2).max(80),
  headline: z.string().min(5).max(160),
  strategySummary: z.string().min(20).max(2000),
  strategyDetail: z.string().max(5000).optional(),
  riskProfile: z.enum(["low", "medium", "high"]),
  commissionPct: z.coerce.number().min(5).max(50),
  minCopyAmount: z.coerce.number().min(25).max(100000).default(25),
};

export const changeMasterAccountSchema = z.object({
  tradingAccountId: z.string().uuid(),
  ...masterProfileFields,
  termsAccepted: z.literal(true),
});

export const createSubscriptionSchema = z.object({
  masterId: z.string().uuid(),
  tradingAccountId: z.string().uuid(),
  allocation: z.coerce.number().positive(),
  copyMode: z.enum(["proportional", "fixed"]).default("proportional"),
  lotMultiplier: z.coerce.number().positive().default(1),
  dailyLossLimitPct: z.coerce.number().min(1).max(100).default(5),
  termsAccepted: z.literal(true),
});

export const updateMasterAccountSettingsSchema = z.object({
  displayName: z.string().min(2).max(80),
  headline: z.string().min(5).max(160),
  strategySummary: z.string().min(20).max(2000),
  strategyDetail: z.string().max(5000).optional(),
  riskProfile: z.enum(["low", "medium", "high"]),
  commissionPct: z.coerce.number().min(5).max(50),
  minCopyAmount: z.coerce.number().min(25).max(100000),
  publicProfile: z.boolean(),
  acceptNewCopiers: z.boolean(),
});

export const rejectMasterSchema = z.object({
  reason: z.string().min(1).max(500),
});
