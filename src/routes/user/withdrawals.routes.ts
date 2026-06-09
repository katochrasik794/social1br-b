import { Router } from "express";
import { authenticateUser } from "../../middleware/authenticateUser.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import { authRateLimit } from "../../middleware/rateLimit.js";
import * as controller from "../../controllers/user/withdrawals.controller.js";

const router = Router();

router.use(rejectSuspiciousInput);
router.use(authenticateUser);

router.get("/", controller.listWithdrawals);
router.post("/", authRateLimit, controller.createWithdrawal);

export default router;
