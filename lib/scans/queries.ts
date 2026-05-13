/**
 * Scan + scan-result DB queries.
 *
 * Stored shape:
 *   updraft_scans          one row per scan (preset or custom)
 *   updraft_scan_results   one row per (scan, symbol, triggered_at)
 */
import { getSupabase } from "@/lib/db/client";
import { TABLES } from "@/lib/db/tables";
import type { ScanDefinition, ResultSnapshot } from "./types";

export type ScanRow = {
  id: string;
  user_id: string;
  name: string;
  type: "preset" | "custom";
  preset_key: string | null;
  definition: ScanDefinition;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ScanResultRow = {
  id: string;
  scan_id: string;
  symbol: string;
  triggered_at: string;
  snapshot: ResultSnapshot;
  seen_at: string | null;
};

export async function listScans(userId: string): Promise<ScanRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.scans)
    .select("*")
    .eq("user_id", userId)
    .order("type", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listScans: ${error.message}`);
  return (data ?? []) as ScanRow[];
}

export async function getScan(userId: string, id: string): Promise<ScanRow | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from(TABLES.scans)
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  return (data as ScanRow) ?? null;
}

export async function createCustomScan(
  userId: string,
  name: string,
  definition: ScanDefinition,
): Promise<ScanRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.scans)
    .insert({
      user_id: userId,
      name,
      type: "custom",
      preset_key: null,
      definition,
      enabled: true,
    })
    .select()
    .single();
  if (error) throw new Error(`createCustomScan: ${error.message}`);
  return data as ScanRow;
}

/**
 * Upsert without relying on the partial unique index (Postgres won't use a
 * partial index in an ON CONFLICT clause). Look up by (user_id, preset_key)
 * and either UPDATE the existing row or INSERT a new one.
 */
export async function upsertPresetScan(
  userId: string,
  preset: { key: string; name: string; definition: ScanDefinition },
): Promise<void> {
  const supabase = getSupabase();

  const { data: existing, error: selErr } = await supabase
    .from(TABLES.scans)
    .select("id")
    .eq("user_id", userId)
    .eq("preset_key", preset.key)
    .maybeSingle();
  if (selErr) throw new Error(`upsertPresetScan(${preset.key}): ${selErr.message}`);

  if (existing) {
    const { error } = await supabase
      .from(TABLES.scans)
      .update({
        name: preset.name,
        definition: preset.definition,
        enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (existing as { id: string }).id);
    if (error) throw new Error(`upsertPresetScan(${preset.key}): ${error.message}`);
  } else {
    const { error } = await supabase
      .from(TABLES.scans)
      .insert({
        user_id: userId,
        name: preset.name,
        type: "preset",
        preset_key: preset.key,
        definition: preset.definition,
        enabled: true,
      });
    if (error) throw new Error(`upsertPresetScan(${preset.key}): ${error.message}`);
  }
}

export async function updateScanDefinition(
  userId: string,
  id: string,
  patch: { name?: string; definition?: ScanDefinition; enabled?: boolean },
): Promise<void> {
  const supabase = getSupabase();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.definition !== undefined) update.definition = patch.definition;
  if (patch.enabled !== undefined) update.enabled = patch.enabled;
  const { error } = await supabase
    .from(TABLES.scans)
    .update(update)
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`updateScanDefinition: ${error.message}`);
}

export async function deleteScan(userId: string, id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLES.scans)
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`deleteScan: ${error.message}`);
}

/* ----------------------------- scan results ----------------------------- */

export async function listLatestResults(
  scanId: string,
  limit: number = 100,
): Promise<ScanResultRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.scanResults)
    .select("*")
    .eq("scan_id", scanId)
    .order("triggered_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listLatestResults: ${error.message}`);
  return (data ?? []) as ScanResultRow[];
}

/** All results across all scans triggered in the last `minutes` minutes. */
export async function listRecentResultsForUser(
  userId: string,
  minutes: number = 60 * 24,
  limit: number = 200,
): Promise<ScanResultRow[]> {
  const supabase = getSupabase();
  const scans = await listScans(userId);
  if (scans.length === 0) return [];
  const cutoff = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data, error } = await supabase
    .from(TABLES.scanResults)
    .select("*")
    .in("scan_id", scans.map((s) => s.id))
    .gte("triggered_at", cutoff)
    .order("triggered_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listRecentResultsForUser: ${error.message}`);
  return (data ?? []) as ScanResultRow[];
}

export async function insertResults(
  scanId: string,
  snapshots: ResultSnapshot[],
): Promise<number> {
  if (snapshots.length === 0) return 0;
  const supabase = getSupabase();
  const rows = snapshots.map((s) => ({
    scan_id: scanId,
    symbol: s.symbol,
    snapshot: s,
  }));
  const { error, count } = await supabase
    .from(TABLES.scanResults)
    .insert(rows, { count: "exact" });
  if (error) throw new Error(`insertResults: ${error.message}`);
  return count ?? snapshots.length;
}

export async function markResultSeen(resultId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLES.scanResults)
    .update({ seen_at: new Date().toISOString() })
    .eq("id", resultId);
  if (error) throw new Error(`markResultSeen: ${error.message}`);
}

/** Delete results older than `days` so the table doesn't grow unbounded. */
export async function pruneOldResults(days: number = 30): Promise<number> {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const { error, count } = await supabase
    .from(TABLES.scanResults)
    .delete({ count: "exact" })
    .lt("triggered_at", cutoff);
  if (error) throw new Error(`pruneOldResults: ${error.message}`);
  return count ?? 0;
}
