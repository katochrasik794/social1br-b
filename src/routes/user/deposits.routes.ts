import { Router } from "express";
import { authenticateUser } from "../../middleware/authenticateUser.js";
import { rejectSuspiciousInput } from "../../middleware/sanitizeRequest.js";
import { authRateLimit } from "../../middleware/rateLimit.js";
import { depositProofUpload } from "../../middleware/upload.js";
import * as controller from "../../controllers/user/deposits.controller.js";

const router = Router();

router.use(rejectSuspiciousInput);
router.use(authenticateUser);

router.get("/", controller.listDeposits);
router.post("/", authRateLimit, (req, res, next) => {
  depositProofUpload(req, res, (err) => {
    if (err) return next(err);
    controller.createDeposit(req, res, next);
  });
});

export default router;
