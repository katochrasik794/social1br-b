import type { Request, Response, NextFunction } from "express";
import * as mastersService from "../../services/copier/copier-masters.service.js";
import * as tradeHistoryService from "../../services/copier/copier-trade-history.service.js";
import { rejectMasterSchema } from "../../validators/copier.schemas.js";
import { success } from "../../utils/response.js";

export async function listMasters(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mastersService.listMastersForAdmin();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function approveMaster(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await mastersService.approveMasterApplication(id, req.admin!.id);
    res.json(success(data, "Master approved"));
  } catch (err) {
    next(err);
  }
}

export async function rejectMaster(req: Request, res: Response, next: NextFunction) {
  try {
    const body = rejectMasterSchema.parse(req.body);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await mastersService.rejectMasterApplication(id, req.admin!.id, body.reason);
    res.json(success(data, "Master application rejected"));
  } catch (err) {
    next(err);
  }
}

export async function approveChangeRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await mastersService.approveMasterChangeRequest(id, req.admin!.id);
    res.json(success(data, "Account change approved"));
  } catch (err) {
    next(err);
  }
}

export async function rejectChangeRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const body = rejectMasterSchema.parse(req.body);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await mastersService.rejectMasterChangeRequest(id, req.admin!.id, body.reason);
    res.json(success(data, "Account change rejected"));
  } catch (err) {
    next(err);
  }
}

export async function getMasterProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const masterId = Array.isArray(req.params.masterId) ? req.params.masterId[0] : req.params.masterId;
    const account =
      typeof req.query.account === "string" && req.query.account.trim()
        ? req.query.account.trim()
        : undefined;
    const data = await mastersService.getAdminMasterProfile(masterId, account);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function getMasterAccountHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const tradingAccountId = Array.isArray(req.params.tradingAccountId)
      ? req.params.tradingAccountId[0]
      : req.params.tradingAccountId;
    const data = await tradeHistoryService.getAdminMasterAccountTradeHistory(tradingAccountId);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
