import type { Request, Response, NextFunction } from "express";
import * as tradingService from "../../services/trading/trading-accounts.service.js";
import { openTradingAccountSchema } from "../../validators/trading.schemas.js";
import { success } from "../../utils/response.js";

export async function getAvailableGroups(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await tradingService.getAvailableGroups();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function listAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await tradingService.listUserAccounts(req.user!.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function openAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const body = openTradingAccountSchema.parse(req.body);
    const data = await tradingService.openAccount(req.user!.id, body);
    res.json(success(data, "MT5 account opened successfully"));
  } catch (err) {
    next(err);
  }
}
