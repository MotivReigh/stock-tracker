/**
 * Daily-bars data layer.
 *
 * Bars live in updraft_daily_bars (composite PK on symbol + date) and are
 * populated by lib/bars/refresh.ts via the candle-provider chain.
 *
 * The scan engine reads bars from here at run time; the stock detail page
 * uses lib/stock/data.ts which keeps its own Redis cache of recent bars.
 */
import { getSupabase } from "@/lib/db/client";
import { TABLES } from "@/lib/db/tables";
import type { Bar } from "@/lib/scans/signals";

export type BarRow = {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function rowToBar(r: BarRow): Bar {
  return {
    date: r.date,
    time: Math.floor(new Date(r.date + "T00:00:00Z").getTime() / 1000),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  };
}

/** Last `lookbackDays` of bars for one symbol, oldest first. */
export async function getBars(symbol: string, lookbackDays: number = 365): Promise<Bar[]> {
  const supabase = getSupabase();
  const sym = symbol.toUpperCase();
  const cutoff = new Date(Date.now() - lookbackDays * 86_400_000)
    .toISOString()
    .slice(0, 10);

  // Supabase default row limit is 1000 — explicitly raise so we can fetch 5y.
  const { data, error } = await supabase
    .from(TABLES.dailyBars)
    .select("*")
    .eq("symbol", sym)
    .gte("date", cutoff)
    .order("date", { ascending: true })
    .limit(2000);
  if (error) throw new Error(`getBars(${sym}): ${error.message}`);
  return (data ?? []).map(rowToBar);
}

/** Bulk fetch for the scan runner. Returns Map<symbol, Bar[]>. */
export async function getBarsForSymbols(
  symbols: string[],
  lookbackDays: number = 365,
): Promise<Map<string, Bar[]>> {
  const out = new Map<string, Bar[]>();
  if (symbols.length === 0) return out;

  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - lookbackDays * 86_400_000)
    .toISOString()
    .slice(0, 10);

  // Chunk to keep `in()` lists reasonable.
  const CHUNK = 50;
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const chunk = symbols.slice(i, i + CHUNK).map((s) => s.toUpperCase());
    const { data, error } = await supabase
      .from(TABLES.dailyBars)
      .select("*")
      .in("symbol", chunk)
      .gte("date", cutoff)
      .order("date", { ascending: true })
      .limit(50000);
    if (error) throw new Error(`getBarsForSymbols: ${error.message}`);
    for (const row of data ?? []) {
      const bar = rowToBar(row as BarRow);
      const sym = (row as BarRow).symbol;
      const arr = out.get(sym) ?? [];
      arr.push(bar);
      out.set(sym, arr);
    }
  }
  return out;
}

/** True if we have at least one bar for the given symbol. */
export async function hasBars(symbol: string): Promise<boolean> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(TABLES.dailyBars)
    .select("symbol", { count: "exact", head: true })
    .eq("symbol", symbol.toUpperCase());
  if (error) throw new Error(`hasBars: ${error.message}`);
  return (count ?? 0) > 0;
}

/** Used by the dashboard "needs bars" banner. */
export async function countSymbolsWithBars(): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.dailyBars)
    .select("symbol")
    .limit(20000);
  if (error) throw new Error(`countSymbolsWithBars: ${error.message}`);
  const set = new Set<string>();
  for (const r of data ?? []) set.add((r as { symbol: string }).symbol);
  return set.size;
}

/** Upsert a batch of bars. Used by the refresh job. */
export async function upsertBars(rows: BarRow[]): Promise<void> {
  if (rows.length === 0) return;
  const supabase = getSupabase();
  // Supabase upsert with composite PK works via onConflict listing both cols.
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK).map((r) => ({
      symbol: r.symbol.toUpperCase(),
      date: r.date,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    }));
    const { error } = await supabase
      .from(TABLES.dailyBars)
      .upsert(batch, { onConflict: "symbol,date" });
    if (error) throw new Error(`upsertBars: ${error.message}`);
  }
}
