import { finnhubFetch } from "./client";
import type { FinnhubCandles } from "./types";

export type Resolution = "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M";

export async function fetchCandles(
  symbol: string,
  resolution: Resolution,
  from: number, // unix sec
  to: number, // unix sec
): Promise<FinnhubCandles> {
  return finnhubFetch<FinnhubCandles>("/stock/candle", {
    symbol,
    resolution,
    from,
    to,
  });
}
