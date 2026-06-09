import { Router } from "express";
import { authenticateAdmin } from "../../middleware/authenticateAdmin.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import * as controller from "../../controllers/admin/deposits.controller.js";

const router = Router();

router.use(rejectSuspiciousInput);
router.use(authenticateAdmin);

router.get("/", controller.listDeposits);
router.post("/:id/approve", controller.approveDeposit);
router.post("/:id/reject", controller.rejectDeposit);

export default router;
