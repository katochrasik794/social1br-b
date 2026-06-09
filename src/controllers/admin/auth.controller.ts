import type { Request, Response, NextFunction } from "express";
import { adminLoginSchema } from "../../validators/auth.schemas.js";
import * as authService from "../../services/admin/auth.service.js";
import { success } from "../../utils/response.js";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = adminLoginSchema.parse(req.body);
    const data = await authService.loginAdmin(body);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.getAdminById(req.admin!.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
