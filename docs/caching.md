# Caching in TsvStock

This app uses Upstash Redis (REST) on Vercel as a caching layer in front of MongoDB.

## What is cached
- Orders by id: key `orders:${id}` (TTL 60s)
- Products by sku (or fallback by id): key `products:${sku}` or `products:id:${id}` (TTL 300s)
- Stock numbers by sku: key `stock:${sku}` (TTL 10s)
- Search results: key `search:${hash(q)}:${page}` (TTL 180s)

See `src/lib/cacheTtl.ts` for TTLs.

## Key helpers
See `src/lib/cacheKeys.ts` for helpers and `hash()`.

## Read-through cache
Use `cacheGetOrSet(key, fetcher, ttl)` from `src/lib/cache.ts`.
- On hit: returns cached JSON value.
- On miss: runs `fetcher()`, stores the value with `ex` TTL, returns it.
- Logging is enabled when `NODE_ENV !== 'production'`.

## Write-through and invalidation
- After successful Mongo mutations, write updated documents into Redis with the appropriate TTL.
- For list/search invalidation, prefer versioned prefixes (e.g., `prefix:products:version`) and compose keys with the current version. Bump the version with `INCR` on mutation. Old keys expire naturally.

## Rate limiting
`src/lib/rateLimit.ts` implements a sliding-window limiter using INCR + EX.
Apply to public routes; return 429 when over the limit.

## Bypass cache for admins
Append `?fresh=1` to read endpoints to fetch from Mongo and refresh cache.

## Edge runtime
The Upstash REST client works on Edge, but the MongoDB Node driver requires the Node.js runtime. For fully Edge-compatible reads, use a data API (or precomputed cache) that avoids direct Mongo driver usage.

## Health check
`GET /api/_cache/health` performs `PING` and a `SET/GET` round-trip.

## Environment variables
Define in `.env.local` and Vercel project:
- `UPSTASH_REDIS_REST_URL=`
- `UPSTASH_REDIS_REST_TOKEN=`

## Testing
- Unit test idea for `cacheGetOrSet`: mock `redis.get`/`set` and a fetcher; ensure fetcher is only called on cache miss.
- Integration check: `scripts/redis-expire-check.ts` writes a key with TTL 2s, reads it, waits 3s, confirms expiration.
