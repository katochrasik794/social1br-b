import type { Request, Response, NextFunction } from "express";
import * as depositsService from "../../services/funds/deposits.service.js";
import { createDepositSchema } from "../../validators/funds.schemas.js";
import { success } from "../../utils/response.js";

export async function listDeposits(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await depositsService.listUserDeposits(req.user!.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function createDeposit(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createDepositSchema.parse({
      tradingAccountId: req.body.tradingAccountId,
      amount: req.body.amount,
      manualGatewayId: req.body.manualGatewayId,
      paymentMethod: req.body.paymentMethod,
      transactionReference: req.body.transactionReference,
    });

    let proofUrl: string | null = null;
    if (req.file) {
      proofUrl = `/uploads/deposits/${req.file.filename}`;
    }

    const data = await depositsService.createDeposit(req.user!.id, {
      ...body,
      proofUrl,
    });
    res.json(success(data, "Deposit request submitted"));
  } catch (err) {
    next(err);
  }
}
