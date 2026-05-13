/**
 * Watchlist database queries.
 *
 * All functions take user_id explicitly so this module remains pure-data with
 * no session knowledge. The route layer resolves the user via getCurrentUserId().
 */
import { getSupabase } from "@/lib/db/client";
import { TABLES } from "@/lib/db/tables";

export type Watchlist = {
  id: string;
  user_id: string;
  name: string;
  sort_index: number;
  created_at: string;
};

export type WatchlistItem = {
  watchlist_id: string;
  symbol: string;
  added_at: string;
};

export type WatchlistWithCount = Watchlist & { item_count: number };

/** All watchlists for a user, ordered by display order then creation. */
export async function listWatchlists(userId: string): Promise<Watchlist[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.watchlists)
    .select("*")
    .eq("user_id", userId)
    .order("sort_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listWatchlists: ${error.message}`);
  return (data ?? []) as Watchlist[];
}

/** Same as listWatchlists but also includes the item count per list. */
export async function listWatchlistsWithCounts(
  userId: string,
): Promise<WatchlistWithCount[]> {
  const lists = await listWatchlists(userId);
  if (lists.length === 0) return [];
  const supabase = getSupabase();
  const { data } = await supabase
    .from(TABLES.watchlistItems)
    .select("watchlist_id")
    .in(
      "watchlist_id",
      lists.map((l) => l.id),
    );
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.watchlist_id, (counts.get(row.watchlist_id) ?? 0) + 1);
  }
  return lists.map((l) => ({ ...l, item_count: counts.get(l.id) ?? 0 }));
}

export async function getWatchlist(
  userId: string,
  id: string,
): Promise<Watchlist | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from(TABLES.watchlists)
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  return data as Watchlist | null;
}

export async function listItems(watchlistId: string): Promise<WatchlistItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.watchlistItems)
    .select("*")
    .eq("watchlist_id", watchlistId)
    .order("added_at", { ascending: true });
  if (error) throw new Error(`listItems: ${error.message}`);
  return (data ?? []) as WatchlistItem[];
}

export async function createWatchlist(
  userId: string,
  name: string,
): Promise<Watchlist> {
  const supabase = getSupabase();
  // Next sort_index = max + 1 so new lists land at the bottom.
  const { data: maxRow } = await supabase
    .from(TABLES.watchlists)
    .select("sort_index")
    .eq("user_id", userId)
    .order("sort_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = ((maxRow?.sort_index as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from(TABLES.watchlists)
    .insert({ user_id: userId, name, sort_index: nextSort })
    .select()
    .single();
  if (error) throw new Error(`createWatchlist: ${error.message}`);
  return data as Watchlist;
}

export async function renameWatchlist(
  userId: string,
  id: string,
  name: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLES.watchlists)
    .update({ name })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`renameWatchlist: ${error.message}`);
}

export async function deleteWatchlist(
  userId: string,
  id: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLES.watchlists)
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`deleteWatchlist: ${error.message}`);
}

/** Adds a symbol to a list. Idempotent — re-adding the same symbol no-ops. */
export async function addItem(
  watchlistId: string,
  symbol: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLES.watchlistItems)
    .upsert(
      { watchlist_id: watchlistId, symbol: symbol.toUpperCase() },
      { onConflict: "watchlist_id,symbol", ignoreDuplicates: true },
    );
  if (error) throw new Error(`addItem: ${error.message}`);
}

export async function removeItem(
  watchlistId: string,
  symbol: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLES.watchlistItems)
    .delete()
    .eq("watchlist_id", watchlistId)
    .eq("symbol", symbol.toUpperCase());
  if (error) throw new Error(`removeItem: ${error.message}`);
}

/** Used by the "Add to watchlist" affordance on the stock detail page. */
export async function listWatchlistsContainingSymbol(
  userId: string,
  symbol: string,
): Promise<string[]> {
  const supabase = getSupabase();
  const lists = await listWatchlists(userId);
  if (lists.length === 0) return [];
  const { data } = await supabase
    .from(TABLES.watchlistItems)
    .select("watchlist_id")
    .eq("symbol", symbol.toUpperCase())
    .in(
      "watchlist_id",
      lists.map((l) => l.id),
    );
  return (data ?? []).map((r) => r.watchlist_id as string);
}
