import type { Request, Response, NextFunction } from "express";
import * as gatewaysService from "../../services/gateways/manual-gateways.service.js";
import { createGatewaySchema, updateGatewaySchema } from "../../validators/gateway.schemas.js";
import { success } from "../../utils/response.js";

function mediaUrls(req: Request) {
  const files = req.files as { icon?: Express.Multer.File[]; qrCode?: Express.Multer.File[] } | undefined;
  return {
    iconUrl: files?.icon?.[0] ? `/uploads/gateways/${files.icon[0].filename}` : undefined,
    qrCodeUrl: files?.qrCode?.[0] ? `/uploads/gateways/${files.qrCode[0].filename}` : undefined,
  };
}

function parseBody(req: Request) {
  const b = req.body as Record<string, string | undefined>;
  return {
    category: b.category,
    name: b.name,
    slug: b.slug,
    details: b.details === "" ? null : b.details,
    cryptoAddress: b.cryptoAddress === "" ? null : b.cryptoAddress,
    vpaAddress: b.vpaAddress === "" ? null : b.vpaAddress,
    bankName: b.bankName === "" ? null : b.bankName,
    accountNumber: b.accountNumber === "" ? null : b.accountNumber,
    iconUrl: b.iconUrl === "" ? null : b.iconUrl,
    qrCodeUrl: b.qrCodeUrl === "" ? null : b.qrCodeUrl,
    processingTimeText: b.processingTimeText,
    feeDisplay: b.feeDisplay,
    minAmount: b.minAmount,
    maxAmount: b.maxAmount,
    limitsCurrency: b.limitsCurrency,
    network: b.network === "" ? null : b.network,
    warningText: b.warningText === "" ? null : b.warningText,
    isActive: b.isActive,
    isRecommended: b.isRecommended,
    sortOrder: b.sortOrder,
  };
}

export async function listGateways(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await gatewaysService.listAdminGateways();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function getGateway(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await gatewaysService.getAdminGateway(id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function createGateway(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createGatewaySchema.parse(parseBody(req));
    const media = mediaUrls(req);
    const data = await gatewaysService.createGateway({
      ...body,
      iconUrl: media.iconUrl ?? body.iconUrl ?? null,
      qrCodeUrl: media.qrCodeUrl ?? body.qrCodeUrl ?? null,
    });
    res.status(201).json(success(data, "Gateway created"));
  } catch (err) {
    next(err);
  }
}

export async function updateGateway(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = updateGatewaySchema.parse(parseBody(req));
    const media = mediaUrls(req);
    const patch = {
      ...body,
      ...(media.iconUrl ? { iconUrl: media.iconUrl } : {}),
      ...(media.qrCodeUrl ? { qrCodeUrl: media.qrCodeUrl } : {}),
    };
    const data = await gatewaysService.updateGateway(id, patch);
    res.json(success(data, "Gateway updated"));
  } catch (err) {
    next(err);
  }
}

export async function toggleGateway(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await gatewaysService.toggleGatewayActive(id);
    res.json(success(data, "Gateway status updated"));
  } catch (err) {
    next(err);
  }
}

export async function deleteGateway(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await gatewaysService.deleteGateway(id);
    res.json(success(data, "Gateway deleted"));
  } catch (err) {
    next(err);
  }
}
