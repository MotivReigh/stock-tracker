import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { NoteRow } from "@/components/journal/note-row";
import { JournalFilters } from "@/components/journal/journal-filters";
import { getCurrentUserId } from "@/lib/auth/user";
import {
  listAllNotes,
  listSymbolsWithNotes,
} from "@/lib/journal/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string; q?: string }>;
}) {
  const params = await searchParams;
  const userId = getCurrentUserId();
  const [notes, symbols] = await Promise.all([
    listAllNotes(userId, {
      symbol: params.symbol,
      query: params.q,
    }),
    listSymbolsWithNotes(userId),
  ]);

  const activeSymbol = params.symbol?.toUpperCase();
  const totalNotes = symbols.reduce((s, x) => s + x.count, 0);

  return (
    <Shell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
        <header>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            Phase 8 · Journal
          </div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BookOpenText className="h-6 w-6 text-terminal-600 dark:text-terminal-400" />
            Trade journal
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            {totalNotes === 0
              ? "Capture entry rationale, levels to watch, exit plans, and observations as you trade. Add notes from any stock page."
              : `${totalNotes} note${totalNotes === 1 ? "" : "s"} across ${symbols.length} ticker${symbols.length === 1 ? "" : "s"}.`}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
          {/* Sidebar: per-symbol counts */}
          <aside className="space-y-3">
            <JournalFilters />

            <div className="border border-app rounded-md bg-panel overflow-hidden">
              <div className="px-3 py-2 border-b border-app bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider font-semibold text-muted">
                By symbol
              </div>
              <ul className="text-sm">
                <li>
                  <Link
                    href={
                      params.q
                        ? `/journal?q=${encodeURIComponent(params.q)}`
                        : "/journal"
                    }
                    className={cn(
                      "flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      !activeSymbol && "bg-terminal-50 dark:bg-terminal-900/30 font-medium",
                    )}
                  >
                    <span>All tickers</span>
                    <span className="font-mono text-xs text-muted">
                      {totalNotes}
                    </span>
                  </Link>
                </li>
                {symbols.map((s) => (
                  <li key={s.symbol}>
                    <Link
                      href={`/journal?symbol=${s.symbol}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800",
                        activeSymbol === s.symbol &&
                          "bg-terminal-50 dark:bg-terminal-900/30 font-medium",
                      )}
                    >
                      <span className="font-mono">{s.symbol}</span>
                      <span className="font-mono text-xs text-muted">
                        {s.count}
                      </span>
                    </Link>
                  </li>
                ))}
                {symbols.length === 0 && (
                  <li className="px-3 py-4 text-center text-xs text-muted">
                    No notes yet.
                  </li>
                )}
              </ul>
            </div>
          </aside>

          {/* Main: notes list */}
          <main>
            {(activeSymbol || params.q) && (
              <div className="mb-3 flex items-center gap-2 text-xs text-muted">
                <span>Filtered:</span>
                {activeSymbol && (
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {activeSymbol}
                  </span>
                )}
                {params.q && (
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    &ldquo;{params.q}&rdquo;
                  </span>
                )}
                <Link
                  href="/journal"
                  className="ml-auto text-terminal-700 dark:text-terminal-400 hover:underline"
                >
                  Clear
                </Link>
              </div>
            )}

            {notes.length === 0 ? (
              <div className="border border-app rounded-md bg-panel px-6 py-12 text-center">
                <BookOpenText className="h-6 w-6 mx-auto text-muted mb-2" />
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {totalNotes === 0
                    ? "No notes yet"
                    : "No notes match this filter"}
                </p>
                <p className="text-xs text-muted mt-1">
                  {totalNotes === 0
                    ? "Open a stock and add your first note from the journal panel."
                    : "Try clearing the filter or changing your search query."}
                </p>
              </div>
            ) : (
              <ul className="border border-app rounded-md bg-panel divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {notes.map((n) => (
                  <NoteRow key={n.id} note={n} showSymbol={!activeSymbol} />
                ))}
              </ul>
            )}
          </main>
        </div>
      </div>
    </Shell>
  );
}
