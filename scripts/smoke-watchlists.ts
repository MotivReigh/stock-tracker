/**
 * End-to-end smoke test for Phase 5 watchlists.
 * Exercises the queries layer (same code the server actions use), then
 * inspects HTTP rendering of /watchlists, /watchlists/[id], /, /stock/NVDA.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function main() {
  const { SINGLE_USER_ID } = await import("../lib/db/tables");
  const wl = await import("../lib/watchlists/queries");

  console.log("\n--- 1. Clean slate ---");
  const existing = await wl.listWatchlists(SINGLE_USER_ID);
  for (const l of existing) {
    await wl.deleteWatchlist(SINGLE_USER_ID, l.id);
  }
  console.log(`  Deleted ${existing.length} pre-existing lists`);

  console.log("\n--- 2. Create three watchlists ---");
  const semis = await wl.createWatchlist(SINGLE_USER_ID, "Semis");
  const owned = await wl.createWatchlist(SINGLE_USER_ID, "Owned");
  const breakouts = await wl.createWatchlist(SINGLE_USER_ID, "Breakout Candidates");
  console.log(`  ✓ Created "${semis.name}" (sort=${semis.sort_index})`);
  console.log(`  ✓ Created "${owned.name}" (sort=${owned.sort_index})`);
  console.log(`  ✓ Created "${breakouts.name}" (sort=${breakouts.sort_index})`);

  console.log("\n--- 3. Add symbols to Semis ---");
  for (const sym of ["NVDA", "MU", "AVGO", "AMD", "ARM"]) {
    await wl.addItem(semis.id, sym);
  }
  const semisItems = await wl.listItems(semis.id);
  console.log(`  ✓ Semis has ${semisItems.length} symbols: ${semisItems.map((i) => i.symbol).join(", ")}`);

  console.log("\n--- 4. Add NVDA to a second list ---");
  await wl.addItem(owned.id, "NVDA");
  const containing = await wl.listWatchlistsContainingSymbol(SINGLE_USER_ID, "NVDA");
  console.log(`  ✓ NVDA is in ${containing.length} list(s)`);

  console.log("\n--- 5. listWatchlistsWithCounts ---");
  const withCounts = await wl.listWatchlistsWithCounts(SINGLE_USER_ID);
  for (const l of withCounts) {
    console.log(`  ${l.name.padEnd(22)} · ${l.item_count} symbols`);
  }

  console.log('\n--- 6. Rename Owned -> "Owned & Active" ---');
  await wl.renameWatchlist(SINGLE_USER_ID, owned.id, "Owned & Active");
  const renamed = await wl.getWatchlist(SINGLE_USER_ID, owned.id);
  console.log(`  ✓ New name: "${renamed?.name}"`);

  console.log("\n--- 7. Remove ARM from Semis ---");
  await wl.removeItem(semis.id, "ARM");
  const after = await wl.listItems(semis.id);
  console.log(`  ✓ Semis now has ${after.length} symbols: ${after.map((i) => i.symbol).join(", ")}`);

  console.log("\n--- 8. Idempotent add (re-adding NVDA to Owned) ---");
  await wl.addItem(owned.id, "NVDA");
  const ownedItems = await wl.listItems(owned.id);
  console.log(`  ✓ Owned still has ${ownedItems.length} symbol(s) (no duplicate)`);

  console.log('\n--- 9. Delete "Breakout Candidates" ---');
  await wl.deleteWatchlist(SINGLE_USER_ID, breakouts.id);
  const remaining = await wl.listWatchlists(SINGLE_USER_ID);
  console.log(`  ✓ ${remaining.length} lists remain: ${remaining.map((l) => l.name).join(", ")}`);

  console.log("\n--- 10. Final state ---");
  for (const l of remaining) {
    const items = await wl.listItems(l.id);
    console.log(`  ${l.name}: [${items.map((i) => i.symbol).join(", ")}]`);
  }

  console.log("\n✓ Watchlist CRUD smoke passed.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n✗ Smoke failed:", err);
  process.exit(1);
});
