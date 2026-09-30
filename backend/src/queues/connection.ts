import type { ConnectionOptions } from "bullmq";

import { env } from "../config/env";

export const redisConnection: ConnectionOptions = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
};
