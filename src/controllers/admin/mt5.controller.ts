import type { Request, Response, NextFunction } from "express";
import * as mt5Service from "../../services/mt5/mt5.service.js";
import { managerConfigSchema, syncGroupsSchema, updateGroupSchema } from "../../validators/mt5.schemas.js";
import { success } from "../../utils/response.js";

export async function getManagerConfig(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mt5Service.getManagerConfig();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function listManagerConfigs(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mt5Service.listManagerConfigs();
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function getManagerConfigById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await mt5Service.getManagerConfigById(id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function saveManagerConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const body = managerConfigSchema.parse(req.body);
    const data = await mt5Service.saveManagerConfig(body);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function deleteManagerConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = await mt5Service.deleteManagerConfig(id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function testManagerConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body && Object.keys(req.body).length ? managerConfigSchema.parse(req.body) : undefined;
    const data = await mt5Service.testConnection(body);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function listGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mt5Service.listGroups({
      status: req.query.status === "inactive" ? "inactive" : req.query.status === "active" ? "active" : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      from: typeof req.query.from === "string" ? req.query.from : undefined,
      to: typeof req.query.to === "string" ? req.query.to : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function syncGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const body = syncGroupsSchema.parse(req.body ?? {});
    const data = await mt5Service.syncGroups(body.forceUpdate);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

function paramId(req: Request) {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

export async function getGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mt5Service.getGroup(paramId(req));
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function updateGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const body = updateGroupSchema.parse(req.body);
    const data = await mt5Service.updateGroup(paramId(req), body);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function deleteGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await mt5Service.deleteGroup(paramId(req));
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
