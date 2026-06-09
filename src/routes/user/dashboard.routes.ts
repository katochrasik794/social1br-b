import { Router } from "express";
import { authenticateUser } from "../../middleware/authenticateUser.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import * as controller from "../../controllers/user/dashboard.controller.js";

const router = Router();

router.use(rejectSuspiciousInput);
router.use(authenticateUser);

router.get("/activity", controller.getActivity);

export default router;
