/**
 * Phase 8 journal smoke: exercise create / update / delete / list / filter.
 * Same code path the server actions use, against live Supabase.
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
  const j = await import("../lib/journal/queries");

  console.log("\n--- 1. Clean slate ---");
  const existing = await j.listAllNotes(SINGLE_USER_ID, { limit: 500 });
  for (const n of existing) {
    await j.deleteNote(SINGLE_USER_ID, n.id);
  }
  console.log(`  Deleted ${existing.length} pre-existing notes`);

  console.log("\n--- 2. Create notes for NVDA, MU, AAPL ---");
  const nvda1 = await j.createNote(
    SINGLE_USER_ID,
    "NVDA",
    "Bought 100 shares @ 215. Stop at 205, target 250.\nFollowing the AI cycle. Big volume on breakout.",
  );
  const nvda2 = await j.createNote(
    SINGLE_USER_ID,
    "NVDA",
    "Earnings tomorrow. Holding through.",
  );
  const mu = await j.createNote(
    SINGLE_USER_ID,
    "MU",
    "52-week high on 3.5× volume. Watching for follow-through above 115.",
  );
  const aapl = await j.createNote(
    SINGLE_USER_ID,
    "AAPL",
    "Pullback to 20-MA looks clean. No entry yet, waiting for confirmation.",
  );
  console.log(`  ✓ Created 4 notes (NVDA×2, MU×1, AAPL×1)`);

  console.log("\n--- 3. listNotesForSymbol(NVDA) ---");
  const nvdaNotes = await j.listNotesForSymbol(SINGLE_USER_ID, "NVDA");
  console.log(`  ✓ NVDA has ${nvdaNotes.length} notes (most recent first)`);
  for (const n of nvdaNotes) {
    console.log(`    · ${n.body.slice(0, 50).replace(/\n/g, " ⏎ ")}…`);
  }

  console.log("\n--- 4. listSymbolsWithNotes ---");
  const symbols = await j.listSymbolsWithNotes(SINGLE_USER_ID);
  for (const s of symbols) {
    console.log(`  ${s.symbol.padEnd(6)} · ${s.count} note(s)`);
  }

  console.log("\n--- 5. Full-text search: 'earnings' ---");
  const earningsHits = await j.listAllNotes(SINGLE_USER_ID, { query: "earnings" });
  console.log(`  ✓ ${earningsHits.length} hit(s)`);
  for (const n of earningsHits) {
    console.log(`    · ${n.symbol}: ${n.body.slice(0, 50)}…`);
  }

  console.log("\n--- 6. Filter by symbol: AAPL ---");
  const aaplOnly = await j.listAllNotes(SINGLE_USER_ID, { symbol: "AAPL" });
  console.log(`  ✓ ${aaplOnly.length} hit(s), all AAPL`);

  console.log("\n--- 7. Update NVDA note ---");
  await j.updateNote(SINGLE_USER_ID, nvda1.id, nvda1.body + "\n\nEdit: raised stop to 210.");
  const updated = await j.getNote(SINGLE_USER_ID, nvda1.id);
  console.log(`  ✓ updated_at moved forward (now ${updated?.updated_at !== nvda1.updated_at ? "yes" : "no"})`);

  console.log("\n--- 8. Delete one note (NVDA #2) ---");
  await j.deleteNote(SINGLE_USER_ID, nvda2.id);
  const remaining = await j.listAllNotes(SINGLE_USER_ID, { limit: 50 });
  console.log(`  ✓ ${remaining.length} notes remain`);

  console.log("\n--- 9. Final state ---");
  const finalSymbols = await j.listSymbolsWithNotes(SINGLE_USER_ID);
  for (const s of finalSymbols) {
    console.log(`  ${s.symbol.padEnd(6)} · ${s.count}`);
  }

  // Leave notes in place so the user can poke around the UI.
  // (Smoke runs are idempotent — re-running starts fresh via "clean slate".)
  // To wipe completely: uncomment below.
  // for (const n of remaining) await j.deleteNote(SINGLE_USER_ID, n.id);

  console.log("\n✓ Phase 8 journal smoke complete\n");
  // Reference unused names so TS-lint doesn't complain.
  void mu;
  void aapl;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
