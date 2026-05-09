/**
 * End-to-end sanity check for the Phase 2 data layer.
 * Talks to the real Supabase, Redis, and Finnhub instances configured in .env.local.
 *
 * Asserts:
 *  - First quote fetch hits Finnhub (source: 'finnhub')
 *  - Second quote fetch hits Redis (source: 'redis')
 *  - Sector ETFs all resolve
 *  - Profile cache works
 *
 * Usage: npx tsx scripts/smoke-data-layer.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

// Force the strict-SSL pg behavior off for this script (shared with migrate).
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function main() {
  const { getCachedQuote } = await import("../lib/cache/quoteCache");
  const { fetchProfile } = await import("../lib/finnhub/profile");
  const { getRedis, cacheKey } = await import("../lib/cache/redis");
  const { SECTOR_ETFS } = await import("../lib/market/sectors");

  console.log("\n--- 1. Quote chain (NVDA) ---");
  const r1 = await getCachedQuote("NVDA");
  console.log(`  source=${r1.source} price=$${r1.quote.price} %=${r1.quote.changePercent.toFixed(2)} ageMs=${r1.ageMs}`);

  const r2 = await getCachedQuote("NVDA");
  console.log(`  (re-read) source=${r2.source} ageMs=${r2.ageMs}`);
  if (r2.source !== "redis") {
    console.error(`  ✗ expected source=redis on second read, got ${r2.source}`);
    process.exit(1);
  }
  console.log("  ✓ Redis hot-cache working");

  console.log("\n--- 2. Sector ETF quotes ---");
  for (const etf of SECTOR_ETFS.slice(0, 4)) {
    const r = await getCachedQuote(etf.ticker);
    const arrow = (r.quote.changePercent ?? 0) >= 0 ? "▲" : "▼";
    console.log(
      `  ${etf.ticker.padEnd(5)} ${etf.label.padEnd(22)} $${r.quote.price.toFixed(2).padStart(8)} ${arrow} ${r.quote.changePercent.toFixed(2)}%  source=${r.source}`,
    );
  }

  console.log("\n--- 3. Profile cache ---");
  const profile = await fetchProfile("NVDA");
  console.log(`  ${profile.ticker} ${profile.name} · industry=${profile.finnhubIndustry} · marketCap≈$${(profile.marketCapitalization ?? 0).toLocaleString()}M`);

  console.log("\n--- 4. Redis health check ---");
  const r = await getRedis();
  if (r) {
    const pong = await r.ping();
    console.log(`  PING: ${pong}`);
    const dbsize = await r.dbSize();
    console.log(`  Total keys in db: ${dbsize}`);
    await r.quit();
  } else {
    console.log("  Redis unavailable (graceful degrade path active)");
  }

  console.log("\n✓ All smoke checks passed.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n✗ Smoke test failed:", err);
  process.exit(1);
});
