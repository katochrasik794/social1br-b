import type { Request, Response, NextFunction } from "express";
import * as tradingService from "../../services/trading/trading-accounts.service.js";
import { success } from "../../utils/response.js";

export async function listAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await tradingService.listAdminAccounts({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
    });
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
