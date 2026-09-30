import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";

import { env } from "../config/env";
import { getGoogleAuthUrl, getGoogleProfile } from "../services/google.service";
import {
  clearSessionCookie,
  cookieOptions,
  setSessionCookie,
  signSessionToken,
  STATE_COOKIE,
} from "../services/session.service";
import { upsertGoogleUser } from "../services/user.service";
import { HttpError } from "../utils/HttpError";

export function startGoogleLogin(_req: Request, res: Response) {
  const state = randomBytes(32).toString("hex");

  res.cookie(STATE_COOKIE, state, {
    ...cookieOptions,
    maxAge: 10 * 60 * 1000,
  });

  return res.redirect(getGoogleAuthUrl(state));
}

export async function googleCallback(req: Request, res: Response) {
  const { code, state, error } = req.query;
  const savedState = req.cookies?.[STATE_COOKIE];

  res.clearCookie(STATE_COOKIE, cookieOptions);

  if (error) {
    throw new HttpError(401, `Google login was cancelled or denied (${error})`);
  }

  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    !savedState ||
    state !== savedState
  ) {
    throw new HttpError(400, "Invalid OAuth state");
  }

  const profile = await getGoogleProfile(code);
  const user = await upsertGoogleUser(profile);
  const token = signSessionToken(user.id);
  setSessionCookie(res, token);

  return res.redirect(env.AUTH_SUCCESS_REDIRECT);
}

export function logout(_req: Request, res: Response) {
  clearSessionCookie(res);
  return res.status(204).send();
}
