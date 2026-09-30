import type { NextFunction, Request, Response } from "express";

import { ZodError } from "zod";

import { isDbUnavailable, isUniqueViolation } from "../db/errors";
import { HttpError } from "../utils/HttpError";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const bodyErrorType = (err as { type?: unknown } | null)?.type;

  if (bodyErrorType === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON body" });
  }

  if (bodyErrorType === "entity.too.large") {
    return res.status(413).json({ error: "Request body too large" });
  }

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
