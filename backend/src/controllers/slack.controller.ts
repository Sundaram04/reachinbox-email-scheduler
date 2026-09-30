import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";

import { cookieOptions } from "../services/session.service";
import {
  connectSlack,
  disconnectSlack,
  getSlackAuthorizeUrl,
  getSlackStatus,
} from "../services/slack.service";
import { HttpError } from "../utils/HttpError";

const SLACK_STATE_COOKIE = "slack_oauth_state";

export function startSlackConnect(_req: Request, res: Response) {
  const state = randomBytes(32).toString("hex");
  const url = getSlackAuthorizeUrl(state);

  res.cookie(SLACK_STATE_COOKIE, state, {
    ...cookieOptions,
    maxAge: 10 * 60 * 1000,
  });

  return res.redirect(url);
}

export async function slackCallback(req: Request, res: Response) {
  const { code, state, error } = req.query;
  const savedState = req.cookies?.[SLACK_STATE_COOKIE];

  res.clearCookie(SLACK_STATE_COOKIE, cookieOptions);

  if (error) {
    throw new HttpError(
      401,
      `Slack authorization was cancelled or denied (${error})`,
    );
  }

  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    !savedState ||
    state !== savedState
  ) {
    throw new HttpError(400, "Invalid OAuth state");
  }

  const connection = await connectSlack(req.auth!.userId, code);

  return res.status(200).json({ connected: true, ...connection });
}

export async function slackStatus(req: Request, res: Response) {
  return res.status(200).json(await getSlackStatus(req.auth!.userId));
}

export async function slackDisconnect(req: Request, res: Response) {
  await disconnectSlack(req.auth!.userId);

  return res.status(204).send();
}
