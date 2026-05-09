/**
 * Three-layer quote cache:
 *   1. Redis (hot, 30s TTL during market hours, 10m off-hours)
 *   2. Postgres updraft_quote_cache (warm, survives Redis cold-start)
 *   3. Finnhub (origin, last resort, rate-limited)
 *
 * On a hit at any layer, upstream layers get repopulated so subsequent
 * requests hit the fastest tier.
 */
import { cacheGet, cacheSet, cacheKey, CACHE_TTL } from "./redis";
import { fetchQuote } from "@/lib/finnhub/quote";
import { isMarketOpen } from "@/lib/market/calendar";
import { getSupabase } from "@/lib/db/client";
import { TABLES } from "@/lib/db/tables";
import type { Quote } from "@/lib/finnhub/types";

type CacheSource = "redis" | "postgres" | "finnhub";

export type QuoteResult = {
  quote: Quote;
  source: CacheSource;
  ageMs: number;
};

const POSTGRES_TTL_MS = 60 * 1000; // 60s — Postgres is the warm tier

function liveTtlSeconds(): number {
  return isMarketOpen() ? CACHE_TTL.quote : 60 * 10;
}

export async function getCachedQuote(symbol: string): Promise<QuoteResult> {
  const sym = symbol.toUpperCase();
  const key = cacheKey("quote", sym);
  const now = Date.now();

  // Layer 1: Redis
  const fromRedis = await cacheGet<{ quote: Quote; cachedAt: number }>(key);
  if (fromRedis) {
    return {
      quote: fromRedis.quote,
      source: "redis",
      ageMs: now - fromRedis.cachedAt,
    };
  }

  // Layer 2: Postgres
  const supabase = getSupabase();
  const { data: pgRow } = await supabase
    .from(TABLES.quoteCache)
    .select("symbol, payload, fetched_at")
    .eq("symbol", sym)
    .maybeSingle();

  if (pgRow) {
    const fetchedAtMs = new Date(pgRow.fetched_at).getTime();
    const age = now - fetchedAtMs;
    if (age < POSTGRES_TTL_MS) {
      const quote = pgRow.payload as Quote;
      await cacheSet(key, { quote, cachedAt: fetchedAtMs }, liveTtlSeconds());
      return { quote, source: "postgres", ageMs: age };
    }
  }

  // Layer 3: Finnhub
  const quote = await fetchQuote(sym);
  const cachedAt = Date.now();
  await Promise.all([
    cacheSet(key, { quote, cachedAt }, liveTtlSeconds()),
    supabase
      .from(TABLES.quoteCache)
      .upsert(
        {
          symbol: sym,
          payload: quote,
          fetched_at: new Date(cachedAt).toISOString(),
        },
        { onConflict: "symbol" },
      ),
  ]);
  return { quote, source: "finnhub", ageMs: 0 };
}

/**
 * Bulk variant. Useful for sector strength (12 ETFs) and dashboard top movers.
 * Symbols already in cache return instantly; misses are fetched in parallel
 * (still routed through the rate limiter).
 */
export async function getCachedQuotes(
  symbols: string[],
): Promise<QuoteResult[]> {
  return Promise.all(symbols.map((s) => getCachedQuote(s)));
}
