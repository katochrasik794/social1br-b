import type { Request, Response, NextFunction } from "express";
import * as mamService from "../../services/mam/mam.service.js";
import { success } from "../../utils/response.js";

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mamService.getMamSettings();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function getInvestorDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mamService.getMamInvestorDashboard(req.user!.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
