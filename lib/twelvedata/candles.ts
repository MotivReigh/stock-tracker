/**
 * Twelve Data candle fetcher.
 *
 * Why: Yahoo's free chart API rate-limits per IP, which is fine in production
 * but brittle in dev when iterating. Twelve Data's free tier (800 req/day,
 * 8 req/min) is registered against an API key, so blocks aren't shared with
 * other users on your network.
 *
 * Sign up free: https://twelvedata.com/pricing (no card, ~30s)
 * Set TWELVE_DATA_API_KEY in .env.local; this provider is automatically
 * preferred over Yahoo when the key is present.
 */
import type { FinnhubCandles } from "@/lib/finnhub/types";

const BASE = "https://api.twelvedata.com/time_series";

type TwelveDataValue = {
  datetime: string; // "YYYY-MM-DD"
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

type TwelveDataResponse =
  | {
      meta: { symbol: string; interval: string; currency?: string };
      values: TwelveDataValue[];
      status: "ok";
    }
  | {
      code: number;
      message: string;
      status: "error";
    };

export class TwelveDataError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TwelveDataError";
  }
}

export async function fetchTwelveDataCandles(
  symbol: string,
  fromUnix: number,
  toUnix: number,
): Promise<FinnhubCandles> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new TwelveDataError("TWELVE_DATA_API_KEY not set", 500);
  }

  const days = Math.ceil((toUnix - fromUnix) / 86_400);
  // Twelve Data caps free tier at 5000 outputsize per call; that's ~20 years daily.
  const outputsize = Math.min(5000, Math.max(50, days + 5));

  const url = new URL(BASE);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", String(outputsize));
  url.searchParams.set("order", "ASC");
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new TwelveDataError(
      `Twelve Data ${symbol}: HTTP ${res.status}`,
      res.status,
    );
  }
  const body = (await res.json()) as TwelveDataResponse;
  if (body.status === "error") {
    throw new TwelveDataError(
      `Twelve Data ${symbol}: ${body.message}`,
      body.code,
    );
  }
  if (!body.values || body.values.length === 0) {
    return { c: [], h: [], l: [], o: [], s: "no_data", t: [], v: [] };
  }

  const t: number[] = [];
  const o: number[] = [];
  const h: number[] = [];
  const l: number[] = [];
  const c: number[] = [];
  const v: number[] = [];

  for (const row of body.values) {
    const time = Math.floor(new Date(row.datetime + "T00:00:00Z").getTime() / 1000);
    if (time < fromUnix || time > toUnix) continue;
    t.push(time);
    o.push(parseFloat(row.open));
    h.push(parseFloat(row.high));
    l.push(parseFloat(row.low));
    c.push(parseFloat(row.close));
    v.push(parseInt(row.volume, 10) || 0);
  }

  return { c, h, l, o, s: "ok", t, v };
}
