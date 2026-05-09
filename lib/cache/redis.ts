/**
 * Redis singleton client. Lazy-connects on first use.
 * Graceful degradation: if Redis is unavailable, ops return null/false and log.
 *
 * Used by quoteCache, scan dispatcher locks, and rate-limit guards.
 */
import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType> | null = null;

export async function getRedis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (client && client.isOpen) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    const c = createClient({ url, socket: { reconnectStrategy: 3 } });
    c.on("error", (err) => {
      console.error("[redis] error:", err.message);
    });
    await c.connect();
    client = c as RedisClientType;
    return client;
  })();

  try {
    return await connecting;
  } catch (err) {
    console.error("[redis] connect failed:", err);
    connecting = null;
    return null;
  } finally {
    connecting = null;
  }
}

/** TTLs in seconds, by data type. */
export const CACHE_TTL = {
  quote: 30,
  profile: 60 * 60 * 24, // 24h
  candlesDaily: 60 * 30, // 30m
  news: 60 * 15, // 15m
  sectors: 60 * 30, // 30m
  universe: 60 * 60, // 1h (universe metadata changes rarely)
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = await getRedis();
    if (!r) return null;
    const v = await r.get(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch (err) {
    console.error("[redis] get failed:", err);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<boolean> {
  try {
    const r = await getRedis();
    if (!r) return false;
    await r.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch (err) {
    console.error("[redis] set failed:", err);
    return false;
  }
}

export function cacheKey(...parts: (string | number)[]): string {
  return ["updraft", ...parts.map(String)].join(":");
}
