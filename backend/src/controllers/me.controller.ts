import type { Request, Response } from "express";

import { findUserById } from "../services/user.service";
import { HttpError } from "../utils/HttpError";

export async function getMe(req: Request, res: Response) {
  const user = await findUserById(req.auth!.userId);

  if (!user) {
    throw new HttpError(401, "Unauthorized");
  }

  return res.status(200).json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
}
