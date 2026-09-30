import type { NextFunction, Request, Response } from "express";

import { isDbUnavailable, isUniqueViolation } from "../db/errors";
import { HttpError } from "../utils/HttpError";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error("Unhandled error:", err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (isUniqueViolation(err)) {
    return res.status(409).json({
      error: "Resource already exists",
    });
  }

  if (isDbUnavailable(err)) {
    return res.status(503).json({
      error: "Database unavailable",
    });
  }

  return res.status(500).json({
    error: "Internal Server Error",
  });
}
