/**
 * Yahoo Finance chart-API candle fetcher.
 *
 * Why: Finnhub's free tier returns 403 on /stock/candle for US equities.
 * Yahoo's chart endpoint is unofficial-but-stable, requires no key, and is
 * what their own consumer app uses. We treat it like any other rate-limited
 * source: cache aggressively, surface failures gracefully.
 *
 * Output shape mirrors Finnhub's FinnhubCandles so the rest of the app
 * doesn't need to know which provider responded.
 */
import type { FinnhubCandles } from "@/lib/finnhub/types";

const BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type YahooChartResponse = {
  chart: {
    result?: Array<{
      meta: { currency?: string; symbol?: string; regularMarketPrice?: number };
      timestamp?: number[];
      indicators: {
        quote: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error: { code: string; description: string } | null;
  };
};

export type YahooInterval = "1d" | "1wk" | "1mo";

export class YahooError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "YahooError";
  }
}

export async function fetchYahooCandles(
  symbol: string,
  fromUnix: number,
  toUnix: number,
  interval: YahooInterval = "1d",
): Promise<FinnhubCandles> {
  const url =
    `${BASE}/${encodeURIComponent(symbol)}` +
    `?period1=${fromUnix}&period2=${toUnix}&interval=${interval}` +
    `&includePrePost=false`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new YahooError(
      `Yahoo chart ${symbol}: HTTP ${res.status}`,
      res.status,
    );
  }

  const body = (await res.json()) as YahooChartResponse;
  if (body.chart.error) {
    throw new YahooError(
      `Yahoo chart ${symbol}: ${body.chart.error.description}`,
      400,
    );
  }
  const result = body.chart.result?.[0];
  if (!result?.timestamp?.length) {
    return { c: [], h: [], l: [], o: [], s: "no_data", t: [], v: [] };
  }
  const q = result.indicators.quote[0];

  const t: number[] = [];
  const o: number[] = [];
  const h: number[] = [];
  const l: number[] = [];
  const c: number[] = [];
  const v: number[] = [];

  for (let i = 0; i < result.timestamp.length; i++) {
    const close = q.close?.[i];
    const open = q.open?.[i];
    const high = q.high?.[i];
    const low = q.low?.[i];
    // Yahoo occasionally has null gaps; skip those rather than poison the chart.
    if (close == null || open == null || high == null || low == null) continue;
    t.push(result.timestamp[i]);
    o.push(open);
    h.push(high);
    l.push(low);
    c.push(close);
    v.push(q.volume?.[i] ?? 0);
  }

  return { c, h, l, o, s: "ok", t, v };
}
