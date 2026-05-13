import { Star } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { CreateWatchlistForm } from "@/components/watchlists/create-form";
import { WatchlistCard } from "@/components/watchlists/watchlist-card";
import { getCurrentUserId } from "@/lib/auth/user";
import { listWatchlistsWithCounts } from "@/lib/watchlists/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WatchlistsPage() {
  const userId = getCurrentUserId();
  const lists = await listWatchlistsWithCounts(userId);

  return (
    <Shell>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <header>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
            Phase 5 · Watchlists
          </div>
          <h1 className="text-2xl font-semibold">My watchlists</h1>
          <p className="text-sm text-muted mt-1">
            Create unlimited named lists (Semis, Owned, Pre-Breakout candidates,
            etc.). Each list shows live quotes and feeds the dashboard preview
            panel.
          </p>
        </header>

        <section className="border border-app rounded-md bg-panel p-4">
          <h2 className="text-sm font-semibold mb-3">New list</h2>
          <CreateWatchlistForm />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            Your lists
            <span className="text-xs text-muted font-normal">
              {lists.length === 0 ? "" : `(${lists.length})`}
            </span>
          </h2>
          {lists.length === 0 ? (
            <div className="border border-app rounded-md bg-panel px-6 py-12 text-center">
              <Star className="h-6 w-6 mx-auto text-amber-500 mb-2" />
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                No watchlists yet
              </p>
              <p className="text-xs text-muted mt-1">
                Create one above to start tracking groups of tickers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lists.map((list) => (
                <WatchlistCard key={list.id} list={list} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
