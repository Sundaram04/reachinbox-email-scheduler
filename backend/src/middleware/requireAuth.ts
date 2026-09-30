import type { NextFunction, Request, Response } from "express";

import {
  SESSION_COOKIE,
  verifySessionToken,
} from "../services/session.service";
import { HttpError } from "../utils/HttpError";

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[SESSION_COOKIE];
  const session = typeof token === "string" ? verifySessionToken(token) : null;

  if (!session) {
    throw new HttpError(401, "Unauthorized");
  }

  req.auth = {
    userId: session.userId,
  };

  next();
}
