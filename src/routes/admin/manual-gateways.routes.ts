import { Router } from "express";
import { authenticateAdmin } from "../../middleware/authenticateAdmin.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import { gatewayMediaUpload } from "../../middleware/upload.js";
import * as controller from "../../controllers/admin/manual-gateways.controller.js";

const router = Router();

router.use(authenticateAdmin);
router.use(rejectSuspiciousInput);

router.get("/", controller.listGateways);
router.get("/:id", controller.getGateway);
router.post("/", (req, res, next) => {
  gatewayMediaUpload(req, res, (err) => {
    if (err) return next(err);
    controller.createGateway(req, res, next);
  });
});
router.put("/:id", (req, res, next) => {
  gatewayMediaUpload(req, res, (err) => {
    if (err) return next(err);
    controller.updateGateway(req, res, next);
  });
});
router.post("/:id/toggle", controller.toggleGateway);
router.delete("/:id", controller.deleteGateway);

export default router;
