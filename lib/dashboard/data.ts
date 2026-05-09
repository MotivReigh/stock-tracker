/**
 * Server-side composition of all data shown on the dashboard.
 *
 * Each section degrades independently: a sector failure does not blank the
 * movers panel. Promise.allSettled isolates failures.
 */
import { getCachedQuote } from "@/lib/cache/quoteCache";
import { fetchGeneralNews } from "@/lib/finnhub/marketNews";
import { cacheGet, cacheSet, cacheKey, CACHE_TTL } from "@/lib/cache/redis";
import { SECTOR_ETFS } from "@/lib/market/sectors";
import { POPULAR_SYMBOLS, INDEX_TAPE_SYMBOLS } from "./popular-symbols";
import { isMarketOpen } from "@/lib/market/calendar";
import type { Quote } from "@/lib/finnhub/types";
import type { FinnhubNewsItem } from "@/lib/finnhub/types";

export type Mover = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
};

export type SectorRow = {
  ticker: string;
  label: string;
  price: number | null;
  changePercent: number | null;
  error?: string;
};

export type IndexRow = {
  ticker: string;
  label: string;
  price: number | null;
  changePercent: number | null;
};

export type Highlight =
  | { kind: "topGainer"; mover: Mover }
  | { kind: "topDecliner"; mover: Mover }
  | { kind: "biggestRange"; mover: Mover; rangePct: number }
  | { kind: "biggestGap"; mover: Mover; gapPct: number };

export type DashboardData = {
  asOf: number;
  marketOpen: boolean;
  indices: IndexRow[];
  sectors: SectorRow[];
  movers: Mover[];
  highlights: Highlight[];
  news: FinnhubNewsItem[];
};

function quoteToMover(symbol: string, q: Quote): Mover {
  return {
    symbol,
    price: q.price,
    change: q.change,
    changePercent: q.changePercent,
    high: q.high,
    low: q.low,
    open: q.open,
    prevClose: q.prevClose,
  };
}

async function getMovers(): Promise<Mover[]> {
  const results = await Promise.allSettled(
    POPULAR_SYMBOLS.map(async (sym) => {
      const r = await getCachedQuote(sym);
      return quoteToMover(sym, r.quote);
    }),
  );
  const movers: Mover[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") movers.push(r.value);
  }
  // Sort biggest gainers first, ties broken by absolute change.
  movers.sort((a, b) => b.changePercent - a.changePercent);
  return movers;
}

async function getSectors(): Promise<SectorRow[]> {
  const results = await Promise.allSettled(
    SECTOR_ETFS.map(async (etf) => {
      const r = await getCachedQuote(etf.ticker);
      return {
        ticker: etf.ticker,
        label: etf.label,
        price: r.quote.price,
        changePercent: r.quote.changePercent,
      } satisfies SectorRow;
    }),
  );
  const rows: SectorRow[] = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          ticker: SECTOR_ETFS[i].ticker,
          label: SECTOR_ETFS[i].label,
          price: null,
          changePercent: null,
          error: "fetch failed",
        },
  );
  rows.sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity));
  return rows;
}

async function getIndices(): Promise<IndexRow[]> {
  const results = await Promise.allSettled(
    INDEX_TAPE_SYMBOLS.map(async (idx) => {
      const r = await getCachedQuote(idx.ticker);
      return {
        ticker: idx.ticker,
        label: idx.label,
        price: r.quote.price,
        changePercent: r.quote.changePercent,
      } satisfies IndexRow;
    }),
  );
  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          ticker: INDEX_TAPE_SYMBOLS[i].ticker,
          label: INDEX_TAPE_SYMBOLS[i].label,
          price: null,
          changePercent: null,
        },
  );
}

async function getNews(): Promise<FinnhubNewsItem[]> {
  const key = cacheKey("news", "general");
  const cached = await cacheGet<FinnhubNewsItem[]>(key);
  if (cached) return cached.slice(0, 8);

  try {
    const news = await fetchGeneralNews("general");
    await cacheSet(key, news, CACHE_TTL.news);
    return news.slice(0, 8);
  } catch (err) {
    console.error("[dashboard] news fetch failed:", err);
    return [];
  }
}

function computeHighlights(movers: Mover[]): Highlight[] {
  if (movers.length === 0) return [];
  const out: Highlight[] = [];

  // Top gainer (movers are pre-sorted desc).
  out.push({ kind: "topGainer", mover: movers[0] });

  // Top decliner.
  const decliner = movers[movers.length - 1];
  if (decliner && decliner !== movers[0]) {
    out.push({ kind: "topDecliner", mover: decliner });
  }

  // Biggest intraday range (high-low / prevClose).
  let widest: Mover | null = null;
  let widestPct = -Infinity;
  for (const m of movers) {
    if (m.prevClose <= 0) continue;
    const rangePct = ((m.high - m.low) / m.prevClose) * 100;
    if (rangePct > widestPct) {
      widestPct = rangePct;
      widest = m;
    }
  }
  if (widest && widestPct > 0) {
    out.push({ kind: "biggestRange", mover: widest, rangePct: widestPct });
  }

  // Biggest gap (open vs prevClose, absolute %).
  let gapper: Mover | null = null;
  let gapPct = 0;
  for (const m of movers) {
    if (m.prevClose <= 0) continue;
    const g = ((m.open - m.prevClose) / m.prevClose) * 100;
    if (Math.abs(g) > Math.abs(gapPct)) {
      gapPct = g;
      gapper = m;
    }
  }
  if (gapper) out.push({ kind: "biggestGap", mover: gapper, gapPct });

  return out;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [indices, sectors, movers, news] = await Promise.all([
    getIndices(),
    getSectors(),
    getMovers(),
    getNews(),
  ]);

  return {
    asOf: Date.now(),
    marketOpen: isMarketOpen(),
    indices,
    sectors,
    movers,
    highlights: computeHighlights(movers),
    news,
  };
}
