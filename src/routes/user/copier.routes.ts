import { Router } from "express";
import { authenticateUser } from "../../middleware/authenticateUser.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import { authRateLimit } from "../../middleware/rateLimit.js";
import * as controller from "../../controllers/user/copier.controller.js";

const router = Router();

router.get("/settings", controller.getSettings);

router.use(rejectSuspiciousInput);
router.use(authenticateUser);

router.get("/master/account-options", controller.getMasterApplyAccountOptions);
router.get("/master/me", controller.getMasterMe);
router.get("/master/commissions", controller.getMasterCommissions);
router.post("/master/change-request", controller.submitMasterChangeRequest);
router.get("/master/accounts/:tradingAccountId/history", controller.getMasterAccountHistory);
router.put("/master/accounts/:tradingAccountId", controller.updateMasterAccountSettings);
router.post("/master/apply", authRateLimit, controller.applyForMaster);
router.get("/masters", controller.listMasters);
router.get("/masters/:id/accounts/:tradingAccountId/history", controller.getPublicMasterAccountHistory);
router.get("/masters/:id", controller.getMasterDetail);
router.get("/subscriptions", controller.listSubscriptions);
router.post("/subscriptions", authRateLimit, controller.createSubscription);

export default router;
