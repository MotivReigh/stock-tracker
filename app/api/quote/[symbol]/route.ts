import { NextResponse } from "next/server";
import { getCachedQuote } from "@/lib/cache/quoteCache";
import { FinnhubError } from "@/lib/finnhub/client";

// Quote fetching uses Node-only deps (pg/redis); force Node runtime.
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

  try {
    const result = await getCachedQuote(symbol);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FinnhubError) {
      return NextResponse.json(
        { error: err.message, status: err.status },
        { status: err.status === 429 ? 429 : 502 },
      );
    }
    console.error("[/api/quote] error:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
