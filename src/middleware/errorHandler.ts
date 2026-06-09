import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError, fail } from "../utils/response.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(fail(err.message));
  }

  if (err instanceof ZodError) {
    return res.status(400).json(fail(err.errors[0]?.message ?? "Invalid request data"));
  }

  if (err instanceof Error && err.message.includes("Only JPG")) {
    return res.status(400).json(fail(err.message));
  }

  console.error("[error]", err);
  return res.status(500).json(fail("Internal server error"));
}
