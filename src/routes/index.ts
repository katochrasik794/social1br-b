import { Router } from "express";
import userAuthRoutes from "./user/auth.routes.js";
import adminAuthRoutes from "./admin/auth.routes.js";
import adminMt5Routes from "./admin/mt5.routes.js";
import tradingAccountsRoutes from "./user/trading-accounts.routes.js";
import depositsRoutes from "./user/deposits.routes.js";
import withdrawalsRoutes from "./user/withdrawals.routes.js";
import adminTradingAccountsRoutes from "./admin/trading-accounts.routes.js";
import adminDepositsRoutes from "./admin/deposits.routes.js";
import adminWithdrawalsRoutes from "./admin/withdrawals.routes.js";
import publicGatewaysRoutes from "./public/gateways.routes.js";
import adminManualGatewaysRoutes from "./admin/manual-gateways.routes.js";
import userActivitiesRoutes from "./user/activities.routes.js";
import userCopierRoutes from "./user/copier.routes.js";
import userPammRoutes from "./user/pamm.routes.js";
import userMamRoutes from "./user/mam.routes.js";
import userDashboardRoutes from "./user/dashboard.routes.js";
import adminCopierRoutes from "./admin/copier.routes.js";
import adminDashboardRoutes from "./admin/dashboard.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

router.use("/auth/user", userAuthRoutes);
router.use("/auth/admin", adminAuthRoutes);
router.use("/trading-accounts", tradingAccountsRoutes);
router.use("/deposits", depositsRoutes);
router.use("/withdrawals", withdrawalsRoutes);
router.use("/activities", userActivitiesRoutes);
router.use("/copier", userCopierRoutes);
router.use("/pamm", userPammRoutes);
router.use("/mam", userMamRoutes);
router.use("/dashboard", userDashboardRoutes);
router.use("/admin/mt5", adminMt5Routes);
router.use("/admin/mt5/accounts", adminTradingAccountsRoutes);
router.use("/admin/deposits", adminDepositsRoutes);
router.use("/admin/withdrawals", adminWithdrawalsRoutes);
router.use("/public", publicGatewaysRoutes);
router.use("/admin/manual-gateways", adminManualGatewaysRoutes);
router.use("/admin/copier", adminCopierRoutes);
router.use("/admin/dashboard", adminDashboardRoutes);

export default router;
