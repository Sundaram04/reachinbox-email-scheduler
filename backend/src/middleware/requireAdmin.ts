import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { findUserById } from "../services/user.service";
import { HttpError } from "../utils/HttpError";

const adminEmails = new Set(
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const user = await findUserById(req.auth!.userId);

  if (!user || !adminEmails.has(user.email.toLowerCase())) {
    throw new HttpError(403, "Forbidden");
  }

  next();
}
