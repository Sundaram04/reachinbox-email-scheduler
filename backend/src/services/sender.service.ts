import { and, asc, eq, inArray } from "drizzle-orm";

import { getDbErrorCode, isUniqueViolation } from "../db/errors";
import { db } from "../db";
import { senders } from "../db/schema";
import type { CreateSenderInput } from "../schemas/sender.schemas";
import { HttpError } from "../utils/HttpError";
import { decryptSecret, encryptSecret } from "../utils/secretBox";

const publicColumns = {
  id: senders.id,
  fromEmail: senders.fromEmail,
  smtpHost: senders.smtpHost,
  smtpPort: senders.smtpPort,
  smtpUser: senders.smtpUser,
  createdAt: senders.createdAt,
};

export async function createSender(userId: string, input: CreateSenderInput) {
  try {
    const [sender] = await db
      .insert(senders)
      .values({ ...input, userId, smtpPass: encryptSecret(input.smtpPass) })
      .returning(publicColumns);

    return sender;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new HttpError(409, "Sender already exists");
    }

    throw err;
  }
}

export function listSenders(userId: string) {
  return db
    .select(publicColumns)
    .from(senders)
    .where(eq(senders.userId, userId))
    .orderBy(asc(senders.createdAt), asc(senders.id));
}

export async function deleteSender(userId: string, id: string) {
  try {
    const deleted = await db
      .delete(senders)
      .where(and(eq(senders.id, id), eq(senders.userId, userId)))
      .returning({ id: senders.id });

    if (deleted.length === 0) {
      throw new HttpError(404, "Sender not found");
    }
  } catch (err) {
    if (getDbErrorCode(err) === "23503") {
      throw new HttpError(409, "Sender is used by scheduled emails");
    }

    throw err;
  }
}

export async function resolveSendersForUser(
  userId: string,
  senderIds?: string[],
) {
  if (!senderIds) {
    const all = await db
      .select({ id: senders.id })
      .from(senders)
      .where(eq(senders.userId, userId))
      .orderBy(asc(senders.createdAt), asc(senders.id));

    if (all.length === 0) {
      throw new HttpError(400, "No senders configured");
    }

    return all.map((sender) => sender.id);
  }

  const unique = [...new Set(senderIds)];
  const owned = await db
    .select({ id: senders.id })
    .from(senders)
    .where(and(eq(senders.userId, userId), inArray(senders.id, unique)));

  if (owned.length !== unique.length) {
    throw new HttpError(400, "Invalid sender");
  }

  return unique;
}

export type SenderSmtpConfig = {
  id: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
};

export async function getSenderSmtpConfig(
  id: string,
): Promise<SenderSmtpConfig | null> {
  const [sender] = await db
    .select()
    .from(senders)
    .where(eq(senders.id, id))
    .limit(1);

  if (!sender) {
    return null;
  }

  return { ...sender, smtpPass: decryptSecret(sender.smtpPass) };
}
