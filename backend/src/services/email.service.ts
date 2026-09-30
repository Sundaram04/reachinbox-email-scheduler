import { and, asc, count, desc, eq, inArray, type SQL } from "drizzle-orm";

import { db } from "../db";
import { campaigns, emails } from "../db/schema";
import { emailQueue } from "../queues/email.queue";
import type {
  ListEmailsQuery,
  ScheduleEmailsInput,
} from "../schemas/email.schemas";

const INSERT_CHUNK_SIZE = 1000;

const emailColumns = {
  id: emails.id,
  campaignId: emails.campaignId,
  toEmail: emails.toEmail,
  status: emails.status,
  scheduledAt: emails.scheduledAt,
  sentAt: emails.sentAt,
  attempts: emails.attempts,
  lastError: emails.lastError,
  previewUrl: emails.previewUrl,
  subject: campaigns.subject,
};

export async function scheduleEmails(
  userId: string,
  input: ScheduleEmailsInput,
) {
  const recipients = [...new Set(input.recipients)];
  const order = new Map(recipients.map((toEmail, index) => [toEmail, index]));

  const { campaign, createdEmails } = await db.transaction(async (tx) => {
    const [campaign] = await tx
      .insert(campaigns)
      .values({
        userId,
        subject: input.subject,
        body: input.body,
        startTime: input.startTime,
        delaySeconds: input.delaySeconds,
        hourlyLimit: input.hourlyLimit,
      })
      .returning();

    const rows = recipients.map((toEmail, index) => ({
      campaignId: campaign.id,
      toEmail,
      scheduledAt: new Date(
        input.startTime.getTime() + index * input.delaySeconds * 1000,
      ),
    }));

    const createdEmails: {
      id: string;
      toEmail: string;
      status: (typeof emails.$inferSelect)["status"];
      scheduledAt: Date;
    }[] = [];

    for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
      const inserted = await tx
        .insert(emails)
        .values(rows.slice(i, i + INSERT_CHUNK_SIZE))
        .returning({
          id: emails.id,
          toEmail: emails.toEmail,
          status: emails.status,
          scheduledAt: emails.scheduledAt,
        });

      createdEmails.push(...inserted);
    }

    return { campaign, createdEmails };
  });

  createdEmails.sort((a, b) => order.get(a.toEmail)! - order.get(b.toEmail)!);

  try {
    const now = Date.now();

    await emailQueue.addBulk(
      createdEmails.map((email) => ({
        name: "send-email",
        data: {
          emailId: email.id,
          campaignId: campaign.id,
          toEmail: email.toEmail,
        },
        opts: {
          jobId: email.id,
          delay: Math.max(0, email.scheduledAt.getTime() - now),
        },
      })),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to enqueue email jobs:", message);
  }

  return {
    campaign: {
      id: campaign.id,
      subject: campaign.subject,
      startTime: campaign.startTime,
      delaySeconds: campaign.delaySeconds,
      hourlyLimit: campaign.hourlyLimit,
      createdAt: campaign.createdAt,
    },
    scheduledCount: createdEmails.length,
    duplicatesRemoved: input.recipients.length - recipients.length,
    firstScheduledAt: createdEmails[0].scheduledAt,
    lastScheduledAt: createdEmails[createdEmails.length - 1].scheduledAt,
  };
}

async function listEmailsByStatus(
  userId: string,
  statuses: (typeof emails.$inferSelect)["status"][],
  { limit, offset }: ListEmailsQuery,
  orderBy: SQL[],
) {
  const where = and(
    eq(campaigns.userId, userId),
    inArray(emails.status, statuses),
  );

  const [items, [totalRow]] = await Promise.all([
    db
      .select(emailColumns)
      .from(emails)
      .innerJoin(campaigns, eq(emails.campaignId, campaigns.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(emails)
      .innerJoin(campaigns, eq(emails.campaignId, campaigns.id))
      .where(where),
  ]);

  return { items, total: totalRow.total, limit, offset };
}

export function listScheduledEmails(userId: string, query: ListEmailsQuery) {
  return listEmailsByStatus(userId, ["scheduled", "processing"], query, [
    asc(emails.scheduledAt),
    asc(emails.id),
  ]);
}

export function listSentEmails(userId: string, query: ListEmailsQuery) {
  return listEmailsByStatus(userId, ["sent", "failed"], query, [
    desc(emails.sentAt),
    desc(emails.scheduledAt),
    asc(emails.id),
  ]);
}

export async function findEmailForUser(userId: string, id: string) {
  const [email] = await db
    .select({ ...emailColumns, body: campaigns.body })
    .from(emails)
    .innerJoin(campaigns, eq(emails.campaignId, campaigns.id))
    .where(and(eq(emails.id, id), eq(campaigns.userId, userId)))
    .limit(1);

  return email ?? null;
}
