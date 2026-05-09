/**
 * Bulk-upsert the curated universe list into updraft_universe.
 *
 * Source: data/seed-universe.json (~140 popular US large/mid caps).
 * market_cap is left null here; the weekly refresher cron (Phase 6) will
 * fetch fresh values from Finnhub via /stock/profile2 and update in place.
 *
 * Usage: npm run db:seed
 */
import { Client } from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type SeedRow = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
};

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    env[trimmed.slice(0, i).trim()] = trimmed
      .slice(i + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const url = env.POSTGRES_URL_NON_POOLING?.replace(/[?&]sslmode=[^&]*/g, "");
  if (!url) {
    console.error("POSTGRES_URL_NON_POOLING missing in .env.local");
    process.exit(1);
  }

  const seedPath = resolve(process.cwd(), "data/seed-universe.json");
  const rows: SeedRow[] = JSON.parse(readFileSync(seedPath, "utf8"));

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log(`✓ Connected · seeding ${rows.length} symbols...`);

  try {
    await client.query("begin");
    for (const r of rows) {
      await client.query(
        `insert into updraft_universe (symbol, name, sector, industry, enabled, last_refreshed)
         values ($1, $2, $3, $4, true, now())
         on conflict (symbol) do update set
           name = excluded.name,
           sector = excluded.sector,
           industry = excluded.industry,
           enabled = true,
           last_refreshed = now()`,
        [r.symbol, r.name, r.sector, r.industry],
      );
    }
    await client.query("commit");

    const count = await client.query(
      "select count(*) as n, count(distinct sector) as sectors from updraft_universe where enabled = true",
    );
    console.log(
      `✓ ${count.rows[0].n} symbols enabled across ${count.rows[0].sectors} sectors`,
    );
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
