import { closeDb } from "./db";
import { closeRateLimiter } from "./services/rateLimit.service";
import { emailQueue } from "./queues/email.queue";
import { reenqueueScheduledEmails } from "./services/email.service";
import { createEmailWorker } from "./workers/email.worker";

const worker = createEmailWorker();

console.log("Email worker started");

reenqueueScheduledEmails()
  .then((count) => console.log(`[worker] reconciled ${count} scheduled emails`))
  .catch((err) => console.error("[worker] reconcile failed:", err.message));

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down worker...`);

  await worker.close();
  await emailQueue.close();
  await closeRateLimiter();
  await closeDb();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
