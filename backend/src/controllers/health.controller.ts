import type { Request, Response } from "express";

import { pingDb } from "../db";

export function getHealth(_req: Request, res: Response) {
  return res.status(200).json({
    status: "ok",
  });
}

export async function getDbHealth(_req: Request, res: Response) {
  await pingDb();

  return res.status(200).json({
    status: "ok",
    db: "up",
  });
}
