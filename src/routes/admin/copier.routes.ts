import { Router } from "express";
import { authenticateAdmin } from "../../middleware/authenticateAdmin.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import * as controller from "../../controllers/admin/copier.controller.js";

const router = Router();

router.use(rejectSuspiciousInput);
router.use(authenticateAdmin);

router.get("/masters", controller.listMasters);
router.get("/masters/:masterId/profile", controller.getMasterProfile);
router.get("/accounts/:tradingAccountId/history", controller.getMasterAccountHistory);
router.post("/masters/:id/approve", controller.approveMaster);
router.post("/masters/:id/reject", controller.rejectMaster);
router.post("/change-requests/:id/approve", controller.approveChangeRequest);
router.post("/change-requests/:id/reject", controller.rejectChangeRequest);

export default router;
