import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/auth/cron";
import { listUniverse } from "@/lib/universe/queries";
import { refreshBars } from "@/lib/bars/refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800; // Vercel Pro cron cap; harmless on Hobby

const BENCHMARK = "SPY";

export async function GET(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const universe = await listUniverse();
  const symbols = universe.map((u) => u.symbol);
  if (!symbols.includes(BENCHMARK)) symbols.push(BENCHMARK);

  const url = new URL(req.url);
  const lookback = parseInt(url.searchParams.get("lookback") ?? String(365 * 2), 10);

  const summary = await refreshBars({
    symbols,
    lookbackDays: Number.isFinite(lookback) ? lookback : 365 * 2,
    concurrency: 4,
  });

  return NextResponse.json(summary);
}

// Allow POST too for manual triggering with curl.
export const POST = GET;
