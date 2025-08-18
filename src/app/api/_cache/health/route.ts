import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const pong = await redis.ping();
    const key = 'health:test:key';
    const value = { ok: true, t: Date.now() };
    await redis.set(key, value, { ex: 5 });
    const readBack = await redis.get<typeof value>(key);

    return NextResponse.json({
      redis: pong,
      setGetOk: !!readBack?.ok,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Redis health failed' }, { status: 500 });
  }
}
