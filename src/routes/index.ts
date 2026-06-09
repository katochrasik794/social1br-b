import { Router } from "express";
import userAuthRoutes from "./user/auth.routes.js";
import adminAuthRoutes from "./admin/auth.routes.js";
import adminMt5Routes from "./admin/mt5.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

router.use("/auth/user", userAuthRoutes);
router.use("/auth/admin", adminAuthRoutes);
router.use("/admin/mt5", adminMt5Routes);

export default router;
