import { Router } from "express";
import { authenticateAdmin } from "../../middleware/authenticateAdmin.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import * as controller from "../../controllers/admin/trading-accounts.controller.js";

const router = Router();

router.use(rejectSuspiciousInput);
router.use(authenticateAdmin);

router.get("/", controller.listAccounts);

export default router;
