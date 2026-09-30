import { Redis } from "ioredis";

import { env } from "../config/env";

const LAST_SLOT_KEY_PREFIX = "ratelimit:email:last-slot:";
const LAST_SEND_KEY_PREFIX = "ratelimit:email:last-send:";
const COUNT_KEY_PREFIX = "ratelimit:email:count:";

const RESERVE_SLOT_SCRIPT = `
local minDelay = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local windowMs = tonumber(ARGV[3])

local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)

local last = tonumber(redis.call('GET', KEYS[1]) or '0')
local slot = math.max(now, last + minDelay)
local window = math.floor(slot / windowMs)

while tonumber(redis.call('GET', ARGV[4] .. window) or '0') >= limit do
  window = window + 1
  slot = math.max(slot, window * windowMs)
end

local countKey = ARGV[4] .. window
redis.call('INCR', countKey)
redis.call('PEXPIRE', countKey, (window + 2) * windowMs - now)
redis.call('SET', KEYS[1], slot, 'PX', slot - now + windowMs)

return slot
`;

const SEND_TURN_SCRIPT = `
local minDelay = tonumber(ARGV[1])

local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)

local last = tonumber(redis.call('GET', KEYS[1]) or '0')
local turn = math.max(now, last + minDelay)

redis.call('SET', KEYS[1], turn, 'PX', turn - now + 60000)

return turn - now
`;

const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export async function reserveSendSlot(
  senderKey: string,
  limit: number,
): Promise<number> {
  const slot = await redis.eval(
    RESERVE_SLOT_SCRIPT,
    1,
    LAST_SLOT_KEY_PREFIX + senderKey,
    env.MIN_SEND_DELAY_MS,
    limit,
    env.RATE_WINDOW_MS,
    `${COUNT_KEY_PREFIX}${senderKey}:`,
  );

  return Number(slot);
}

export async function waitForSendTurn(senderKey: string): Promise<void> {
  const wait = Number(
    await redis.eval(
      SEND_TURN_SCRIPT,
      1,
      LAST_SEND_KEY_PREFIX + senderKey,
      env.MIN_SEND_DELAY_MS,
    ),
  );

  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}

export async function closeRateLimiter() {
  await redis.quit();
}
