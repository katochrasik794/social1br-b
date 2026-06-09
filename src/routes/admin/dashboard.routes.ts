import { Router } from "express";
import { authenticateAdmin } from "../../middleware/authenticateAdmin.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import * as controller from "../../controllers/admin/dashboard.controller.js";

const router = Router();

router.use(rejectSuspiciousInput);
router.use(authenticateAdmin);

router.get("/overview", controller.getOverview);
router.get("/activity", controller.getActivityLogs);

export default router;
