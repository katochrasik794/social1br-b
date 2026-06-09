import { Router } from "express";
import { authenticateUser } from "../../middleware/authenticateUser.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import * as controller from "../../controllers/user/mam.controller.js";

const router = Router();

router.get("/settings", controller.getSettings);

router.use(rejectSuspiciousInput);
router.use(authenticateUser);

router.get("/investor", controller.getInvestorDashboard);

export default router;
