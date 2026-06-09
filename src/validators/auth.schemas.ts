import { z } from "zod";

/** Strip control chars and trim — reduces XSS/injection payloads in stored text fields */
function sanitizeString(value: string) {
  return value.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

const nameField = z
  .string()
  .min(1, "Name is required")
  .max(50, "Name must be at most 50 characters")
  .transform(sanitizeString)
  .refine((v) => /^[\p{L}\p{M}'\-. ]+$/u.test(v), "Name contains invalid characters");

const emailField = z
  .string()
  .email("Invalid email address")
  .max(255)
  .transform((v) => sanitizeString(v).toLowerCase());

const phoneField = z
  .string()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .transform(sanitizeString)
  .refine((v) => /^\+?[0-9\s\-()]{7,20}$/.test(v), "Invalid phone number format");

export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((v) => /[a-z]/.test(v), "Password must include a lowercase letter")
  .refine((v) => /[A-Z]/.test(v), "Password must include an uppercase letter")
  .refine((v) => /[0-9]/.test(v), "Password must include a number")
  .refine(
    (v) => /[^a-zA-Z0-9]/.test(v),
    "Password must include a special character"
  );

const otpField = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d{6}$/, "OTP must contain digits only");

export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
  firstName: nameField,
  lastName: nameField,
  phone: phoneField,
});

export const verifyOtpSchema = z.object({
  email: emailField,
  otp: otpField,
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required").max(128),
});

export const forgotSchema = z.object({
  email: emailField,
});

export const verifyResetSchema = z.object({
  email: emailField,
  otp: otpField,
});

export const resetPasswordSchema = z.object({
  password: passwordField,
});

export const adminLoginSchema = loginSchema;
