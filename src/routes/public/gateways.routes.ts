import { Router } from "express";
import * as controller from "../../controllers/public/gateways.controller.js";

const router = Router();

router.get("/manual-gateways", controller.listGateways);
router.get("/manual-gateways/:id", controller.getGateway);

export default router;
