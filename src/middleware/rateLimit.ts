import rateLimit from "express-rate-limit";

const rateLimitJson = (message: string) => ({
  success: false,
  error: message,
});

/** General auth endpoints — register, forgot password */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitJson("Too many requests. Please try again later."),
});

/** Login brute-force protection — strict per IP */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: rateLimitJson("Too many login attempts. Please try again in 15 minutes."),
});

/** OTP verification — prevent brute force on 6-digit codes */
export const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitJson("Too many OTP attempts. Please try again later."),
});

/** Registration — limit account spam */
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitJson("Too many registration attempts. Please try again later."),
});
