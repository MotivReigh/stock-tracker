/* One-shot sanity check after running db:migrate. */
import { Client } from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const url = env.POSTGRES_URL_NON_POOLING.replace(/[?&]sslmode=[^&]*/g, "");
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(
    "select tablename from pg_tables where schemaname='public' and tablename like 'updraft_%' order by tablename",
  );
  console.log(`Tables (${r.rows.length}):`);
  for (const row of r.rows) console.log("  -", row.tablename);
  const u = await c.query("select count(*) from updraft_users");
  console.log("\nupdraft_users count:", u.rows[0].count);
  const s = await c.query("select user_id, dashboard_layout from updraft_settings");
  console.log("updraft_settings:", s.rows);
  await c.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
