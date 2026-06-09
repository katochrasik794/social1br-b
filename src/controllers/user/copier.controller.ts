import type { Request, Response, NextFunction } from "express";
import * as mastersService from "../../services/copier/copier-masters.service.js";
import * as tradeHistoryService from "../../services/copier/copier-trade-history.service.js";
import * as subsService from "../../services/copier/copier-subscriptions.service.js";
import * as commissionService from "../../services/copier/copier-commission.service.js";
import * as mastersRepo from "../../db/copier-masters.repository.js";
import {
  masterApplySchema,
  createSubscriptionSchema,
  changeMasterAccountSchema,
  updateMasterAccountSettingsSchema,
} from "../../validators/copier.schemas.js";
import { success } from "../../utils/response.js";

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mastersService.getCopierSettings();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function getMasterApplyAccountOptions(req: Request, res: Response, next: NextFunction) {
  try {
    const forApproved = req.query.for === "approved";
    const data = await mastersService.getMasterApplyAccountOptions(req.user!.id, {
      forApprovedMaster: forApproved,
    });
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function submitMasterChangeRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const body = changeMasterAccountSchema.parse(req.body);
    const { termsAccepted: _, ...payload } = body;
    const data = await mastersService.submitMasterChangeRequest(req.user!.id, payload);
    res.json(success(data, "Account change submitted for admin approval"));
  } catch (err) {
    next(err);
  }
}

export async function getMasterAccountHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const tradingAccountId = Array.isArray(req.params.tradingAccountId)
      ? req.params.tradingAccountId[0]
      : req.params.tradingAccountId;
    const data = await tradeHistoryService.getMasterAccountTradeHistory(req.user!.id, tradingAccountId);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function updateMasterAccountSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const tradingAccountId = Array.isArray(req.params.tradingAccountId)
      ? req.params.tradingAccountId[0]
      : req.params.tradingAccountId;
    const body = updateMasterAccountSettingsSchema.parse(req.body);
    const data = await mastersService.updateMasterAccountSettings(req.user!.id, tradingAccountId, body);
    res.json(success(data, "Account settings saved"));
  } catch (err) {
    next(err);
  }
}

export async function getMasterMe(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mastersService.getMasterMe(req.user!.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function applyForMaster(req: Request, res: Response, next: NextFunction) {
  try {
    const body = masterApplySchema.parse(req.body);
    const data = await mastersService.applyForMaster(req.user!.id, body);
    res.json(success(data, "Master application submitted"));
  } catch (err) {
    next(err);
  }
}

export async function listMasters(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mastersService.listApprovedMasters();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function getMasterDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const rawAccount = req.query.account;
    const account =
      typeof rawAccount === "string"
        ? rawAccount
        : Array.isArray(rawAccount) && typeof rawAccount[0] === "string"
          ? rawAccount[0]
          : undefined;
    const data = await mastersService.getApprovedMasterDetail(id, account);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function getPublicMasterAccountHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const masterId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tradingAccountId = Array.isArray(req.params.tradingAccountId)
      ? req.params.tradingAccountId[0]
      : req.params.tradingAccountId;
    const data = await tradeHistoryService.getPublicMasterAccountTradeHistory(masterId, tradingAccountId);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function listSubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await subsService.listUserSubscriptions(req.user!.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function getMasterCommissions(req: Request, res: Response, next: NextFunction) {
  try {
    const master = await mastersRepo.findMasterByUserId(req.user!.id);
    if (!master || master.status !== "approved") {
      return res.status(404).json({ success: false, error: "Approved master profile not found" });
    }
    const data = await commissionService.getMasterCommissionDashboard(master.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function createSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createSubscriptionSchema.parse(req.body);
    const data = await subsService.createSubscription(req.user!.id, body);
    res.json(success(data, "Copy subscription started"));
  } catch (err) {
    next(err);
  }
}
