import type { Request, Response, NextFunction } from "express";
import * as withdrawalsService from "../../services/funds/withdrawals.service.js";
import { approveWithdrawalSchema, rejectFundSchema } from "../../validators/funds.schemas.js";
import { success } from "../../utils/response.js";

function parseStatus(raw: unknown): "pending" | "approved" | "rejected" | undefined {
  if (raw === "pending" || raw === "approved" || raw === "rejected") return raw;
  return undefined;
}

export async function listWithdrawals(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await withdrawalsService.listAdminWithdrawals({
      status: parseStatus(req.query.status),
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function approveWithdrawal(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = approveWithdrawalSchema.parse(req.body ?? {});
    const data = await withdrawalsService.approveWithdrawal(
      id,
      req.admin!.id,
      body.externalTransactionId,
      body.comment
    );
    res.json(success(data, "Withdrawal approved"));
  } catch (err) {
    next(err);
  }
}

export async function rejectWithdrawal(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = rejectFundSchema.parse(req.body);
    const data = await withdrawalsService.rejectWithdrawal(id, req.admin!.id, body.reason);
    res.json(success(data, "Withdrawal rejected"));
  } catch (err) {
    next(err);
  }
}
