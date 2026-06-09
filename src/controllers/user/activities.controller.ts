import type { Request, Response, NextFunction } from "express";
import * as activitiesService from "../../services/activities/user-activities.service.js";
import { success } from "../../utils/response.js";

export async function listActivities(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await activitiesService.listRecentUserActivities(req.user!.id, 5);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
