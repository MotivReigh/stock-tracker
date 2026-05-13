import { finnhubFetch } from "./client";
import type { FinnhubMetric } from "./types";

/**
 * Fundamental metrics for a symbol.
 *
 * Requires Finnhub Starter or higher — returns 403 on free tier. The
 * `metric=all` flag pulls every available field; we let TS narrow only the
 * ones the UI consumes.
 */
export async function fetchMetrics(symbol: string): Promise<FinnhubMetric> {
  return finnhubFetch<FinnhubMetric>("/stock/metric", {
    symbol,
    metric: "all",
  });
}
