import { DelayedError, Worker } from "bullmq";
import { and, eq, lt, or, sql } from "drizzle-orm";

import { env } from "../config/env";
import { db } from "../db";
import { campaigns, emails } from "../db/schema";
import { EMAIL_QUEUE_NAME } from "../queues/email.queue";
import { redisConnection } from "../queues/connection";
import { sendEmail } from "../services/mail.service";
import { syncEmailSafe } from "../services/search.service";
import { getSenderSmtpConfig } from "../services/sender.service";
import { notifyRateLimitReached } from "../services/slack.service";
import { reserveSendSlot, waitForSendTurn } from "../services/rateLimit.service";

const LOCK_DURATION_MS = 30_000;
const STALE_CLAIM_MS = 20_000;

type EmailJobData = {
  emailId: string;
  campaignId: string;
  toEmail: string;
  slot?: number;
};

export function createEmailWorker() {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job, token) => {
      const { emailId } = job.data;

      const [current] = await db
        .select({
          status: emails.status,
          senderId: emails.senderId,
          hourlyLimit: campaigns.hourlyLimit,
          userId: campaigns.userId,
        })
        .from(emails)
        .innerJoin(campaigns, eq(emails.campaignId, campaigns.id))
        .where(eq(emails.id, emailId))
        .limit(1);

      if (!current || current.status === "sent" || current.status === "failed") {
        console.log(
          `[worker] job ${job.id} skipped: email ${emailId} is ${current?.status ?? "missing"}`,
        );
        return;
      }

      const senderKey = current.senderId ?? "default";

      if (job.data.slot === undefined) {
        const { slot, limitedWindow } = await reserveSendSlot(
          senderKey,
          Math.min(current.hourlyLimit, env.EMAILS_PER_HOUR),
        );

        if (limitedWindow !== null) {
          void notifyRateLimitReached(
            current.userId,
            limitedWindow,
            new Date(slot),
          );
        }

        if (slot > Date.now()) {
          await db
            .update(emails)
            .set({
              scheduledAt: new Date(slot),
              rescheduleCount: sql`${emails.rescheduleCount} + 1`,
            })
            .where(and(eq(emails.id, emailId), eq(emails.status, "scheduled")));

          await syncEmailSafe(emailId);

          await job.updateData({ ...job.data, slot });
          await job.moveToDelayed(slot, token);

          console.log(
            `[worker] job ${job.id} delayed to ${new Date(slot).toISOString()}`,
          );
          throw new DelayedError();
        }
      } else {
        const remaining = job.data.slot - Date.now();

        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
      }

      const claimedAt = new Date();
      const staleBefore = new Date(claimedAt.getTime() - STALE_CLAIM_MS);

      const [claimed] = await db
        .update(emails)
        .set({
          status: "processing",
          claimedAt,
          attempts: sql`${emails.attempts} + 1`,
        })
        .where(
          and(
            eq(emails.id, emailId),
            or(
              eq(emails.status, "scheduled"),
              and(
                eq(emails.status, "processing"),
                lt(emails.claimedAt, staleBefore),
              ),
            ),
          ),
        )
        .returning({
          id: emails.id,
          toEmail: emails.toEmail,
          campaignId: emails.campaignId,
        });

      if (!claimed) {
        const [current] = await db
          .select({ status: emails.status })
          .from(emails)
          .where(eq(emails.id, emailId))
          .limit(1);

        console.log(
          `[worker] job ${job.id} skipped: email ${emailId} is ${current?.status ?? "missing"}`,
        );
        return;
      }

      void syncEmailSafe(emailId);

      const ownsClaim = and(
        eq(emails.id, emailId),
        eq(emails.status, "processing"),
        eq(emails.claimedAt, claimedAt),
      );

      const [campaign] = await db
        .select({ subject: campaigns.subject, body: campaigns.body })
        .from(campaigns)
        .where(eq(campaigns.id, claimed.campaignId))
        .limit(1);

      await waitForSendTurn(senderKey);

      let result;

      try {
        const sender = current.senderId
          ? await getSenderSmtpConfig(current.senderId)
          : null;

        if (current.senderId && !sender) {
          throw new Error("Sender not found");
        }

        console.log(
          `[worker] job ${job.id} sending to ${claimed.toEmail} via ${sender?.fromEmail ?? "default"}`,
        );

        result = await sendEmail({
          sender,
          messageId: `<${emailId}@reachinbox.local>`,
          to: claimed.toEmail,
          subject: campaign.subject,
          text: campaign.body,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        await db
          .update(emails)
          .set({ status: "failed", lastError: message })
          .where(ownsClaim);

        await syncEmailSafe(emailId);

        console.error(`[worker] job ${job.id} failed: ${message}`);
        throw err;
      }

      const updated = await db
        .update(emails)
        .set({
          status: "sent",
          sentAt: new Date(),
          messageId: result.messageId,
          previewUrl: result.previewUrl,
          lastError: null,
        })
        .where(ownsClaim)
        .returning({ id: emails.id });

      await syncEmailSafe(emailId);

      if (updated.length === 0) {
        console.warn(`[worker] job ${job.id} sent but claim was lost`);
      }

      console.log(
        `[worker] job ${job.id} sent messageId=${result.messageId} preview=${result.previewUrl}`,
      );
    },
    {
      connection: redisConnection,
      lockDuration: LOCK_DURATION_MS,
      concurrency: env.CONCURRENCY,
    },
  );

  worker.on("error", (err) => {
    console.error("[worker] error:", err.message);
  });

  return worker;
}
