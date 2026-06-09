import { Router } from "express";
import * as authController from "../../controllers/user/auth.controller.js";
import { authenticateUser, authenticateResetToken } from "../../middleware/authenticateUser.js";
import {
  authRateLimit,
  loginRateLimit,
  otpRateLimit,
  registerRateLimit,
} from "../../middleware/rateLimit.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";

const router = Router();

router.use(rejectSuspiciousInput);

router.post("/register", registerRateLimit, authController.register);
router.post("/verify-otp", otpRateLimit, authController.verifyOtp);
router.post("/login", loginRateLimit, authController.login);
router.post("/forgot-password", authRateLimit, authController.forgotPassword);
router.post("/verify-reset-otp", otpRateLimit, authController.verifyResetOtp);
router.post("/reset-password", authRateLimit, authenticateResetToken, authController.resetPassword);
router.get("/me", authenticateUser, authController.me);

export default router;
