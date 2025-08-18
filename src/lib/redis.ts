import { Redis } from "@upstash/redis";

// Guard against missing envs at import time (fail fast)
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  const msg = "Missing Upstash Redis envs: UPSTASH_REDIS_REST_URL and/or UPSTASH_REDIS_REST_TOKEN";
  // Do not print secrets
  throw new Error(msg);
}

// Singleton across hot reloads
const globalForRedis = globalThis as unknown as { __tsvStockRedis?: Redis };

export const redis =
  globalForRedis.__tsvStockRedis ??
  new Redis({
    url,
    token,
  });

if (!globalForRedis.__tsvStockRedis) {
  globalForRedis.__tsvStockRedis = redis;
}
