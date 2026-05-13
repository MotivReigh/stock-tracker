import { finnhubFetch } from "./client";
import type { FinnhubRecommendation } from "./types";

/**
 * Analyst recommendation breakdown over the last few months.
 * Paid endpoint. Returns array, newest period first.
 */
export async function fetchRecommendations(
  symbol: string,
): Promise<FinnhubRecommendation[]> {
  return finnhubFetch<FinnhubRecommendation[]>("/stock/recommendation", {
    symbol,
  });
}
