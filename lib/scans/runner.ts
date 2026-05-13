/**
 * Wire-up between the pure engine, DB-backed bars, and persistence.
 * Used by the cron route, the `/scans/[id]` Run-now button, and the smoke
 * script.
 *
 * Steps:
 *   1. Load universe + benchmark bars (SPY) + per-symbol bars in one round-trip
 *   2. Call the pure engine
 *   3. Persist results via insertResults
 */
import { listUniverse } from "@/lib/universe/queries";
import { getBarsForSymbols } from "@/lib/bars/queries";
import { runScan, type SymbolBars } from "./engine";
import { insertResults, type ScanRow } from "./queries";
import type { Bar } from "./signals";

export type RunnerResult = {
  scanId: string;
  scanName: string;
  hits: number;
  evaluated: number;
  skipped: number;
  inserted: number;
  notes: string[];
};

const BENCHMARK = "SPY";
const SCAN_LOOKBACK_DAYS = 365 * 2; // 2y of history is plenty for our signals

export async function runScanAndPersist(scan: ScanRow): Promise<RunnerResult> {
  const notes: string[] = [];
  const universe = await listUniverse();

  // Symbols to evaluate: universe (filtered by definition.universe at engine level).
  const symbols = universe.map((u) => u.symbol);

  // One Postgres round-trip for all bars (chunked by getBarsForSymbols).
  const barsMap = await getBarsForSymbols(
    [...symbols, BENCHMARK],
    SCAN_LOOKBACK_DAYS,
  );

  const benchmarkBars: Bar[] = barsMap.get(BENCHMARK) ?? [];
  if (benchmarkBars.length === 0) {
    notes.push(
      `Benchmark ${BENCHMARK} has no bars in DB — RS scoring will be null.`,
    );
  }

  const symbolBars: SymbolBars[] = symbols.map((sym) => ({
    symbol: sym,
    bars: barsMap.get(sym) ?? [],
  }));

  const withBars = symbolBars.filter((s) => s.bars.length > 0).length;
  if (withBars === 0) {
    notes.push(
      "No symbols have bars in updraft_daily_bars yet. Run scripts/refresh-bars.ts (or POST /api/cron/refresh-bars) to populate.",
    );
  } else if (withBars < symbols.length / 2) {
    notes.push(
      `Only ${withBars}/${symbols.length} symbols have bars. Results will be partial until refresh-bars completes.`,
    );
  }

  const { hits, evaluated, skipped } = runScan({
    definition: scan.definition,
    symbolBars,
    benchmarkBars,
    universe,
  });

  const inserted = await insertResults(scan.id, hits);

  return {
    scanId: scan.id,
    scanName: scan.name,
    hits: hits.length,
    evaluated,
    skipped,
    inserted,
    notes,
  };
}
