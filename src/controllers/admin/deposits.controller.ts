import type { Request, Response, NextFunction } from "express";
import * as depositsService from "../../services/funds/deposits.service.js";
import { approveDepositSchema, rejectFundSchema } from "../../validators/funds.schemas.js";
import { success } from "../../utils/response.js";

function parseStatus(raw: unknown): "pending" | "approved" | "rejected" | undefined {
  if (raw === "pending" || raw === "approved" || raw === "rejected") return raw;
  return undefined;
}

export async function listDeposits(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await depositsService.listAdminDeposits({
      status: parseStatus(req.query.status),
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function approveDeposit(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = approveDepositSchema.parse(req.body ?? {});
    const data = await depositsService.approveDeposit(id, req.admin!.id, body.comment);
    res.json(success(data, "Deposit approved"));
  } catch (err) {
    next(err);
  }
}

export async function rejectDeposit(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = rejectFundSchema.parse(req.body);
    const data = await depositsService.rejectDeposit(id, req.admin!.id, body.reason);
    res.json(success(data, "Deposit rejected"));
  } catch (err) {
    next(err);
  }
}
