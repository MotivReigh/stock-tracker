/**
 * Bulk daily-bars fetch + upsert.
 *
 * Strategy:
 *   1. For each symbol, call fetchDailyCandles (Twelve Data primary, Yahoo fallback)
 *   2. Normalize to BarRow
 *   3. Upsert into updraft_daily_bars
 *
 * Throttling: we cap concurrent fetches so we don't blow past Twelve Data's
 * 8 req/min limit. Yahoo doesn't publish a limit, but the same throttle
 * keeps us polite.
 */
import { fetchDailyCandles } from "@/lib/market/candles";
import { upsertBars, type BarRow } from "./queries";

type RefreshOptions = {
  symbols: string[];
  /** How many days back to fetch on first seed. */
  lookbackDays?: number;
  /** Concurrent symbols in flight. 4 is comfortable for free tiers. */
  concurrency?: number;
  /** Called per symbol — useful for progress logs. */
  onProgress?: (info: { symbol: string; bars: number; source: string; error?: string }) => void;
};

export type RefreshSummary = {
  total: number;
  withBars: number;
  emptyOrFailed: number;
  rowsWritten: number;
  perSource: Record<string, number>;
  errors: Array<{ symbol: string; error: string }>;
};

export async function refreshBars(opts: RefreshOptions): Promise<RefreshSummary> {
  const {
    symbols,
    lookbackDays = 365 * 5,
    concurrency = 4,
    onProgress,
  } = opts;

  const summary: RefreshSummary = {
    total: symbols.length,
    withBars: 0,
    emptyOrFailed: 0,
    rowsWritten: 0,
    perSource: {},
    errors: [],
  };

  const to = Math.floor(Date.now() / 1000);
  const from = to - lookbackDays * 86_400;

  let cursor = 0;
  async function worker() {
    while (cursor < symbols.length) {
      const idx = cursor++;
      const symbol = symbols[idx];
      try {
        const result = await fetchDailyCandles(symbol, from, to);
        summary.perSource[result.source] = (summary.perSource[result.source] ?? 0) + 1;

        if (result.source === "none" || result.candles.s !== "ok") {
          summary.emptyOrFailed++;
          summary.errors.push({
            symbol,
            error: result.error ?? "no candles returned",
          });
          onProgress?.({
            symbol,
            bars: 0,
            source: result.source,
            error: result.error,
          });
          continue;
        }

        const c = result.candles;
        const rows: BarRow[] = [];
        for (let i = 0; i < c.t.length; i++) {
          rows.push({
            symbol: symbol.toUpperCase(),
            date: new Date(c.t[i] * 1000).toISOString().slice(0, 10),
            open: c.o[i],
            high: c.h[i],
            low: c.l[i],
            close: c.c[i],
            volume: c.v[i],
          });
        }
        if (rows.length > 0) {
          await upsertBars(rows);
          summary.withBars++;
          summary.rowsWritten += rows.length;
          onProgress?.({
            symbol,
            bars: rows.length,
            source: result.source,
          });
        } else {
          summary.emptyOrFailed++;
          onProgress?.({ symbol, bars: 0, source: result.source });
        }
      } catch (err) {
        summary.emptyOrFailed++;
        summary.errors.push({ symbol, error: (err as Error).message });
        onProgress?.({
          symbol,
          bars: 0,
          source: "error",
          error: (err as Error).message,
        });
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
  return summary;
}
