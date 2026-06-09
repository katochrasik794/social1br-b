import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("30d"),
  OTP_TTL_MINUTES: z.coerce.number().default(10),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DEV_OTP_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  DEV_OTP: z.string().default("123456"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Social Trading <noreply@example.com>"),
  INITIAL_ADMIN_EMAIL: z.string().email().optional(),
  INITIAL_ADMIN_PASSWORD: z.string().min(8).optional(),
  MT5_API_URL: z.string().url().default("https://www.thefincrm.net"),
  MT5_MANAGER_TOKEN_TTL_MS: z.coerce.number().default(240000),
  ENCRYPTION_KEY: z.string().min(16).optional(),
  MT5_MANAGER_API_KEY: z.string().optional(),
  MT5_MANAGER_LOGIN: z.coerce.number().optional(),
  MT5_MANAGER_PASSWORD: z.string().optional(),
  MT5_MANAGER_SERVER: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

export const corsOrigins = parsed.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  ...parsed,
  ENCRYPTION_KEY: parsed.ENCRYPTION_KEY ?? parsed.JWT_SECRET,
};
