"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Star, Plus, Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleSymbolInWatchlistAction } from "@/app/watchlists/actions";

type WatchlistEntry = {
  id: string;
  name: string;
};

export function AddToWatchlistButton({
  symbol,
  watchlists,
  containingIds,
}: {
  symbol: string;
  watchlists: WatchlistEntry[];
  containingIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Set<string>>(
    () => new Set(containingIds),
  );
  const ref = useRef<HTMLDivElement>(null);

  // Sync with server state when it changes (after a successful action).
  useEffect(() => {
    setOptimistic(new Set(containingIds));
  }, [containingIds]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggle(listId: string, isMember: boolean) {
    // Optimistic toggle
    setOptimistic((prev) => {
      const next = new Set(prev);
      if (isMember) next.delete(listId);
      else next.add(listId);
      return next;
    });

    startTransition(async () => {
      const fd = new FormData();
      fd.set("watchlist_id", listId);
      fd.set("symbol", symbol);
      fd.set("action", isMember ? "remove" : "add");
      await toggleSymbolInWatchlistAction(fd);
    });
  }

  const memberCount = optimistic.size;

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant={memberCount > 0 ? "secondary" : "outline"}
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Star
          className={cn(
            "h-3.5 w-3.5",
            memberCount > 0 ? "fill-amber-400 text-amber-500" : "",
          )}
        />
        {memberCount > 0
          ? `In ${memberCount} list${memberCount === 1 ? "" : "s"}`
          : "Add to watchlist"}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-64 rounded-md border border-app bg-panel shadow-lg z-40 overflow-hidden"
        >
          {watchlists.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-muted mb-2">No lists yet</p>
              <Link
                href="/watchlists"
                className="inline-flex items-center gap-1 text-sm font-medium text-terminal-700 dark:text-terminal-400 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Create your first list
              </Link>
            </div>
          ) : (
            <>
              <ul className="max-h-64 overflow-y-auto">
                {watchlists.map((w) => {
                  const isMember = optimistic.has(w.id);
                  return (
                    <li key={w.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggle(w.id, isMember)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-left text-sm",
                          "hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50",
                        )}
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded border grid place-items-center shrink-0",
                            isMember
                              ? "bg-terminal-600 border-terminal-600 text-white"
                              : "border-app",
                          )}
                        >
                          {isMember && <Check className="h-3 w-3" />}
                        </span>
                        <span className="truncate">{w.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/watchlists"
                className="flex items-center gap-2 px-3 py-2 text-xs text-muted border-t border-app hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Plus className="h-3 w-3" />
                Manage watchlists
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
