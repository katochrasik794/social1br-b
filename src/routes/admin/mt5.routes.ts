import { Router } from "express";
import { authenticateAdmin } from "../../middleware/authenticateAdmin.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import { authRateLimit } from "../../middleware/rateLimit.js";
import * as mt5Controller from "../../controllers/admin/mt5.controller.js";

const router = Router();

router.use(rejectSuspiciousInput);
router.use(authenticateAdmin);

router.get("/manager-configs", mt5Controller.listManagerConfigs);
router.get("/manager-config/:id", mt5Controller.getManagerConfigById);
router.get("/manager-config", mt5Controller.getManagerConfig);
router.put("/manager-config", mt5Controller.saveManagerConfig);
router.delete("/manager-config/:id", mt5Controller.deleteManagerConfig);
router.post("/manager-config/test", authRateLimit, mt5Controller.testManagerConfig);

router.get("/groups", mt5Controller.listGroups);
router.post("/groups/sync", authRateLimit, mt5Controller.syncGroups);
router.get("/groups/:id", mt5Controller.getGroup);
router.patch("/groups/:id", mt5Controller.updateGroup);
router.delete("/groups/:id", mt5Controller.deleteGroup);

export default router;
