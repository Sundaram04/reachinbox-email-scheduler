import { eq } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../db";
import { slackConnections } from "../db/schema";
import { HttpError } from "../utils/HttpError";
import { decryptSecret, encryptSecret } from "../utils/secretBox";
import { acquireOnce } from "./rateLimit.service";

const SLACK_REQUEST_TIMEOUT_MS = 5000;
const NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

type SlackAccessResponse = {
  ok: boolean;
  error?: string;
  access_token?: string;
  team?: { id?: string; name?: string };
  incoming_webhook?: { url?: string; channel?: string };
};

function requireConfig() {
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    throw new HttpError(503, "Slack integration is not configured");
  }

  return {
    clientId: env.SLACK_CLIENT_ID,
    clientSecret: env.SLACK_CLIENT_SECRET,
  };
}

function isAllowedWebhook(url: string) {
  try {
    const { origin } = new URL(url);

    return (
      origin === "https://hooks.slack.com" ||
      origin === new URL(env.SLACK_API_URL).origin
    );
  } catch {
    return false;
  }
}

export function getSlackAuthorizeUrl(state: string) {
  const { clientId } = requireConfig();
  const url = new URL("/oauth/v2/authorize", env.SLACK_API_URL);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "incoming-webhook");
  url.searchParams.set("redirect_uri", env.SLACK_REDIRECT_URI);
  url.searchParams.set("state", state);

  return url.toString();
}

export async function connectSlack(userId: string, code: string) {
  const { clientId, clientSecret } = requireConfig();

  let data: SlackAccessResponse;

  try {
    const response = await fetch(
      new URL("/api/oauth.v2.access", env.SLACK_API_URL),
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: env.SLACK_REDIRECT_URI,
        }),
        signal: AbortSignal.timeout(SLACK_REQUEST_TIMEOUT_MS),
      },
    );

    data = (await response.json()) as SlackAccessResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[slack] token exchange unreachable:", message);
    throw new HttpError(502, "Slack is unavailable, try again later");
  }

  if (!data.ok) {
    console.error("[slack] token exchange rejected:", data.error);
    throw new HttpError(400, "Slack authorization failed");
  }

  const webhookUrl = data.incoming_webhook?.url;

  if (!webhookUrl || !isAllowedWebhook(webhookUrl)) {
    throw new HttpError(502, "Slack did not return a valid webhook");
  }

  const values = {
    teamId: data.team?.id ?? null,
    teamName: data.team?.name ?? null,
    channel: data.incoming_webhook?.channel ?? null,
    webhookUrl: encryptSecret(webhookUrl),
    accessToken: data.access_token ? encryptSecret(data.access_token) : null,
    revokedAt: null,
  };

  await db
    .insert(slackConnections)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: slackConnections.userId,
      set: { ...values, updatedAt: new Date() },
    });

  return { teamName: values.teamName, channel: values.channel };
}

export async function getSlackStatus(userId: string) {
  const [connection] = await db
    .select({
      teamName: slackConnections.teamName,
      channel: slackConnections.channel,
      connectedAt: slackConnections.updatedAt,
      revokedAt: slackConnections.revokedAt,
    })
    .from(slackConnections)
    .where(eq(slackConnections.userId, userId))
    .limit(1);

  if (!connection || connection.revokedAt) {
    return { connected: false };
  }

  return {
    connected: true,
    teamName: connection.teamName,
    channel: connection.channel,
    connectedAt: connection.connectedAt,
  };
}

export async function disconnectSlack(userId: string) {
  const deleted = await db
    .delete(slackConnections)
    .where(eq(slackConnections.userId, userId))
    .returning({ id: slackConnections.id });

  if (deleted.length === 0) {
    throw new HttpError(404, "Slack is not connected");
  }
}

export async function sendSlackMessage(
  userId: string,
  text: string,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const [connection] = await db
      .select({
        webhookUrl: slackConnections.webhookUrl,
        revokedAt: slackConnections.revokedAt,
      })
      .from(slackConnections)
      .where(eq(slackConnections.userId, userId))
      .limit(1);

    if (!connection || connection.revokedAt) {
      return { sent: false, reason: "not-connected" };
    }

    const response = await fetch(decryptSecret(connection.webhookUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(SLACK_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[slack] webhook responded ${response.status}`);
      return { sent: false, reason: `http-${response.status}` };
    }

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[slack] notification failed:", message);
    return { sent: false, reason: "unavailable" };
  }
}

export async function notifyRateLimitReached(
  userId: string,
  limitedWindow: number,
  resumesAt: Date,
) {
  try {
    const first = await acquireOnce(
      `slack:rate-limit-notified:${userId}:${limitedWindow}`,
      NOTIFICATION_TTL_MS,
    );

    if (!first) {
      return { sent: false, reason: "already-notified" };
    }

    const result = await sendSlackMessage(
      userId,
      `Email sending limit reached. Your campaign has reached its hourly limit and remaining emails have been rescheduled (sending resumes around ${resumesAt.toISOString()}).`,
    );

    if (result.sent) {
      console.log(
        `[slack] rate-limit notification delivered (window ${limitedWindow})`,
      );
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[slack] rate-limit notification error:", message);
    return { sent: false, reason: "error" };
  }
}
