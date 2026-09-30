import type { Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";

export const SESSION_COOKIE = "reachinbox_session";

export const STATE_COOKIE = "oauth_state";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
};

export function signSessionToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: SESSION_TTL_SECONDS,
    algorithm: "HS256",
  });
}

export function verifySessionToken(
  token: string,
): { userId: string } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (typeof payload === "string" || !payload.sub) {
      return null;
    }

    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions,
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}
