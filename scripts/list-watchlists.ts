import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
const env: Record<string, string> = {};
for (const line of raw.split("\n")) {
  const i = line.indexOf("=");
  if (i < 0 || line.startsWith("#")) continue;
  env[line.slice(0, i).trim()] = line
    .slice(i + 1)
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

const url = env.POSTGRES_URL_NON_POOLING.replace(/[?&]sslmode=[^&]*/g, "");
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function main() {
  await c.connect();
  const r = await c.query(
    "select id, name from updraft_watchlists order by sort_index",
  );
  for (const row of r.rows) console.log(`${row.id} ${row.name}`);
  await c.end();
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
