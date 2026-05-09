import { NextResponse } from "next/server";
import { fetchYahooCandles, YahooError, type YahooInterval } from "@/lib/yahoo/candles";
import { cacheGet, cacheSet, cacheKey, CACHE_TTL } from "@/lib/cache/redis";
import type { FinnhubCandles } from "@/lib/finnhub/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_INTERVALS: YahooInterval[] = ["1d", "1wk", "1mo"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const url = new URL(req.url);
  const interval = (url.searchParams.get("interval") ?? "1d") as YahooInterval;
  const lookbackDays = parseInt(url.searchParams.get("lookback") ?? "365", 10);

  if (!/^[A-Z0-9.-]{1,10}$/i.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }
  if (!VALID_INTERVALS.includes(interval)) {
    return NextResponse.json({ error: "invalid interval" }, { status: 400 });
  }
  if (Number.isNaN(lookbackDays) || lookbackDays < 1 || lookbackDays > 3650) {
    return NextResponse.json({ error: "invalid lookback" }, { status: 400 });
  }

  const sym = symbol.toUpperCase();
  const key = cacheKey("candles", sym, interval, lookbackDays);

  const cached = await cacheGet<FinnhubCandles>(key);
  if (cached) {
    return NextResponse.json({ candles: cached, source: "redis" });
  }

  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - lookbackDays * 24 * 60 * 60;
    const candles = await fetchYahooCandles(sym, from, to, interval);
    await cacheSet(key, candles, CACHE_TTL.candlesDaily);
    return NextResponse.json({ candles, source: "yahoo" });
  } catch (err) {
    if (err instanceof YahooError) {
      return NextResponse.json(
        { error: err.message, status: err.status },
        { status: err.status === 429 ? 429 : 502 },
      );
    }
    console.error("[/api/candles] error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
