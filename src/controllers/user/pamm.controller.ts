import type { Request, Response, NextFunction } from "express";
import * as pammService from "../../services/pamm/pamm.service.js";
import { success } from "../../utils/response.js";

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await pammService.getPammSettings();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function getInvestorDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await pammService.getPammInvestorDashboard(req.user!.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
