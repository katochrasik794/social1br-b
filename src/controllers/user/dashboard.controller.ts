import type { Request, Response, NextFunction } from "express";
import * as dashboardService from "../../services/dashboard/user-dashboard.service.js";
import { success } from "../../utils/response.js";

export async function getActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.listDashboardActivity(req.user!.id, 8);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
