import type { Request, Response } from "express";

import {
  emailIdParamSchema,
  listEmailsQuerySchema,
  scheduleEmailsSchema,
} from "../schemas/email.schemas";
import {
  findEmailForUser,
  listScheduledEmails,
  listSentEmails,
  scheduleEmails,
} from "../services/email.service";
import { HttpError } from "../utils/HttpError";

export async function scheduleEmailsHandler(req: Request, res: Response) {
  const input = scheduleEmailsSchema.parse(req.body);
  const result = await scheduleEmails(req.auth!.userId, input);

  return res.status(201).json(result);
}

export async function listScheduledHandler(req: Request, res: Response) {
  const query = listEmailsQuerySchema.parse(req.query);
  const result = await listScheduledEmails(req.auth!.userId, query);

  return res.status(200).json(result);
}

export async function listSentHandler(req: Request, res: Response) {
  const query = listEmailsQuerySchema.parse(req.query);
  const result = await listSentEmails(req.auth!.userId, query);

  return res.status(200).json(result);
}

export async function getEmailHandler(req: Request, res: Response) {
  const { id } = emailIdParamSchema.parse(req.params);
  const email = await findEmailForUser(req.auth!.userId, id);

  if (!email) {
    throw new HttpError(404, "Email not found");
  }

  return res.status(200).json(email);
}
