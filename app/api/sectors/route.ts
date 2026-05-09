import { NextResponse } from "next/server";
import { SECTOR_ETFS } from "@/lib/market/sectors";
import { getCachedQuote } from "@/lib/cache/quoteCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const results = await Promise.allSettled(
    SECTOR_ETFS.map(async (etf) => {
      const r = await getCachedQuote(etf.ticker);
      return {
        ticker: etf.ticker,
        label: etf.label,
        name: etf.name,
        price: r.quote.price,
        changePercent: r.quote.changePercent,
        change: r.quote.change,
        source: r.source,
      };
    }),
  );

  const sectors = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          ticker: SECTOR_ETFS[i].ticker,
          label: SECTOR_ETFS[i].label,
          name: SECTOR_ETFS[i].name,
          price: null,
          changePercent: null,
          change: null,
          error: "fetch failed",
        },
  );

  // Sort strongest → weakest by changePercent
  sectors.sort((a, b) => {
    const ap = a.changePercent ?? -Infinity;
    const bp = b.changePercent ?? -Infinity;
    return bp - ap;
  });

  return NextResponse.json({ sectors });
}
