import type { Request, Response, NextFunction } from "express";
import * as gatewaysService from "../../services/gateways/manual-gateways.service.js";
import { success } from "../../utils/response.js";

export async function listGateways(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await gatewaysService.listPublicGateways();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function getGateway(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await gatewaysService.getPublicGateway(id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
