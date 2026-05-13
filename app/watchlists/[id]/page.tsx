import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { AddSymbolForm } from "@/components/watchlists/add-symbol-form";
import { ItemsTable, type ItemQuote } from "@/components/watchlists/items-table";
import { RenameWatchlistForm } from "@/components/watchlists/rename-form";
import { DeleteWatchlistForm } from "@/components/watchlists/delete-form";
import { getCurrentUserId } from "@/lib/auth/user";
import { getWatchlist, listItems } from "@/lib/watchlists/queries";
import { listUniverse } from "@/lib/universe/queries";
import { getCachedQuote } from "@/lib/cache/quoteCache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WatchlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = getCurrentUserId();

  const [list, items, universe] = await Promise.all([
    getWatchlist(userId, id),
    listItems(id),
    listUniverse(),
  ]);

  if (!list) notFound();

  // Fetch quotes for each item in parallel through the cache chain.
  const rows: ItemQuote[] = await Promise.all(
    items.map(async (it): Promise<ItemQuote> => {
      try {
        const r = await getCachedQuote(it.symbol);
        return { symbol: it.symbol, quote: r.quote, source: r.source };
      } catch {
        return { symbol: it.symbol, quote: null };
      }
    }),
  );

  return (
    <Shell>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        <Link
          href="/watchlists"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3 w-3" />
          All watchlists
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
              Watchlist
            </div>
            <h1 className="text-2xl font-semibold">{list.name}</h1>
            <div className="mt-1.5 flex items-center gap-3">
              <RenameWatchlistForm id={list.id} currentName={list.name} />
            </div>
          </div>
          <DeleteWatchlistForm id={list.id} name={list.name} variant="full" />
        </header>

        <section className="border border-app rounded-md bg-panel p-4">
          <h2 className="text-sm font-semibold mb-2">Add symbol</h2>
          <p className="text-xs text-muted mb-3">
            Start typing to autocomplete from the $2B+ universe ({universe.length}{" "}
            symbols). Symbols outside the universe also work — we verify them
            with Finnhub before saving.
          </p>
          <AddSymbolForm watchlistId={list.id} universe={universe} />
        </section>

        <ItemsTable watchlistId={list.id} rows={rows} />
      </div>
    </Shell>
  );
}
