import { z } from "zod";

export const managerConfigSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().max(100).optional(),
  apiKey: z.string().min(1),
  mt5Login: z.coerce.number().int().positive(),
  mt5Password: z.string().optional(),
  mt5Server: z.string().min(1),
});

export const syncGroupsSchema = z.object({
  forceUpdate: z.boolean().default(false),
});

export const updateGroupSchema = z.object({
  dedicatedName: z.string().max(120).nullable().optional(),
  marginCall: z.coerce.number().nullable().optional(),
  marginStopOut: z.coerce.number().nullable().optional(),
  minDeposit: z.coerce.number().nullable().optional(),
  maxDeposit: z.coerce.number().nullable().optional(),
  minWithdrawal: z.coerce.number().nullable().optional(),
  maxWithdrawal: z.coerce.number().nullable().optional(),
  badgeLabel: z.string().max(64).nullable().optional(),
  planDescription: z.string().max(500).nullable().optional(),
  spreadFrom: z.string().max(64).nullable().optional(),
  maxLeverageDisplay: z.coerce.number().int().positive().nullable().optional(),
  commissionText: z.string().max(64).nullable().optional(),
  minLotSize: z.string().max(32).nullable().optional(),
  isActive: z.boolean().optional(),
});
