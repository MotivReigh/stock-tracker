import { NextResponse } from "next/server";
import { fetchDailyCandles } from "@/lib/market/candles";
import { cacheGet, cacheSet, cacheKey, CACHE_TTL } from "@/lib/cache/redis";
import type { FinnhubCandles } from "@/lib/finnhub/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const url = new URL(req.url);
  const lookbackDays = parseInt(url.searchParams.get("lookback") ?? "365", 10);

  if (!/^[A-Z0-9.-]{1,10}$/i.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }
  if (Number.isNaN(lookbackDays) || lookbackDays < 1 || lookbackDays > 3650) {
    return NextResponse.json({ error: "invalid lookback" }, { status: 400 });
  }

  const sym = symbol.toUpperCase();
  const key = cacheKey("candles", sym, "1d", lookbackDays);

  const cached = await cacheGet<FinnhubCandles>(key);
  if (cached) {
    return NextResponse.json({ candles: cached, source: "redis" });
  }

  const to = Math.floor(Date.now() / 1000);
  const from = to - lookbackDays * 24 * 60 * 60;
  const result = await fetchDailyCandles(sym, from, to);

  if (result.source === "none") {
    return NextResponse.json(
      { error: "no candle source available", detail: result.error },
      { status: 502 },
    );
  }

  await cacheSet(key, result.candles, CACHE_TTL.candlesDaily);
  return NextResponse.json({ candles: result.candles, source: result.source });
}
