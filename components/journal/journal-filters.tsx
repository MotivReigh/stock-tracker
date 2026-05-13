"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useTransition } from "react";

export function JournalFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();

  // Debounce URL updates so we don't refetch on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (query.trim().length === 0) {
        next.delete("q");
      } else {
        next.set("q", query.trim());
      }
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="relative">
      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search note text…"
        className="w-full bg-slate-50 dark:bg-slate-900 border border-app rounded-md pl-9 pr-9 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-terminal-500/40"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-slate-700 dark:hover:text-slate-200"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {pending && (
        <span className="absolute -bottom-5 left-0 text-[10px] text-muted font-mono">
          searching…
        </span>
      )}
    </div>
  );
}
