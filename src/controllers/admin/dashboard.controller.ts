import type { Request, Response, NextFunction } from "express";
import * as dashboardService from "../../services/admin/admin-dashboard.service.js";
import { success } from "../../utils/response.js";

export async function getOverview(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getAdminDashboardOverview();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function getActivityLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const data = await dashboardService.getAdminActivityLogs({ search, page, limit });
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
