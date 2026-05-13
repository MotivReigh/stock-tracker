/**
 * Universe (set of scannable symbols) queries.
 *
 * Populated by scripts/seed-universe.ts and refreshed by the weekly cron
 * (Phase 6+). Used for autocomplete in watchlist/scan UIs and as the symbol
 * set the scan runner iterates over.
 */
import { getSupabase } from "@/lib/db/client";
import { TABLES } from "@/lib/db/tables";

export type UniverseRow = {
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;
  market_cap: number | null;
  enabled: boolean;
  last_refreshed: string;
};

export async function listUniverse(): Promise<UniverseRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.universe)
    .select("*")
    .eq("enabled", true)
    .order("symbol", { ascending: true });
  if (error) throw new Error(`listUniverse: ${error.message}`);
  return (data ?? []) as UniverseRow[];
}

export async function getUniverseRow(
  symbol: string,
): Promise<UniverseRow | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from(TABLES.universe)
    .select("*")
    .eq("symbol", symbol.toUpperCase())
    .maybeSingle();
  return (data as UniverseRow) ?? null;
}
