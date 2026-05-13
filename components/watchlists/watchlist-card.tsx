import Link from "next/link";
import { Star, ChevronRight } from "lucide-react";
import { DeleteWatchlistForm } from "./delete-form";
import { RenameWatchlistForm } from "./rename-form";
import type { WatchlistWithCount } from "@/lib/watchlists/queries";

export function WatchlistCard({ list }: { list: WatchlistWithCount }) {
  return (
    <div className="border border-app bg-panel rounded-md p-4 flex flex-col gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <Link
          href={`/watchlists/${list.id}`}
          className="flex items-start gap-2 min-w-0 group"
        >
          <Star className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold truncate group-hover:underline">
              {list.name}
            </div>
            <div className="text-xs text-muted mt-0.5">
              {list.item_count} symbol{list.item_count === 1 ? "" : "s"}
            </div>
          </div>
        </Link>
        <DeleteWatchlistForm id={list.id} name={list.name} />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <RenameWatchlistForm id={list.id} currentName={list.name} />
        <Link
          href={`/watchlists/${list.id}`}
          className="inline-flex items-center gap-1 text-terminal-700 dark:text-terminal-400 hover:underline font-medium"
        >
          Open
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
