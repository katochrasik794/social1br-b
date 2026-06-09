import type { Request, Response, NextFunction } from "express";
import * as withdrawalsService from "../../services/funds/withdrawals.service.js";
import { createWithdrawalSchema } from "../../validators/funds.schemas.js";
import { success } from "../../utils/response.js";

export async function listWithdrawals(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await withdrawalsService.listUserWithdrawals(req.user!.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function createWithdrawal(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createWithdrawalSchema.parse(req.body);
    const data = await withdrawalsService.createWithdrawal(req.user!.id, body);
    res.json(success(data, "Withdrawal request submitted"));
  } catch (err) {
    next(err);
  }
}
