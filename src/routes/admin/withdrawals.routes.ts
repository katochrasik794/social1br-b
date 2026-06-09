import { Router } from "express";
import { authenticateAdmin } from "../../middleware/authenticateAdmin.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import * as controller from "../../controllers/admin/withdrawals.controller.js";

const router = Router();

router.use(rejectSuspiciousInput);
router.use(authenticateAdmin);

router.get("/", controller.listWithdrawals);
router.post("/:id/approve", controller.approveWithdrawal);
router.post("/:id/reject", controller.rejectWithdrawal);

export default router;
