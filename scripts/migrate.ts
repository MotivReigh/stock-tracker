/**
 * Apply all SQL migrations in supabase/migrations/ in lexical order.
 *
 * Idempotent: each migration uses CREATE TABLE IF NOT EXISTS / ON CONFLICT
 * so re-running is safe. (Phase 6+ migrations should follow the same pattern.)
 *
 * Usage: npm run db:migrate
 */
import "dotenv/config";
import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

async function main() {
  // Manually load .env.local since dotenv/config only reads .env by default.
  loadEnvFile(resolve(process.cwd(), ".env.local"));

  const url = process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    console.error("POSTGRES_URL_NON_POOLING not set in .env.local");
    process.exit(1);
  }

  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migrations found.");
    return;
  }

  // Supabase pooler presents an intermediate cert that Node's bundled CA store
  // doesn't recognize. pg's modern default treats sslmode=require as verify-full,
  // which fails. We strip sslmode from the URL and pass ssl options explicitly.
  const safeUrl = url.replace(/[?&]sslmode=[^&]*/g, "");
  const client = new Client({
    connectionString: safeUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("✓ Connected to Postgres");

  try {
    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      console.log(`→ Applying ${file}...`);
      await client.query(sql);
      console.log(`  ✓ ${file} done`);
    }
    console.log("All migrations applied.");
  } finally {
    await client.end();
  }
}

function loadEnvFile(path: string) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local optional; rely on real env if it doesn't exist.
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
