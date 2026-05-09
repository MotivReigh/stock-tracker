import { NextResponse } from "next/server";
import { fetchCandles, type Resolution } from "@/lib/finnhub/candles";
import { cacheGet, cacheSet, cacheKey, CACHE_TTL } from "@/lib/cache/redis";
import { FinnhubError } from "@/lib/finnhub/client";
import type { FinnhubCandles } from "@/lib/finnhub/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_RESOLUTIONS: Resolution[] = ["1", "5", "15", "30", "60", "D", "W", "M"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const url = new URL(req.url);
  const resolution = (url.searchParams.get("resolution") ?? "D") as Resolution;
  const lookbackDays = parseInt(url.searchParams.get("lookback") ?? "365", 10);

  if (!/^[A-Z0-9.-]{1,10}$/i.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }
  if (!VALID_RESOLUTIONS.includes(resolution)) {
    return NextResponse.json({ error: "invalid resolution" }, { status: 400 });
  }
  if (Number.isNaN(lookbackDays) || lookbackDays < 1 || lookbackDays > 3650) {
    return NextResponse.json({ error: "invalid lookback" }, { status: 400 });
  }

  const sym = symbol.toUpperCase();
  const key = cacheKey("candles", sym, resolution, lookbackDays);

  const cached = await cacheGet<FinnhubCandles>(key);
  if (cached) {
    return NextResponse.json({ candles: cached, source: "redis" });
  }

  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - lookbackDays * 24 * 60 * 60;
    const candles = await fetchCandles(sym, resolution, from, to);
    await cacheSet(key, candles, CACHE_TTL.candlesDaily);
    return NextResponse.json({ candles, source: "finnhub" });
  } catch (err) {
    if (err instanceof FinnhubError) {
      return NextResponse.json(
        { error: err.message, status: err.status },
        { status: err.status === 429 ? 429 : 502 },
      );
    }
    console.error("[/api/candles] error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
