import { redis } from "@/lib/redis";

async function main() {
  const key = `test:expire:${Date.now()}`;
  await redis.set(key, { ok: true }, { ex: 2 });
  const v1 = await redis.get(key);
  console.log("read immediately:", v1);
  await new Promise((r) => setTimeout(r, 3000));
  const v2 = await redis.get(key);
  console.log("read after 3s (should be null):", v2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
