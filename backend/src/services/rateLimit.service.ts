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
local fullWindow = -1

while tonumber(redis.call('GET', ARGV[4] .. window) or '0') >= limit do
  if fullWindow < 0 then
    fullWindow = math.floor(now / windowMs)
  end
  window = window + 1
  slot = math.max(slot, window * windowMs)
end

local countKey = ARGV[4] .. window
redis.call('INCR', countKey)
redis.call('PEXPIRE', countKey, (window + 2) * windowMs - now)
redis.call('SET', KEYS[1], slot, 'PX', slot - now + windowMs)

return {slot, fullWindow}
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
): Promise<{ slot: number; limitedWindow: number | null }> {
  const result = (await redis.eval(
    RESERVE_SLOT_SCRIPT,
    1,
    LAST_SLOT_KEY_PREFIX + senderKey,
    env.MIN_SEND_DELAY_MS,
    limit,
    env.RATE_WINDOW_MS,
    `${COUNT_KEY_PREFIX}${senderKey}:`,
  )) as [number, number];

  return {
    slot: Number(result[0]),
    limitedWindow: Number(result[1]) >= 0 ? Number(result[1]) : null,
  };
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

export async function acquireOnce(
  key: string,
  ttlMs: number,
): Promise<boolean> {
  const result = await redis.set(key, "1", "PX", ttlMs, "NX");

  return result === "OK";
}

export async function closeRateLimiter() {
  await redis.quit();
}
