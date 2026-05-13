/**
 * Alert dispatcher: pulls undelivered alerts, fans them out across the
 * channels recorded on each row, and writes back delivered_at / error.
 *
 * Resilience contract (from CUJ 4):
 *   - A failed channel does not block the other channels for that alert.
 *   - The alert is considered "delivered" if AT LEAST ONE channel succeeded.
 *     If all configured channels fail, delivered_at is still set (so we don't
 *     retry forever) but `error` records the failure for the inbox UI.
 *
 * Wiring: called by both /api/cron/dispatch-alerts (every minute in prod) and
 * by /api/cron/run-scans immediately after new results are inserted, so a
 * fresh-from-the-engine result fans out without waiting for the next cron tick.
 */
import { getCurrentUserId } from "@/lib/auth/user";
import { getSettings } from "@/lib/settings/queries";
import { getScan, listLatestResults } from "@/lib/scans/queries";
import { getSupabase } from "@/lib/db/client";
import { TABLES } from "@/lib/db/tables";
import {
  listUndeliveredAlerts,
  markAlertDelivered,
  stageOf,
} from "./queries";
import { sendSlackAlert } from "./slack";
import { sendPushAlert } from "./push";
import { sendSmsAlert } from "./sms";
import type { AlertChannel, AlertPayload, SendResult } from "./types";

export type DispatchSummary = {
  processed: number;
  successes: number;
  failures: number;
  perChannel: Record<AlertChannel, { ok: number; err: number }>;
  errors: Array<{ alertId: string; error: string }>;
};

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

/**
 * Snapshot the user's currently-enabled channels. Used by run-scans to record
 * which channels each fresh alert should fan out to.
 */
export function enabledChannels(settings: {
  push_enabled: boolean;
  slack_enabled: boolean;
  sms_enabled: boolean;
  slack_webhook_url: string | null;
}): AlertChannel[] {
  const out: AlertChannel[] = [];
  if (settings.push_enabled) out.push("push");
  if (settings.slack_enabled && settings.slack_webhook_url) out.push("slack");
  if (settings.sms_enabled) out.push("sms");
  return out;
}

async function dispatchOne(
  userId: string,
  alertId: string,
  scanResultId: string,
  channels: AlertChannel[],
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = getSupabase();

  // Look up the scan_result and parent scan in one round-trip.
  const { data: sr } = await supabase
    .from(TABLES.scanResults)
    .select("id, scan_id, symbol, snapshot, triggered_at")
    .eq("id", scanResultId)
    .maybeSingle();
  if (!sr) {
    return { ok: false, error: "scan_result not found" };
  }
  const scan = await getScan(userId, sr.scan_id);
  if (!scan) {
    return { ok: false, error: "parent scan not found" };
  }

  const payload: AlertPayload = {
    scanId: scan.id,
    scanName: scan.name,
    scanResultId: sr.id,
    symbol: sr.symbol,
    snapshot: sr.snapshot,
    stage: stageOf(scan.preset_key),
    stockUrl: `${appUrl()}/stock/${sr.symbol}`,
  };

  const settings = await getSettings(userId);

  // Run all channels in parallel; collect results.
  const results = await Promise.all<SendResult>(
    channels.map(async (ch) => {
      try {
        if (ch === "slack") {
          return await sendSlackAlert(settings.slack_webhook_url ?? "", payload);
        }
        if (ch === "push") {
          return await sendPushAlert(userId, payload);
        }
        if (ch === "sms") {
          return await sendSmsAlert(null, payload);
        }
        return { ok: false, channel: ch, error: `Unknown channel: ${ch}` };
      } catch (err) {
        return { ok: false, channel: ch, error: (err as Error).message };
      }
    }),
  );

  const anyOk = results.some((r) => r.ok);
  const errs = results
    .filter((r): r is Extract<SendResult, { ok: false }> => !r.ok)
    .map((r) => `${r.channel}: ${r.error}`);

  return {
    ok: anyOk,
    error: errs.length > 0 ? errs.join(" · ") : null,
  };
}

/**
 * Process the next batch of undelivered alerts. Idempotent — re-running is
 * safe (delivered_at gates duplicate sends).
 */
export async function dispatchPending(
  limit: number = 50,
): Promise<DispatchSummary> {
  const summary: DispatchSummary = {
    processed: 0,
    successes: 0,
    failures: 0,
    perChannel: {
      push: { ok: 0, err: 0 },
      slack: { ok: 0, err: 0 },
      sms: { ok: 0, err: 0 },
    },
    errors: [],
  };

  const pending = await listUndeliveredAlerts(limit);
  if (pending.length === 0) return summary;

  const userId = getCurrentUserId();

  for (const alert of pending) {
    summary.processed++;
    const r = await dispatchOne(userId, alert.id, alert.scan_result_id, alert.channels);
    if (r.ok) summary.successes++;
    else summary.failures++;
    if (r.error) summary.errors.push({ alertId: alert.id, error: r.error });

    // Per-channel tally derived from the error string (best-effort).
    for (const ch of alert.channels) {
      const failed = r.error?.includes(`${ch}:`) ?? false;
      if (failed) summary.perChannel[ch].err++;
      else summary.perChannel[ch].ok++;
    }

    await markAlertDelivered(alert.id, r.error);
  }
  return summary;
}

/**
 * Called by run-scans right after inserting fresh scan_results — creates one
 * alert row per result with the user's currently-enabled channels and then
 * immediately dispatches them. Reads the most-recent N results for the scan
 * (we just inserted them) and creates alerts for any that don't already have one.
 */
export async function createAndDispatchAlertsForScan(
  scanId: string,
  insertedCount: number,
): Promise<DispatchSummary> {
  const empty: DispatchSummary = {
    processed: 0,
    successes: 0,
    failures: 0,
    perChannel: {
      push: { ok: 0, err: 0 },
      slack: { ok: 0, err: 0 },
      sms: { ok: 0, err: 0 },
    },
    errors: [],
  };
  if (insertedCount === 0) return empty;

  const userId = getCurrentUserId();
  const settings = await getSettings(userId);
  const channels = enabledChannels(settings);
  if (channels.length === 0) return empty;

  // Pick up the rows we just inserted (most recent N for this scan).
  const recent = await listLatestResults(scanId, insertedCount);
  const supabase = getSupabase();

  const newAlertIds: string[] = [];
  for (const r of recent) {
    // Skip if an alert already exists for this result.
    const { data: existing } = await supabase
      .from(TABLES.alerts)
      .select("id")
      .eq("scan_result_id", r.id)
      .maybeSingle();
    if (existing) continue;

    const { data: inserted, error } = await supabase
      .from(TABLES.alerts)
      .insert({ scan_result_id: r.id, channels })
      .select("id")
      .single();
    if (error || !inserted) continue;
    newAlertIds.push((inserted as { id: string }).id);
  }

  if (newAlertIds.length === 0) return empty;
  return dispatchPending(newAlertIds.length);
}
