import { Router } from "express";
import * as authController from "../../controllers/admin/auth.controller.js";
import { authenticateAdmin } from "../../middleware/authenticateAdmin.js";
import { loginRateLimit } from "../../middleware/rateLimit.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";

const router = Router();

router.use(rejectSuspiciousInput);

router.post("/login", loginRateLimit, authController.login);
router.get("/me", authenticateAdmin, authController.me);

export default router;
