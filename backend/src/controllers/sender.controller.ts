import type { Request, Response } from "express";

import {
  createSenderSchema,
  senderIdParamSchema,
} from "../schemas/sender.schemas";
import {
  createSender,
  deleteSender,
  listSenders,
} from "../services/sender.service";

export async function createSenderHandler(req: Request, res: Response) {
  const input = createSenderSchema.parse(req.body);
  const sender = await createSender(req.auth!.userId, input);

  return res.status(201).json(sender);
}

export async function listSendersHandler(req: Request, res: Response) {
  const items = await listSenders(req.auth!.userId);

  return res.status(200).json({ items });
}

export async function deleteSenderHandler(req: Request, res: Response) {
  const { id } = senderIdParamSchema.parse(req.params);
  await deleteSender(req.auth!.userId, id);

  return res.status(204).send();
}
