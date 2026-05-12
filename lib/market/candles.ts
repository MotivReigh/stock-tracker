/**
 * Provider-agnostic daily candle fetcher.
 *
 * Order of preference:
 *   1. Twelve Data — when TWELVE_DATA_API_KEY is set. Registered key, reliable.
 *   2. Yahoo Finance — fallback. No key needed but rate-limits per IP.
 *
 * Both return Finnhub-shaped output so the rest of the app stays oblivious to
 * the source.
 */
import { fetchTwelveDataCandles, TwelveDataError } from "@/lib/twelvedata/candles";
import { fetchYahooCandles, YahooError } from "@/lib/yahoo/candles";
import type { FinnhubCandles } from "@/lib/finnhub/types";

export type CandleSource = "twelvedata" | "yahoo" | "none";

export type CandleResult = {
  candles: FinnhubCandles;
  source: CandleSource;
  error?: string;
};

export async function fetchDailyCandles(
  symbol: string,
  fromUnix: number,
  toUnix: number,
): Promise<CandleResult> {
  const errors: string[] = [];

  if (process.env.TWELVE_DATA_API_KEY) {
    try {
      const candles = await fetchTwelveDataCandles(symbol, fromUnix, toUnix);
      if (candles.s === "ok") {
        return { candles, source: "twelvedata" };
      }
      errors.push(`twelvedata: no_data`);
    } catch (err) {
      const msg = err instanceof TwelveDataError ? err.message : String(err);
      errors.push(`twelvedata: ${msg}`);
    }
  }

  try {
    const candles = await fetchYahooCandles(symbol, fromUnix, toUnix);
    if (candles.s === "ok") {
      return { candles, source: "yahoo" };
    }
    errors.push(`yahoo: no_data`);
  } catch (err) {
    const msg = err instanceof YahooError ? err.message : String(err);
    errors.push(`yahoo: ${msg}`);
  }

  return {
    candles: { c: [], h: [], l: [], o: [], s: "no_data", t: [], v: [] },
    source: "none",
    error: errors.join(" · "),
  };
}
