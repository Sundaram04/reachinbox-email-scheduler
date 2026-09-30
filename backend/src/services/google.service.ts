import { OAuth2Client } from "google-auth-library";

import { env } from "../config/env";
import { HttpError } from "../utils/HttpError";

export const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI,
);

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
};

export function getGoogleAuthUrl(state: string): string {
  return googleClient.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account",
  });
}

export async function getGoogleProfile(code: string): Promise<GoogleProfile> {
  let idToken: string | null | undefined;

  try {
    const { tokens } = await googleClient.getToken(code);
    idToken = tokens.id_token;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Google token exchange failed:", message);
    throw new HttpError(400, "Google login failed (invalid or expired code)");
  }

  if (!idToken) {
    throw new HttpError(502, "Google did not return an ID token");
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Google ID token verification failed:", message);
    throw new HttpError(401, "Google identity could not be verified");
  }

  if (!payload?.sub || !payload.email) {
    throw new HttpError(502, "Google profile is incomplete");
  }

  if (!payload.email_verified) {
    throw new HttpError(403, "Google email is not verified");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}
