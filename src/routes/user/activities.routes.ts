import { Router } from "express";
import { authenticateUser } from "../../middleware/authenticateUser.js";
import * as controller from "../../controllers/user/activities.controller.js";

const router = Router();

router.use(authenticateUser);
router.get("/", controller.listActivities);

export default router;
