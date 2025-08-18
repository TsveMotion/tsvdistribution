// Unit-like test without a framework to validate cacheGetOrSet
// It stubs the global Redis client before importing the cache helper.

// 1) Provide a minimal mock redis client on the expected global key
const calls: string[] = [];
const store = new Map<string, any>();

;(globalThis as any).__tsvStockRedis = {
  async get(key: string) {
    calls.push(`get:${key}`);
    return store.has(key) ? store.get(key) : null;
  },
  async set(key: string, value: any, _opts?: any) {
    calls.push(`set:${key}`);
    store.set(key, value);
  },
};

async function run() {
  const { cacheGetOrSet } = await import("@/lib/cache");

  let fetcherRuns = 0;
  const fetcher = async () => {
    fetcherRuns++;
    return { value: Math.random() };
  };

  const key = "unit:test:key";

  // Miss -> calls fetcher once and sets
  const a = await cacheGetOrSet(key, fetcher, 60);
  // Hit -> returns cached without calling fetcher
  const b = await cacheGetOrSet(key, fetcher, 60);

  console.log({
    equal: JSON.stringify(a) === JSON.stringify(b),
    fetcherRuns,
    calls,
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
