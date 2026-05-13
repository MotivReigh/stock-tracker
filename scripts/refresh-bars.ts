/**
 * Manual bars refresh trigger.
 *
 * Fetches daily candles for every enabled universe symbol (plus the SPY
 * benchmark) via the provider chain (Twelve Data → Yahoo) and upserts into
 * updraft_daily_bars. Same code path the cron uses.
 *
 * Usage:
 *   npx tsx scripts/refresh-bars.ts          # full refresh
 *   npx tsx scripts/refresh-bars.ts NVDA MU  # specific symbols only
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    process.env[t.slice(0, i).trim()] = t
      .slice(i + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }
}
loadEnv();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BENCHMARK = "SPY";

async function main() {
  const { listUniverse } = await import("../lib/universe/queries");
  const { refreshBars } = await import("../lib/bars/refresh");

  const argv = process.argv.slice(2);
  let symbols: string[];
  if (argv.length > 0) {
    symbols = argv.map((s) => s.toUpperCase());
  } else {
    const universe = await listUniverse();
    symbols = universe.map((u) => u.symbol);
  }

  // Always include SPY as the benchmark.
  if (!symbols.includes(BENCHMARK)) symbols.push(BENCHMARK);

  console.log(`Refreshing bars for ${symbols.length} symbols (concurrency=4)…\n`);

  const start = Date.now();
  const summary = await refreshBars({
    symbols,
    lookbackDays: 365 * 5,
    concurrency: 4,
    onProgress: ({ symbol, bars, source, error }) => {
      const status = error ? `✗ ${error}` : `${bars} bars`;
      console.log(`  ${symbol.padEnd(6)} [${source.padEnd(11)}] ${status}`);
    },
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log("\n--- Summary ---");
  console.log(`  Total symbols      : ${summary.total}`);
  console.log(`  With bars          : ${summary.withBars}`);
  console.log(`  Empty / failed     : ${summary.emptyOrFailed}`);
  console.log(`  Rows written       : ${summary.rowsWritten.toLocaleString()}`);
  console.log(`  Per source         : ${JSON.stringify(summary.perSource)}`);
  console.log(`  Elapsed            : ${elapsed}s`);

  if (summary.errors.length > 0) {
    console.log("\n--- First 10 errors ---");
    for (const e of summary.errors.slice(0, 10)) {
      console.log(`  ${e.symbol}: ${e.error}`);
    }
  }

  if (summary.withBars === 0) {
    console.log("\n⚠️  No bars were ingested. Set TWELVE_DATA_API_KEY in .env.local");
    console.log("    (free signup at https://twelvedata.com — 800 req/day, no card)");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
