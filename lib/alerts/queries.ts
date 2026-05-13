/**
 * updraft_alerts CRUD + joined-fetch helpers for the inbox UI.
 */
import { getSupabase } from "@/lib/db/client";
import { TABLES } from "@/lib/db/tables";
import type { AlertRow, AlertChannel } from "./types";
import type { ScanRow, ScanResultRow } from "@/lib/scans/queries";

export type AlertWithContext = AlertRow & {
  scanResult: ScanResultRow;
  scan: Pick<ScanRow, "id" | "name" | "preset_key" | "type">;
};

/** Insert one alert row per scan_result, with the user's currently-enabled channels. */
export async function createAlertForResult(
  scanResultId: string,
  channels: AlertChannel[],
): Promise<void> {
  if (channels.length === 0) return;
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLES.alerts)
    .insert({
      scan_result_id: scanResultId,
      channels,
    });
  if (error) throw new Error(`createAlertForResult: ${error.message}`);
}

/** Alerts that haven't been dispatched yet. Ordered oldest-first for FIFO. */
export async function listUndeliveredAlerts(
  limit: number = 100,
): Promise<AlertRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.alerts)
    .select("*")
    .is("delivered_at", null)
    .order("fired_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`listUndeliveredAlerts: ${error.message}`);
  return (data ?? []) as AlertRow[];
}

export async function markAlertDelivered(
  alertId: string,
  error: string | null,
): Promise<void> {
  const supabase = getSupabase();
  const { error: updateErr } = await supabase
    .from(TABLES.alerts)
    .update({
      delivered_at: new Date().toISOString(),
      error,
    })
    .eq("id", alertId);
  if (updateErr) throw new Error(`markAlertDelivered: ${updateErr.message}`);
}

/** Recent alerts joined with their scan + scan_result for the inbox UI. */
export async function listRecentAlerts(
  userId: string,
  limit: number = 50,
): Promise<AlertWithContext[]> {
  const supabase = getSupabase();

  // 1. user's scan ids
  const { data: scans } = await supabase
    .from(TABLES.scans)
    .select("id, name, preset_key, type")
    .eq("user_id", userId);
  if (!scans || scans.length === 0) return [];
  const scanById = new Map(scans.map((s) => [s.id, s]));

  // 2. recent results for those scans
  const { data: results } = await supabase
    .from(TABLES.scanResults)
    .select("*")
    .in(
      "scan_id",
      scans.map((s) => s.id),
    )
    .order("triggered_at", { ascending: false })
    .limit(limit * 2);
  if (!results || results.length === 0) return [];
  const resultById = new Map(results.map((r) => [r.id, r]));

  // 3. alerts for those results
  const { data: alerts } = await supabase
    .from(TABLES.alerts)
    .select("*")
    .in(
      "scan_result_id",
      results.map((r) => r.id),
    )
    .order("fired_at", { ascending: false })
    .limit(limit);
  if (!alerts) return [];

  const out: AlertWithContext[] = [];
  for (const a of alerts) {
    const sr = resultById.get((a as AlertRow).scan_result_id);
    if (!sr) continue;
    const s = scanById.get(
      (sr as { scan_id: string }).scan_id,
    ) as AlertWithContext["scan"] | undefined;
    if (!s) continue;
    out.push({
      ...(a as AlertRow),
      scanResult: sr as ScanResultRow,
      scan: s,
    });
  }
  return out;
}

/** Inferred stage from preset_key for icon/color rendering. */
export function stageOf(presetKey: string | null): string {
  if (!presetKey) return "momentum";
  if (presetKey.startsWith("pre-")) return "pre-breakout";
  if (presetKey.startsWith("break-")) return "just-broke-out";
  if (presetKey.startsWith("trend-")) return "established-trend";
  return "momentum";
}
