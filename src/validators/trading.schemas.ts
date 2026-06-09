import { z } from "zod";
import { passwordField } from "./auth.schemas.js";

export const openTradingAccountSchema = z.object({
  group: z.string().min(1),
  leverage: z.coerce.number().int().min(1).max(1000),
  masterPassword: passwordField,
});
