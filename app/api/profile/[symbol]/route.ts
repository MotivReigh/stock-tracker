import { NextResponse } from "next/server";
import { fetchProfile } from "@/lib/finnhub/profile";
import { cacheGet, cacheSet, cacheKey, CACHE_TTL } from "@/lib/cache/redis";
import { FinnhubError } from "@/lib/finnhub/client";
import type { FinnhubProfile } from "@/lib/finnhub/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  if (!/^[A-Z0-9.-]{1,10}$/i.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }
  const sym = symbol.toUpperCase();
  const key = cacheKey("profile", sym);

  const cached = await cacheGet<FinnhubProfile>(key);
  if (cached) {
    return NextResponse.json({ profile: cached, source: "redis" });
  }

  try {
    const profile = await fetchProfile(sym);
    await cacheSet(key, profile, CACHE_TTL.profile);
    return NextResponse.json({ profile, source: "finnhub" });
  } catch (err) {
    if (err instanceof FinnhubError) {
      return NextResponse.json(
        { error: err.message, status: err.status },
        { status: err.status === 429 ? 429 : 502 },
      );
    }
    console.error("[/api/profile] error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
