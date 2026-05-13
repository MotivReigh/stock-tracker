/**
 * End-to-end Phase 6 smoke:
 *   1. Synthesize daily bars for a few symbols + SPY benchmark
 *   2. Insert them into updraft_daily_bars
 *   3. Run all enabled scans via runScanAndPersist
 *   4. Verify hits land in updraft_scan_results
 *
 * Approximates what `refresh-bars + cron run-scans` does in production,
 * without depending on external candle providers.
 *
 * Usage: npx tsx scripts/smoke-scan-engine.ts
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

const DAY_MS = 86_400_000;

type SyntheticBar = {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function uptrendBars(symbol: string, days: number, start: number, end: number): SyntheticBar[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const rows: SyntheticBar[] = [];
  for (let i = 0; i < days; i++) {
    const ago = days - 1 - i;
    const d = new Date(today.getTime() - ago * DAY_MS);
    // Skip weekends so the date column passes the trading-day smell test.
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const close = start + ((end - start) * i) / (days - 1);
    rows.push({
      symbol,
      date: d.toISOString().slice(0, 10),
      open: close * 0.999,
      high: close * 1.008,
      low: close * 0.995,
      close,
      volume: 1_000_000,
    });
  }
  return rows;
}

/** Last 5 bars get a fresh push past prior high + volume surge. */
function breakoutBars(symbol: string): SyntheticBar[] {
  const flat = uptrendBars(symbol, 300, 50, 100);
  // Take last 5 and bump prices.
  for (let i = 0; i < 5; i++) {
    const idx = flat.length - 5 + i;
    const target = 100 + (i + 1) * 4; // 104 → 120
    flat[idx] = {
      ...flat[idx],
      close: target,
      open: target * 0.997,
      high: target * 1.01,
      low: target * 0.995,
      volume: 3_500_000,
    };
  }
  return flat;
}

async function main() {
  const { SINGLE_USER_ID } = await import("../lib/db/tables");
  const { upsertBars } = await import("../lib/bars/queries");
  const { listScans } = await import("../lib/scans/queries");
  const { runScanAndPersist } = await import("../lib/scans/runner");
  const { Client } = await import("pg");

  console.log("\n--- 1. Synthesize bars ---");
  const allRows: SyntheticBar[] = [
    ...breakoutBars("NVDA"),
    ...breakoutBars("MU"),
    ...uptrendBars("AAPL", 300, 150, 200),     // steady uptrend (less aggressive)
    ...uptrendBars("AVGO", 300, 1000, 1450),
    ...uptrendBars("SPY", 300, 500, 550),       // benchmark, mild rise
  ];
  console.log(`  Synthesized ${allRows.length} bars across 5 symbols`);

  console.log("\n--- 2. Upsert into updraft_daily_bars ---");
  await upsertBars(allRows);
  console.log(`  ✓ Wrote ${allRows.length} rows`);

  console.log("\n--- 3. Clear prior scan results so test is deterministic ---");
  const env = (k: string) => process.env[k]!;
  const pg = new Client({
    connectionString: env("POSTGRES_URL_NON_POOLING").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();
  await pg.query("delete from updraft_scan_results");
  await pg.end();
  console.log("  ✓ updraft_scan_results emptied");

  console.log("\n--- 4. Run all enabled scans ---");
  const scans = (await listScans(SINGLE_USER_ID)).filter((s) => s.enabled);
  for (const scan of scans) {
    const r = await runScanAndPersist(scan);
    const tag = r.hits > 0 ? "🎯" : "  ";
    console.log(
      `  ${tag} ${scan.name.padEnd(48)} hits=${String(r.hits).padStart(2)} eval=${r.evaluated} skip=${r.skipped} inserted=${r.inserted}`,
    );
    if (r.hits > 0) {
      // Show which symbols
      console.log(`       symbols: (see DB)`);
    }
  }

  console.log("\n--- 5. Verify results landed in DB ---");
  const verify = new Client({
    connectionString: env("POSTGRES_URL_NON_POOLING").replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false },
  });
  await verify.connect();
  const rs = await verify.query(`
    select s.name, sr.symbol, sr.snapshot->>'conviction' as conviction
    from updraft_scan_results sr
    join updraft_scans s on s.id = sr.scan_id
    order by s.name, sr.symbol
  `);
  console.log(`  Total scan_results rows: ${rs.rows.length}`);
  for (const row of rs.rows.slice(0, 25)) {
    console.log(`    ${row.name.padEnd(48)} ${row.symbol.padEnd(6)} conv=${row.conviction}`);
  }
  await verify.end();

  console.log("\n✓ Phase 6 smoke complete\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
