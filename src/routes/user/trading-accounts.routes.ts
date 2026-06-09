import { Router } from "express";
import { authenticateUser } from "../../middleware/authenticateUser.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import { authRateLimit } from "../../middleware/rateLimit.js";
import * as controller from "../../controllers/user/trading-accounts.controller.js";

const router = Router();

router.use(rejectSuspiciousInput);
router.use(authenticateUser);

router.get("/available-groups", controller.getAvailableGroups);
router.get("/", controller.listAccounts);
router.post("/", authRateLimit, controller.openAccount);

export default router;
