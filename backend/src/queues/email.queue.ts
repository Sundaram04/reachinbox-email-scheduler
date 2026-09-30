import { Queue } from "bullmq";

import { redisConnection } from "./connection";

export const EMAIL_QUEUE_NAME = "email";

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
});
