import type { Request, Response, NextFunction } from "express";
import {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  forgotSchema,
  verifyResetSchema,
  resetPasswordSchema,
} from "../../validators/auth.schemas.js";
import * as authService from "../../services/user/auth.service.js";
import { success } from "../../utils/response.js";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerSchema.parse(req.body);
    const data = await authService.registerUser(body);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = verifyOtpSchema.parse(req.body);
    const data = await authService.verifyRegistrationOtp(body);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body);
    const data = await authService.loginUser(body);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const body = forgotSchema.parse(req.body);
    const data = await authService.forgotPassword(body);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function verifyResetOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = verifyResetSchema.parse(req.body);
    const data = await authService.verifyResetOtp(body);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const body = resetPasswordSchema.parse(req.body);
    const data = await authService.resetPassword({
      resetToken: req.headers.authorization?.slice(7) ?? "",
      password: body.password,
    });
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.getUserById(req.user!.id);
    res.json(success(data));
  } catch (err) {
    next(err);
  }
}
