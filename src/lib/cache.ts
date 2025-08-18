import { redis } from "./redis";

// Simple env-guarded logger
function log(...args: any[]) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[cache]", ...args);
  }
}

export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached !== null && cached !== undefined) {
    log("hit", key);
    return cached as T;
  }
  log("miss", key);
  const fresh = await fetcher();
  await redis.set(key, fresh as any, { ex: ttlSeconds });
  return fresh;
}
