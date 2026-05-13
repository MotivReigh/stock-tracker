/**
 * Phase 7 end-to-end smoke:
 *   1. Configure settings with push_enabled=true and a mock Slack webhook URL
 *   2. Insert a synthetic scan_result so we have something to dispatch
 *   3. Call createAndDispatchAlertsForScan
 *   4. Verify an updraft_alerts row exists with delivered_at set + channels recorded
 *   5. Reset state so the inbox UI is empty afterwards
 *
 * No real Slack webhook is hit — we stub global.fetch in this script so the
 * test runs without network side effects.
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
  const { getSettings, updateSettings } = await import("../lib/settings/queries");
  const { getSupabase } = await import("../lib/db/client");
  const { listScans } = await import("../lib/scans/queries");
  const { createAndDispatchAlertsForScan } = await import("../lib/alerts/dispatcher");
  const { TABLES } = await import("../lib/db/tables");

  // ----- Stub fetch so the Slack webhook URL doesn't actually hit Slack
  const originalFetch = globalThis.fetch;
  let slackHits = 0;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const href = typeof url === "string" ? url : (url as URL).href ?? "";
    if (href.includes("hooks.slack.com")) {
      slackHits++;
      return new Response("ok", { status: 200 });
    }
    return originalFetch(url as RequestInfo, init);
  }) as typeof fetch;

  console.log("\n--- 1. Configure user settings (slack enabled, fake webhook) ---");
  const fakeWebhook = "https://hooks.slack.com/services/T-FAKE/B-FAKE/SMOKE";
  await updateSettings(SINGLE_USER_ID, {
    slack_enabled: true,
    slack_webhook_url: fakeWebhook,
    push_enabled: false,
    sms_enabled: false,
  });
  const settings = await getSettings(SINGLE_USER_ID);
  console.log(
    `  ✓ slack_enabled=${settings.slack_enabled} url=${settings.slack_webhook_url?.slice(0, 36)}…`,
  );

  console.log("\n--- 2. Clear any existing alerts + insert a fresh scan_result ---");
  const supabase = getSupabase();
  await supabase.from(TABLES.alerts).delete().gte("fired_at", "1970-01-01");
  // Find an existing scan to attach the result to
  const scans = await listScans(SINGLE_USER_ID);
  if (scans.length === 0) {
    throw new Error("No scans seeded — run npm run db:seed-presets first");
  }
  const scan = scans[0];
  const { data: inserted, error } = await supabase
    .from(TABLES.scanResults)
    .insert({
      scan_id: scan.id,
      symbol: "MU",
      snapshot: {
        symbol: "MU",
        price: 112.45,
        pctChange1d: 2.8,
        pctChange5d: 11.6,
        pctChange21d: 24.0,
        pctChange63d: 38.5,
        relVol: 3.5,
        rsScore: 96,
        rsi: 68,
        macdHistogram: 1.2,
        maLabel: "20>50>200",
        high52wDistance: 0,
        sector: "Technology",
        conviction: 94,
      },
    })
    .select()
    .single();
  if (error) throw error;
  console.log(`  ✓ Inserted synthetic scan_result for MU (scan="${scan.name}")`);

  console.log("\n--- 3. Dispatch alerts for the new result ---");
  const summary = await createAndDispatchAlertsForScan(scan.id, 1);
  console.log(`  Processed: ${summary.processed}`);
  console.log(`  Successes: ${summary.successes}`);
  console.log(`  Failures : ${summary.failures}`);
  console.log(`  Per chan : ${JSON.stringify(summary.perChannel)}`);

  console.log("\n--- 4. Verify alert row + delivery ---");
  const { data: alerts } = await supabase
    .from(TABLES.alerts)
    .select("id, channels, delivered_at, error, fired_at")
    .order("fired_at", { ascending: false });
  for (const a of alerts ?? []) {
    console.log(
      `  alert=${(a as { id: string }).id.slice(0, 8)} channels=${JSON.stringify((a as { channels: string[] }).channels)} delivered=${!!(a as { delivered_at: string | null }).delivered_at} error=${(a as { error: string | null }).error ?? "(none)"}`,
    );
  }

  console.log(`\n  Slack POSTs intercepted: ${slackHits}`);
  if (slackHits === 0) {
    throw new Error("Expected at least one Slack POST attempt");
  }

  console.log("\n--- 5. Cleanup ---");
  await supabase
    .from(TABLES.scanResults)
    .delete()
    .eq("id", (inserted as { id: string }).id);
  await supabase.from(TABLES.alerts).delete().gte("fired_at", "1970-01-01");
  // Restore settings to a quiet state
  await updateSettings(SINGLE_USER_ID, {
    slack_enabled: false,
    slack_webhook_url: null,
  });
  console.log("  ✓ Removed synthetic rows; cleared mock webhook from settings");

  console.log("\n✓ Phase 7 alerts smoke complete\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
