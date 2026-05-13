/**
 * Journal notes data layer. Notes live in updraft_journal_notes with composite
 * index on (user_id, symbol, created_at desc) — see migration 0001.
 *
 * Markdown body is stored as raw text; rendering is done at display time
 * (currently plain text with preserved whitespace; a real markdown renderer
 * can swap in later without touching this layer).
 */
import { getSupabase } from "@/lib/db/client";
import { TABLES } from "@/lib/db/tables";

export type JournalNote = {
  id: string;
  user_id: string;
  symbol: string;
  body: string;
  created_at: string;
  updated_at: string;
};

/** Counts of notes per symbol — used by the global page sidebar. */
export type SymbolCount = {
  symbol: string;
  count: number;
  last_updated: string;
};

export async function listNotesForSymbol(
  userId: string,
  symbol: string,
): Promise<JournalNote[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.journalNotes)
    .select("*")
    .eq("user_id", userId)
    .eq("symbol", symbol.toUpperCase())
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listNotesForSymbol: ${error.message}`);
  return (data ?? []) as JournalNote[];
}

export async function listAllNotes(
  userId: string,
  opts: { symbol?: string; query?: string; limit?: number } = {},
): Promise<JournalNote[]> {
  const supabase = getSupabase();
  let q = supabase
    .from(TABLES.journalNotes)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);

  if (opts.symbol) {
    q = q.eq("symbol", opts.symbol.toUpperCase());
  }
  if (opts.query && opts.query.trim().length > 0) {
    // Case-insensitive partial match. Supabase escapes special chars for us.
    q = q.ilike("body", `%${opts.query.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(`listAllNotes: ${error.message}`);
  return (data ?? []) as JournalNote[];
}

export async function getNote(
  userId: string,
  id: string,
): Promise<JournalNote | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from(TABLES.journalNotes)
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  return (data as JournalNote) ?? null;
}

export async function createNote(
  userId: string,
  symbol: string,
  body: string,
): Promise<JournalNote> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.journalNotes)
    .insert({
      user_id: userId,
      symbol: symbol.toUpperCase(),
      body,
    })
    .select()
    .single();
  if (error) throw new Error(`createNote: ${error.message}`);
  return data as JournalNote;
}

export async function updateNote(
  userId: string,
  id: string,
  body: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLES.journalNotes)
    .update({ body, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`updateNote: ${error.message}`);
}

export async function deleteNote(
  userId: string,
  id: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLES.journalNotes)
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(`deleteNote: ${error.message}`);
}

/**
 * Per-symbol counts, ordered by most-recently-updated first. Used by the
 * global page sidebar so the user can filter to a single ticker's notes.
 */
export async function listSymbolsWithNotes(
  userId: string,
): Promise<SymbolCount[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLES.journalNotes)
    .select("symbol, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`listSymbolsWithNotes: ${error.message}`);
  const map = new Map<string, SymbolCount>();
  for (const row of (data ?? []) as { symbol: string; updated_at: string }[]) {
    const existing = map.get(row.symbol);
    if (existing) {
      existing.count++;
    } else {
      map.set(row.symbol, {
        symbol: row.symbol,
        count: 1,
        last_updated: row.updated_at,
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime(),
  );
}
