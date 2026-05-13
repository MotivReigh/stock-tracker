/**
 * Idempotently insert all 10 preset scans for the single-user account.
 * Re-running is safe — preset_key + user_id is unique so we upsert by it.
 *
 * Usage: npx tsx scripts/seed-presets.ts
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

async function main() {
  const { SINGLE_USER_ID } = await import("../lib/db/tables");
  const { PRESETS } = await import("../lib/scans/presets");
  const { upsertPresetScan, listScans } = await import("../lib/scans/queries");

  console.log(`Seeding ${PRESETS.length} preset scans for user ${SINGLE_USER_ID}...`);
  for (const p of PRESETS) {
    await upsertPresetScan(SINGLE_USER_ID, {
      key: p.key,
      name: p.name,
      definition: p.definition,
    });
    console.log(`  ✓ ${p.key.padEnd(35)} → "${p.name}"`);
  }

  const all = await listScans(SINGLE_USER_ID);
  const preset = all.filter((s) => s.type === "preset");
  const custom = all.filter((s) => s.type === "custom");
  console.log(`\n✓ ${preset.length} preset scans, ${custom.length} custom scans on this account.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
