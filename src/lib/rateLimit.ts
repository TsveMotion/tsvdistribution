import { redis } from "./redis";

// Sliding window rate limiter using minute buckets
// Returns true if under limit, false if over
export async function rateLimit(ip: string, limit: number, windowSec: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSec);
  const key = `ratelimit:${ip}:${bucket}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSec);
  }
  return count <= limit;
}
